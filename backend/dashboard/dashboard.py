"""Investigation detail and crew-environment dashboard routes."""
from collections import Counter

from fastapi import Depends, Request

from dashboard.earth import citation, earth_catalogue, study_earth
from dashboard.gravity import gravity_catalogue
from dashboard.service import CatalogError
from data_pipeline.facts import aggregate
from data_pipeline.reviewed import REPORT_DETAILS, REVIEWED
from data_pipeline.source_metadata import source_details
from research.crew import (
    CONDITIONS, EQUIPMENT_LABELS, EQUIPMENT_TOPICS, ResearchRequest, catalog_data,
    condition_value, discover_filters, find_research, fuel_types, material_labels,
    study_topics, usable,
)


def study_details(catalog, sid, audience):
    summary = catalog.summary(sid, audience)
    if summary['facts'] is None:
        raise CatalogError(503, 'SUMMARY_PENDING', 'The investigation summary is still being prepared.')
    with catalog.store.connect() as conn:
        studies, grouped = catalog_data(conn, [sid])
        documents = conn.execute('SELECT d.id,d.title,d.file_name,d.content_hash,d.source_url,d.catalog_profile,d.source_type,EXISTS (SELECT 1 FROM rag_passages p WHERE p.document_id=d.id) AS indexed FROM rag_documents d WHERE d.investigation_id=%s ORDER BY d.title,d.id',
                                 (sid,)).fetchall()
        counts = conn.execute('''SELECT record_kind,count(*) AS count FROM investigation_tests
            WHERE investigation_id=%s GROUP BY record_kind''', (sid,)).fetchall()
        table_rows = conn.execute('''SELECT coalesce(sum(row_count),0) AS count FROM experiment_tables
            WHERE investigation_id=%s''', (sid,)).fetchone()['count']
        notes = conn.execute('''SELECT p.document_id,p.location,d.source_url,d.content_hash,
            coalesce(p.row_data->>'Notes',p.row_data->>'Notes*',p.row_data->>'Comments') AS text
            FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id
            WHERE d.investigation_id=%s AND jsonb_typeof(p.row_data)='object'
              AND nullif(trim(coalesce(p.row_data->>'Notes',p.row_data->>'Notes*',p.row_data->>'Comments')),'') IS NOT NULL
            ORDER BY d.id,(p.location->>'csv_record')::integer LIMIT 10''', (sid,)).fetchall()
    source_counts = Counter(doc['source_type'] for doc in documents if doc['indexed'])
    study = studies[0]
    rows = grouped[sid]
    facts = summary['facts']
    record_counts = {row['record_kind']: row['count'] for row in counts}
    source_rows = [row for row in rows if row['record_kind'] == 'source_record']
    source_parameters = aggregate(source_rows)
    citations = {doc['id']: {'id': doc['id'], 'source_id': doc['id'], 'title': doc['title'], 'file_name': doc['file_name'],
                             'url': doc['source_url'], 'location': 'Source document', 'source_type': 'psi'}
                 for doc in documents}

    def cited(text, refs=()):
        ids = []
        for ref in refs:
            document_id = ref.get('document_id')
            if not document_id and ref.get('file_name') and ref.get('source_url'):
                document_id = next((doc['id'] for doc in documents
                                    if doc['file_name'] == ref['file_name'] and doc['source_url'] == ref['source_url']), None)
            doc = citations.get(document_id)
            location = f'CSV row {ref["csv_record"]}' if ref.get('csv_record') is not None else (
                f'Page {ref["page"]}' if ref.get('page') is not None else ref.get('field', 'Source metadata'))
            base = document_id or ref.get('source_url') or f'{sid}-metadata'
            ref_id = f'{base}:{location}'
            citations[ref_id] = {'id': ref_id, 'source_id': base, 'title': ref.get('title') or (doc or {}).get('title', 'NASA investigation metadata'),
                                 'file_name': ref.get('file_name') or (doc or {}).get('file_name') or
                                     ((study.get('metadata', {}).get('source_metadata') or {}).get('source_file')
                                      if ref.get('field') and not ref.get('title') else None),
                                 'url': ref.get('source_url') or (doc or {}).get('url'), 'location': location,
                                 'source_type': ref.get('source_type', 'psi')}
            ids.append(ref_id)
        return {'text': text, 'citation_ids': list(dict.fromkeys(ids))}

    def sections(name, prefix=False, keys=None):
        entries = []
        parameters = source_parameters if name == 'source_record_parameters' else facts.get(name, {})
        for kind, fields in parameters.items():
            for field in fields:
                if keys is not None and field['key'] not in keys:
                    continue
                values, refs = [], []
                scoped_rows = [row for row in rows if
                               (name == 'source_record_parameters') == (row['record_kind'] == 'source_record')]
                for item in field['values'][:25]:
                    v = item['value']
                    if v['category'] is not None:
                        value = next((param['raw'] for row in scoped_rows
                                      if (param := row['parameters'].get(field['key']))
                                      and param.get('category') == v['category']), v['category'])
                    else:
                        value = f'{v["low"]:g}' if v['low'] == v['high'] else f'{v["low"]:g}–{v["high"]:g}'
                        value += f' {v["unit"]}' if v['unit'] else ''
                    values.append(value)
                    refs.extend(item['source_refs'][:1])
                raw_values = {}
                for row in rows:
                    if (name == 'source_record_parameters') != (row['record_kind'] == 'source_record'):
                        continue
                    value = row['parameters'].get(field['key'])
                    if value and value['state'] not in ('usable', 'missing') and value['raw'].strip():
                        raw_values.setdefault(value['raw'], row['source'])
                label = (field['definition'] or {}).get('label', field['key'].replace('_', ' '))
                status = 'Source records · ' if prefix else ''
                count = field.get('distinct_value_count', len(field['values']))
                values_text = ', '.join(values) or ('See the reported entries' if raw_values else 'No usable value reported')
                if count > len(values):
                    values_text += f' and {count - len(values)} more'
                if raw_values:
                    examples = list(raw_values)[:4]
                    values_text += '. Also reported as: ' + ' | '.join(examples)
                    if len(raw_values) > len(examples):
                        values_text += f' (+{len(raw_values) - len(examples)} other source entries)'
                    values_text += '. These entries are preserved as written, not treated as individual test values.'
                    refs.extend(raw_values[value] for value in examples)
                group_label = {'shared': 'Same reported value', 'varying': 'Varies across records',
                               'unknown': 'Incomplete or qualified values'}[kind]
                entries.append(cited(f'{status}{label} · {group_label} · {values_text}', refs[:4]))
        return entries

    objective = facts['objective']
    objectives = [cited(objective['text'], objective['source_refs'])] if objective['text'] else []
    tests = []
    for row in rows:
        if row['record_kind'] != 'reported_test':
            continue
        params = row['parameters']
        refs = cited('', [row['source']])['citation_ids']
        scalar = {}
        for key in CONDITIONS:
            bounds = condition_value(params, key)
            scalar[key] = bounds[0] if bounds and bounds[0] == bounds[1] else None
        gravity = usable(params, 'gravity').get('category')
        tests.append({'id': row['external_id'], 'record_id': row['id'], 'investigation_id': sid,
                      'material': usable(params, 'material').get('category') or usable(params, 'fuel').get('category'),
                      'sample_shape': usable(params, 'geometry').get('category'), 'sample_dimensions': None,
                      **scalar, 'gravity_regime': gravity if gravity in ('microgravity', 'normal_gravity', 'partial_gravity') else 'unknown',
                      'gravity_g': None, 'source_id': refs[0], 'source_location': citations[refs[0]]['location'],
                      'missing_reasons': {}})
    measurements = [cited(f'{m["label"]}' + (f' ({m["unit"]})' if m.get('unit') else ''), m['source_refs'])
                    for m in facts['measurement_types']]
    report = REPORT_DETAILS.get(sid)
    if report:
        revisions = {doc['id']: doc['content_hash'] for doc in documents}
        required = {report['document_id']: report['content_hash'], **report.get('supporting_documents', {})}
        if any(revisions.get(document_id) != expected for document_id, expected in required.items()):
            report = None
    report_limitations = []
    report_overview = []
    report_conditions = []
    report_findings = []
    report_materials = []
    if report:
        if report.get('replace_measurements'):
            measurements = []
        doc = next(doc for doc in documents if doc['id'] == report['document_id'])
        for key, target in [('measurements', measurements), ('limitations', report_limitations),
                            ('overview', report_overview), ('conditions', report_conditions),
                            ('findings', report_findings), ('materials', report_materials)]:
            for item in report.get(key, []):
                refs = item.get('source_refs') or [dict(document_id=doc['id'], source_url=doc['source_url'],
                                                       content_hash=doc['content_hash'], page=item.get('page'),
                                                       field=item.get('field', 'Source metadata'))]
                target.append(cited(item['text'], refs))
    reviewed = REVIEWED.get(sid)
    if reviewed and any(ref.get('content_hash') and not any(
            doc['id'] == ref.get('document_id') and doc['content_hash'] == ref['content_hash'] for doc in documents)
            for ref in reviewed['source_refs']):
        reviewed = None
    findings = ([dict(cited(reviewed['text'], reviewed['source_refs']),
                      id=f'{sid}-reviewed-finding', investigation_id=sid)] if reviewed else [])
    if report_findings:
        findings = [dict(item, id=f'{sid}-reviewed-finding-{index}', investigation_id=sid)
                    for index, item in enumerate(report_findings, 1)]
    equipment = EQUIPMENT_TOPICS.get(sid)
    design = report if report and 'design_question' in report else reviewed
    equipment_links = []
    if equipment and objectives and objectives[0]['citation_ids']:
        equipment_links = [{
            'id': f'{sid}-research-topic', 'investigation_id': sid, 'equipment_category': equipment,
            'design_question': design['design_question'] if design else f'Which test evidence can inform {EQUIPMENT_LABELS[equipment].lower()}?',
            'explanation': design['design_connection'] if design else 'The study objective is relevant to this equipment topic. Review the source conditions before applying the research.',
            'finding_ids': [item['id'] for item in findings[:2]],
            'limitations': [design['design_limit']] if design else ['Research relevance alone does not establish equipment performance.'],
            'citation_ids': findings[0]['citation_ids'] if findings else objectives[0]['citation_ids'],
        }]
    materials = report_materials or sections('sample_properties')
    if not materials:
        materials = sections('source_record_parameters', True,
                             {'material', 'fuel', 'fuel_bottle', 'fuel_description', 'sample_description'})
    source_notes = [cited(note['text'], [dict(document_id=note['document_id'], source_url=note['source_url'],
                                             content_hash=note['content_hash'], **note['location'])]) for note in notes]
    limitations = [cited(text) for text in facts['limitations']] + source_notes + report_limitations
    if report and report.get('reviewed_limitations_only'):
        limitations = report_limitations
    grouped_label = None
    if sid in {'PSI-20', 'PSI-21', 'PSI-23'}:
        grouped_label = 'Daily summaries'
    elif source_rows:
        grouped_label = 'Source records'
    elif record_counts.get('planned_record'):
        grouped_label = 'Planned profiles'
    if report and report.get('record_label'):
        grouped_label = report['record_label']
    record_description = ('Each row is a daily log entry, not one flame. Year, Month and Date identify the test day; Flames Ignited is the daily ignition count. The log includes a day with zero ignitions. Oxygen entries are approximate daily values, not exact conditions for each flame. The zero-ignition day is retained as reported; chamber pressures are not listed in this table.'
                          if sid == 'PSI-20' else report['record_description'] if report and report.get('record_description') else
                          'These source rows contain grouped descriptions or planned conditions, rather than individual completed tests.'
                          if grouped_label else 'The indexed sources contain no individual test records.')
    return {'investigation': {'id': sid, 'name': study['name'], 'acronym': study['metadata'].get('acronym') or sid,
                             'overview': study['description'] or (study['objective'] or '').split('\n')[0][:360],
                             'summary': study['description'], 'safety_topics': study_topics(study),
                             'materials': material_labels(rows), 'fuel_types': fuel_types(study),
                             'objectives': [item['text'] for item in objectives],
                             'measurement_types': [item['text'] for item in measurements],
                             'limitations': facts['limitations'], 'source_ids': [doc['id'] for doc in documents],
                             'hardware': study['metadata'].get('hardware'),
                             'citation': citation(sid),
                             'indexed_source_types': [dict(source_type=label, document_count=count)
                                                      for label, count in sorted(source_counts.items())],
                             **source_details(study)},
            'summary_sections': {'objectives': objectives, 'study_context': report_overview, 'materials': materials,
                                 'conditions': (report_conditions if report_conditions else
                                                sections('test_parameters') + sections('source_record_parameters', True)),
                                 'measurements': measurements, 'findings': findings,
                                 'limitations': limitations},
            'tests': tests, 'findings': findings, 'equipment_links': equipment_links, 'citations': list(citations.values()),
            'earth': study_earth(sid),
            'data_availability': {'numeric_test_count': sum(any(test[key] is not None for key in CONDITIONS) for test in tests),
                                  'source_row_count': table_rows,
                                  'reported_test_count': record_counts.get('reported_test', 0),
                                  'source_record_count': record_counts.get('source_record', 0),
                                  'planned_record_count': record_counts.get('planned_record', 0),
                                  'record_label': grouped_label,
                                  'record_description': record_description,
                                  'conditions_view': report.get('conditions_view') if report else None,
                                  'measurement_summary_status': 'available' if measurements else 'not_mapped',
                                  'unavailable_reason': None if tests else record_description}}


def register_dashboard(router, service, read, audience, respond):
    @router.get('/research/filters', dependencies=[Depends(read)])
    def filters(request: Request, audience_type=Depends(audience)):
        return respond(request, discover_filters(service().store), audience_type)

    @router.post('/research/relevance', dependencies=[Depends(read)])
    def relevance(body: ResearchRequest, request: Request, audience_type=Depends(audience)):
        return respond(request, find_research(service().store, body), audience_type)

    @router.get('/earth', dependencies=[Depends(read)])
    def earth(request: Request, audience_type=Depends(audience)):
        """Earth applications stated in the PSI records, grouped by theme. Needs no database."""
        return respond(request, earth_catalogue(), audience_type)

    @router.get('/gravity', dependencies=[Depends(read)])
    def gravity(request: Request, audience_type=Depends(audience)):
        """Partial-gravity evidence: Earth-comparison studies, simulated effects and NASA tests outside PSI."""
        return respond(request, gravity_catalogue(), audience_type)

    @router.get('/investigations/{study}/detail', dependencies=[Depends(read)])
    def detail(study: str, request: Request, audience_type=Depends(audience)):
        return respond(request, study_details(service(), study, audience_type), audience_type)
