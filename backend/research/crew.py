"""Crew environment relevance from published investigation and test records."""
import threading
import time
from collections import defaultdict
from typing import Literal
from weakref import WeakKeyDictionary

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

from dashboard.gravity import EARTH_COMPARISON_IDS
from research.catalog_search import rank_candidates, search_candidates, query_words

Topic = Literal['prevention', 'detection', 'suppression']
Habitat = Literal['spacecraft', 'space_station', 'lunar_base', 'mars_base', 'pressurized_rover']
Gravity = Literal['microgravity', 'normal_gravity', 'partial_gravity', 'simulated_effect', 'unknown']
Equipment = Literal['smoke_detection', 'suppression', 'material_controls']

HABITATS = {
    'spacecraft': 'Spacecraft', 'space_station': 'Space station', 'lunar_base': 'Lunar base',
    'mars_base': 'Mars base', 'pressurized_rover': 'Pressurized rover',
}
TOPICS = {
    'material_flammability': ('prevention',), 'spacecraft_fire_spread': ('prevention',),
    'smoke_and_fire_detection': ('detection',), 'fire_suppression_and_extinction': ('suppression',),
}
# These links describe research topics, with source documents listed alongside each study.
EQUIPMENT_TOPICS = {
    'PSI-23': 'suppression',
    'PSI-10': 'suppression',
    'PSI-21': 'suppression',
    'PSI-159': 'suppression',
    'PSI-115': 'smoke_detection', 'PSI-106': 'smoke_detection', 'PSI-107': 'smoke_detection', 'PSI-47': 'smoke_detection', 'PSI-101': 'smoke_detection', 'PSI-102': 'smoke_detection',
    'PSI-142': 'suppression', 'PSI-117': 'suppression', 'PSI-68': 'suppression', 'PSI-39': 'suppression', 'PSI-69': 'suppression', 'PSI-20': 'material_controls', 'PSI-25': 'material_controls',
    'PSI-26': 'material_controls', 'PSI-98': 'material_controls', 'PSI-99': 'material_controls',
    'PSI-100': 'material_controls', 'PSI-62': 'material_controls',
}
EQUIPMENT_LABELS = {'smoke_detection': 'Smoke detection', 'suppression': 'Suppression',
                    'material_controls': 'Material controls'}
CONDITIONS = {
    'oxygen_pct': (('initial_oxygen_percent', 'oxygen_percent'), '%', 1),
    'pressure_kpa': (('pressure_kpa', 'initial_pressure_kpa'), 'kPa', 1),
    'airflow_m_s': (('airflow_cm_s',), 'm/s', .01),
}
SAFFIRE = {'PSI-98', 'PSI-99', 'PSI-100'}
ORBITAL_STUDIES = {
    'PSI-10', 'PSI-20', 'PSI-21', 'PSI-22', 'PSI-23', 'PSI-25', 'PSI-26', 'PSI-39', 'PSI-47',
    'PSI-68', 'PSI-69', 'PSI-101', 'PSI-102', 'PSI-106', 'PSI-107', 'PSI-159',
}


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Range(Input):
    min: FiniteFloat | None = Field(default=None, ge=0)
    max: FiniteFloat | None = Field(default=None, ge=0)

    @model_validator(mode='after')
    def ordered(self):
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError('The minimum must be at most the maximum.')
        return self


class Filters(Input):
    safety_topics: list[Topic] = Field(default_factory=list, max_length=3)
    materials: list[str] = Field(default_factory=list, max_length=50)
    fuel_types: list[str] = Field(default_factory=list, max_length=50)
    gravity_regimes: list[Gravity] = Field(default_factory=list, max_length=5)
    equipment_categories: list[Equipment] = Field(default_factory=list, max_length=3)
    oxygen_pct: Range | None = None
    pressure_kpa: Range | None = None
    airflow_m_s: Range | None = None


