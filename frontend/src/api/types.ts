/**
 * API contract types for the research backend (calls in client.ts and live.ts).
 * Where the contract leaves a shape open, the type is marked ASSUMPTION and the
 * client normalizes both possible shapes.
 */

// ── Enums ────────────────────────────────────────────────────────────
export const SAFETY_TOPICS = ['prevention', 'detection', 'suppression'] as const
export type SafetyTopic = (typeof SAFETY_TOPICS)[number]

export const HABITAT_IDS = ['spacecraft', 'space_station', 'lunar_base', 'mars_base', 'pressurized_rover'] as const
export type HabitatId = (typeof HABITAT_IDS)[number]

export const GRAVITY_REGIMES = ['microgravity', 'normal_gravity', 'partial_gravity', 'simulated_effect', 'unknown'] as const
export type GravityRegime = (typeof GRAVITY_REGIMES)[number]

export const EQUIPMENT_CATEGORIES = ['smoke_detection', 'suppression', 'material_controls'] as const
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]

export type ConditionKey = 'oxygen_pct' | 'pressure_kpa' | 'airflow_m_s'

// ── Shared ───────────────────────────────────────────────────────────
export type Range = { min?: number; max?: number }

/** ASSUMPTION (Q1): contract says reasons/mismatches; shape not fixed. */
export type ResearchSourceRef = { source_url?: string | null; title?: string; file_name?: string; csv_record?: number; field?: string }

export type RelevanceNote = {
  text: string
  kind?: 'query' | 'topic' | 'material' | 'condition' | 'gravity' | 'habitat' | 'equipment' | 'other'
  citation_ids?: string[]
  source?: ResearchSourceRef
}

/** ASSUMPTION (Q2) */
export type ApiWarning = { code: string; message: string; field?: string }

export type ApiErrorBody = {
  error: { code: string; message: string; field?: string; retryable: boolean }
}

// ── GET /api/filters ─────────────────────────────────────────────────
export type FilterOption<T extends string = string> = { value: T; label: string; count?: number }

export type ConditionMeta = {
  supported: boolean
  unit: string
  min?: number
  max?: number
  coverage_count?: number
}

export type FiltersResponse = {
  safety_topics: FilterOption<SafetyTopic>[]
  materials: FilterOption[]
  fuel_types: FilterOption[]
  habitats: FilterOption<HabitatId>[]
  gravity_regimes: FilterOption<GravityRegime>[]
  equipment_categories: FilterOption<EquipmentCategory>[]
  conditions: Record<ConditionKey, ConditionMeta>
}

// ── POST /api/search ─────────────────────────────────────────────────
export type SearchFilters = {
  safety_topics?: SafetyTopic[]
  materials?: string[]
  fuel_types?: string[]
  gravity_regimes?: GravityRegime[]
  equipment_categories?: EquipmentCategory[]
  oxygen_pct?: Range
  pressure_kpa?: Range
  airflow_m_s?: Range
}

/** Soft scenario context — affects relevance and gap explanations, never a hard filter. */
export type SearchContext = {
  habitat?: HabitatId
  safety_concern?: SafetyTopic
  material?: string
  oxygen_pct?: number
  pressure_kpa?: number
  airflow_m_s?: number
  gravity_regime?: GravityRegime
}

export type SearchRequest = {
  query: string
  filters: SearchFilters
  context: SearchContext
  page: number
  page_size: number
}

export type SearchItem = {
  id: string
  name: string
  acronym: string
  summary_snippet: string
  safety_topics: SafetyTopic[]
  material_labels: string[]
  relevance: { reasons: RelevanceNote[]; mismatches: RelevanceNote[] }
  source_count: number
  snippet_sources?: ResearchSourceRef[]
  snippet_matches?: { start: number; end: number }[]
  fuel_types?: string[]
}

export type SearchResponse = {
  items: SearchItem[]
  total: number
  page: number
  page_size: number
  warnings: ApiWarning[]
}

