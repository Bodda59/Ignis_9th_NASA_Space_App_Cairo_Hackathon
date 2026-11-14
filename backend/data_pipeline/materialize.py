"""Build and publish a catalog revision in a single database transaction."""
import os
from collections import defaultdict

from psycopg.types.json import Jsonb

from data_pipeline.facts import SAMPLE_KEYS, VERSION, build_facts, digest
from data_pipeline.queue import enqueue_narrative
from data_pipeline.search_index import refresh_search_index
from data_pipeline.conditions import MISSING, ColumnMapping, header_key, parse_value


def rebuild(store, job):
    with store.connect() as conn:
        conn.execute("SET LOCAL statement_timeout='120s'")
        conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (job['target'],))
        study = conn.execute('SELECT * FROM rag_investigations WHERE id=%s', (job['target'],)).fetchone()
        if not study or conn.execute('SELECT catalog_source_hash(%s) AS hash', (study['id'],)).fetchone()['hash'] != job['source_hash']:
            return 'superseded'
        profiles = conn.execute('SELECT * FROM audience_profiles ORDER BY id').fetchall()
        ready = conn.execute('''SELECT audience_type,profile_version,extractor_version,source_hash
            FROM investigation_summaries WHERE investigation_id=%s''', (study['id'],)).fetchall()
        current = {r['audience_type']: (r['profile_version'], r['extractor_version'], r['source_hash']) for r in ready}
        if all(current.get(p['id']) == (p['version'], VERSION, job['source_hash']) for p in profiles) and profiles:
            return 'complete'

        documents, facts = replace_experiment_data(conn, study, job['source_hash'])
        save_summaries(conn, study['id'], profiles, facts, job['source_hash'])
        refresh_search_index(conn, study, documents, job['source_hash'])
        conn.execute('UPDATE rag_investigations SET published_content_hash=%s WHERE id=%s',
                     (job['source_hash'], study['id']))
        conn.execute('DELETE FROM comparison_cache WHERE %s=ANY(investigation_ids)', (study['id'],))
        conn.execute('DELETE FROM search_suggestion_cache')
    return 'complete'


