import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  EQUIPMENT_CATEGORIES,
  GRAVITY_REGIMES,
  HABITAT_IDS,
  SAFETY_TOPICS,
  type Range,
  type SearchContext,
  type SearchFilters,
} from '@/api/types'

/**
 * Search state lives in the URL so it survives navigation, reload and sharing.
 * Blank fields are simply absent — nothing is defaulted or inferred.
 */
export const PAGE_SIZE = 8

const num = (v: string | null) => {
  if (v === null || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
const oneOf = <T extends string>(v: string | null, allowed: readonly T[]) =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined
const listOf = <T extends string>(vs: string[], allowed?: readonly T[]) =>
  (allowed ? vs.filter((v) => (allowed as readonly string[]).includes(v)) : vs) as T[]
const range = (min?: number, max?: number): Range | undefined =>
  min === undefined && max === undefined ? undefined : { ...(min !== undefined && { min }), ...(max !== undefined && { max }) }

export function useSearchState() {
  const [params, setParams] = useSearchParams()

  const state = useMemo(() => {
    const filters: SearchFilters = {}
    const topics = listOf(params.getAll('topic'), SAFETY_TOPICS)
    const materials = params.getAll('material')
    const fuels = params.getAll('fuel')
    const gravity = listOf(params.getAll('gravity'), GRAVITY_REGIMES)
    const equipment = listOf(params.getAll('equipment'), EQUIPMENT_CATEGORIES)
    if (topics.length) filters.safety_topics = topics
    if (materials.length) filters.materials = materials
    if (fuels.length) filters.fuel_types = fuels
    if (gravity.length) filters.gravity_regimes = gravity
    if (equipment.length) filters.equipment_categories = equipment
    const o2 = range(num(params.get('o2_min')), num(params.get('o2_max')))
    const p = range(num(params.get('p_min')), num(params.get('p_max')))
    const af = range(num(params.get('af_min')), num(params.get('af_max')))
    if (o2) filters.oxygen_pct = o2
    if (p) filters.pressure_kpa = p
    if (af) filters.airflow_m_s = af

    const context: SearchContext = {}
    const habitat = oneOf(params.get('habitat'), HABITAT_IDS)
    const concern = oneOf(params.get('concern'), SAFETY_TOPICS)
    const cg = oneOf(params.get('ctx_gravity'), GRAVITY_REGIMES)
    if (habitat) context.habitat = habitat
    if (concern) context.safety_concern = concern
    if (params.get('ctx_material')?.trim()) context.material = params.get('ctx_material')!.trim()
    const co2 = num(params.get('ctx_o2'))
    const cp = num(params.get('ctx_p'))
    const caf = num(params.get('ctx_af'))
    if (co2 !== undefined) context.oxygen_pct = co2
    if (cp !== undefined) context.pressure_kpa = cp
    if (caf !== undefined) context.airflow_m_s = caf
    if (cg) context.gravity_regime = cg

    return {
      query: params.get('q') ?? '',
      page: Math.max(1, num(params.get('page')) ?? 1),
      filters,
      context,
    }
  }, [params])

  /** Patch URL params. `null`/'' removes a key; arrays replace all values. Resets page unless set. */
  const update = useCallback(
    (patch: Record<string, string | number | string[] | null | undefined>, opts: { keepPage?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            next.delete(k)
            if (Array.isArray(v)) v.forEach((x) => next.append(k, x))
            else if (v !== null && v !== undefined && `${v}` !== '') next.set(k, `${v}`)
          }
          if (!opts.keepPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: false },
      )
    },
    [setParams],
  )

  const toggleIn = useCallback(
    (key: string, value: string) => {
      const cur = params.getAll(key)
      update({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] })
    },
    [params, update],
  )

  const resetFilters = useCallback(() => {
    update(
      Object.fromEntries(
        ['topic', 'material', 'fuel', 'gravity', 'equipment', 'o2_min', 'o2_max', 'p_min', 'p_max', 'af_min', 'af_max'].map((k) => [k, null]),
      ),
    )
  }, [update])

  const resetContext = useCallback(() => {
    update(Object.fromEntries(['habitat', 'concern', 'ctx_material', 'ctx_o2', 'ctx_p', 'ctx_af', 'ctx_gravity'].map((k) => [k, null])))
  }, [update])

  const activeFilterCount =
    Object.values(state.filters).reduce((n, v) => n + (Array.isArray(v) ? v.length : v ? 1 : 0), 0)

  return { ...state, params, update, toggleIn, resetFilters, resetContext, activeFilterCount }
}