// ── Records (GET /api/investigations/{id}) ───────────────────────────
export type SourceType = 'psi' | 'paper' | 'nasa_page' | 'challenge_brief' | 'fixture' | string

export type Citation = {
  id: string
  source_id: string
  title: string
  file_name?: string | null
  url: string | null
  location: string
  /** not in contract; 'fixture' marks synthetic sources so they are always labeled */
  source_type?: SourceType
  /** which investigation the passage belongs to (used to group Notes) */
  investigation_id?: string
}

export type CitedText = { text: string; citation_ids: string[] }

export type Investigation = {
  id: string
  name: string
  acronym: string
  overview: string
  safety_topics: SafetyTopic[]
  materials: string[]
  fuel_types: string[]
  objectives: string[]
  summary: string
  measurement_types: string[]
  limitations: string[]
  source_ids: string[]
  indexed_source_types?: { source_type: string; document_count: number }[]
  /** ASSUMPTION: not listed in contract; shown when present */
  hardware?: string
  /** PSI persistent identifier; PSI asks users to cite each investigation by DOI */
  citation?: { doi: string | null; doi_url: string | null; psi_url: string | null }
}

// ── Earth applications (GET /api/v1/earth and the study detail) ─────
export type EarthThemeId = 'confined_spaces' | 'smoke_detection' | 'suppression' | 'fire_modeling' | 'test_methods' | 'cleaner_combustion'

/** A theme tag on one study. `quote` is copied from NASA's impact text. */
export type EarthTag = { id: EarthThemeId; label: string; fire_safety: boolean; quote: string }

export type StudyEarth = {
  /** NASA's "Research Impacts / Earth Benefits" text, as published in PSI */
  text: string
  themes: EarthTag[]
  note: string | null
  source_title: string
  source_url: string | null
}

export type EarthStudy = { id: string; acronym: string; name: string; quote: string; source_url: string | null }

export type EarthTheme = { id: EarthThemeId; label: string; description: string; fire_safety: boolean; studies: EarthStudy[] }

export type Spinoff = {
  id: string
  title: string
  era: string
  text: string
  source_title: string
  url: string | null
  related_theme: EarthThemeId | null
}

export type EarthResponse = { themes: EarthTheme[]; spinoffs: Spinoff[]; caveat: string; study_count: number }

// ── Partial gravity (GET /api/v1/gravity) ───────────────────────────
export type SourceLink = { title: string; url: string | null }

export type StudyRef = { id: string; acronym: string; name: string; psi_url: string | null }

/** A study whose PSI record sets microgravity against Earth gravity. `quote` is copied from `field`. */
export type GravityBracket = StudyRef & {
  topic: string
  topic_label: string
  /** this project's one-line reading of the quote */
  summary: string
  field: 'objective' | 'hypothesis' | 'approach'
  quote: string
  /** reviewed low-g vs 1 g finding, when one exists */
  finding: { text: string; source_title: string; source_url: string | null } | null
}

export type OutsideEvidence = {
  id: string
  name: string
  /** label for the gravity axis */
  short: string
  g: number
  status: 'flown' | 'planned' | 'published'
  method: string
  text: string
  source: SourceLink
}

export type GravityResponse = {
  counts: { microgravity_studies: number; earth_comparison_studies: number; partial_gravity_studies: number; outside_psi: number }
  topics: { id: string; label: string }[]
  brackets: GravityBracket[]
  simulated: StudyRef & {
    brief_quote: string
    brief_source: SourceLink
    record_quotes: { field: string; quote: string }[]
    limit: string
  }
  outside: OutsideEvidence[]
  bounding: {
    brief_quote: string
    brief_source: SourceLink
    caveat_study: StudyRef
    caveat_quote: string
    nasa_summary: string
    nasa_source: SourceLink
    takeaway: string
  }
  limits: string[]
}