class Context(Input):
    habitat: Habitat | None = None
    safety_concern: Topic | None = None
    material: str | None = Field(default=None, max_length=120)
    oxygen_pct: FiniteFloat | None = Field(default=None, ge=0, le=100)
    pressure_kpa: FiniteFloat | None = Field(default=None, gt=0)
    airflow_m_s: FiniteFloat | None = Field(default=None, ge=0)
    gravity_regime: Gravity | None = None


class ResearchRequest(Input):
    query: str = Field(default='', max_length=300)
    filters: Filters = Field(default_factory=Filters)
    context: Context = Field(default_factory=Context)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=8, ge=1, le=100)


def usable(parameters, key):
    value = parameters.get(key) or {}
    return value if value.get('state') == 'usable' else {}


def condition_value(parameters, field):
    keys, _, scale = CONDITIONS[field]
    for key in keys:
        value = usable(parameters, key)
        if value.get('low') is not None and value.get('high') is not None:
            return value['low'] * scale, value['high'] * scale
    return None


def record_matches(row, material, bounds, *, overlap=False):
    parameters = row['parameters']
    if material and not ({usable(parameters, k).get('category') for k in ('material', 'fuel')} & material):
        return False
    for field, requested in bounds.items():
        low, high = requested.min if requested.min is not None else 0, requested.max
        measured = condition_value(parameters, field)
        if measured is None:
            return False
        if overlap:
            if measured[1] < low - 1e-9 or (high is not None and measured[0] > high + 1e-9):
                return False
        elif measured[0] < low - 1e-9 or (high is not None and measured[1] > high + 1e-9):
            return False
    return True


def study_topics(study):
    result = {topic for category in study['metadata'].get('categories', []) for topic in TOPICS.get(category, ())}
    if study['id'] in {'PSI-39', 'PSI-68', 'PSI-159'}:
        result.add('suppression')  # extinction and droplet combustion background
    if study['id'] in {'PSI-10', 'PSI-21', 'PSI-22', 'PSI-106'}:
        result.add('prevention')  # fundamental flame behavior
    if study['id'] == 'PSI-10':
        result.add('detection')  # soot inception and control
    return sorted(result)


def study_gravities(study):
    gravity = set(study['metadata'].get('gravity_environments', []))
    if study['id'] in ORBITAL_STUDIES | SAFFIRE:
        gravity.add('microgravity')
    if study['id'] in EARTH_COMPARISON_IDS:
        gravity.add('normal_gravity')  # Earth-gravity comparison evidence (see dashboard/gravity.py)
    if study['id'] == 'PSI-22':
        gravity.add('simulated_effect')
    return gravity or {'unknown'}


def catalog_data(conn, ids=None):
    studies = conn.execute('''SELECT i.id,i.name,i.description,i.objective,i.metadata,i.field_sources,
        (SELECT count(*) FROM rag_documents d WHERE d.investigation_id=i.id) AS source_count
        FROM rag_investigations i WHERE (%s::text[] IS NULL OR i.id=ANY(%s)) ORDER BY i.name,i.id''',
        (ids, ids)).fetchall()
    tests = conn.execute('''SELECT investigation_id,id,external_id,parameters,source,record_kind FROM investigation_tests
        WHERE record_kind<>'planned_record' AND (%s::text[] IS NULL OR investigation_id=ANY(%s))
        ORDER BY document_id,(source->>'csv_record')::integer,id''', (ids, ids)).fetchall()
    by_study = defaultdict(list)
    for row in tests:
        by_study[row['investigation_id']].append(row)
    return studies, by_study


# shortcut: one process holds the catalog; a metadata edit reaches search and filters within CATALOG_SECONDS.
CATALOG_SECONDS = 60
_catalogs, _catalog_lock = WeakKeyDictionary(), threading.Lock()


