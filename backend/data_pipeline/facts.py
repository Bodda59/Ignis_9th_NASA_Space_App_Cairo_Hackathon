"""Deterministic facts retain coverage, type, units, and source identity."""
import hashlib
import json
import re
from collections import Counter

VERSION = 'catalog-v1'
SAMPLE_KEYS = {'material', 'geometry', 'sample_length_mm', 'sample_width_mm', 'sample_thickness_mm',
               'droplet_initial_diameter_mm'}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def aggregate(records):
    fields = sorted({key for record in records for key in record['parameters']})
    result = {'shared': [], 'varying': [], 'unknown': []}
    for key in fields:
        reported = {}
        states = Counter()
        definition = None
        for record in records:
            value = record['parameters'].get(key)
            if not value or value['state'] != 'usable':
                states[value['state'] if value else 'missing'] += 1
                continue
            definition = value['field']
            canonical = {'category': value.get('category'), 'low': value.get('low'),
                         'high': value.get('high'), 'unit': definition.get('unit')}
            signature = digest(canonical)
            item = reported.setdefault(signature, {'value': canonical, 'count': 0, 'source_refs': []})
            item['count'] += 1
            if len(item['source_refs']) < 3:
                item['source_refs'].append(record['source'])
        values = sorted(reported.values(), key=lambda item: json.dumps(item['value'], sort_keys=True))
        field = {'key': key, 'definition': definition, 'values': values,
                 'total_records': len(records), 'reported_records': sum(v['count'] for v in values),
                 'missing_or_unusable': dict(states)}
        group = 'unknown' if not values else 'shared' if len(values) == 1 and not states else 'varying'
        if len(values) == 1 and states:
            group = 'unknown'
            field['note'] = 'One reported value; incomplete coverage prevents declaring it shared.'
        result[group].append(field)
    return result


def build_facts(study, records, measurements, row_count):
    tests = [r for r in records if r['record_kind'] == 'reported_test']
    summaries = [r for r in records if r['record_kind'] == 'source_record']
    return {
        'objective': {'text': study['objective'] or None,
                      'source_refs': study['field_sources'].get('objective', []),
                      'status': 'reported' if study['objective'] else 'not_reported'},
        'sample_properties': aggregate([
            dict(r, parameters={k: v for k, v in r['parameters'].items() if k in SAMPLE_KEYS}) for r in tests
        ]),
        'test_parameters': aggregate(tests),
        'source_record_parameters': aggregate(summaries),
        'measurement_types': measurements,
        'coverage': {'test_count': len(tests) if tests else None, 'source_record_count': len(summaries),
                     'planned_record_count': sum(r['record_kind'] == 'planned_record' for r in records),
                     'table_row_count': row_count},
        'limitations': ['Counts describe source records; repeated identifiers across documents may describe the same physical test.',
                        'Unmapped columns remain available in the original tables.'],
    }


def compare_facts(summaries):
    shared, differences = [], []
    keys = set()
    per_study = {}
    for study, facts in summaries.items():
        fields = {f['key']: f for group in facts['test_parameters'].values() for f in group}
        per_study[study] = fields
        keys.update(fields)
    for key in sorted(keys):
        values = {study: fields.get(key) for study, fields in per_study.items()}
        signatures = [
            digest([v['value'] for v in field['values']])
            if field and field['values'] and not field['missing_or_unusable'] else None
            for field in values.values()
        ]
        item = {'key': key, 'investigations': values}
        (shared if None not in signatures and len(set(signatures)) == 1 else differences).append(item)
    measurement_sets = [{m['key'] for m in facts['measurement_types']} for facts in summaries.values()]
    return {'investigation_ids': sorted(summaries),
            'objectives': {sid: facts['objective'] for sid, facts in summaries.items()},
            'test_designs': {'shared': shared, 'differences': differences},
            'sample_properties': {'shared': [item for item in shared if item['key'] in SAMPLE_KEYS],
                                  'differences': [item for item in differences if item['key'] in SAMPLE_KEYS],
                                  'by_investigation': {sid: facts['sample_properties'] for sid, facts in summaries.items()}},
            'measurement_types': {'shared_keys': sorted(set.intersection(*measurement_sets)),
                                  'by_investigation': {sid: f['measurement_types'] for sid, f in summaries.items()},
                                  'unique_by_investigation': {
                                      sid: sorted({m['key'] for m in facts['measurement_types']} -
                                                  set.union(*[s for index, s in enumerate(measurement_sets)
                                                              if index != position]))
                                      for position, (sid, facts) in enumerate(summaries.items())}},
            'coverage': {sid: f['coverage'] for sid, f in summaries.items()},
            'limitations': ['Matching reported properties do not establish equivalent experimental designs.',
                            'Objectives are compared using their reported text; scientific equivalence requires review.']}


def tokens(text):
    return re.findall(r'[\w-]+', text.casefold(), flags=re.UNICODE)


def search_score(title, objective, description, other, query, lexical, fuzzy, prefix):
    """Exact IDs are handled by the caller. Components are bounded before fusion."""
    phrase = query.strip(' "').casefold()
    exact = 1 if title.casefold() == phrase else 0
    phrase_boost = sum(weight for value, weight in [(title, 8), (objective, 5), (description, 3), (other, 1)]
                       if phrase and phrase in value.casefold())
    return exact * 100 + phrase_boost + min(float(lexical), 1) * 8 + float(fuzzy) * 3 + float(prefix)
