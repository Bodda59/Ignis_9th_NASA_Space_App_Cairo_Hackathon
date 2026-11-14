/**
 * Live research-backend calls whose responses need reshaping into the contract
 * types. Simple pass-through calls live directly in client.ts.
 */
import type { Audience } from '@/features/audience/audience'
import { EXPERIMENT_PAGE_SIZE } from './types'
import { citation } from './citation'
import { ApiError } from './errors'
import { download, http, post } from './transport'
import type {
  Citation, CompareField, CompareResponse, ExperimentPage, ExperimentTable, InterpretRequest, InterpretResponse,
  RankResponse, ScenarioCondition, ScenarioRanking, SearchResponse, Source,
} from './types'

type FactRef = Partial<Source> & { csv_record?: number; page?: number; field?: string }
type TestField = { definition?: { label: string }; values: { value: {
  category: string | null; low: number | null; high: number | null; unit: string | null
}; source_refs: FactRef[] }[] }
type Compared = { key: string; investigations: Record<string, TestField | null> }
type Measurement = { key: string; label: string; unit: string | null; source_refs: FactRef[] }
type Comparison = {
  status: string
  facts?: {
    objectives: Record<string, { text: string | null; source_refs: FactRef[] }>
    test_designs: { shared: Compared[]; differences: Compared[] }
    measurement_types: { by_investigation: Record<string, Measurement[]> }
    reviewed_findings?: Record<string, { text: string; source_refs: FactRef[] }[]>
    limitations: string[]
  }
}

export async function compare(ids: string[], signal?: AbortSignal): Promise<CompareResponse> {
  const [result, list] = await Promise.all([
    http<Comparison>('/api/v1/investigations/compare', post({ investigation_ids: ids }, signal)),
    http<SearchResponse>('/api/v1/research/relevance', post({ page_size: 100 }, signal)),
  ])
  if (!result.facts) throw new ApiError(503, { message: 'Comparison is waiting for the study summaries.' })
  const facts = result.facts
  const citations = new Map<string, Citation>()
  function cite(refs: FactRef[], sid: string) {
    return refs.slice(0, 4).map((ref) => {
      const id = [ref.document_id ?? sid, ref.page ?? ref.csv_record ?? ref.field ?? 'source'].join(':')
      citations.set(id, citation({ id, document_id: ref.document_id, title: ref.title ?? `${sid} research source`,
        source_url: ref.source_url ?? null, location: ref.location ?? (ref.page ? { page: ref.page } : ref.csv_record ? { csv_record: ref.csv_record } : ref.field ? { section: ref.field } : {}) }))
      return id
    })
  }
  const fields: CompareField[] = [{
    key: 'objective', label: 'Objective', group: 'overview',
    values: ids.map((sid) => ({ investigation_id: sid, value: facts.objectives[sid]?.text ?? null,
      citation_ids: cite(facts.objectives[sid]?.source_refs ?? [], sid) })),
  }]
  fields.push({ key: 'fuel_types', label: 'Fuel types', group: 'materials',
    values: ids.map((sid) => {
      const fuels = list.items.find((item) => item.id === sid)?.fuel_types
      return { investigation_id: sid, value: fuels?.length ? fuels : null, citation_ids: [] }
    }),
  })
  for (const field of [...facts.test_designs.shared, ...facts.test_designs.differences]) {
    fields.push({
      key: field.key, label: Object.values(field.investigations).find((value) => value?.definition)?.definition?.label ?? field.key,
      group: /material|geometry|sample/.test(field.key) ? 'materials' : 'conditions',
      values: ids.map((sid) => {
        const reported = field.investigations[sid]?.values ?? []
        const values = reported.slice(0, 12).map(({ value: v }) => v.category ??
          `${v.low === v.high ? v.low : `${v.low}–${v.high}`}${v.unit ? ` ${v.unit}` : ''}`)
        if (reported.length > values.length) values.push(`+${reported.length - values.length} more`)
        return { investigation_id: sid, value: values.length ? values : null,
          citation_ids: cite(reported.flatMap((item) => item.source_refs), sid) }
      }),
    })
  }
  fields.push({ key: 'measurements', label: 'Reported measurement types', group: 'measurements',
    values: ids.map((sid) => {
      const measures = facts.measurement_types.by_investigation[sid] ?? []
      return { investigation_id: sid, value: measures.length ? measures.map((m) => `${m.label}${m.unit ? ` (${m.unit})` : ''}`) : null,
        citation_ids: cite(measures.flatMap((m) => m.source_refs), sid) }
    }),
  })
  fields.push({ key: 'reviewed_findings', label: 'Reviewed findings', group: 'findings',
    values: ids.map((sid) => {
      const findings = facts.reviewed_findings?.[sid] ?? []
      return { investigation_id: sid, value: findings.length ? findings.map(({ text }) => text) : null,
        citation_ids: cite(findings.flatMap(({ source_refs }) => source_refs), sid) }
    }),
  })
  return { investigations: ids.map((id) => list.items.find((item) => item.id === id) ??
    { id, name: id, acronym: id, safety_topics: [] }), fields,
    comparability_notes: facts.limitations.map((text) => ({ text })), citations: [...citations.values()] }
}