def cached_catalog(store, ids=None, conn=None):
    """The whole catalog from memory, narrowed to `ids`. It is re-read once it is CATALOG_SECONDS old."""
    with _catalog_lock:
        entry = _catalogs.get(store)
        if not entry or time.monotonic() - entry[0] >= CATALOG_SECONDS:
            if conn is not None:
                data = catalog_data(conn)
            else:
                with store.connect() as connection:
                    data = catalog_data(connection)
            entry = _catalogs[store] = (time.monotonic(), data)
    studies, by_study = entry[1]
    if ids is None:
        return studies, by_study
    wanted = set(ids)
    return ([study for study in studies if study['id'] in wanted],
            defaultdict(list, {sid: rows for sid, rows in by_study.items() if sid in wanted}))


def material_labels(rows):
    return sorted({value for row in rows for key in ('material', 'fuel')
                   if (value := usable(row['parameters'], key).get('category'))})


def fuel_types(study):
    reported = study['metadata'].get('fuel_types', [])
    if reported:
        return reported
    if study['id'] in {'PSI-25', 'PSI-26'} | SAFFIRE:
        return ['solid']
    if study['id'] in {'PSI-39', 'PSI-68', 'PSI-69'}:
        return ['liquid']
    if study['id'] in {'PSI-10', 'PSI-20', 'PSI-21', 'PSI-22', 'PSI-23', 'PSI-106', 'PSI-107', 'PSI-159'}:
        return ['gas']
    return []


def habitat_relevance(study, rows, context):
    """Score evidence relevance, with every requested condition evaluated on the same record."""
    reasons, gaps, score = [], [], 0
    sid = study['id']
    habitat = context.habitat
    if habitat:
        if (habitat == 'spacecraft' and sid in SAFFIRE) or (habitat == 'space_station' and sid in ORBITAL_STUDIES):
            reasons.append({'kind': 'habitat', 'text': f'Flight evidence from a {HABITATS[habitat].lower()} platform.'})
            score += 8
        elif habitat in {'spacecraft', 'space_station'} and 'microgravity' in study_gravities(study):
            reasons.append({'kind': 'habitat', 'text': 'Related microgravity evidence from another flight platform.'})
            score += 3
        else:
            gaps.append({'kind': 'gravity', 'text': f'No indexed test from this study verifies the gravity of the selected {HABITATS[habitat].lower()}.'})
            if sid == 'PSI-22':
                reasons.append({'kind': 'gravity', 'text': 'Electric fields mimicked some buoyancy effects during a microgravity test.'})
                score += 2
    if context.safety_concern:
        if context.safety_concern in study_topics(study):
            reasons.append({'kind': 'topic', 'text': f'Related to {context.safety_concern} research.'})
            score += 9
        else:
            gaps.append({'kind': 'topic', 'text': 'The selected safety concern is outside this study’s catalog topics.'})
    if context.gravity_regime and context.gravity_regime not in study_gravities(study):
        gaps.append({'kind': 'gravity', 'text': 'The requested gravity regime is absent from this investigation’s catalog tags.'})
    points = {key: Range(min=value, max=value) for key in CONDITIONS
              if (value := getattr(context, key)) is not None}
    material = {context.material.casefold()} if context.material else set()
    if points or material:
        direct = next((row for row in rows if row['record_kind'] == 'reported_test'
                       and record_matches(row, material, points)), None)
        related = next((row for row in rows if record_matches(row, material, points, overlap=True)), None)
        if direct:
            reasons.append({'kind': 'condition', 'text': f'Test {direct["external_id"]} reports the selected material and/or conditions together.',
                            'source': direct.get('source')})
            score += 10
        elif related:
            reasons.append({'kind': 'condition', 'text': f'Source record {related["external_id"]} overlaps the requested conditions.',
                            'source': related.get('source')})
            gaps.append({'kind': 'condition', 'text': 'An overlapping range or grouped source record provides limited evidence for an individual test.'})
            score += 4
        else:
            gaps.append({'kind': 'condition', 'text': 'No indexed record reports the requested values together.'})
    return score, reasons, gaps


