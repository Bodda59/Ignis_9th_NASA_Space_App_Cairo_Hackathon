"""Investigation detail and crew-environment dashboard routes."""
from collections import Counter

from fastapi import Depends, Request

from dashboard.earth import citation, earth_catalogue, study_earth
from dashboard.gravity import gravity_catalogue
from dashboard.service import CatalogError
from data_pipeline.reviewed import REVIEWED
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
        documents = conn.execute('SELECT d.id,d.title,d.source_url,d.source_type,EXISTS (SELECT 1 FROM rag_passages p WHERE p.document_id=d.id) AS indexed FROM rag_documents d WHERE d.investigation_id=%s ORDER BY d.title,d.id',
                                 (sid,)).fetchall()
    source_counts = Counter(doc['source_type'] for doc in documents if doc['indexed'])
    study = studies[0]
    rows = grouped[sid]
    facts = summary['facts']
    citations = {doc['id']: {'id': doc['id'], 'source_id': doc['id'], 'title': doc['title'],
                             'url': doc['source_url'], 'location': 'Source document', 'source_type': 'psi'}
                 for doc in documents}

    def cited(text, refs=()):
        ids = []
        for ref in refs:
            doc = citations.get(ref.get('document_id'))
            location = f'CSV row {ref["csv_record"]}' if ref.get('csv_record') is not None else (
                f'Page {ref["page"]}' if ref.get('page') is not None else ref.get('field', 'Source metadata'))
            base = ref.get('document_id') or ref.get('source_url') or f'{sid}-metadata'
            ref_id = f'{base}:{location}'
            citations[ref_id] = {'id': ref_id, 'source_id': base, 'title': ref.get('title') or (doc or {}).get('title', 'NASA investigation metadata'),
                                 'url': ref.get('source_url') or (doc or {}).get('url'), 'location': location, 'source_type': 'psi'}
            ids.append(ref_id)
        return {'text': text, 'citation_ids': list(dict.fromkeys(ids))}

    def sections(name, prefix=False):
        entries = []
        for kind, fields in facts.get(name, {}).items():
            for field in fields:
                values, refs = [], []
                for item in field['values']:
                    v = item['value']
                    if v['category'] is not None:
                        value = v['category']
                    else:
                        value = f'{v["low"]:g}' if v['low'] == v['high'] else f'{v["low"]:g}–{v["high"]:g}'
                        value += f' {v["unit"]}' if v['unit'] else ''
                    values.append(value)
                    refs.extend(item['source_refs'][:1])
                label = (field['definition'] or {}).get('label', field['key'].replace('_', ' '))
                status = 'Source records · ' if prefix else ''
                count = field['distinct_value_count']
                values_text = ', '.join(values) or 'No usable value'
                if count > len(values):
                    values_text += f' and {count - len(values)} more'
                entries.append(cited(f'{status}{label} · {kind} · {values_text}', refs[:4]))
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
    reviewed = REVIEWED.get(sid)
    findings = ([dict(cited(reviewed['text'], reviewed['source_refs']),
                      id=f'{sid}-reviewed-finding', investigation_id=sid)] if reviewed else [])
    equipment = EQUIPMENT_TOPICS.get(sid)
    equipment_links = []
    if equipment and objectives and objectives[0]['citation_ids']:
        equipment_links = [{
            'id': f'{sid}-research-topic', 'investigation_id': sid, 'equipment_category': equipment,
            'design_question': reviewed['design_question'] if reviewed else f'Which test evidence can inform {EQUIPMENT_LABELS[equipment].lower()}?',
            'explanation': reviewed['design_connection'] if reviewed else 'The study objective is relevant to this equipment topic. Review the source conditions before applying the research.',
            'finding_ids': [item['id'] for item in findings],
            'limitations': [reviewed['design_limit']] if reviewed else ['Research relevance alone does not establish equipment performance.'],
            'citation_ids': findings[0]['citation_ids'] if findings else objectives[0]['citation_ids'],
        }]
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
            'summary_sections': {'objectives': objectives, 'materials': sections('sample_properties'),
                                 'conditions': sections('test_parameters') + sections('source_record_parameters', True),
                                 'measurements': measurements, 'findings': findings,
                                 'limitations': [cited(text) for text in facts['limitations']]},
            'tests': tests, 'findings': findings, 'equipment_links': equipment_links, 'citations': list(citations.values()),
            'earth': study_earth(sid),
            'data_availability': {'numeric_test_count': sum(any(test[key] is not None for key in CONDITIONS) for test in tests),
                                  'unavailable_reason': None if tests else 'This source table contains grouped or planned records.'}}


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
