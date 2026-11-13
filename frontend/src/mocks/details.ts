/**
 * ⚠ Mock detail records. Real-study content is limited to statements in the
 * 2026 challenge brief, cited to the brief section they come from. Anything the
 * brief does not state is left empty so the UI shows "Not reported".
 * Test-level numbers exist ONLY for the clearly labeled `fixture-demo` study.
 */
import type {
  Citation,
  CitedText,
  DataRow,
  EquipmentLink,
  Finding,
  InvestigationResponse,
  Test,
} from '@/api/types'
import { STUDIES, type FixtureStudy } from './fixtures'

const BRIEF = { source_id: 'src-brief', title: 'NASA Space Apps 2026 — “Flame in Freefall” challenge brief', url: 'https://www.spaceappschallenge.org/', source_type: 'challenge_brief' }

const C = {
  bg: { id: 'c-bg', ...BRIEF, location: 'Background' },
  obj: { id: 'c-obj', ...BRIEF, location: 'Objectives' },
  hw: { id: 'c-hw', ...BRIEF, location: 'Potential considerations › Hardware' },
  other: { id: 'c-other', ...BRIEF, location: 'Potential considerations › Other investigations in PSI' },
  o2: { id: 'c-o2', ...BRIEF, location: 'Potential considerations › Spacesuits and oxygen concentration' },
  pg: { id: 'c-pg', ...BRIEF, location: 'Potential considerations › Partial-gravity data' },
  fx: { id: 'c-fx', source_id: 'src-fixture', title: 'Synthetic fixture (UI development only)', url: null, location: 'mocks/details.ts', source_type: 'fixture' },
} satisfies Record<string, Citation>

/** which brief section describes each study */
const DESC_CITE: Record<string, keyof typeof C> = {
  bass: 'bg', 'bass-ii': 'bg', saffire: 'bg', same: 'bg', 'same-r': 'bg', flex: 'bg',
  daft: 'other', 'acme-bre': 'other', 'acme-cfi-g': 'o2', 'acme-e-field': 'pg',
  'flex-2': 'hw', cfi: 'hw', spice: 'hw', slice: 'hw', 'fixture-demo': 'fx',
}

const FINDINGS: Record<string, Omit<Finding, 'investigation_id'>[]> = {
  flex: [{ id: 'f-flex-1', text: 'Diluting the chamber atmosphere with carbon dioxide or with helium suppressed fire in these burning-droplet tests.', citation_ids: ['c-bg'] }],
  'acme-cfi-g': [{ id: 'f-cfig-1', text: 'Reached the highest oxygen concentrations of PSI microgravity tests — oxygen-nitrogen flows of up to 85% oxygen from a spherical burner.', citation_ids: ['c-o2'] }],
  'acme-e-field': [{ id: 'f-ef-1', text: 'An applied electric field acting on naturally occurring flame ions was used to mimic partial-gravity effects.', citation_ids: ['c-pg'] }],
  daft: [{ id: 'f-daft-1', text: 'An instrument used for smoke detection in SAME / SAME-R was reused to detect dust.', citation_ids: ['c-other'] }],
  'fixture-demo': [
    { id: 'f-demo-1', text: 'SYNTHETIC: placeholder finding that exercises the layout for a documented result with one citation.', citation_ids: ['c-fx'] },
    { id: 'f-demo-2', text: 'SYNTHETIC: a second placeholder finding — not an experimental result.', citation_ids: ['c-fx'] },
  ],
}