def replace_experiment_data(conn, study, source_hash):
    docs = conn.execute('SELECT * FROM rag_documents WHERE investigation_id=%s ORDER BY id', (study['id'],)).fetchall()
    rows = conn.execute('''SELECT p.document_id,p.location,p.row_data,p.text,r.external_id,r.record_kind,r.id AS scenario_id
        FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id
        LEFT JOIN rag_scenario_records r ON r.passage_id=p.id
        WHERE d.investigation_id=%s AND jsonb_typeof(p.row_data)='object'
        ORDER BY p.document_id,(p.location->>'csv_record')::integer,p.id''', (study['id'],)).fetchall()
    values = conn.execute('''SELECT v.*,f.label,f.unit,f.kind FROM rag_scenario_values v
        JOIN rag_scenario_fields f ON f.key=v.field_key
        JOIN rag_scenario_records r ON r.id=v.record_id JOIN rag_passages p ON p.id=r.passage_id
        JOIN rag_documents d ON d.id=p.document_id WHERE d.investigation_id=%s''', (study['id'],)).fetchall()
    rows_by_document = defaultdict(list)
    for row in rows:
        rows_by_document[row['document_id']].append(row)

    by_record = {}
    for value in values:
        by_record.setdefault(value['record_id'], {})[value['field_key']] = {
            'field': {'key': value['field_key'], 'label': value['label'], 'kind': value['kind'], 'unit': value['unit']},
            'state': value['state'], 'low': value['low'], 'high': value['high'], 'category': value['category'],
            'raw': value['raw'], 'source_column': value['source_column'], 'note': value['mapping_note'],
        }
    for table in ['experiment_tables', 'investigation_measurements', 'investigation_tests', 'investigation_samples']:
        conn.execute(f'DELETE FROM {table} WHERE investigation_id=%s', (study['id'],))
    records, row_total, measurement_info = [], 0, {}
    for doc in docs:
        source_rows = rows_by_document.get(doc['id'], [])
        profile = doc['catalog_profile']
        for measured in profile.get('measurement_types', []):
            register_measurement(conn, measured)
            key = measured['key']
            source = {'document_id': doc['id'], 'source_url': doc['source_url'],
                      'content_hash': doc['content_hash'], **measured['source']}
            measurement_info[key] = dict(measured, source_refs=[source])
            conn.execute('''INSERT INTO investigation_measurements
                (id,investigation_id,measurement_key,source) VALUES(%s,%s,%s,%s)''',
                         (digest([doc['id'], key]), study['id'], key, Jsonb(source)))
        if not source_rows:
            continue
        header_set = {key for row in source_rows for key in row['row_data']}
        headers = [line.split(':', 1)[0] for line in source_rows[0]['text'].splitlines()
                   if line.split(':', 1)[0] in header_set]
        headers = list(dict.fromkeys(headers + sorted(header_set)))
        conn.execute('''INSERT INTO experiment_tables(id,investigation_id,document_id,title,revision,row_count)
            VALUES(%s,%s,%s,%s,%s,%s)''',
                     (doc['id'], study['id'], doc['id'], doc['title'], source_hash, len(source_rows)))
        condition_columns = {}
        for row in source_rows:
            for value in by_record.get(row['scenario_id'], {}).values():
                condition_columns.setdefault(value['source_column'], value['field'])
        for position, header in enumerate(headers):
            mapping = condition_columns.get(header, {})
            measured = profile.get('measurement_columns', {}).get(header)
            if measured:
                register_measurement(conn, measured)
                mapping = measured
            conn.execute('''INSERT INTO experiment_table_columns(table_id,key,header,position,kind,unit,mapping)
                VALUES(%s,%s,%s,%s,%s,%s,%s)''',
                         (doc['id'], f'c{position+1}', header, position,
                          mapping.get('kind', 'text'), mapping.get('unit'), Jsonb(mapping)))
        with conn.pipeline():
            for number, row in enumerate(source_rows, 1):
                source = {'document_id': doc['id'], 'source_url': doc['source_url'],
                          'content_hash': doc['content_hash'], **row['location']}
                test_id = digest([doc['id'], row['location'].get('csv_record', number)])
                parameters = by_record.get(row['scenario_id'], {})
                kind = row['record_kind'] or 'source_record'
                record = {'id': test_id, 'parameters': parameters, 'source': source, 'record_kind': kind}
                records.append(record)
                conn.execute('''INSERT INTO investigation_tests
                    (id,investigation_id,document_id,external_id,record_kind,parameters,source)
                    VALUES(%s,%s,%s,%s,%s,%s,%s)''',
                             (test_id, study['id'], doc['id'], row['external_id'] or str(number), kind,
                              Jsonb(parameters), Jsonb(source)))
                sample = {k: v for k, v in parameters.items() if k in SAMPLE_KEYS}
                if sample and kind == 'reported_test':
                    sample_column = next((key for key in row['row_data']
                                          if header_key(key) in {'sample', 'sample number', 'sample id'}), None)
                    external_sample = str(row['row_data'][sample_column]).strip() if sample_column else None
                    sample_id = digest([doc['id'], external_sample, sample]) if external_sample else digest([test_id, 'sample'])
                    conn.execute('''INSERT INTO investigation_samples
                        (id,investigation_id,document_id,external_id,material,geometry,properties,source)
                        VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING''',
                                 (sample_id, study['id'], doc['id'], external_sample, sample.get('material', {}).get('category'),
                                  sample.get('geometry', {}).get('category'), Jsonb(sample), Jsonb(source)))
                    conn.execute('INSERT INTO test_samples VALUES(%s,%s)', (test_id, sample_id))
                for header, measured in profile.get('measurement_columns', {}).items():
                    if header not in row['row_data']:
                        raise ValueError('Reviewed measurement column missing from source.')
                    value = measurement_value(row['row_data'], header, measured)
                    measurement_info[measured['key']] = dict(measured, source_refs=[source])
                    conn.execute('''INSERT INTO investigation_measurements
                        (id,investigation_id,test_id,measurement_key,value,original_unit,source)
                        VALUES(%s,%s,%s,%s,%s,%s,%s)''',
                                 (digest([test_id, measured['key']]), study['id'], test_id, measured['key'],
                                  Jsonb(value), measured.get('original_unit', measured.get('unit')), Jsonb(source)))
                conn.execute('''INSERT INTO experiment_table_rows(table_id,row_number,test_id,cells,normalized,source)
                    VALUES(%s,%s,%s,%s,%s,%s)''',
                             (doc['id'], number, test_id, Jsonb({f'c{i+1}': row['row_data'].get(h) for i, h in enumerate(headers)}),
                              Jsonb(parameters), Jsonb(source)))
        row_total += len(source_rows)
    return docs, build_facts(study, records, list(measurement_info.values()), row_total)


def measurement_value(row, header, measured):
    value = parse_value(row[header], ColumnMapping.model_validate(
        {k: v for k, v in measured.items() if k in ColumnMapping.model_fields}))
    required = measured.get('requires_column')
    if required and str(row.get(required)).strip().casefold() in MISSING | {'#value!'}:
        value.update(state='ambiguous', low=None, high=None,
                     note=f'Unverified derived value: {required} is not reported.')
    return value


def register_measurement(conn, measurement):
    key = measurement['key']
    definition = {'name': measurement['label'], 'quantity': measurement['quantity'],
                  'unit': measurement.get('unit'), 'kind': measurement['kind']}
    old = conn.execute('SELECT name,quantity,unit,kind FROM measurement_types WHERE key=%s', (key,)).fetchone()
    if old and old != definition:
        raise ValueError('Measurement key has an incompatible definition.')
    conn.execute('''INSERT INTO measurement_types(key,name,quantity,unit,kind) VALUES(%s,%s,%s,%s,%s)
        ON CONFLICT(key) DO NOTHING''', (key, *definition.values()))


def save_summaries(conn, investigation_id, profiles, facts, source_hash):
    for profile in profiles:
        conn.execute('''INSERT INTO investigation_summaries
            (investigation_id,audience_type,source_hash,extractor_version,profile_version,facts,narrative_status)
            VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(investigation_id,audience_type) DO UPDATE SET
            source_hash=excluded.source_hash,extractor_version=excluded.extractor_version,
            profile_version=excluded.profile_version,facts=excluded.facts,narrative=NULL,
            narrative_status=excluded.narrative_status,model_version=NULL,generated_at=now()''',
                     (investigation_id, profile['id'], source_hash, VERSION, profile['version'], Jsonb(facts),
                      'pending' if os.getenv('CATALOG_NARRATIVE_ENABLED', 'false').lower() == 'true' else 'disabled'))
        enqueue_narrative(conn, 'summary_narrative', investigation_id, source_hash,
                          {'audience': profile['id'], 'profile_version': profile['version']})
