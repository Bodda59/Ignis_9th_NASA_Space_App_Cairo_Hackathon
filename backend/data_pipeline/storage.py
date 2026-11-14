import atexit
import hashlib
import math
import os
import threading
import time
from contextlib import contextmanager
from pathlib import Path

from pgvector import Vector
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from research.models import Evidence
from research.retrieval import CorpusIndex, IndexedRows


MAX_CORPUS_PASSAGES = 25_000
# How often a search asks the database whether the indexed documents changed.
CACHE_CHECK_SECONDS = 30
# Changes whenever a document is added, removed, re-indexed, moved or renamed.
CORPUS_VERSION = '''SELECT md5(
    coalesce((SELECT string_agg(concat_ws('|',id,investigation_id,content_hash,index_signature,embedding_model,
        source_type,title,source_url), ',' ORDER BY id) FROM rag_documents), '') || '#' ||
    coalesce((SELECT string_agg(id||'|'||name, ',' ORDER BY id) FROM rag_investigations), '')) AS version'''


def validate_vector(values):
    if len(values) != 384 or any(not math.isfinite(x) for x in values):
        raise ValueError('Embeddings must have 384 finite dimensions.')


def vector_literal(values):
    validate_vector(values)
    return '[' + ','.join(str(float(x)) for x in values) + ']'


