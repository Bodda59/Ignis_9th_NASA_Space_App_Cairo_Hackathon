/**
 * Mock server: answers every API call the app makes, from the bundled fixtures.
 * Simulates the documented contract behavior (OR within a filter category, AND
 * across categories, unknown never matches a hard filter, context is soft, stable
 * ties by id). Ranking lives HERE — views must not re-rank.
 *
 * Force states for demos/testing with the page URL:
 * ?mock=slow | error | timeout | empty | ratelimit (each call honors the ones it checks)
 */
import { ApiError } from '@/api/errors'
import type {
  FiltersResponse,
  RelevanceNote,
  SearchItem,
  SearchRequest,
  SearchResponse,
} from '@/api/types'
import { STUDIES, type FixtureStudy } from './fixtures'
import type { CompareResponse, InterpretRequest, InterpretResponse, InvestigationResponse } from '@/api/types'
import type {
  Citation,
  DataRow,
  ExperimentPage,
  ExperimentTable,
  RankedRecord,
  RankedStudy,
  ScenarioCondition,
  ScenarioEvidence,
  ScenarioField,
  ScenarioRanking,
  Source,
  Test,
} from '@/api/types'
import type { Audience } from '@/features/audience/audience'
import { cell } from './csv'
import { buildInvestigation, dataRows, findStudy } from './details'
import { buildCompare } from './compare'
import { interpret } from './interpret'

const scenario = () => new URLSearchParams(location.search).get('mock')

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      rej(new DOMException('Aborted', 'AbortError'))
    })
  })
}

const LABEL: Record<string, string> = {
  prevention: 'Prevention',
  detection: 'Detection',
  suppression: 'Suppression',
  spacecraft: 'Spacecraft',
  space_station: 'Space station',
  lunar_base: 'Lunar base',
  mars_base: 'Mars base',
  pressurized_rover: 'Pressurized rover',
  microgravity: 'Microgravity',
  normal_gravity: 'Normal gravity',
  partial_gravity: 'Partial gravity',
  simulated_effect: 'Simulated effect',
  unknown: 'Unknown',
  smoke_detection: 'Smoke detection',
  suppression_eq: 'Suppression',
  material_controls: 'Material controls',
  solid: 'Solid',
  liquid: 'Liquid',
  gas: 'Gas',
  aerosol: 'Aerosol',
}

function count<T extends string>(values: T[]) {
  const m = new Map<T, number>()
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1))
  return [...m.entries()].map(([value, c]) => ({ value, label: LABEL[value] ?? value, count: c }))
}

export async function mockFilters(signal?: AbortSignal): Promise<FiltersResponse> {
  await delay(250, signal)
  return {
    safety_topics: count(STUDIES.flatMap((s) => s.topics)),
    materials: count(STUDIES.flatMap((s) => s.materials)).sort((a, b) => a.label.localeCompare(b.label)),
    fuel_types: count(STUDIES.flatMap((s) => s.fuel_types)),
    habitats: (['spacecraft', 'space_station', 'lunar_base', 'mars_base', 'pressurized_rover'] as const).map((v) => ({
      value: v,
      label: LABEL[v],
    })),
    gravity_regimes: count(STUDIES.flatMap((s) => s.gravity)),
    equipment_categories: count(STUDIES.flatMap((s) => s.equipment)).map((o) => ({
      ...o,
      label: o.value === 'suppression' ? 'Suppression' : (LABEL[o.value] ?? o.value),
    })),
    conditions: {
      oxygen_pct: { supported: true, unit: '%', min: 0, max: 100, coverage_count: 1 },
      pressure_kpa: { supported: false, unit: 'kPa' },
      airflow_m_s: { supported: false, unit: 'm/s' },
    },
  }
}

const HABITAT_G: Record<string, number> = {
  spacecraft: 0,
  space_station: 0,
  lunar_base: 0.166,
  mars_base: 0.38,
  pressurized_rover: 0.166,
}

const tokens = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((t) => t.length > 2)

const STOP = new Set(['which', 'what', 'the', 'and', 'for', 'how', 'does', 'that', 'with', 'studied', 'experiments', 'over', 'change', 'in'])

