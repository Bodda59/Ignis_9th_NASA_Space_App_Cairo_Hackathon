import type { CompareField } from '@/api/types'

/** Row status. Unknown is never treated as "same". */
export function rowStatus(f: CompareField) {
  const missing = f.values.filter((v) => v.value === null || (Array.isArray(v.value) && !v.value.length)).length
  if (missing === f.values.length) return 'none' as const
  if (f.incompatible) return 'incompatible' as const
  if (missing > 0) return 'partial' as const
  const units = new Set(f.values.map(({ unit }) => unit).filter(Boolean))
  if (units.size > 1) return 'incompatible' as const
  const values = new Set(f.values.map(({ value, unit }) =>
    JSON.stringify([Array.isArray(value) ? [...value].sort() : value, unit ?? null])))
  return f.differs || values.size > 1 ? 'differs' as const : 'same' as const
}

export const STATUS = {
  incompatible: { text: 'Not comparable', color: 'var(--color-ember)' },
  differs: { text: 'Differs', color: 'var(--color-flame)' },
  partial: { text: 'Partly reported', color: 'var(--color-ink-dim)' },
  none: { text: 'Not reported', color: 'var(--color-ink-faint)' },
  same: { text: 'Same', color: 'var(--color-ink-faint)' },
}
