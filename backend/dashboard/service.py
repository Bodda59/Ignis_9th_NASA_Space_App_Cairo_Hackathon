import base64
import csv
import copy
import hashlib
import hmac
import io
import json
import os
import uuid

from psycopg.types.json import Jsonb

from data_pipeline.facts import VERSION, compare_facts, digest
from data_pipeline.reviewed import REVIEWED
from data_pipeline.source_metadata import source_details
from research.catalog_search import query_words, rank_candidates, search_candidates
from data_pipeline.queue import enqueue_narrative


class CatalogError(Exception):
    def __init__(self, status, code, message, details=None):
        self.status, self.code, self.message, self.details = status, code, message, details
        super().__init__(message)


def missing():
    raise CatalogError(404, 'NOT_FOUND', 'The requested resource does not exist.')


def encode_cursor(payload, secret):
    body = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode()).decode()
    signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return body + '.' + signature


def decode_cursor(cursor, secret, revision, fingerprint):
    if not cursor:
        return 0
    try:
        body, signature = cursor.split('.')
        expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(body))
        if payload['revision'] != revision:
            raise CatalogError(409, 'CURSOR_EXPIRED', 'The data changed. Restart pagination.')
        if payload['fingerprint'] != fingerprint or type(payload['offset']) is not int or payload['offset'] < 0:
            raise ValueError()
        return payload['offset']
    except (ValueError, KeyError, TypeError):
        raise CatalogError(422, 'INVALID_CURSOR', 'The cursor is invalid for this request.') from None


def project_facts(facts, config):
    result = {key: copy.deepcopy(facts[key]) for key in config['field_order'] if key in config['visible_fields'] and key in facts}
    for section in ['sample_properties', 'test_parameters', 'source_record_parameters']:
        for group in result.get(section, {}).values():
            for field in group:
                field['distinct_value_count'] = len(field['values'])
                field['values'] = field['values'][:config['max_display_values']]
                field['values_truncated'] = field['distinct_value_count'] > len(field['values'])
    # Essential evidence coverage and limitations are included for every audience.
    result.update(coverage=facts['coverage'], limitations=facts['limitations'])
    return result