function rank(s: FixtureStudy, req: SearchRequest) {
  const reasons: RelevanceNote[] = []
  const mismatches: RelevanceNote[] = []
  let score = 0
  const hay = `${s.acronym} ${s.name} ${s.snippet} ${s.materials.join(' ')} ${s.topics.join(' ')} ${s.equipment.join(' ')}`.toLowerCase()

  const q = tokens(req.query).filter((t) => !STOP.has(t))
  const hits = q.filter((t) => hay.includes(t.replace(/s$/, '')))
  if (hits.length) {
    score += hits.length * 3
    reasons.push({ kind: 'query', text: `Matches your search terms: ${[...new Set(hits)].join(', ')}` })
  }

  const c = req.context
  if (c.safety_concern) {
    if (s.topics.includes(c.safety_concern)) {
      score += 4
      reasons.push({ kind: 'topic', text: `Tagged with your concern: ${LABEL[c.safety_concern]}` })
    } else {
      mismatches.push({ kind: 'topic', text: `Not tagged with ${LABEL[c.safety_concern].toLowerCase()}` })
    }
  }
  if (c.material) {
    const m = c.material.toLowerCase()
    if (s.materials.some((x) => x.toLowerCase().includes(m.replace(/s$/, '')))) {
      score += 3
      reasons.push({ kind: 'material', text: `Includes “${c.material}” among tested materials` })
    } else {
      mismatches.push({ kind: 'material', text: `No indexed material matches “${c.material}”` })
    }
  }
  if (c.oxygen_pct !== undefined) {
    if (s.oxygen_pct?.max !== undefined && c.oxygen_pct <= s.oxygen_pct.max) {
      score += 2
      reasons.push({ kind: 'condition', text: `Reported O₂ reaches ${s.oxygen_pct.max}%, at or above your ${c.oxygen_pct}% scenario` })
    } else {
      mismatches.push({ kind: 'condition', text: `Oxygen concentration not reported for comparison with ${c.oxygen_pct}%` })
    }
  }
  if (c.pressure_kpa !== undefined) mismatches.push({ kind: 'condition', text: 'Total pressure not indexed in sample data' })
  if (c.airflow_m_s !== undefined) mismatches.push({ kind: 'condition', text: 'Airflow not indexed in sample data' })

  if (c.habitat) {
    const g = HABITAT_G[c.habitat]
    if (g > 0) {
      mismatches.push({
        kind: 'gravity',
        text: `Evidence is from ${s.gravity.includes('simulated_effect') ? 'microgravity + a simulated effect' : 'microgravity'} — ${LABEL[c.habitat].toLowerCase()} is ${g} g; results can bound, not represent, this gravity`,
      })
      if (s.gravity.includes('simulated_effect')) {
        score += 1
        reasons.push({ kind: 'gravity', text: 'Mimics partial-gravity effects with an electric field' })
      }
    } else {
      score += 1
      reasons.push({ kind: 'habitat', text: `Microgravity tests — same gravity regime as a ${LABEL[c.habitat].toLowerCase()}` })
    }
  }

  return { score, reasons, mismatches }
}

function passesFilters(s: FixtureStudy, f: SearchRequest['filters']) {
  const anyOf = <T>(sel: T[] | undefined, has: T[]) => !sel?.length || sel.some((v) => has.includes(v))
  if (!anyOf(f.safety_topics, s.topics)) return false
  if (!anyOf(f.materials, s.materials)) return false
  if (!anyOf(f.fuel_types, s.fuel_types as string[])) return false
  if (!anyOf(f.gravity_regimes, s.gravity)) return false
  if (!anyOf(f.equipment_categories, s.equipment)) return false
  // unknown values never satisfy a hard numeric filter
  if (f.oxygen_pct && (f.oxygen_pct.min !== undefined || f.oxygen_pct.max !== undefined)) {
    const max = s.oxygen_pct?.max
    if (max === undefined) return false
    if (f.oxygen_pct.min !== undefined && max < f.oxygen_pct.min) return false
  }
  if (f.pressure_kpa || f.airflow_m_s) return false
  return true
}

