/** Real catalog data, reshaped for the Kids Lab. No values are invented here. */
import { api } from '@/api/client'
import type { InvestigationResponse, SearchItem } from '@/api/types'

export function loadStudies(signal: AbortSignal) {
  return api.search({ query: '', filters: {}, context: {}, page: 1, page_size: 50 }, signal)
}

/**
 * Studies with a mission name (e.g. "FLEX") are flight experiments a child can meet.
 * Catalog entries without one (named only "PSI-60" etc.) are grown-up analysis studies.
 */
export const hasMissionName = (s: Pick<SearchItem, 'id' | 'acronym'>) => Boolean(s.acronym) && s.acronym !== s.id

/** The PSI record the detail endpoint passes through (not part of the typed contract). */
type SourceMetadata = { platform?: string; start_date?: string | null; end_date?: string | null }

export type KidStats = {
  platform?: string
  startYear?: number
  endYear?: number
  testCount: number
  oxygen?: { min: number; max: number; count: number }
  pressure?: { min: number; max: number; count: number; skippedZero: number }
  topMaterials: { name: string; count: number }[]
}

const range = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values), count: values.length })
const year = (d?: string | null) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : undefined)

export function kidStats(detail: InvestigationResponse): KidStats {
  const meta = ((detail.investigation as unknown as { source_metadata?: SourceMetadata }).source_metadata) ?? {}
  const tests = detail.tests
  const oxygen = tests.map((t) => t.oxygen_pct).filter((v): v is number => typeof v === 'number')
  const pressureAll = tests.map((t) => t.pressure_kpa).filter((v): v is number => typeof v === 'number')
  // A pressure of 0 kPa would be vacuum, where nothing burns: treat it as "not recorded".
  const pressure = pressureAll.filter((v) => v > 0)
  const counts = new Map<string, number>()
  for (const t of tests) if (t.material) counts.set(t.material, (counts.get(t.material) ?? 0) + 1)
  const topMaterials = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
  return {
    platform: meta.platform,
    startYear: year(meta.start_date),
    endYear: year(meta.end_date),
    testCount: detail.data_availability?.numeric_test_count ?? tests.length,
    oxygen: oxygen.length ? range(oxygen) : undefined,
    pressure: pressure.length ? { ...range(pressure), skippedZero: pressureAll.length - pressure.length } : undefined,
    topMaterials,
  }
}

/** Rounds for kids: whole numbers, or one decimal for small values. */
export const kidNumber = (n: number) => (Math.abs(n) >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10))
