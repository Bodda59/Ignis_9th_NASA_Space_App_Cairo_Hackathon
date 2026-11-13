from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, field_validator, model_validator
from psycopg.types.json import Jsonb
from rag.models import Query
from dashboard.audience import AudiencePreferences
from data_pipeline.storage import vector_literal


class ScenarioInputError(ValueError):
    pass


class ConditionRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    key: str = Field(pattern=r'^[a-z][a-z0-9_]{0,63}$')
    value: str | None = Field(default=None, min_length=1, max_length=300)
    minimum: FiniteFloat | None = None
    maximum: FiniteFloat | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=30)

    @model_validator(mode='after')
    def valid_selection(self):
        if self.value is not None:
            if self.minimum is not None or self.maximum is not None or self.unit is not None:
                raise ValueError('A category selection only accepts value.')
            self.value = ' '.join(self.value.casefold().split())
        elif self.minimum is None or self.maximum is None or not self.unit or self.minimum > self.maximum:
            raise ValueError('A numeric selection requires ordered minimum/maximum and a unit.')
        return self


class ScenarioScope(AudiencePreferences):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    investigation_ids: list[str] = Field(default_factory=list, max_length=20,
        description='One ID for an investigation page; omit or send [] for all indexed investigations. Applies to conditions, options, ranking and answers.')

    @field_validator('investigation_ids')
    @classmethod
    def ids(cls, values):
        return Query.valid_ids(values)


class ScenarioOptions(ScenarioScope):
    conditions: list[ConditionRequest] = Field(default_factory=list, max_length=8)

    @field_validator('conditions')
    @classmethod
    def unique_conditions(cls, values):
        if len({x.key for x in values}) != len(values):
            raise ValueError('Each condition key may appear only once.')
        return values


class ScenarioQuery(ScenarioOptions):
    question: str = Field(default='', max_length=2000)
    conditions: list[ConditionRequest] = Field(min_length=1, max_length=8)
    include_analogues: bool = False
    limit: int = Field(default=5, ge=1, le=20)


class ScenarioCompare(BaseModel):
    model_config = ConfigDict(extra='forbid')
    before: ScenarioQuery
    after: ScenarioQuery


class ScenarioQuestion(ScenarioQuery):
    question: str = Field(min_length=1, max_length=2000)


def compare_condition(request, value):
    result = {'key': request.key, 'requested': request.model_dump(exclude_none=True),
              'reported': value, 'status': 'unknown'}
    if not value or value['state'] != 'usable':
        result['reason'] = 'Not reported in this record.' if not value else f'Source value is {value["state"]}.'
    elif request.value is not None:
        result['status'] = 'match' if value.get('category') == request.value else 'mismatch'
        result['reason'] = 'Comparison of normalized reported categories.'
    elif value.get('low') is None:
        result['reason'] = 'A numeric value is not available.'
    else:
        low, high = value['low'], value['high']
        if low >= request.minimum - 1e-9 and high <= request.maximum + 1e-9:
            result['status'] = 'match'
            result['reason'] = 'The entire reported value/range lies within your requested range.'
        elif high >= request.minimum and low <= request.maximum:
            result['status'] = 'overlap'
            result['reason'] = 'Ranges overlap; this does not establish the exact requested condition.'
        else:
            result['status'] = 'mismatch'
            result['reason'] = 'Reported values fall outside your requested range.'
    return result


MATCHES_REQUEST = '''v.state='usable' AND (
    (q.category IS NOT NULL AND v.category=q.category)
    OR (q.category IS NULL AND v.low>=q.low-1e-9 AND v.high<=q.high+1e-9))'''


WARNINGS = [
    'Matches describe reported source records, not validated fire safety or predictions.',
    'Ranges do not establish every intermediate value or every simultaneous operating point.',
    'Different tests, planned requirements, and missing values are never combined into a confirmed match.',
]


