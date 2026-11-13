import hashlib
import math
from pathlib import Path

import psycopg
from pgvector import Vector
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from research.models import Evidence


MAX_CORPUS_PASSAGES = 25_000


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

    def connect(self):
        connection = psycopg.connect(self.database_url, connect_timeout=10, row_factory=dict_row)
        connection.execute('SET search_path TO public, extensions')
        connection.execute("SET statement_timeout = '30s'")
        return connection

    def initialize(self):
        with self.connect() as connection:
            for migration in sorted((Path(__file__).resolve().parent / 'migrations').glob('*.sql')):
                connection.execute(migration.read_text())

    def health(self):
        with self.connect() as connection:
            count = connection.execute('SELECT count(*) AS count FROM rag_passages').fetchone()['count']
        return {'status': 'ok', 'passages': count}

    def save_document(self, study_id, name, document_id, title, file_name, source_url,
                      content_hash, signature, model, chunks, vectors, condition_profile=None):
        from data_pipeline.scenario_storage import save_conditions
        if not chunks or len(chunks) != len(vectors):
            raise ValueError('A document needs matching, nonempty chunks and vectors.')
        for vector in vectors:
            validate_vector(vector)
        with self.connect() as connection:
            connection.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))', (study_id,))
            old = connection.execute('SELECT investigation_id, index_signature FROM rag_documents WHERE id=%s', (document_id,)).fetchone()
            if old and old['investigation_id'] != study_id:
                raise ValueError('Document ID already belongs to another investigation.')
            duplicate = connection.execute('''SELECT id FROM rag_documents
                WHERE investigation_id=%s AND content_hash=%s AND embedding_model=%s AND id<>%s''',
                (study_id, content_hash, model, document_id)).fetchone()
            if duplicate:
                return {'status': 'duplicate', 'document_id': duplicate['id']}
            connection.execute('INSERT INTO rag_investigations(id,name) VALUES (%s,%s) ON CONFLICT(id) DO UPDATE SET name=excluded.name', (study_id, name))
            if old and old['index_signature'] == signature:
                rows = connection.execute('SELECT id,text,location,row_data FROM rag_passages WHERE document_id=%s ORDER BY id', (document_id,)).fetchall()
                if any(r['row_data'] and isinstance(r['row_data'], dict) for r in rows):
                    from data_pipeline.loaders import SourceUnit
                    previous = connection.execute('SELECT profile FROM rag_scenario_profiles WHERE document_id=%s', (document_id,)).fetchone()
                    active = condition_profile if condition_profile is not None else (previous['profile'] if previous else {})
                    save_conditions(connection, document_id, [SourceUnit(r['text'],r['location'],r['row_data']) for r in rows],
                                    [r['id'] for r in rows], active)
                return {'status': 'unchanged', 'document_id': document_id}
            connection.execute('''INSERT INTO rag_documents
                (id,investigation_id,title,file_name,source_url,content_hash,index_signature,embedding_model)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(id) DO UPDATE SET title=excluded.title,file_name=excluded.file_name,
                source_url=excluded.source_url,content_hash=excluded.content_hash,
                index_signature=excluded.index_signature,embedding_model=excluded.embedding_model,updated_at=now()''',
                (document_id, study_id, title, file_name, source_url, content_hash, signature, model))
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

    def corpus(self, selected, model):
        with self.connect() as connection:
            if selected:
                found = connection.execute('SELECT id FROM rag_investigations WHERE id=ANY(%s)', (selected,)).fetchall()
                if set(selected) != {x['id'] for x in found}:
                    raise ValueError('One or more selected investigation IDs do not exist.')
            different = connection.execute('''SELECT 1 FROM rag_documents WHERE embedding_model<>%s
                AND (%s::text[] IS NULL OR investigation_id=ANY(%s)) LIMIT 1''',
                (model, selected or None, selected or None)).fetchone()
            if different:
                raise ValueError('The selected corpus uses a different embedding model. Reindex it before searching.')
            rows = connection.execute('''SELECT p.id,p.document_id,p.text,p.location,p.row_data,
                d.investigation_id,i.name AS investigation_name,d.title,d.source_url,d.content_hash
                FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id
                JOIN rag_investigations i ON i.id=d.investigation_id
                WHERE (%s::text[] IS NULL OR d.investigation_id=ANY(%s)) ORDER BY p.id LIMIT %s''',
                (selected or None, selected or None, MAX_CORPUS_PASSAGES + 1)).fetchall()
        if len(rows) > MAX_CORPUS_PASSAGES:
            raise ValueError(f'Scope this query to fewer studies; the in-memory lexical index supports '
                             f'{MAX_CORPUS_PASSAGES:,} passages per query.')
        return [Evidence(**row) for row in rows]

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
                    source_url=ref['source_url'], location={'section': ref.get('field', 'Objective')},
                    content_hash=ref['source_hash'])
        return [by_id[sid] for sid in ids if sid in by_id]

    def semantic(self, vector, selected, model, limit):
        literal = vector_literal(vector)
        with self.connect() as connection:
            rows = connection.execute('''SELECT p.id,1-(p.embedding <=> %s::vector) AS similarity
                FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id
                WHERE d.embedding_model=%s AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                ORDER BY p.embedding <=> %s::vector,p.id LIMIT %s''',
                (literal, model, selected or None, selected or None, literal, limit)).fetchall()
        return [(x['id'], float(x['similarity'])) for x in rows]