def find_research(store, body):
    with store.connect() as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        matches = {}
        if body.query:
            conn.execute("SET LOCAL pg_trgm.similarity_threshold=0.2")
            words = query_words(body.query)
            rows = search_candidates(conn, body.query, words, None, None, None)
            matches = {item['id']: item for item in rank_candidates(rows, body.query, words)}
        studies, rows = cached_catalog(store, list(matches) if body.query else None, conn)
    selected = []
    filters = body.filters
    bounds = {key: value for key in CONDITIONS if (value := getattr(filters, key)) is not None}
    materials = {value.casefold() for value in filters.materials}
    for study in studies:
        sid = study['id']
        topics = study_topics(study)
        if filters.safety_topics and not set(topics).intersection(filters.safety_topics):
            continue
        if filters.fuel_types and not set(fuel_types(study)).intersection(filters.fuel_types):
            continue
        if filters.gravity_regimes and not study_gravities(study).intersection(filters.gravity_regimes):
            continue
        if filters.equipment_categories and EQUIPMENT_TOPICS.get(sid) not in filters.equipment_categories:
            continue
        if (bounds or materials) and not any(record_matches(row, materials, bounds) for row in rows[sid]):
            continue
        score, reasons, gaps = habitat_relevance(study, rows[sid], body.context)
        matched = matches.get(sid)
        if matched:
            reasons.append({'kind': 'query', 'text': f'Query matched {matched["matched_field"].replace("_", " ")} evidence.'})
        snippet_field = matched['matched_field'] if matched else ('description' if study['description'] else 'objective')
        selected.append((score, matched['score'] if matched else 0, {
            'id': sid, 'name': study['name'], 'acronym': study['metadata'].get('acronym') or sid,
            'summary_snippet': (matched['snippet']['text'] if matched else
                                (study['description'] or study['objective'] or ''))[:360],
            'snippet_matches': matched['snippet']['matches'] if matched else [],
            'snippet_sources': study['field_sources'].get(snippet_field, [])[:2],
            'safety_topics': topics, 'material_labels': material_labels(rows[sid])[:8], 'fuel_types': fuel_types(study),
            'source_count': study['source_count'], 'relevance': {'reasons': reasons, 'mismatches': gaps},
        }))
    selected.sort(key=lambda item: (-item[0], -item[1], item[2]['name'], item[2]['id']))
    start = (body.page - 1) * body.page_size
    warnings = []
    if body.context.habitat in {'lunar_base', 'mars_base', 'pressurized_rover'}:
        warnings.append({'code': 'GRAVITY_GAP', 'message': 'The selected surface environment has limited indexed evidence. Review each study’s actual conditions.'})
    return {'items': [item[2] for item in selected[start:start + body.page_size]],
            'total': len(selected), 'page': body.page, 'page_size': body.page_size, 'warnings': warnings}


def discover_filters(store):
    studies, groups = cached_catalog(store)
    rows = [row for group in groups.values() for row in group]
    conditions = {}
    for key, (_, unit, _) in CONDITIONS.items():
        values = [value for row in rows if (value := condition_value(row['parameters'], key)) is not None]
        conditions[key] = {'supported': bool(values), 'unit': unit, 'coverage_count': len(values)}
        if values:
            conditions[key].update(min=min(v[0] for v in values), max=max(v[1] for v in values))
    def options(values):
        return [{'value': v, 'label': v.replace('_', ' ').capitalize()} for v in sorted(values)]
    return {'safety_topics': options({t for study in studies for t in study_topics(study)}),
            'materials': options(material_labels(rows)),
            'fuel_types': options({f for study in studies for f in fuel_types(study)}),
            'habitats': [{'value': key, 'label': label} for key, label in HABITATS.items()],
            'gravity_regimes': options({g for study in studies for g in study_gravities(study)}),
            'equipment_categories': [{'value': k, 'label': v} for k, v in EQUIPMENT_LABELS.items()],
            'conditions': conditions}