const EQUIPMENT: Record<string, Omit<EquipmentLink, 'investigation_id'>[]> = {
  same: [{
    id: 'eq-same', equipment_category: 'smoke_detection',
    design_question: 'How should spacecraft smoke detectors sense an early fire in microgravity?',
    finding_ids: [], explanation: 'SAME tested fire detection in microgravity through smoke and aerosol measurements — the evidence base for detector development.',
    limitations: ['No measured detector-performance values are in this sample data.', 'Microgravity smoke behaviour cannot be assumed for lunar or Martian gravity.'],
    citation_ids: ['c-bg'],
  }],
  'same-r': [{
    id: 'eq-samer', equipment_category: 'smoke_detection',
    design_question: 'How should spacecraft smoke detectors sense an early fire in microgravity?',
    finding_ids: [], explanation: 'SAME-R continued microgravity smoke and aerosol measurement for fire detection.',
    limitations: ['No measured detector-performance values are in this sample data.'],
    citation_ids: ['c-bg'],
  }],
  daft: [{
    id: 'eq-daft', equipment_category: 'smoke_detection',
    design_question: 'Can an instrument built for smoke detection also characterise dust?',
    finding_ids: ['f-daft-1'], explanation: 'DAFT reused a SAME smoke instrument to detect dust, relevant where dust and smoke may both be present.',
    limitations: ['Feasibility test only; detection performance is not reported here.'],
    citation_ids: ['c-other'],
  }],
  flex: [{
    id: 'eq-flex', equipment_category: 'suppression',
    design_question: 'Which atmosphere-dilution agents can extinguish a fire in a sealed cabin?',
    finding_ids: ['f-flex-1'], explanation: 'FLEX found that both carbon dioxide and helium dilution suppress fire, informing suppression agent choices.',
    limitations: ['Burning fuel droplets in a chamber — not cabin-scale fires or solid materials.', 'Microgravity only.', 'Agent quantities and concentrations are not reported in this sample data.'],
    citation_ids: ['c-bg'],
  }],
  ...Object.fromEntries(['bass', 'bass-ii', 'saffire', 'acme-bre'].map((id) => [id, [{
    id: `eq-${id}`, equipment_category: 'material_controls' as const,
    design_question: 'Which cabin materials need flammability screening for oxygen-enriched habitats?',
    finding_ids: [], explanation: 'Fire prevention relies on material selection, which depends on understanding flammability limits — the focus of this study.',
    limitations: ['No flammability limits are recorded in this sample data.', 'Test oxygen levels are not imported, so relevance to 30%+ O₂ habitats is unverified.'],
    citation_ids: ['c-bg'],
  }]])),
  'fixture-demo': [{
    id: 'eq-demo', equipment_category: 'material_controls',
    design_question: 'SYNTHETIC: placeholder design question for layout testing.',
    finding_ids: ['f-demo-1'], explanation: 'SYNTHETIC: placeholder explanation linking a finding to a design question.',
    limitations: ['Synthetic — not evidence.'], citation_ids: ['c-fx'],
  }],
}

const LIMITS: Record<string, string> = {
  'acme-e-field': 'An electric-field effect mimics, but is not, partial gravity.',
  daft: 'Measured dust rather than combustion smoke.',
  'acme-bre': 'Gaseous fuels emulate solid materials; they are not the materials themselves.',
}

const DEMO_TESTS: Test[] = [
  { id: 'SYN-T1', investigation_id: 'fixture-demo', material: 'Synthetic sample', sample_shape: 'Flat sheet', sample_dimensions: '10 × 2 cm (synthetic)', oxygen_pct: 21, pressure_kpa: 101.3, airflow_m_s: 0.1, gravity_regime: 'microgravity', gravity_g: null, source_id: 'src-fixture', source_location: 'mocks/details.ts', missing_reasons: { gravity_g: 'Residual acceleration not reported' } },
  { id: 'SYN-T2', investigation_id: 'fixture-demo', material: 'Synthetic sample', sample_shape: 'Flat sheet', sample_dimensions: '10 × 2 cm (synthetic)', oxygen_pct: 30, pressure_kpa: null, airflow_m_s: 0.25, gravity_regime: 'microgravity', gravity_g: null, source_id: 'src-fixture', source_location: 'mocks/details.ts', missing_reasons: { pressure_kpa: 'Not stated in source for this test', gravity_g: 'Residual acceleration not reported' } },
]

const DEMO_MEAS: { test: string; name: string; value: number | null; unit: string; unc: number | null; missing?: string }[] = [
  { test: 'SYN-T1', name: 'flame_spread_rate', value: 1.0, unit: 'mm/s', unc: 0.1 },
  { test: 'SYN-T1', name: 'burn_duration', value: 0, unit: 's', unc: null },
  { test: 'SYN-T2', name: 'flame_spread_rate', value: 2.0, unit: 'mm/s', unc: null },
  { test: 'SYN-T2', name: 'burn_duration', value: null, unit: 's', unc: null, missing: 'Not measured in this test' },
]

export function findStudy(id: string): FixtureStudy | undefined {
  return STUDIES.find((s) => s.id === id)
}