class ScenarioSearch:
    def __init__(self, store, embeddings_factory, model_name):
        self.store, self.embeddings_factory, self.model_name = store, embeddings_factory, model_name

    def _scope(self, connection, selected):
        if selected:
            rows = connection.execute('SELECT id FROM rag_investigations WHERE id=ANY(%s)', (selected,)).fetchall()
            if {x['id'] for x in rows} != set(selected):
                raise ScenarioInputError('One or more selected investigation IDs do not exist.')

    def catalogue(self, scope):
        with self.store.connect() as connection:
            self._scope(connection, scope.investigation_ids)
            fields = connection.execute('''SELECT f.*,count(*) AS reported_records,
                count(*) FILTER(WHERE v.state='usable') AS usable_records,
                min(v.low) AS observed_minimum,max(v.high) AS observed_maximum,
                (array_agg(DISTINCT v.category ORDER BY v.category) FILTER(WHERE v.category IS NOT NULL))[1:100] AS categories
                FROM rag_scenario_values v JOIN rag_scenario_fields f ON f.key=v.field_key
                JOIN rag_scenario_records r ON r.id=v.record_id JOIN rag_passages p ON p.id=r.passage_id
                JOIN rag_documents d ON d.id=p.document_id
                WHERE r.record_kind<>'planned_record' AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                GROUP BY f.key ORDER BY f.label''', (scope.investigation_ids or None, scope.investigation_ids or None)).fetchall()
            studies = connection.execute('''SELECT i.id,i.name,count(DISTINCT d.id) AS documents,
                count(DISTINCT r.id) FILTER(WHERE r.record_kind<>'planned_record') AS scenario_records
                FROM rag_investigations i LEFT JOIN rag_documents d ON d.investigation_id=i.id
                LEFT JOIN rag_passages p ON p.document_id=d.id LEFT JOIN rag_scenario_records r ON r.passage_id=p.id
                WHERE (%s::text[] IS NULL OR i.id=ANY(%s)) GROUP BY i.id ORDER BY i.id LIMIT 1000''',
                (scope.investigation_ids or None, scope.investigation_ids or None)).fetchall()
            profiles = connection.execute('''SELECT d.id AS document_id,d.investigation_id,d.file_name,s.diagnostics
                FROM rag_documents d JOIN rag_scenario_profiles s ON s.document_id=d.id
                WHERE lower(d.file_name) LIKE '%%.csv' AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                ORDER BY d.id LIMIT 100''', (scope.investigation_ids or None, scope.investigation_ids or None)).fetchall()
            sets = connection.execute('''SELECT keys,count(*) AS records FROM (
                SELECT r.id,array_agg(v.field_key ORDER BY v.field_key) AS keys FROM rag_scenario_records r
                JOIN rag_scenario_values v ON v.record_id=r.id AND v.state='usable'
                JOIN rag_passages p ON p.id=r.passage_id JOIN rag_documents d ON d.id=p.document_id
                WHERE r.record_kind<>'planned_record' AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                GROUP BY r.id) combinations GROUP BY keys ORDER BY count(*) DESC,keys LIMIT 100''',
                (scope.investigation_ids or None, scope.investigation_ids or None)).fetchall()
        return {'fields': fields, 'investigations': studies, 'condition_sets': sets, 'imports': profiles,
                'warnings': WARNINGS, 'limits': {'category_values_per_field': 100, 'condition_sets': 100, 'import_diagnostics': 100}}

    def _validate(self, conditions, fields):
        by_key = {x['key']: x for x in fields}
        for item in conditions:
            field = by_key.get(item.key)
            if not field:
                continue
            if (field['kind'] == 'category') != (item.value is not None):
                raise ScenarioInputError(f'Condition {item.key} has the wrong value type.')
            if field['kind'] == 'number':
                if item.unit != field['unit']:
                    raise ScenarioInputError(f'Condition {item.key} expects unit {field["unit"]}.')
                if ((field['minimum'] is not None and item.minimum < field['minimum'])
                        or (field['maximum'] is not None and item.maximum > field['maximum'])):
                    raise ScenarioInputError(f'Condition {item.key} is outside the defined physical bounds.')

    def _requests(self, conditions):
        return Jsonb([{'key': x.key, 'low': x.minimum, 'high': x.maximum, 'category': x.value} for x in conditions])

    def options(self, query):
        catalog = self.catalogue(query)
        self._validate(query.conditions, catalog['fields'])
        with self.store.connect() as connection:
            rows = connection.execute('''WITH requested AS (
                SELECT * FROM jsonb_to_recordset(%s) AS x(key text,low float8,high float8,category text)),
                eligible AS (SELECT r.id FROM rag_scenario_records r JOIN rag_passages p ON p.id=r.passage_id
                  JOIN rag_documents d ON d.id=p.document_id WHERE r.record_kind<>'planned_record'
                  AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                  AND NOT EXISTS(SELECT 1 FROM requested q WHERE NOT EXISTS(
                    SELECT 1 FROM rag_scenario_values v WHERE v.record_id=r.id AND v.field_key=q.key AND v.state='usable'
                    AND ((q.category IS NOT NULL AND v.category=q.category) OR
                         (q.category IS NULL AND v.low>=q.low-1e-9 AND v.high<=q.high+1e-9)))))
                SELECT v.field_key,count(*) AS compatible_records,min(v.low) AS observed_minimum,max(v.high) AS observed_maximum,
                (array_agg(DISTINCT v.category ORDER BY v.category) FILTER(WHERE v.category IS NOT NULL))[1:100] AS categories
                FROM eligible e JOIN rag_scenario_values v ON v.record_id=e.id AND v.state='usable'
                GROUP BY v.field_key ORDER BY v.field_key''',
                (self._requests(query.conditions), query.investigation_ids or None, query.investigation_ids or None)).fetchall()
        compatible = {x['field_key']: x for x in rows}
        catalog['fields'] = [dict(f, compatible=compatible.get(f['key'], {'compatible_records': 0})) for f in catalog['fields']]
        catalog['status'] = 'ok' if rows else 'no_compatible_records'
        return catalog

    def _evidence_map(self, connection, query, fields):
        # Use the full scope, before relevance ranking and its per-investigation limit.
        matches = connection.execute(f'''WITH requested AS (
            SELECT * FROM jsonb_to_recordset(%s) AS x(key text,low float8,high float8,category text)),
            matched AS (
                SELECT q.key,r.id,r.passage_id,r.external_id
                FROM requested q JOIN rag_scenario_values v ON v.field_key=q.key
                JOIN rag_scenario_records r ON r.id=v.record_id
                JOIN rag_passages p ON p.id=r.passage_id JOIN rag_documents d ON d.id=p.document_id
                WHERE r.record_kind='reported_test' AND {MATCHES_REQUEST}
                AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))),
            totals AS (SELECT id,count(*) AS matched_conditions FROM matched GROUP BY id),
            examples AS (
                SELECT m.*,count(*) OVER(PARTITION BY m.key) AS matching_records,
                    count(*) FILTER(WHERE t.matched_conditions=(SELECT count(*) FROM requested))
                        OVER(PARTITION BY m.key) AS joint_records,
                    row_number() OVER(PARTITION BY m.key ORDER BY t.matched_conditions DESC,m.id) AS choice
                FROM matched m JOIN totals t USING(id))
            SELECT e.key,e.matching_records,e.joint_records,e.external_id AS test_id,
                p.id AS passage_id,p.document_id,p.location,p.text,d.title,d.source_url,
                d.investigation_id,i.name AS investigation_name
            FROM examples e JOIN rag_passages p ON p.id=e.passage_id
            JOIN rag_documents d ON d.id=p.document_id JOIN rag_investigations i ON i.id=d.investigation_id
            WHERE e.choice=1''',
            (self._requests(query.conditions), query.investigation_ids or None, query.investigation_ids or None)).fetchall()
        examples = {row['key']: row for row in matches}
        labels = {field['key']: field['label'] for field in fields}
        conditions = []
        for condition in query.conditions:
            example = examples.get(condition.key)
            status = ('tested_together' if example and example['joint_records'] else
                      'tested_separately' if example else 'no_matching_record')
            conditions.append({
                'condition': condition.model_dump(exclude_none=True),
                'label': labels.get(condition.key, condition.key.replace('_', ' ')),
                'status': status,
                'matching_records': example['matching_records'] if example else 0,
                'example': {key: example[key] for key in (
                    'test_id', 'passage_id', 'document_id', 'title', 'source_url', 'location', 'text',
                    'investigation_id', 'investigation_name',
                )} if example else None,
            })
        return {'joint_records': matches[0]['joint_records'] if matches else 0, 'conditions': conditions}

    def rank(self, query):
        catalog = self.catalogue(query)
        self._validate(query.conditions, catalog['fields'])
        available = {x['key'] for x in catalog['fields'] if x['usable_records']}
        unsupported = [x.key for x in query.conditions if x.key not in available]
        result = {'status': 'ok', 'investigations': [], 'unsupported_conditions': unsupported,
                  'coverage': {}, 'warnings': WARNINGS}
        has_records = any(x['scenario_records'] for x in catalog['investigations'])
        if not has_records or (unsupported and not query.include_analogues):
            with self.store.connect() as connection:
                result['evidence_map'] = self._evidence_map(connection, query, catalog['fields'])
            if not has_records:
                return dict(result, status='no_scenario_data', message='General search is available, but this scope has no indexed experimental conditions.')
            return dict(result, status='unsupported_conditions', message='These conditions are not reported with usable values in this scope; they are not scientifically invalid.')
        vector = None
        if query.question:
            vector = vector_literal(self.embeddings_factory().embed_query(query.question))
        with self.store.connect() as connection:
            result['evidence_map'] = self._evidence_map(connection, query, catalog['fields'])
            if vector is not None:
                other = connection.execute('''SELECT 1 FROM rag_documents d JOIN rag_passages p ON p.document_id=d.id
                    JOIN rag_scenario_records r ON r.passage_id=p.id WHERE d.embedding_model<>%s
                    AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s)) LIMIT 1''',
                    (self.model_name, query.investigation_ids or None, query.investigation_ids or None)).fetchone()
                if other:
                    raise ScenarioInputError('The selected records use a different embedding model; reindex before semantic scenario search.')
            params = (self._requests(query.conditions), query.question, query.question, vector, vector,
                      query.investigation_ids or None, query.investigation_ids or None)
            base = f'''WITH requested AS (SELECT * FROM jsonb_to_recordset(%s) AS x(key text,low float8,high float8,category text)),
                compared AS (SELECT r.id,r.external_id,r.record_kind,p.id AS passage_id,p.document_id,p.text,p.location,
                  d.investigation_id,i.name,d.title,d.source_url,d.content_hash,
                  ts_rank_cd(to_tsvector('english',p.text),websearch_to_tsquery('english',%s)) AS lexical,
                  CASE WHEN %s='' THEN NULL ELSE 1-(p.embedding <=> %s::vector) END AS similarity,
                  %s::vector AS query_vector,
                  count(*) FILTER(WHERE v.state='usable') AS known,
                  count(*) FILTER(WHERE {MATCHES_REQUEST}) AS matches,
                  (SELECT count(*) FROM requested) AS needed
                FROM rag_scenario_records r JOIN rag_passages p ON p.id=r.passage_id
                JOIN rag_documents d ON d.id=p.document_id JOIN rag_investigations i ON i.id=d.investigation_id
                CROSS JOIN requested q LEFT JOIN rag_scenario_values v ON v.record_id=r.id AND v.field_key=q.key
                WHERE r.record_kind<>'planned_record' AND (%s::text[] IS NULL OR d.investigation_id=ANY(%s))
                GROUP BY r.id,p.id,d.id,i.id),
                categorized AS (SELECT *,CASE WHEN matches=needed THEN 0 WHEN known=matches THEN 1 ELSE 2 END AS tier
                    FROM compared),
                fused AS (SELECT *,CASE WHEN query_vector IS NULL THEN 0 ELSE
                    1.0/(60+row_number() OVER(ORDER BY similarity DESC NULLS LAST,id)) END
                    + CASE WHEN lexical>0 THEN 1.0/(60+row_number() OVER(ORDER BY lexical DESC,id)) ELSE 0 END AS relevance
                    FROM categorized)'''
            coverage = connection.execute(base + ''' SELECT count(*) AS source_records,
                count(*) FILTER(WHERE known=needed) AS records_with_all_requested_conditions,
                count(*) FILTER(WHERE matches=needed) AS records_matching_all_conditions FROM fused''', params).fetchone()
            rows = connection.execute(base + ''', ordered AS (SELECT *,row_number() OVER(PARTITION BY investigation_id
                ORDER BY tier,matches DESC,known DESC,relevance DESC,id) AS within_study FROM fused
                WHERE known>0 AND (%s OR tier=0)),
                best AS (SELECT investigation_id,row_number() OVER(ORDER BY tier,matches DESC,known DESC,relevance DESC,id) AS study_rank
                    FROM ordered WHERE within_study=1 ORDER BY tier,matches DESC,known DESC,relevance DESC,id LIMIT %s)
                SELECT o.*,b.study_rank FROM ordered o JOIN best b USING(investigation_id)
                WHERE o.within_study<=3 ORDER BY b.study_rank,o.within_study''',
                params + (query.include_analogues, query.limit)).fetchall()
            values = []
            if rows:
                values = connection.execute('''SELECT v.*,f.label,f.unit,f.kind FROM rag_scenario_values v
                    JOIN rag_scenario_fields f ON f.key=v.field_key WHERE v.record_id=ANY(%s) ORDER BY v.field_key''',
                    ([r['id'] for r in rows],)).fetchall()
        result['coverage'] = coverage
        if unsupported:
            result['status'] = 'unsupported_conditions'
        elif not coverage['records_with_all_requested_conditions']:
            result['status'] = 'unsupported_combination'
        elif not coverage['records_matching_all_conditions']:
            result['status'] = 'no_matching_tests'
        groups = {}
        for row in rows:
            reported = {v['field_key']: {k: val for k, val in v.items() if k != 'record_id'}
                        for v in values if v['record_id'] == row['id']}
            comparisons = [compare_condition(c, reported.get(c.key)) for c in query.conditions]
            record = {'record_id': row['id'], 'test_id': row['external_id'], 'record_kind': row['record_kind'],
                      'category': ['reported_conditions_match','incomplete_metadata','related_analogue'][row['tier']],
                      'comparisons': comparisons, 'reported_conditions': reported,
                      'relevance_score': float(row['relevance']), 'semantic_similarity': row['similarity'],
                      'source': {k: row[k] for k in ['passage_id','document_id','title','source_url','content_hash','location','text']}}
            if row['investigation_id'] not in groups:
                groups[row['investigation_id']] = {'investigation_id': row['investigation_id'], 'name': row['name'],
                    'rank': row['study_rank'], 'best_category': record['category'], 'records': []}
            groups[row['investigation_id']]['records'].append(record)
        result['investigations'] = list(groups.values())
        result['message'] = {'ok': 'Matching reported records found.',
            'unsupported_conditions': 'Some requested conditions are not reported in this scope.',
            'unsupported_combination': 'No single indexed record reports all requested conditions together.',
            'no_matching_tests': 'No indexed record matches all requested values or ranges.'}[result['status']]
        return result

    def compare(self, query):
        before, after = self.rank(query.before), self.rank(query.after)
        old = {x['investigation_id']: x for x in before['investigations']}
        new = {x['investigation_id']: x for x in after['investigations']}
        changes = []
        for id in sorted(set(old) | set(new)):
            a, b = old.get(id), new.get(id)
            changes.append({'investigation_id': id, 'before_rank': a['rank'] if a else None,
                'after_rank': b['rank'] if b else None,
                'before_category': a['best_category'] if a else None, 'after_category': b['best_category'] if b else None,
                'before_record': a['records'][0]['test_id'] if a else None,
                'after_record': b['records'][0]['test_id'] if b else None})
        return {'before': before, 'after': after, 'changes': changes,
                'changed_inputs': [key for key in ScenarioQuery.model_fields if query.before.model_dump()[key] != query.after.model_dump()[key]],
                'warning': 'Changes explain search results, not changes in actual fire behavior.'}