export async function mockSearch(req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  const sc = scenario()
  await delay(sc === 'slow' ? 2500 : 450 + Math.random() * 300, signal)
  if (sc === 'error') throw new ApiError(503, { code: 'SERVICE_UNAVAILABLE', message: 'The research service is temporarily unavailable.', retryable: true })
  if (sc === 'timeout') throw new ApiError(504, { code: 'TIMEOUT', message: 'The search took too long to respond.', retryable: true })

  const warnings: SearchResponse['warnings'] = []
  if (req.filters.pressure_kpa) warnings.push({ code: 'FILTER_NOT_INDEXED', field: 'pressure_kpa', message: 'Total pressure is not indexed in this collection, so no study can match that filter.' })
  if (req.filters.airflow_m_s) warnings.push({ code: 'FILTER_NOT_INDEXED', field: 'airflow_m_s', message: 'Airflow is not indexed in this collection, so no study can match that filter.' })
  if (req.filters.oxygen_pct) warnings.push({ code: 'LOW_COVERAGE', field: 'oxygen_pct', message: 'Only 1 study in this collection reports oxygen values; studies without them are excluded by this filter.' })

  const hasSignal = req.query.trim() || Object.values(req.context).some((v) => v !== undefined)
  let rows = sc === 'empty' ? [] : STUDIES.filter((s) => passesFilters(s, req.filters)).map((s) => ({ s, ...rank(s, req) }))

  // a query must match retrieved text; context alone never conjures results for an unmatched query
  if (req.query.trim()) rows = rows.filter((r) => r.reasons.some((x) => x.kind === 'query'))

  rows.sort((a, b) =>
    hasSignal ? b.score - a.score || a.s.id.localeCompare(b.s.id) : a.s.name.localeCompare(b.s.name),
  )

  const start = (req.page - 1) * req.page_size
  const items: SearchItem[] = rows.slice(start, start + req.page_size).map(({ s, reasons, mismatches }) => ({
    id: s.id,
    name: s.name,
    acronym: s.acronym,
    summary_snippet: s.snippet,
    safety_topics: s.topics,
    material_labels: s.materials,
    relevance: { reasons, mismatches },
    source_count: s.source_count,
  }))

  return { items, total: rows.length, page: req.page, page_size: req.page_size, warnings }
}

// ── details + data ───────────────────────────────────────────────────

export async function mockInvestigation(id: string, signal?: AbortSignal): Promise<InvestigationResponse> {
  const sc = scenario()
  await delay(sc === 'slow' ? 2500 : 400, signal)
  if (sc === 'error') throw new ApiError(503, { code: 'SERVICE_UNAVAILABLE', message: 'The research service is temporarily unavailable.', retryable: true })
  const s = findStudy(id)
  if (!s) throw new ApiError(404, { code: 'NOT_FOUND', message: `No investigation with id “${id}” exists in this collection.`, retryable: false })
  return buildInvestigation(s)
}

export async function mockCompare(ids: string[], signal?: AbortSignal): Promise<CompareResponse> {
  const sc = scenario()
  await delay(sc === 'slow' ? 2500 : 500, signal)
  if (sc === 'error') throw new ApiError(503, { code: 'SERVICE_UNAVAILABLE', message: 'The comparison service is temporarily unavailable.', retryable: true })
  // contract validation: 2–3 distinct, known IDs
  if (new Set(ids).size !== ids.length) throw new ApiError(400, { code: 'DUPLICATE_IDS', field: 'investigation_ids', message: 'Each study can only be compared once.', retryable: false })
  if (ids.length < 2 || ids.length > 3) throw new ApiError(400, { code: 'INVALID_COUNT', field: 'investigation_ids', message: 'Compare needs 2 or 3 studies.', retryable: false })
  const unknown = ids.filter((id) => !findStudy(id))
  if (unknown.length) throw new ApiError(404, { code: 'NOT_FOUND', message: `Unknown study: ${unknown.join(', ')}.`, retryable: false })
  return buildCompare(ids)
}

export async function mockInterpret(req: InterpretRequest, signal?: AbortSignal): Promise<InterpretResponse> {
  const sc = scenario()
  await delay(sc === 'slow' ? 6000 : 2400, signal) // realistic retrieval + generation latency
  if (sc === 'timeout') throw new ApiError(504, { code: 'AI_TIMEOUT', message: 'The AI service took too long to answer.', retryable: true })
  if (sc === 'ratelimit') throw new ApiError(429, { code: 'RATE_LIMITED', message: 'Too many questions in a short time — please wait a moment.', retryable: true })
  if (sc === 'error') throw new ApiError(503, { code: 'AI_UNAVAILABLE', message: 'The AI service is temporarily unavailable.', retryable: true })
  const q = req.question.trim()
  if (!q) throw new ApiError(400, { code: 'EMPTY_QUESTION', field: 'question', message: 'Please enter a question.', retryable: false })
  if (q.length > 2000) throw new ApiError(400, { code: 'QUESTION_TOO_LONG', field: 'question', message: 'Questions are limited to 2,000 characters.', retryable: false })
  const unknown = (req.investigation_ids ?? []).filter((id) => !findStudy(id))
  if (unknown.length) throw new ApiError(404, { code: 'NOT_FOUND', message: `Unknown study in scope: ${unknown.join(', ')}.`, retryable: false })
  return interpret(req)
}