export function buildInvestigation(s: FixtureStudy): InvestigationResponse {
  const cite = C[DESC_CITE[s.id] ?? 'bg']
  const demo = s.id === 'fixture-demo'
  const findings = (FINDINGS[s.id] ?? []).map((f) => ({ ...f, investigation_id: s.id }))
  const equipment = (EQUIPMENT[s.id] ?? []).map((e) => ({ ...e, investigation_id: s.id }))
  const tests = demo ? DEMO_TESTS : []

  const t = (text: string, ...ids: string[]): CitedText => ({ text, citation_ids: ids })
  const conditions: CitedText[] = [t('Conducted in microgravity.', cite.id)]
  if (s.oxygen_pct?.max) conditions.push(t(`Oxygen-nitrogen flows of up to ${s.oxygen_pct.max}% oxygen.`, 'c-o2'))
  if (s.hardware && !s.hardware.startsWith('Not')) conditions.push(t(`Hardware: ${s.hardware}.`, demo ? 'c-fx' : 'c-hw'))

  const measurements: CitedText[] =
    s.id === 'same' || s.id === 'same-r' ? [t('Smoke and aerosol measurements for fire detection.', 'c-bg')]
      : s.id === 'daft' ? [t('Dust measurement with a SAME-derived instrument.', 'c-other')]
        : demo ? [t('Flame spread rate (mm/s), burn duration (s) — synthetic.', 'c-fx')]
          : []

  const limitations = [
    demo ? 'SYNTHETIC FIXTURE — values are placeholders for interface testing and must not be cited.' : 'Sample data is built from the challenge brief only; test-level conditions and measured outcomes have not been imported yet.',
    ...(LIMITS[s.id] ? [LIMITS[s.id]] : []),
    ...(s.gravity.includes('microgravity') ? ['Microgravity results do not establish lunar or Martian (partial-gravity) behaviour.'] : []),
  ]

  const usedIds = new Set([cite.id, ...conditions.flatMap((c) => c.citation_ids), ...measurements.flatMap((m) => m.citation_ids), ...findings.flatMap((f) => f.citation_ids), ...equipment.flatMap((e) => e.citation_ids)])
  const citations = Object.values(C).filter((c) => usedIds.has(c.id))

  return {
    investigation: {
      id: s.id, name: s.name, acronym: s.acronym, overview: s.snippet, safety_topics: s.topics, materials: s.materials,
      fuel_types: s.fuel_types, objectives: [s.snippet], summary: s.snippet,
      measurement_types: measurements.map((m) => m.text), limitations, source_ids: [...new Set(citations.map((c) => c.source_id))],
      hardware: s.hardware,
    },
    summary_sections: {
      objectives: [t(s.snippet, cite.id)],
      materials: [t(`${s.materials.join(', ')} · fuel type: ${s.fuel_types.join(', ')}.`, cite.id)],
      conditions,
      measurements,
      findings: findings.map((f) => t(f.text, ...f.citation_ids)),
      limitations: limitations.map((l) => t(l)),
    },
    tests,
    findings,
    equipment_links: equipment,
    citations,
    data_availability: demo
      ? { numeric_test_count: 2, unavailable_reason: null }
      : { numeric_test_count: 0, unavailable_reason: 'No test-level numerical records have been imported for this study yet — only brief-level descriptions exist.' },
  }
}

export function dataRows(ids: string[]): DataRow[] {
  if (!ids.includes('fixture-demo')) return []
  return DEMO_MEAS.map((m) => {
    const test = DEMO_TESTS.find((t) => t.id === m.test)!
    return {
      investigation_id: 'fixture-demo',
      investigation_name: 'Synthetic fixture study',
      test_id: test.id,
      material: test.material,
      oxygen_pct: test.oxygen_pct,
      pressure_kpa: test.pressure_kpa,
      airflow_m_s: test.airflow_m_s,
      gravity_regime: test.gravity_regime,
      gravity_g: test.gravity_g,
      measurement_name: m.name,
      measurement_value: m.value,
      measurement_unit: m.unit,
      uncertainty: m.unc,
      uncertainty_unit: m.unc === null ? null : m.unit,
      original_value: m.value === null ? null : String(m.value),
      original_unit: m.unit,
      source_url: null,
      source_location: 'mocks/details.ts (synthetic)',
      condition_source_refs: JSON.stringify([{ field: 'all', source_url: null, source_location: 'mocks/details.ts' }]),
      missing_reason: m.missing ?? (test.pressure_kpa === null ? 'pressure_kpa: ' + test.missing_reasons.pressure_kpa : null),
    }
  })
}
