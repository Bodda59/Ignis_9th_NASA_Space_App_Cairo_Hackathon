/** Real catalog data, reshaped for the Kids Lab. No values are invented here. */
import { api } from '@/api/client'
import type { InvestigationResponse, SearchItem } from '@/api/types'
import { EARTH_OXYGEN_PCT, plainMaterial } from './kidsCopy'

export function loadStudies(signal: AbortSignal) {
  return api.search({ query: '', filters: {}, context: {}, page: 1, page_size: 50 }, signal)
}

/**
 * Named studies get cards in Kids Explore. Other entries are listed with their full names.
 */
export const hasMissionName = (s: Pick<SearchItem, 'id' | 'acronym'>) => Boolean(s.acronym) && s.acronym !== s.id

export type KidStats = {
  platform?: string
  flightYear?: number
  startYear?: number
  endYear?: number
  testCount: number
  sourceRowCount: number
  recordDescription?: string
  oxygen?: { min: number; max: number; count: number }
  pressure?: { min: number; max: number; count: number }
  topMaterials: { name: string; count: number }[]
}

const range = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values), count: values.length })
const year = (d?: string | null) => {
  const value = d?.match(/^(\d{4})-\d{2}-\d{2}$/)?.[1] ?? d?.match(/^\d{2}-\d{2}-(\d{4})$/)?.[1]
  return value ? Number(value) : undefined
}
const SAFFIRE_FLIGHT_YEARS: Readonly<Record<string, number>> = { 'PSI-98': 2016, 'PSI-99': 2016, 'PSI-100': 2017 }

export function kidStats(detail: InvestigationResponse): KidStats {
  const inv = detail.investigation
  const meta = inv.source_metadata
  // PSI lists ISS for some Saffire records. The reviewed flight reports place all three aboard Cygnus.
  const flightYear = SAFFIRE_FLIGHT_YEARS[inv.id]
  const platform = flightYear ? 'Cygnus' :
    meta?.project_type === 'Ground Investigation' ? 'Earth' : meta?.platform
  const availability = detail.data_availability
  const tests = detail.tests
  const oxygen = tests.map((t) => t.oxygen_pct).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100)
  const pressure = tests.map((t) => t.pressure_kpa).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
  const counts = new Map<string, number>()
  for (const t of tests) {
    if (!t.material) continue
    const name = plainMaterial(t.material).text
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const topMaterials = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
  return {
    platform,
    flightYear,
    startYear: flightYear ? undefined : year(meta?.start_date),
    endYear: flightYear ? undefined : year(meta?.end_date),
    testCount: availability.reported_test_count ?? tests.length,
    sourceRowCount: availability.source_row_count ?? 0,
    recordDescription: availability.record_label || availability.conditions_view ? availability.record_description : undefined,
    oxygen: oxygen.length ? range(oxygen) : undefined,
    pressure: pressure.length ? range(pressure) : undefined,
    topMaterials,
  }
}

/** Rounds for kids: up to three significant digits. */
export const kidNumber = (n: number) => String(Number(n.toPrecision(3)))

/** Compare the reported numbers at the same precision used on the page. */
export function oxygenVerdict(min: number, max: number) {
  const low = Number(kidNumber(min))
  const high = Number(kidNumber(max))
  if (high < EARTH_OXYGEN_PCT) return 'Less oxygen than Earth air'
  if (low > EARTH_OXYGEN_PCT) return 'More oxygen than Earth air'
  if (low === high) return 'About the same as Earth air'
  if (high === EARTH_OXYGEN_PCT) return 'Less oxygen or about the same'
  if (low === EARTH_OXYGEN_PCT) return 'About the same or more oxygen'
  return 'Both less and more than Earth air'
}

export const oxygenAmount = (min: number, max: number) =>
  kidNumber(min) === kidNumber(max) ? kidNumber(min) : `${kidNumber(min)} to ${kidNumber(max)}`
