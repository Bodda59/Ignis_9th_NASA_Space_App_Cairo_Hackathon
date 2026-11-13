/**
 * The ONE API adapter. Views call `api.*` and never talk to the backend directly.
 * Every call goes to the research backend through the dev-server proxy
 * (/research-gateway, see vite.config.ts and transport.ts).
 */
import type { Audience } from '@/features/audience/audience'
import * as live from './live'
import { http, post } from './transport'
import type {
  ApiWarning,
  ComparabilityNote,
  CompareResponse,
  ExperimentPage,
  ExperimentTable,
  FiltersResponse,
  InterpretRequest,
  InterpretResponse,
  InvestigationResponse,
  RankedStudy,
  RelevanceNote,
  ScenarioCondition,
  ScenarioField,
  ScenarioRanking,
  SearchRequest,
  SearchResponse,
} from './types'

export { ApiError } from './errors'

type Download = { blob: Blob; filename: string }
type LearningAudience = 'professor' | 'graduate' | 'undergraduate'
type InterpretOptions = { audience?: Audience; conditions?: ScenarioCondition[]; evidenceOnly?: boolean }

// ── normalizers for shapes the contract hasn't frozen ───────────────
const note = (n: RelevanceNote | string): RelevanceNote => (typeof n === 'string' ? { text: n } : n)
const warning = (w: ApiWarning | string): ApiWarning => (typeof w === 'string' ? { code: 'WARNING', message: w } : w)

function normalizeSearch(r: SearchResponse): SearchResponse {
  return {
    ...r,
    warnings: (r.warnings ?? []).map(warning),
    items: r.items.map((it) => ({
      ...it,
      material_labels: it.material_labels ?? [],
      relevance: {
        reasons: (it.relevance?.reasons ?? []).map(note),
        mismatches: (it.relevance?.mismatches ?? []).map(note),
      },
    })),
  }
}

export const api = {
  filters(signal?: AbortSignal): Promise<FiltersResponse> {
    return http<FiltersResponse>('/api/v1/research/filters', { signal })
  },

  async search(req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
    return normalizeSearch(await http<SearchResponse>('/api/v1/research/relevance', post(req, signal)))
  },

  autocomplete(query: string, limit = 4, signal?: AbortSignal): Promise<{ items: { text: string }[] }> {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    return http<{ items: { text: string }[] }>(`/api/v1/investigations/autocomplete?${params}`, { signal })
  },

  async compare(ids: string[], signal?: AbortSignal): Promise<CompareResponse> {
    const raw = await live.compare(ids, signal)
    return {
      ...raw,
      comparability_notes: (raw.comparability_notes ?? []).map((n: ComparabilityNote | string) => (typeof n === 'string' ? { text: n } : n)),
    }
  },

  /**
   * Answers a question. With `evidenceOnly` it skips the answer and returns the
   * ranked evidence alone; with scenario `conditions` it answers from records
   * that confirm them and carries the scenario ranking and evidence map.
   */
  async interpret(req: InterpretRequest, signal?: AbortSignal, options?: InterpretOptions): Promise<InterpretResponse> {
    const raw = await live.interpret(req, signal, options)
    return {
      ...raw,
      findings: raw.findings ?? [],
      interpretations: raw.interpretations ?? [],
      gaps: (raw.gaps ?? []).map((g: { text: string } | string) => (typeof g === 'string' ? { text: g } : g)),
      related_investigation_ids: raw.related_investigation_ids ?? [],
      citations: raw.citations ?? [],
    }
  },

  investigation(id: string, signal?: AbortSignal): Promise<InvestigationResponse> {
    return http<InvestigationResponse>(`/api/v1/investigations/${encodeURIComponent(id)}/detail`, { signal })
  },

  rankQuestion(question: string, ids: string[], audience?: Audience, signal?: AbortSignal): Promise<{ status: string; message: string | null; investigations: RankedStudy[] }> {
    return live.rankQuestion(question, ids, audience, signal)
  },

  rankScenario(question: string, ids: string[], conditions: ScenarioCondition[], audience?: Audience, signal?: AbortSignal): Promise<ScenarioRanking> {
    return live.rankScenario(question, ids, conditions, audience, signal)
  },

  async scenarioOptions(ids: string[], conditions: ScenarioCondition[], audience?: Audience, signal?: AbortSignal): Promise<ScenarioField[]> {
    const result = await http<{ fields: ScenarioField[] }>('/scenario/options',
      post({ investigation_ids: ids, conditions, audience }, signal))
    return result.fields
  },

  experimentTables(id: string, signal?: AbortSignal): Promise<{ items: ExperimentTable[] }> {
    return live.experimentTables(id, signal)
  },

  experimentRows(id: string, table: string, cursor: string | null, columns: string[], signal?: AbortSignal): Promise<ExperimentPage> {
    return live.experimentRows(id, table, cursor, columns, signal)
  },

  exportTable(id: string, table: string, format: 'csv' | 'json', columns: string[]): Promise<Download> {
    return live.exportTable(id, table, format, columns)
  },

  learning(id: string, audience: LearningAudience, format: 'pdf' | 'pptx' | 'docx', notes: string, topic: string): Promise<Download> {
    return live.learning(id, audience, format, notes, topic)
  },
}

/** Triggers a browser download for a Blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