export function rankQuestion(question: string, ids: string[], audience?: Audience, signal?: AbortSignal, sourceType?: string) {
  return http<RankResponse>('/api/v1/rank', post({ question, investigation_ids: ids, ...(sourceType && { source_types: [sourceType] }) }, signal), audience)
}

export function rankScenario(question: string, ids: string[], conditions: ScenarioCondition[], audience?: Audience, signal?: AbortSignal) {
  return http<ScenarioRanking>('/scenario/rank', post({
    question, investigation_ids: ids, conditions, include_analogues: true, ...(audience && { audience }),
  }, signal), audience)
}

type Answer = {
  status: string
  findings?: InterpretResponse['findings']
  interpretations?: InterpretResponse['interpretations']
  limitations?: string[]
  message?: string
  citations?: Source[]
  scenario?: ScenarioRanking
}

export async function interpret(req: InterpretRequest, signal?: AbortSignal, options?: {
  audience?: Audience; conditions?: ScenarioCondition[]; evidenceOnly?: boolean
}): Promise<InterpretResponse> {
  const ids = req.investigation_ids ?? []
  const selected = options?.conditions?.length ? options.conditions : undefined
  let question = req.question
  if (req.context?.habitat) {
    question = `${question}\nSelected habitat: ${req.context.habitat.replaceAll('_', ' ')}. Explain applicability and evidence gaps.`.slice(0, 2000)
  }
  const common = { question, investigation_ids: ids }
  if (options?.evidenceOnly) {
    const ranking = selected
      ? await rankScenario(question, ids, selected, options.audience, signal)
      : undefined
    const general = ranking ? undefined : await rankQuestion(question, ids, options.audience, signal)
    return { status: 'insufficient_evidence', findings: [], interpretations: [],
      gaps: [], related_investigation_ids: [], citations: [], scenario: ranking,
      ranked: general?.investigations, evidence_only: true,
      evidence_message: ranking?.message ?? general?.message ?? undefined }
  }
  let answer: Answer
  try {
    answer = selected
      ? await http<Answer>('/scenario/interpret', post({ ...common, audience: options?.audience,
        conditions: selected, include_analogues: true }, signal))
      : await http<Answer>('/api/v1/interpret', post(common, signal), options?.audience)
  } catch (error) {
    if (!selected || !(error instanceof ApiError) || !error.retryable) throw error
    const ranking = await rankScenario(question, ids, selected, options?.audience, signal)
    answer = { status: 'insufficient_evidence', message: `Answer generation unavailable. ${error.message}`, scenario: ranking }
  }
  const cited = answer.citations ?? []
  const needsClarification = answer.status === 'clarification_required'
  return {
    status: needsClarification ? 'clarification_required' : answer.status === 'answered' ? 'answered' : 'insufficient_evidence',
    clarification: needsClarification ? answer.message : undefined,
    findings: answer.findings ?? [], interpretations: answer.interpretations ?? [],
    gaps: [...new Set([...(answer.limitations ?? []), ...(answer.message && !needsClarification ? [answer.message] : [])])].map((text) => ({ text })),
    related_investigation_ids: [...new Set([...((cited as (Source & { investigation_id?: string })[]).flatMap((c) => c.investigation_id ? [c.investigation_id] : [])),
      ...(answer.scenario?.investigations.map((s) => s.investigation_id) ?? [])])],
    citations: cited.map(citation),
    scenario: answer.scenario,
  }
}

const studyPath = (id: string) => `/api/v1/investigations/${encodeURIComponent(id)}/tables`
export const experimentTables = (id: string, signal?: AbortSignal) =>
  http<{ items: ExperimentTable[] }>(studyPath(id), { signal })
export function experimentRows(id: string, table: string, cursor: string | null, columns: string[], signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: String(EXPERIMENT_PAGE_SIZE) })
  if (cursor) query.set('cursor', cursor)
  columns.forEach((column) => query.append('columns', column))
  return http<ExperimentPage>(`${studyPath(id)}/${encodeURIComponent(table)}/rows?${query}`, { signal })
}
export function exportTable(id: string, table: string, format: 'csv' | 'json', columns: string[]) {
  const query = new URLSearchParams({ format })
  columns.forEach((column) => query.append('columns', column))
  return download(`${studyPath(id)}/${encodeURIComponent(table)}/export?${query}`, `${id}.${format}`)
}

export const learning = (id: string, audience: 'professor' | 'graduate' | 'undergraduate',
  format: 'pdf' | 'pptx' | 'docx', notes: string, topic: string) =>
  download(`/learning/materials?output=${format}&excerpts=true`, `${id}-${audience}.${format}`,
    post({ investigation_id: id, audience, notes, topic }))