class Catalog:
    def __init__(self, store, secret):
        self.store, self.secret = store, secret

    def audience(self, audience):
        with self.store.connect() as conn:
            row = conn.execute('SELECT * FROM audience_profiles WHERE id=%s', (audience,)).fetchone()
        if not row:
            raise CatalogError(503, 'CATALOG_NOT_INITIALIZED', 'Audience profiles require initialization.')
        return row

    def revision(self, conn):
        return digest(conn.execute('SELECT id,content_hash,published_content_hash FROM rag_investigations ORDER BY id').fetchall())

    def require_study(self, conn, study):
        row = conn.execute('SELECT * FROM rag_investigations WHERE id=%s', (study,)).fetchone()
        if not row:
            missing()
        return row

    def metadata(self, study):
        with self.store.connect() as conn:
            return source_details(self.require_study(conn, study))

    def list_studies(self, audience, limit, cursor, sort, category=None, fuel_type=None, gravity=None):
        sorts = {'title': 'i.name ASC,i.id ASC', '-title': 'i.name DESC,i.id ASC',
                 'updated_at': 'i.updated_at ASC,i.id ASC', '-updated_at': 'i.updated_at DESC,i.id ASC'}
        fingerprint = digest([audience, sort, category, fuel_type, gravity, limit])
        with self.store.connect() as conn:
            conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
            revision = self.revision(conn)
            offset = decode_cursor(cursor, self.secret, revision, fingerprint)
            rows = conn.execute(f'''SELECT i.id,i.name AS title,coalesce(nullif(i.description,''),i.objective) AS description,i.updated_at,
                s.facts->'coverage'->'test_count' AS test_count,
                s.facts->'coverage'->'table_row_count' AS table_row_count,
                s.facts->'measurement_types' AS measurement_types,
                i.content_hash IS DISTINCT FROM i.published_content_hash AS stale
                FROM rag_investigations i LEFT JOIN investigation_summaries s
                 ON s.investigation_id=i.id AND s.audience_type=%s
                WHERE (%s::text IS NULL OR i.metadata->'categories' ? %s)
                 AND (%s::text IS NULL OR i.metadata->'fuel_types' ? %s)
                 AND (%s::text IS NULL OR i.metadata->'gravity_environments' ? %s)
                ORDER BY {sorts[sort]} LIMIT %s OFFSET %s''',
                                (audience, category, category, fuel_type, fuel_type, gravity, gravity, limit+1, offset)).fetchall()
        for row in rows:
            row['short_description'] = row.pop('description')[:300]
            row['main_measurement_types'] = (row.pop('measurement_types') or [])[:5]
        return self.page(rows, limit, offset, revision, fingerprint)

    def page(self, rows, limit, offset, revision, fingerprint):
        return {'items': rows[:limit], 'next_cursor': encode_cursor(
            {'offset': offset+limit, 'revision': revision, 'fingerprint': fingerprint}, self.secret
        ) if len(rows) > limit else None, 'revision': revision}

    def summary(self, study, audience):
        profile = self.audience(audience)
        with self.store.connect() as conn:
            info = self.require_study(conn, study)
            row = conn.execute('SELECT * FROM investigation_summaries WHERE investigation_id=%s AND audience_type=%s',
                               (study, audience)).fetchone()
            job = conn.execute("""SELECT id,status FROM background_jobs WHERE target=%s AND kind='catalog'
                ORDER BY id DESC LIMIT 1""", (study,)).fetchone()
        if not row:
            return {'investigation_id': study, 'status': 'failed' if job and job['status'] == 'failed' else 'pending',
                    'job': job, 'facts': None, **source_details(info)}
        row['facts'] = project_facts(row['facts'], profile['config'])
        row['status'] = 'ready' if row['source_hash'] == info['content_hash'] and row['profile_version'] == profile['version'] else 'stale'
        row.update(source_details(info))
        row['job'] = job
        row['presentation'] = {'depth': profile['config']['default_depth'], 'focus': profile['config']['focus']}
        return row

    def search(self, query, audience, limit, cursor, category=None, fuel_type=None, gravity=None):
        words = query_words(query)
        fingerprint = digest([query, audience, limit, category, fuel_type, gravity])
        with self.store.connect() as conn:
            conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
            revision = self.revision(conn)
            conn.execute("SET LOCAL pg_trgm.similarity_threshold=0.2")
            offset = decode_cursor(cursor, self.secret, revision, fingerprint)
            rows = search_candidates(conn, query, words, category, fuel_type, gravity)
        ranked = rank_candidates(rows, query, words)
        result = self.page(ranked[offset:offset+limit+1], limit, offset, revision, fingerprint)
        result['total'] = len(ranked)
        suggestions = self.autocomplete(query, audience, 1)['items'] if not ranked else []
        result['did_you_mean'] = suggestions[0]['text'] if suggestions else None
        return result

    def autocomplete(self, query, audience, limit):
        with self.store.connect() as conn:
            conn.execute("SET LOCAL pg_trgm.similarity_threshold=0.2")
            revision = self.revision(conn)
            key = digest([query.casefold(), audience, limit, revision])
            cached = conn.execute('SELECT result FROM search_suggestion_cache WHERE key=%s AND expires_at>now()', (key,)).fetchone()
            if cached:
                return cached['result']
            escaped = query.casefold().replace('%', '\\%').replace('_', '\\_')
            rows = conn.execute('''SELECT term AS text,min(investigation_id) AS investigation_id,
                max(similarity(term,lower(%s))) AS score
                FROM search_terms WHERE term LIKE %s OR term %% lower(%s)
                GROUP BY term ORDER BY (term LIKE %s) DESC,score DESC,term LIMIT %s''',
                                (query, escaped+'%', query, escaped+'%', limit)).fetchall()
            result = {'items': rows}
            conn.execute('DELETE FROM search_suggestion_cache WHERE expires_at<=now()')
            conn.execute('''INSERT INTO search_suggestion_cache VALUES(%s,%s,now()+interval '5 minutes')
                ON CONFLICT(key) DO UPDATE SET result=excluded.result,expires_at=excluded.expires_at''', (key, Jsonb(result)))
        return result

    def compare(self, ids, audience):
        ids = sorted(ids)
        profile = self.audience(audience)
        with self.store.connect() as conn:
            for study in ids:
                self.require_study(conn, study)
            rows = conn.execute('''SELECT s.*,i.content_hash FROM investigation_summaries s
                JOIN rag_investigations i ON i.id=s.investigation_id
                WHERE s.investigation_id=ANY(%s) AND audience_type=%s ORDER BY s.investigation_id''', (ids, audience)).fetchall()
            if len(rows) != len(ids):
                return {'status': 'pending', 'investigation_ids': ids}
            hashes = {r['investigation_id']: [r['source_hash'], r['extractor_version'], r['profile_version']] for r in rows}
            key = digest([ids, audience, hashes, VERSION, profile['version']])
            cached = conn.execute('SELECT * FROM comparison_cache WHERE key=%s', (key,)).fetchone()
            stale = any(r['source_hash'] != r['content_hash'] or r['profile_version'] != profile['version'] for r in rows)
            if not cached:
                result = compare_facts({r['investigation_id']: r['facts'] for r in rows})
                pending = os.getenv('CATALOG_NARRATIVE_ENABLED', 'false').lower() == 'true'
                conn.execute('''INSERT INTO comparison_cache
                    (key,investigation_ids,audience_type,source_hashes,result,version,narrative_status)
                    VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(key) DO NOTHING''',
                             (key, ids, audience, Jsonb(hashes), Jsonb(result), VERSION, 'pending' if pending else 'disabled'))
                enqueue_narrative(conn, 'comparison_narrative', key, digest(hashes),
                                  {'audience': audience, 'profile_version': profile['version']})
                cached = conn.execute('SELECT * FROM comparison_cache WHERE key=%s', (key,)).fetchone()
            findings = {sid: [{key: REVIEWED[sid][key] for key in ('text', 'source_refs')}] if sid in REVIEWED else [] for sid in ids}
            return {'status': 'stale' if stale else 'ready', 'facts': dict(cached['result'], reviewed_findings=findings),
                    'narrative': cached['narrative'], 'narrative_status': cached['narrative_status'], 'source_hashes': hashes}

    def tables(self, study):
        with self.store.connect() as conn:
            self.require_study(conn, study)
            rows = conn.execute('''SELECT t.*,coalesce(
                jsonb_agg(jsonb_build_object('key',c.key,'header',c.header,'position',c.position,
                    'kind',c.kind,'unit',c.unit,'mapping',c.mapping) ORDER BY c.position)
                    FILTER (WHERE c.key IS NOT NULL),'[]'::jsonb) AS columns
                FROM experiment_tables t LEFT JOIN experiment_table_columns c ON c.table_id=t.id
                WHERE t.investigation_id=%s GROUP BY t.id ORDER BY t.id''', (study,)).fetchall()
        return {'items': rows}

    def table(self, conn, study, table_id, columns):
        table = conn.execute('SELECT * FROM experiment_tables WHERE id=%s AND investigation_id=%s', (table_id, study)).fetchone()
        if not table:
            missing()
        definitions = conn.execute('''SELECT key,header,position,kind,unit,mapping
            FROM experiment_table_columns WHERE table_id=%s ORDER BY position''', (table_id,)).fetchall()
        allowed = {col['key'] for col in definitions}
        if columns and (len(columns) != len(set(columns)) or set(columns)-allowed):
            raise CatalogError(422, 'INVALID_COLUMNS', 'Choose distinct column keys from the table catalog.')
        return table, [col for col in definitions if not columns or col['key'] in columns]

    def rows(self, study, table_id, audience, limit, cursor, columns, selection='first'):
        with self.store.connect() as conn:
            conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
            table, definitions = self.table(conn, study, table_id, columns)
            fingerprint = digest([study, table_id, audience, columns, limit])
            offset = decode_cursor(cursor, self.secret, table['revision'], fingerprint)
            if selection == 'representative':
                count = table['row_count']
                positions = sorted({1 + round(i*(count-1)/max(1, min(limit, count)-1)) for i in range(min(limit, count))})
                rows = conn.execute('''SELECT row_number,cells,source FROM experiment_table_rows
                    WHERE table_id=%s AND row_number=ANY(%s) ORDER BY row_number''', (table_id, positions)).fetchall()
            else:
                rows = conn.execute('''SELECT row_number,cells,source FROM experiment_table_rows
                    WHERE table_id=%s AND row_number>%s ORDER BY row_number LIMIT %s''', (table_id, offset, limit+1)).fetchall()
            for row in rows:
                row['cells'] = {col['key']: row['cells'].get(col['key']) for col in definitions}
            result = self.page(rows, limit, offset, table['revision'], fingerprint)
            result.update(columns=definitions, total_rows=table['row_count'], selection=selection)
            return result

    def export(self, study, table_id, columns, format):
        # The validation connection runs before HTTP streaming begins.
        with self.store.connect() as conn:
            table, definitions = self.table(conn, study, table_id, columns)
        keys = [column['key'] for column in definitions]
        def stream():
            with self.store.connect() as conn:
                conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
                current = conn.execute('SELECT revision FROM experiment_tables WHERE id=%s', (table_id,)).fetchone()
                if not current or current['revision'] != table['revision']:
                    raise CatalogError(409, 'TABLE_CHANGED', 'Restart export after the table update.')
                with conn.cursor(name='catalog_export_'+uuid.uuid4().hex) as cursor:
                    cursor.execute('SELECT row_number,cells,source FROM experiment_table_rows WHERE table_id=%s ORDER BY row_number', (table_id,))
                    if format == 'json':
                        yield '{"columns":' + json.dumps(definitions) + ',"rows":['
                        separator = ''
                        for row in cursor:
                            row['cells'] = {key: row['cells'].get(key) for key in keys}
                            yield separator + json.dumps(row, ensure_ascii=False)
                            separator = ','
                        yield ']}'
                    else:
                        buffer = io.StringIO()
                        writer = csv.writer(buffer)
                        writer.writerow([col['header'] for col in definitions])
                        yield buffer.getvalue()
                        for row in cursor:
                            buffer.seek(0)
                            buffer.truncate(0)
                            cells = ['' if row['cells'].get(key) is None else str(row['cells'][key]) for key in keys]
                            # CSV exports may be opened by spreadsheet software.
                            writer.writerow(["'"+v if v.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else v for v in cells])
                            yield buffer.getvalue()
        return stream()