export type Test = {
  id: string
  record_id?: string
  investigation_id: string
  material: string | null
  sample_shape: string | null
  sample_dimensions: string | null
  oxygen_pct: number | null
  pressure_kpa: number | null
  airflow_m_s: number | null
  gravity_regime: GravityRegime
  gravity_g: number | null
  source_id: string
  source_location: string
  /** ASSUMPTION (Q4): field → reason */
  missing_reasons: Record<string, string>
}

export type Finding = { id: string; investigation_id: string; text: string; citation_ids: string[] }

export type EquipmentLink = {
  id: string
  investigation_id: string
  equipment_category: EquipmentCategory
  design_question: string
  finding_ids: string[]
  explanation: string
  limitations: string[]
  citation_ids: string[]
}

export type SummarySectionKey = 'objectives' | 'study_context' | 'materials' | 'conditions' | 'measurements' | 'findings' | 'limitations'

export type InvestigationResponse = {
  investigation: Investigation
  /** ASSUMPTION (Q3): each section is a list of cited entries; empty = not reported */
  summary_sections: Record<SummarySectionKey, CitedText[]>
  tests: Test[]
  findings: Finding[]
  equipment_links: EquipmentLink[]
  citations: Citation[]
  data_availability: {
    numeric_test_count: number
    source_row_count?: number
    reported_test_count?: number
    source_record_count?: number
    planned_record_count?: number
    record_label?: string
    record_description?: string
    conditions_view?: 'source_tables' | 'metadata_only' | 'no_indexed_tables' | null
    measurement_summary_status?: 'available' | 'not_mapped'
    unavailable_reason: string | null
  }
  /** null when the PSI record states no research impacts */
  earth?: StudyEarth | null
}

// ── POST /api/data/preview + /api/data/export ───────────────────────
export const CSV_COLUMNS = [
  'investigation_id', 'investigation_name', 'test_id', 'material', 'oxygen_pct', 'pressure_kpa', 'airflow_m_s',
  'gravity_regime', 'gravity_g', 'measurement_name', 'measurement_value', 'measurement_unit', 'uncertainty',
  'uncertainty_unit', 'original_value', 'original_unit', 'source_url', 'source_location', 'condition_source_refs',
  'missing_reason',
] as const

export type DataRow = {
  investigation_id: string
  investigation_name: string
  test_id: string
  material: string | null
  oxygen_pct: number | null
  pressure_kpa: number | null
  airflow_m_s: number | null
  gravity_regime: GravityRegime
  gravity_g: number | null
  measurement_name: string
  measurement_value: number | null
  measurement_unit: string | null
  uncertainty: number | null
  uncertainty_unit: string | null
  original_value: string | null
  original_unit: string | null
  source_url: string | null
  source_location: string | null
  condition_source_refs: string
  missing_reason: string | null
}

/** ASSUMPTION (Q6): same shape as search condition ranges */
export type TestFilters = { oxygen_pct?: Range; pressure_kpa?: Range; airflow_m_s?: Range }

export type DataPreviewRequest = { investigation_ids: string[]; test_filters: TestFilters; page: number; page_size: number }

export type DataPreviewResponse = {
  rows: DataRow[]
  total: number
  page: number
  page_size: number
  availability: 'available' | 'unavailable'
  unavailable_reason: string | null
}

// ── POST /api/compare ────────────────────────────────────────────────
/** ASSUMPTION (Q5): a value may be text, a number, a list, or an explicitly reported range. */
export type CompareRaw = string | number | string[] | Range | null

export type CompareValue = {
  investigation_id: string
  value: CompareRaw
  unit?: string | null
  missing_reason?: string | null
  citation_ids: string[]
}

export type CompareGroup = 'overview' | 'materials' | 'conditions' | 'measurements' | 'findings' | 'limitations'

export type CompareField = {
  key: string
  label: string
  /** ASSUMPTION: grouping + flags help the UI; computed by backend */
  group?: CompareGroup
  values: CompareValue[]
  differs?: boolean
  incompatible?: boolean
}