// ── rank, scenarios, experiment tables, learning, autocomplete ───────
// Same signatures as the calls they replace, so the client can swap them in.
// Only the synthetic DEMO study has test-level records; every other study
// honestly reports none.

const notFound = (id: string) =>
  new ApiError(404, { code: 'NOT_FOUND', message: `No investigation with id “${id}” exists in this collection.`, retryable: false })

const inScope = (ids: string[]) => (ids.length ? STUDIES.filter((s) => ids.includes(s.id)) : STUDIES)

/** Citation (as the UI renders it) → raw Source passage, so citation() can render it again. */
const toSource = (c: Citation, id: string, text: string): Source & { text: string } =>
  ({ id, document_id: c.source_id, title: c.title, source_url: c.url, location: { section: c.location }, text })

export async function mockRankQuestion(
  question: string, ids: string[], _audience?: Audience, signal?: AbortSignal,
): Promise<{ status: string; message: string | null; investigations: RankedStudy[] }> {
  const sc = scenario()
  await delay(sc === 'slow' ? 2500 : 600, signal)
  if (sc === 'error') throw new ApiError(503, { code: 'SERVICE_UNAVAILABLE', message: 'The ranking service is temporarily unavailable.', retryable: true })
  const req: SearchRequest = { query: question, filters: {}, context: {}, page: 1, page_size: 100 }
  const rows = (sc === 'empty' ? [] : inScope(ids))
    .map((s) => ({ s, ...rank(s, req) }))
    .filter((r) => r.reasons.length)
    .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id))
  const investigations = rows.map(({ s, reasons }, i): RankedStudy => {
    const d = buildInvestigation(s)
    const passages = [d.summary_sections.objectives[0], ...d.findings].filter(Boolean)
    return {
      investigation_id: s.id, name: s.name, rank: i + 1,
      match_reasons: reasons.map((r) => r.text),
      evidence: passages.flatMap((p, n) => {
        const c = d.citations.find((x) => x.id === p.citation_ids[0])
        return c ? [toSource(c, `${s.id}:${n}`, p.text)] : []
      }),
    }
  })
  return {
    status: investigations.length ? 'ranked' : 'no_match',
    message: investigations.length ? null : 'No investigation in this scope matches those terms. Try broader wording or a wider scope.',
    investigations,
  }
}

// Scenario conditions can only use fields reported on test records.
const SCENARIO_FIELDS: Pick<ScenarioField, 'key' | 'label' | 'kind' | 'unit' | 'minimum' | 'maximum'>[] = [
  { key: 'material', label: 'Material', kind: 'category', unit: null, minimum: null, maximum: null },
  { key: 'sample_shape', label: 'Sample shape', kind: 'category', unit: null, minimum: null, maximum: null },
  { key: 'oxygen_pct', label: 'Oxygen', kind: 'number', unit: '%', minimum: 0, maximum: 100 },
  { key: 'pressure_kpa', label: 'Total pressure', kind: 'number', unit: 'kPa', minimum: 0, maximum: null },
  { key: 'airflow_m_s', label: 'Airflow', kind: 'number', unit: 'm/s', minimum: 0, maximum: null },
]
const fieldLabel = (key: string) => SCENARIO_FIELDS.find((f) => f.key === key)?.label ?? key.replaceAll('_', ' ')

const scopedTests = (ids: string[]) => inScope(ids).flatMap((s) => buildInvestigation(s).tests.map((t) => ({ s, t })))

const reported = (t: Test, key: string) => (t as Record<string, unknown>)[key] as string | number | null | undefined

function check(t: Test, c: ScenarioCondition): 'match' | 'mismatch' | 'not_reported' {
  const v = reported(t, c.key)
  if (v === null || v === undefined) return 'not_reported'
  if ('value' in c) return v === c.value ? 'match' : 'mismatch'
  return typeof v === 'number' && v >= c.minimum && v <= c.maximum ? 'match' : 'mismatch'
}

