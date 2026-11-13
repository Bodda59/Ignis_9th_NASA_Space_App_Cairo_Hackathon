/**
 * Mock POST /api/compare built from the same brief-only fixtures as the detail
 * view. Values are per study and never averaged across tests.
 */
import type { Citation, CompareField, CompareGroup, CompareRaw, CompareResponse, ComparabilityNote } from '@/api/types'
import { buildInvestigation, findStudy } from './details'
import type { FixtureStudy } from './fixtures'

const same = (vals: CompareRaw[]) => new Set(vals.map((v) => JSON.stringify(v))).size <= 1

export function buildCompare(ids: string[]): CompareResponse {
  const studies = ids.map((id) => findStudy(id)!) as FixtureStudy[]
  const details = studies.map(buildInvestigation)

  const citations = new Map<string, Citation>()
  details.forEach((d) => d.citations.forEach((c) => citations.set(c.id, c)))

  const fields: CompareField[] = []
  const add = (
    group: CompareGroup,
    key: string,
    label: string,
    pick: (i: number) => { value: CompareRaw; unit?: string | null; missing_reason?: string | null; citation_ids?: string[] },
    incompatibleIfDiffers = false,
  ) => {
    const values = studies.map((s, i) => {
      const p = pick(i)
      const empty = p.value === null || (Array.isArray(p.value) && p.value.length === 0)
      return {
        investigation_id: s.id,
        value: empty ? null : p.value,
        unit: p.unit ?? null,
        missing_reason: empty ? (p.missing_reason ?? 'Not reported in this collection') : null,
        citation_ids: [...new Set(p.citation_ids ?? [])],
      }
    })
    const known = values.filter((v) => v.value !== null).map((v) => v.value)
    // differs = reported values disagree; missing data is reported separately, not as a difference
    const differs = known.length > 1 && !same(known)
    fields.push({ key, label, group, values, differs, incompatible: incompatibleIfDiffers && differs })
  }

  const cite = (i: number, section: keyof (typeof details)[number]['summary_sections']) =>
    details[i].summary_sections[section].flatMap((e) => e.citation_ids)

  add('overview', 'objective', 'Objective', (i) => ({ value: details[i].summary_sections.objectives[0]?.text ?? null, citation_ids: cite(i, 'objectives') }))
  add('overview', 'safety_topics', 'Safety topics', (i) => ({ value: studies[i].topics.map((t) => t[0].toUpperCase() + t.slice(1)), missing_reason: 'No safety topic tagged' }))
  add('overview', 'hardware', 'Apparatus', (i) => ({ value: studies[i].hardware.startsWith('Not') ? null : studies[i].hardware, citation_ids: [studies[i].id === 'fixture-demo' ? 'c-fx' : 'c-hw'] }), true)

  add('materials', 'materials', 'Materials', (i) => ({ value: studies[i].materials, citation_ids: cite(i, 'materials') }), true)
  add('materials', 'fuel_types', 'Fuel type', (i) => ({ value: studies[i].fuel_types.map((f) => f[0].toUpperCase() + f.slice(1)) }), true)

  add('conditions', 'gravity', 'Gravity regime', (i) => ({ value: studies[i].gravity.map((g) => (g === 'microgravity' ? 'Microgravity' : g === 'simulated_effect' ? 'Simulated effect' : g)) }), true)
  add('conditions', 'oxygen_pct', 'Oxygen', (i) => {
    const t = details[i].tests.map((x) => x.oxygen_pct).filter((v): v is number => v !== null)
    if (t.length) return { value: { min: Math.min(...t), max: Math.max(...t) }, unit: '%', citation_ids: ['c-fx'] }
    if (studies[i].oxygen_pct?.max) return { value: { max: studies[i].oxygen_pct!.max }, unit: '%', citation_ids: ['c-o2'] }
    return { value: null, missing_reason: 'Oxygen not reported in this collection' }
  })
  add('conditions', 'pressure_kpa', 'Total pressure', (i) => {
    const t = details[i].tests.map((x) => x.pressure_kpa).filter((v): v is number => v !== null)
    return t.length ? { value: { min: Math.min(...t), max: Math.max(...t) }, unit: 'kPa', citation_ids: ['c-fx'] } : { value: null, missing_reason: 'Pressure not reported in this collection' }
  })
  add('conditions', 'airflow_m_s', 'Airflow', (i) => {
    const t = details[i].tests.map((x) => x.airflow_m_s).filter((v): v is number => v !== null)
    return t.length ? { value: { min: Math.min(...t), max: Math.max(...t) }, unit: 'm/s', citation_ids: ['c-fx'] } : { value: null, missing_reason: 'Airflow not reported in this collection' }
  })
  add('conditions', 'tests', 'Numeric test records', (i) => ({ value: details[i].data_availability.numeric_test_count }))

  add('measurements', 'measurements', 'Measurements', (i) => ({ value: details[i].summary_sections.measurements.map((m) => m.text), citation_ids: cite(i, 'measurements') }), true)
  add('findings', 'findings', 'Documented findings', (i) => ({ value: details[i].findings.map((f) => f.text), citation_ids: details[i].findings.flatMap((f) => f.citation_ids), missing_reason: 'No reviewed findings yet' }))
  add('limitations', 'limitations', 'Limitations', (i) => ({ value: details[i].summary_sections.limitations.map((l) => l.text) }))

  // comparability notes
  const notes: ComparabilityNote[] = []
  const f = (k: string) => fields.find((x) => x.key === k)!
  const names = (k: string) => f(k).values.filter((v) => v.value === null).map((v) => studies.find((s) => s.id === v.investigation_id)!.acronym)

  if (f('fuel_types').incompatible) notes.push({ kind: 'incompatible', field_key: 'fuel_types', text: 'Different fuel types — results describe different combustion problems and should not be pooled.' })
  else if (f('materials').incompatible) notes.push({ kind: 'incompatible', field_key: 'materials', text: 'Different materials were tested, so outcomes are not interchangeable.' })
  if (f('hardware').incompatible) notes.push({ kind: 'method', field_key: 'hardware', text: 'Different apparatus — test methods and flow conditions are not the same.' })
  if (f('gravity').incompatible) notes.push({ kind: 'gravity', field_key: 'gravity', text: 'Gravity conditions differ between these studies.' })
  for (const k of ['oxygen_pct', 'pressure_kpa', 'airflow_m_s']) {
    const missing = names(k)
    if (missing.length === studies.length) notes.push({ kind: 'missing', field_key: k, text: `${f(k).label} is not reported for any selected study — no condition comparison is possible.` })
    else if (missing.length) notes.push({ kind: 'missing', field_key: k, text: `${f(k).label} is not reported for ${missing.join(', ')}.` })
  }
  if (studies.every((s) => s.gravity.includes('microgravity'))) notes.push({ kind: 'gravity', text: 'All evidence here is from microgravity; none of it represents lunar or Martian gravity.' })
  notes.push({ kind: 'info', text: 'Values are shown per study; ranges are as reported and are never averaged across tests.' })

  const used = new Set(fields.flatMap((x) => x.values.flatMap((v) => v.citation_ids)))
  return {
    investigations: studies.map((s) => ({ id: s.id, name: s.name, acronym: s.acronym, safety_topics: s.topics })),
    fields,
    comparability_notes: notes,
    citations: [...citations.values()].filter((c) => used.has(c.id)),
  }
}