/** ASSUMPTION: notes may be plain strings or objects */
export type ComparabilityNote = { text: string; kind?: 'incompatible' | 'missing' | 'gravity' | 'method' | 'info'; field_key?: string }

export type CompareResponse = {
  investigations: { id: string; name: string; acronym: string; safety_topics: SafetyTopic[] }[]
  fields: CompareField[]
  comparability_notes: ComparabilityNote[]
  citations: Citation[]
}

// ── POST /api/interpret ──────────────────────────────────────────────
export type InterpretRequest = { question: string; investigation_ids?: string[]; context?: SearchContext }

export type InterpretItem = CitedText & {
  /** ASSUMPTION: optional prevention/detection/suppression framing for interpretations */
  safety_topic?: SafetyTopic
}

export type InterpretResponse = {
  scenario?: ScenarioRanking
  ranked?: RankedStudy[]
  evidence_only?: boolean
  evidence_message?: string
  status: 'answered' | 'insufficient_evidence'
  findings: InterpretItem[]
  interpretations: InterpretItem[]
  /** ASSUMPTION (Q9): strings or {text} — normalized to {text} */
  gaps: { text: string }[]
  related_investigation_ids: string[]
  /** ASSUMPTION (Q8): optional names so the UI needs no extra lookups */
  related_investigations?: { id: string; acronym: string; name: string }[]
  citations: Citation[]
}

// ── Ranking, scenarios and experiment tables ─────────────────────────
export type Source = {
  id?: string
  passage_id?: string
  document_id?: string
  title: string
  source_url: string | null
  location: Record<string, unknown>
}

export type ScenarioCondition = { key: string; value: string } | { key: string; minimum: number; maximum: number; unit: string }
export type ScenarioField = {
  key: string; label: string; kind: 'number' | 'category'; unit: string | null
  minimum: number | null; maximum: number | null; usable_records: number
  observed_minimum: number | null; observed_maximum: number | null; categories: string[] | null
  compatible?: { compatible_records: number; categories?: string[] | null; observed_minimum?: number | null; observed_maximum?: number | null }
}
export type RankedRecord = {
  record_id: string; test_id: string; record_kind: string; category: string; source: Source & { text: string }
  comparisons: { key: string; status: string; reason: string }[]
}
export type ScenarioEvidence = {
  joint_records: number
  conditions: {
    condition: ScenarioCondition
    label: string
    status: 'tested_together' | 'tested_separately' | 'no_matching_record'
    matching_records: number
    example: (Source & { test_id: string; investigation_id: string; investigation_name: string; text: string }) | null
  }[]
}

export type ScenarioRanking = {
  status: string; message?: string
  evidence_map?: ScenarioEvidence
  investigations: { investigation_id: string; name: string; rank: number; records: RankedRecord[] }[]
}

export type SourceRelevance = {
  source_type: string
  document_count: number
  status: 'matched' | 'no_match' | 'unavailable'
  relevance_score: number | null
  semantic_similarity: number | null
  evidence: (Source & { text: string }) | null
}

export type StudySourceCoverage = {
  investigation_id: string; name: string; source_relevance: SourceRelevance[]
}

export type RankResponse = {
  status: string; message: string | null; investigations: RankedStudy[]; source_coverage?: StudySourceCoverage[]
}

export type RankedStudy = {
  investigation_id: string; name: string; rank: number; match_reasons: string[]; source_relevance?: SourceRelevance[]; evidence: (Source & { text: string })[]
}

export type ExperimentTable = { id: string; title: string; row_count: number; columns: { key: string; header: string }[] }
export const EXPERIMENT_PAGE_SIZE = 10
export type ExperimentPage = {
  items: { row_number: number; cells: Record<string, string | null> }[]
  columns: ExperimentTable['columns']; next_cursor: string | null; total_rows: number
}