class PostgresStore:
    def __init__(self, database_url):
        if not database_url:
            raise ValueError('Set DATABASE_URL to a PostgreSQL database with pgvector.')
        self.database_url = database_url
        self._pool = None
        self._pool_lock = threading.Lock()
        self._cache = None
        self._cache_lock = threading.Lock()

    @staticmethod
    def _configure(connection):
        connection.execute('SET search_path TO public, extensions')
        connection.execute("SET statement_timeout = '30s'")
        connection.commit()
        connection.last_used = time.monotonic()

    @staticmethod
    def _check(connection):
        # Only a connection that sat idle is pinged, so busy requests skip the extra round trip.
        if time.monotonic() - getattr(connection, 'last_used', 0) > 20:
            ConnectionPool.check_connection(connection)

    def pool(self):
        with self._pool_lock:
            if self._pool is None:
                # Opening a connection costs about a second against a remote database, so keep them open.
                # prepare_threshold=None keeps this working behind a transaction-mode pooler as well.
                self._pool = ConnectionPool(
                    self.database_url, min_size=1, max_size=int(os.getenv('DB_POOL_SIZE', '8')), timeout=15,
                    max_idle=300, open=True, configure=self._configure, check=self._check,
                    kwargs={'connect_timeout': 10, 'row_factory': dict_row, 'prepare_threshold': None})
                atexit.register(self._pool.close)
            return self._pool

    @contextmanager
    def connect(self):
        """One transaction on a pooled connection: commit on success, roll back on error."""
        with self.pool().connection() as connection:
            try:
                yield connection
            finally:
                connection.last_used = time.monotonic()

    def initialize(self):
        with self.connect() as connection:
            for migration in sorted((Path(__file__).resolve().parent / 'migrations').glob('*.sql')):
                connection.execute(migration.read_text())

    def health(self):
        with self.connect() as connection:
            count = connection.execute('SELECT count(*) AS count FROM rag_passages').fetchone()['count']
        return {'status': 'ok', 'passages': count}

    def save_document(self, study_id, name, document_id, title, file_name, source_url,
                      content_hash, signature, model, chunks, vectors, condition_profile=None, source_type=None):
        from data_pipeline.scenario_storage import save_conditions
        if not chunks or len(chunks) != len(vectors):
            raise ValueError('A document needs matching, nonempty chunks and vectors.')
        for vector in vectors:
            validate_vector(vector)
        with self.connect() as connection:
            connection.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))', (study_id,))
            old = connection.execute('SELECT investigation_id, index_signature, source_type FROM rag_documents WHERE id=%s', (document_id,)).fetchone()
            if old and old['investigation_id'] != study_id:
                raise ValueError('Document ID already belongs to another investigation.')
            duplicate = connection.execute('''SELECT id FROM rag_documents
                WHERE investigation_id=%s AND content_hash=%s AND embedding_model=%s AND id<>%s''',
                (study_id, content_hash, model, document_id)).fetchone()
            if duplicate:
                return {'status': 'duplicate', 'document_id': duplicate['id']}
            connection.execute('INSERT INTO rag_investigations(id,name) VALUES (%s,%s) ON CONFLICT(id) DO UPDATE SET name=excluded.name', (study_id, name))
            if old and old['index_signature'] == signature:
                if source_type is not None:
                    connection.execute(
                        'UPDATE rag_documents SET source_type=%s WHERE id=%s AND source_type<>%s',
                        (source_type, document_id, source_type))
                rows = connection.execute('SELECT id,text,location,row_data FROM rag_passages WHERE document_id=%s ORDER BY id', (document_id,)).fetchall()
                if any(r['row_data'] and isinstance(r['row_data'], dict) for r in rows):
                    from data_pipeline.loaders import SourceUnit
                    previous = connection.execute('SELECT profile FROM rag_scenario_profiles WHERE document_id=%s', (document_id,)).fetchone()
                    active = condition_profile if condition_profile is not None else (previous['profile'] if previous else {})
                    save_conditions(connection, document_id, [SourceUnit(r['text'],r['location'],r['row_data']) for r in rows],
                                    [r['id'] for r in rows], active)
                return {'status': 'unchanged', 'document_id': document_id}
            connection.execute('''INSERT INTO rag_documents
                (id,investigation_id,title,file_name,source_url,content_hash,index_signature,embedding_model,source_type)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(id) DO UPDATE SET title=excluded.title,file_name=excluded.file_name,
                source_url=excluded.source_url,content_hash=excluded.content_hash,
                index_signature=excluded.index_signature,embedding_model=excluded.embedding_model,source_type=excluded.source_type,updated_at=now()''',
                (document_id, study_id, title, file_name, source_url, content_hash, signature, model, source_type or (old['source_type'] if old else 'Other Sources')))
            previous = connection.execute('SELECT profile FROM rag_scenario_profiles WHERE document_id=%s', (document_id,)).fetchone()
            active = condition_profile if condition_profile is not None else (previous['profile'] if previous else {})
            connection.execute('DELETE FROM rag_passages WHERE document_id=%s', (document_id,))
            # Binary COPY avoids sending one SQL statement and a decimal vector per passage.
            register_vector(connection)
            connection.execute("SET LOCAL statement_timeout = '120s'")
            passage_ids = []
            with connection.cursor().copy('''COPY rag_passages
                    (id,document_id,text,location,row_data,embedding) FROM STDIN (FORMAT BINARY)''') as copy:
                copy.set_types(['text', 'text', 'text', 'jsonb', 'jsonb', 'vector'])
                for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
                    id = hashlib.sha256(f'{document_id}:{signature}:{index}'.encode()).hexdigest()[:32]
                    passage_ids.append(id)
                    copy.write_row((id, document_id, chunk.text, Jsonb(chunk.location),
                                    Jsonb(chunk.row_data), Vector(vector)))
            connection.execute("SET LOCAL statement_timeout = '30s'")
            diagnostics = save_conditions(connection, document_id, chunks, passage_ids, active)
        return {'status': 'indexed', 'document_id': document_id, 'chunks': len(chunks), 'scenario': diagnostics}

    def source_coverage(self, selected, model):
        with self.connect() as connection:
            rows = connection.execute('''SELECT i.id,i.name,d.source_type,count(d.id) AS documents,
                    bool_or(d.embedding_model<>%s) AS different_model
                FROM rag_investigations i LEFT JOIN rag_documents d ON d.investigation_id=i.id
                    AND EXISTS (SELECT 1 FROM rag_passages p WHERE p.document_id=d.id)
                WHERE (%s::text[] IS NULL OR i.id=ANY(%s))
                GROUP BY i.id,i.name,d.source_type ORDER BY i.id,d.source_type''',
                (model, selected or None, selected or None)).fetchall()
        if selected and set(selected) != {row['id'] for row in rows}:
            raise ValueError('One or more selected investigation IDs do not exist.')
        if any(row['different_model'] for row in rows):
            raise ValueError('The selected corpus uses a different embedding model. Reindex it before searching.')
        return rows

    def passages(self):
        """Every indexed passage by source type, held in memory and reloaded when the documents change."""
        with self._cache_lock:
            cache = self._cache
            if cache and time.monotonic() - cache['checked'] < CACHE_CHECK_SECONDS:
                return cache
            with self.connect() as connection:
                connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
                version = connection.execute(CORPUS_VERSION).fetchone()['version']
                if cache and cache['version'] == version:
                    cache['checked'] = time.monotonic()
                    return cache
                connection.execute("SET LOCAL statement_timeout = '120s'")
                rows = connection.execute('''SELECT p.id,p.document_id,p.text,p.location,p.row_data,
                    d.investigation_id,i.name AS investigation_name,d.title,d.source_url,d.content_hash,d.source_type,
                    d.embedding_model
                    FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id
                    JOIN rag_investigations i ON i.id=d.investigation_id ORDER BY p.id''').fetchall()
            by_type = {}
            for row in rows:
                model = row.pop('embedding_model')
                by_type.setdefault(row['source_type'], []).append((Evidence(**row), model))
            self._cache = {'version': version, 'checked': time.monotonic(), 'by_type': by_type, 'indexes': {}}
            return self._cache

    def corpus(self, cache, source_type, model, selected):
        """The passages in scope and their keyword index, built once per scope."""
        scope = frozenset(selected) if selected else None
        passages = [evidence for evidence, embedded in cache['by_type'].get(source_type, ())
                    if embedded == model and (scope is None or evidence.investigation_id in scope)]
        key = (source_type, model, scope)
        index = cache['indexes'].get(key)
        if index is None:
            index = CorpusIndex(passages)
            with self._cache_lock:
                # shortcut: whole-collection indexes stay; the oldest scoped one makes room for a new scope.
                scoped = [k for k in cache['indexes'] if k[2] is not None]
                if scope is not None and len(scoped) >= 32:
                    cache['indexes'].pop(scoped[0], None)
                cache['indexes'][key] = index
        return passages, index

    def warm(self, model):
        """Load the passages and the whole-collection indexes before the first question arrives."""
        cache = self.passages()
        for source_type in list(cache['by_type']):
            self.corpus(cache, source_type, model, None)
        return sum(len(rows) for rows in cache['by_type'].values())

    def search_collection(self, vector, selected, model, source_type):
        literal = vector_literal(vector)
        for retry in (True, False):
            cache = self.passages()
            # Passage text comes from memory; the database only scores the question against each passage.
            with self.connect() as connection:
                rows = connection.execute('''SELECT p.id,1-(p.embedding <=> %s::vector) AS similarity
                    FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id
                    WHERE d.source_type=%s AND d.embedding_model=%s
                        AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                    LIMIT %s''',
                    (literal, source_type, model, selected or None, selected or None, MAX_CORPUS_PASSAGES+1)).fetchall()
            if len(rows) > MAX_CORPUS_PASSAGES:
                raise ValueError(f'Scope this query to fewer studies. The {source_type} collection exceeds '
                                 f'{MAX_CORPUS_PASSAGES:,} passages.')
            similarity = {row['id']: row['similarity'] for row in rows}
            passages, index = self.corpus(cache, source_type, model, selected)
            if len(passages) == len(similarity) and all(evidence.id in similarity for evidence in passages):
                break
            if retry:
                # The database and the memory copy disagree about which passages exist: reload and score again.
                with self._cache_lock:
                    if self._cache is cache:
                        self._cache = None
        else:
            raise ValueError('The source index changed during this search. Ask the question again.')
        result = IndexedRows((evidence, similarity[evidence.id]) for evidence in passages)
        result.corpus = index
        return result

    def objective_evidence(self, ids):
        with self.connect() as conn:
            rows = conn.execute("""SELECT id,name,objective,field_sources->'objective' AS refs
                FROM rag_investigations WHERE id=ANY(%s) AND NULLIF(objective,'') IS NOT NULL""", (ids,)).fetchall()
        by_id = {}
        for row in rows:
            ref = next((ref for ref in row['refs'] or [] if ref.get('source_url') and ref.get('source_hash')), None)
            if ref:
                sid = row['id']
                by_id[sid] = Evidence(id=f'{sid}-published-objective', investigation_id=sid,
                    investigation_name=row['name'], document_id=ref.get('document_id') or f'{sid}-metadata',
                    title='NASA investigation metadata · published objective', text=row['objective'],
                    source_type='Investigation Metadata Files',
                    source_url=ref['source_url'], location={'section': ref.get('field', 'Objective')},
                    content_hash=ref['source_hash'])
        return [by_id[sid] for sid in ids if sid in by_id]