function testSource(t: Test) {
  const parts = [t.material, t.sample_shape?.toLowerCase(), t.oxygen_pct !== null && `${t.oxygen_pct}% O₂`,
    t.pressure_kpa !== null && `${t.pressure_kpa} kPa`, t.airflow_m_s !== null && `${t.airflow_m_s} m/s airflow`]
  return {
    id: `test:${t.id}`, document_id: 'src-fixture', title: 'Synthetic fixture (UI development only)', source_url: null,
    location: { test: t.id }, text: `SYNTHETIC test ${t.id}: ${parts.filter(Boolean).join(', ')}. Placeholder values, not evidence.`,
  }
}

export async function mockScenarioOptions(
  ids: string[], conditions: ScenarioCondition[], _audience?: Audience, signal?: AbortSignal,
): Promise<ScenarioField[]> {
  await delay(300, signal)
  const tests = scopedTests(ids).map(({ t }) => t)
  return SCENARIO_FIELDS.map((f) => {
    const values = (list: Test[]) => list.map((t) => reported(t, f.key)).filter((v): v is string | number => v !== null && v !== undefined)
    const categories = (vs: (string | number)[]) => (f.kind === 'category' ? [...new Set(vs.map(String))].sort() : null)
    const range = (vs: (string | number)[]) => {
      const n = vs.filter((v): v is number => typeof v === 'number')
      return f.kind === 'number' && n.length ? { min: Math.min(...n), max: Math.max(...n) } : { min: null, max: null }
    }
    const all = values(tests)
    // compatible = records that satisfy every OTHER selected condition and report this field
    const others = conditions.filter((c) => c.key !== f.key)
    const ok = values(tests.filter((t) => others.every((c) => check(t, c) === 'match')))
    const r = range(all), rc = range(ok)
    return {
      ...f, usable_records: all.length, observed_minimum: r.min, observed_maximum: r.max, categories: categories(all),
      compatible: { compatible_records: ok.length, categories: categories(ok), observed_minimum: rc.min, observed_maximum: rc.max },
    }
  })
}

export async function mockRankScenario(
  _question: string, ids: string[], conditions: ScenarioCondition[], _audience?: Audience, signal?: AbortSignal,
): Promise<ScenarioRanking> {
  const sc = scenario()
  await delay(sc === 'slow' ? 2500 : 700, signal)
  if (sc === 'error') throw new ApiError(503, { code: 'SERVICE_UNAVAILABLE', message: 'The ranking service is temporarily unavailable.', retryable: true })
  const results = (sc === 'empty' ? [] : scopedTests(ids)).map(({ s, t }) => ({ s, t, checks: conditions.map((c) => ({ c, status: check(t, c) })) }))
  const joint = results.filter((r) => r.checks.every((x) => x.status === 'match')).length

  const evidence_map: ScenarioEvidence = {
    joint_records: joint,
    conditions: conditions.map((c) => {
      const matching = results.filter((r) => check(r.t, c) === 'match')
      const first = matching[0]
      return {
        condition: c, label: fieldLabel(c.key),
        status: !matching.length ? 'no_matching_record' : joint ? 'tested_together' : 'tested_separately',
        matching_records: matching.length,
        example: first ? { ...testSource(first.t), test_id: first.t.id, investigation_id: first.s.id, investigation_name: first.s.name } : null,
      }
    }),
  }

  const REASON = { match: 'matches your condition', mismatch: 'outside your condition', not_reported: 'not reported for this test' }
  const byStudy = new Map<string, { s: FixtureStudy; score: number; records: RankedRecord[] }>()
  for (const r of results) {
    const score = r.checks.filter((x) => x.status === 'match').length
    if (!score) continue
    const entry = byStudy.get(r.s.id) ?? { s: r.s, score: 0, records: [] }
    entry.score = Math.max(entry.score, score)
    entry.records.push({
      record_id: r.t.record_id ?? r.t.id, test_id: r.t.id, record_kind: 'reported_test', category: 'synthetic_fixture',
      source: testSource(r.t), comparisons: r.checks.map(({ c, status }) => ({ key: c.key, status, reason: REASON[status] })),
    })
    byStudy.set(r.s.id, entry)
  }
  const investigations = [...byStudy.values()]
    .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id))
    .map((e, i) => ({ investigation_id: e.s.id, name: e.s.name, rank: i + 1, records: e.records }))

  return {
    status: investigations.length ? 'ranked' : 'no_matching_records', evidence_map, investigations,
    message: investigations.length
      ? 'Test-level records in this offline collection come only from the synthetic DEMO study — placeholders, not evidence.'
      : 'No reported test record in this scope matches the selected conditions. Only the synthetic DEMO study has test-level records in this offline collection.',
  }
}

