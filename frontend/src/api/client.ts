/**
 * The ONE API adapter. Views call `api.*` and never talk to the mock server
 * directly. Every call is served by the bundled mock server (src/mocks/), so the
 * app runs fully offline with no backend.
 */
import type { Audience } from '@/features/audience/audience'
import * as mock from '@/mocks/mockServer'
import type {
  CompareResponse,
  DataPreviewRequest,
  DataPreviewResponse,
  ExperimentPage,
  ExperimentTable,
  FiltersResponse,
  InterpretRequest,
  InterpretResponse,
  InvestigationResponse,
  RankedStudy,
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

export const api = {
  filters(signal?: AbortSignal): Promise<FiltersResponse> {
    return mock.mockFilters(signal)
  },

  search(req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
    return mock.mockSearch(req, signal)
  },

  autocomplete(query: string, limit = 4, signal?: AbortSignal): Promise<{ items: { text: string }[] }> {
    return mock.mockAutocomplete(query, limit, signal)
  },

  compare(ids: string[], signal?: AbortSignal): Promise<CompareResponse> {
    return mock.mockCompare(ids, signal)
  },

  /**
   * Answers a question. With `evidenceOnly` it skips the answer and returns the
   * ranked evidence alone; with scenario `conditions` the answer carries the
   * scenario ranking and evidence map.
   */
  async interpret(req: InterpretRequest, signal?: AbortSignal, options?: InterpretOptions): Promise<InterpretResponse> {
    const ids = req.investigation_ids ?? []
    const conditions = options?.conditions?.length ? options.conditions : undefined
    if (options?.evidenceOnly) {
      const scenario = conditions ? await mock.mockRankScenario(req.question, ids, conditions, options.audience, signal) : undefined
      const general = scenario ? undefined : await mock.mockRankQuestion(req.question, ids, options.audience, signal)
      return {
        status: 'insufficient_evidence', findings: [], interpretations: [], gaps: [], related_investigation_ids: [], citations: [],
        scenario, ranked: general?.investigations, evidence_only: true,
        evidence_message: scenario?.message ?? general?.message ?? undefined,
      }
    }
    const answer = await mock.mockInterpret(req, signal)
    if (!conditions) return answer
    return { ...answer, scenario: await mock.mockRankScenario(req.question, ids, conditions, options?.audience, signal) }
  },

  investigation(id: string, signal?: AbortSignal): Promise<InvestigationResponse> {
    return mock.mockInvestigation(id, signal)
  },

  dataPreview(req: DataPreviewRequest, signal?: AbortSignal): Promise<DataPreviewResponse> {
    return mock.mockPreview(req, signal)
  },

  dataExport(req: Omit<DataPreviewRequest, 'page' | 'page_size'>): Promise<Download> {
    return mock.mockExport(req)
  },

  rankQuestion(question: string, ids: string[], audience?: Audience, signal?: AbortSignal): Promise<{ status: string; message: string | null; investigations: RankedStudy[] }> {
    return mock.mockRankQuestion(question, ids, audience, signal)
  },

  rankScenario(question: string, ids: string[], conditions: ScenarioCondition[], audience?: Audience, signal?: AbortSignal): Promise<ScenarioRanking> {
    return mock.mockRankScenario(question, ids, conditions, audience, signal)
  },

  scenarioOptions(ids: string[], conditions: ScenarioCondition[], audience?: Audience, signal?: AbortSignal): Promise<ScenarioField[]> {
    return mock.mockScenarioOptions(ids, conditions, audience, signal)
  },

  experimentTables(id: string, signal?: AbortSignal): Promise<{ items: ExperimentTable[] }> {
    return mock.mockExperimentTables(id, signal)
  },

  experimentRows(id: string, table: string, cursor: string | null, columns: string[], signal?: AbortSignal): Promise<ExperimentPage> {
    return mock.mockExperimentRows(id, table, cursor, columns, signal)
  },

  exportTable(id: string, table: string, format: 'csv' | 'json', columns: string[]): Promise<Download> {
    return mock.mockExportTable(id, table, format, columns)
  },

  learning(id: string, audience: LearningAudience, format: 'pdf' | 'pptx' | 'docx', notes: string, topic: string): Promise<Download> {
    return mock.mockLearning(id, audience, format, notes, topic)
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
