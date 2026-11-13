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
import type { CompareResponse, InterpretRequest, InterpretResponse, DataPreviewRequest, DataPreviewResponse, InvestigationResponse } from '@/api/types'
import { toCsv } from './csv'
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

export async function mockPreview(req: DataPreviewRequest, signal?: AbortSignal): Promise<DataPreviewResponse> {
  await delay(350, signal)
  const all = dataRows(req.investigation_ids)
  if (!all.length) {
    return { rows: [], total: 0, page: req.page, page_size: req.page_size, availability: 'unavailable', unavailable_reason: 'No usable test-level numerical records for this selection.' }
  }
  const start = (req.page - 1) * req.page_size
  return { rows: all.slice(start, start + req.page_size), total: all.length, page: req.page, page_size: req.page_size, availability: 'available', unavailable_reason: null }
}

export async function mockExport(req: Omit<DataPreviewRequest, 'page' | 'page_size'>): Promise<{ blob: Blob; filename: string }> {
  await delay(600)
  const rows = dataRows(req.investigation_ids) // ALL matching rows, not just the preview page
  if (!rows.length) throw new ApiError(422, { code: 'DATA_UNAVAILABLE', message: 'There are no exportable numerical records for this selection.', retryable: false })
  return { blob: new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), filename: `flame-in-freefall_${req.investigation_ids.join('-')}_SYNTHETIC.csv` }
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