const TABLE_ID = 'synthetic-measurements'
const TABLE_COLUMNS: { key: keyof DataRow; header: string }[] = [
  { key: 'test_id', header: 'Test' },
  { key: 'material', header: 'Material' },
  { key: 'oxygen_pct', header: 'Oxygen (%)' },
  { key: 'pressure_kpa', header: 'Total pressure (kPa)' },
  { key: 'airflow_m_s', header: 'Airflow (m/s)' },
  { key: 'measurement_name', header: 'Measurement' },
  { key: 'measurement_value', header: 'Value' },
  { key: 'measurement_unit', header: 'Unit' },
  { key: 'uncertainty', header: 'Uncertainty' },
  { key: 'missing_reason', header: 'Missing reason' },
]

function tableRows(id: string, table?: string) {
  if (!findStudy(id)) throw notFound(id)
  const rows = dataRows([id])
  if (table !== undefined && (table !== TABLE_ID || !rows.length)) {
    throw new ApiError(404, { code: 'NOT_FOUND', message: 'That experiment table does not exist for this study.', retryable: false })
  }
  return rows
}

const pickColumns = (columns: string[]) => (columns.length ? TABLE_COLUMNS.filter((c) => columns.includes(c.key)) : TABLE_COLUMNS)

export async function mockExperimentTables(id: string, signal?: AbortSignal): Promise<{ items: ExperimentTable[] }> {
  await delay(300, signal)
  const rows = tableRows(id)
  return { items: rows.length ? [{ id: TABLE_ID, title: 'Synthetic test measurements (not evidence)', row_count: rows.length, columns: TABLE_COLUMNS }] : [] }
}

export async function mockExperimentRows(
  id: string, table: string, cursor: string | null, columns: string[], signal?: AbortSignal,
): Promise<ExperimentPage> {
  await delay(300, signal)
  const rows = tableRows(id, table)
  const cols = pickColumns(columns)
  const LIMIT = 10
  const start = Number(cursor ?? 0) || 0
  return {
    items: rows.slice(start, start + LIMIT).map((r, i) => ({
      row_number: start + i + 1,
      cells: Object.fromEntries(cols.map((c) => [c.key, r[c.key] === null ? null : String(r[c.key])])),
    })),
    columns: cols,
    next_cursor: start + LIMIT < rows.length ? String(start + LIMIT) : null,
    total_rows: rows.length,
  }
}

export async function mockExportTable(id: string, table: string, format: 'csv' | 'json', columns: string[]): Promise<{ blob: Blob; filename: string }> {
  await delay(500)
  const rows = tableRows(id, table)
  const cols = pickColumns(columns)
  const filename = `${table}_SYNTHETIC.${format}`
  if (format === 'json') {
    const data = rows.map((r) => Object.fromEntries(cols.map((c) => [c.key, r[c.key]])))
    return { blob: new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename }
  }
  const lines = [cols.map((c) => cell(c.header)), ...rows.map((r) => cols.map((c) => cell(r[c.key])))].map((l) => l.join(','))
  return { blob: new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }), filename }
}

export async function mockLearning(
  id: string, _audience: 'professor' | 'graduate' | 'undergraduate', format: 'pdf' | 'pptx' | 'docx', _notes: string, _topic: string,
): Promise<{ blob: Blob; filename: string }> {
  await delay(400)
  if (!findStudy(id)) throw notFound(id)
  // Real PDF / Word / PowerPoint files need a document generator, which this offline app does not include.
  throw new ApiError(501, { code: 'NOT_AVAILABLE_OFFLINE', message: `${format.toUpperCase()} learning materials are not available in this offline demo.`, retryable: false })
}

/** Search-box suggestions: study acronyms, names and materials containing the query. */
export async function mockAutocomplete(query: string, limit = 4, signal?: AbortSignal): Promise<{ items: { text: string }[] }> {
  await delay(120, signal)
  const q = query.trim().toLowerCase()
  if (q.length < 2) return { items: [] }
  const hits = [...new Set(STUDIES.flatMap((s) => [s.acronym, s.name, ...s.materials]))].filter((t) => t.toLowerCase().includes(q))
  hits.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)) || a.length - b.length)
  return { items: hits.slice(0, limit).map((text) => ({ text })) }
}
