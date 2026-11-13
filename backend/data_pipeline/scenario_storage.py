import hashlib

from psycopg.types.json import Jsonb

from data_pipeline.conditions import EXTRACTOR_VERSION, extract_records
from data_pipeline.loaders import SourceUnit


def save_conditions(connection, document_id, chunks, passage_ids, profile):
    records, diagnostics = extract_records(chunks, profile)
    fields = {v['field']['key']: v['field'] for r in records for v in r['values']}
    for key in sorted(fields):
        field = fields[key]
        connection.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('scenario-field:'+key,))
        old = connection.execute('SELECT kind,unit,minimum,maximum FROM rag_scenario_fields WHERE key=%s', (key,)).fetchone()
        signature = {k: field.get(k) for k in ['kind', 'unit', 'minimum', 'maximum']}
        if old and dict(old) != signature:
            raise ValueError(f'Scenario field {key} already has a different type, unit, or bounds; use a new key.')
        connection.execute('''INSERT INTO rag_scenario_fields(key,label,kind,unit,minimum,maximum)
            VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT(key) DO NOTHING''',
            (key, field['label'], field['kind'], field.get('unit'), field.get('minimum'), field.get('maximum')))
    connection.execute('''DELETE FROM rag_scenario_records r USING rag_passages p
        WHERE r.passage_id=p.id AND p.document_id=%s''', (document_id,))
    connection.execute('''INSERT INTO rag_scenario_profiles(document_id,profile,diagnostics,extractor_version)
        VALUES (%s,%s,%s,%s) ON CONFLICT(document_id) DO UPDATE SET profile=excluded.profile,
        diagnostics=excluded.diagnostics,extractor_version=excluded.extractor_version''',
        (document_id, Jsonb(profile), Jsonb(diagnostics), EXTRACTOR_VERSION))
    values, record_rows = [], []
    for record in records:
        passage_id = passage_ids[record['passage_index']]
        id = hashlib.sha256(f'scenario:{passage_id}'.encode()).hexdigest()[:32]
        record_rows.append((id, passage_id, record['external_id'], record['kind']))
        for v in record['values']:
            values.append((id, v['field']['key'], v['state'], v['low'], v['high'], v['category'],
                           v['raw'], v['column'], v['note'], v['scale']))
    if values:
        with connection.cursor() as cursor:
            cursor.executemany('''INSERT INTO rag_scenario_records(id,passage_id,external_id,record_kind)
                VALUES (%s,%s,%s,%s)''', record_rows)
            cursor.executemany('''INSERT INTO rag_scenario_values
                (record_id,field_key,state,low,high,category,raw,source_column,mapping_note,scale)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''', values)
    return diagnostics


def backfill(store, selected=None, document_id=None, profile=None):
    """Index conditions from persisted rows without regenerating embeddings."""
    results = []
    with store.connect() as connection:
        docs = connection.execute('''SELECT id,investigation_id,file_name FROM rag_documents
            WHERE (%s::text[] IS NULL OR investigation_id=ANY(%s))
              AND (%s::text IS NULL OR id=%s) AND lower(file_name) LIKE '%%.csv' ORDER BY investigation_id,id''',
            (selected or None, selected or None, document_id, document_id)).fetchall()
    if document_id and not docs:
        raise ValueError('No CSV document found with that ID in the selected investigation scope.')
    if profile is not None and len(docs) != 1:
        raise ValueError('A custom condition profile must target exactly one CSV document.')
    for doc in docs:
        with store.connect() as connection:
            connection.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (doc['investigation_id'],))
            # Lock and reread the current source; replacement cannot attach stale values to new text.
            current = connection.execute('SELECT id FROM rag_documents WHERE id=%s FOR UPDATE', (doc['id'],)).fetchone()
            if not current:
                continue
            old = connection.execute('SELECT profile FROM rag_scenario_profiles WHERE document_id=%s', (doc['id'],)).fetchone()
            active_profile = profile if profile is not None else (old['profile'] if old else {})
            rows = connection.execute('SELECT id,text,location,row_data FROM rag_passages WHERE document_id=%s ORDER BY id', (doc['id'],)).fetchall()
            chunks = [SourceUnit(r['text'], r['location'], r['row_data']) for r in rows]
            diagnostics = save_conditions(connection, doc['id'], chunks, [r['id'] for r in rows], active_profile)
            results.append({'document_id': doc['id'], 'file_name': doc['file_name'], **diagnostics})
    return {'status': 'indexed', 'documents': results}
