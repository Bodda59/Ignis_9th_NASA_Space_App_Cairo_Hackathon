import { Box, Factory, Flame, FlaskConical, Radar, Trees, type LucideIcon } from 'lucide-react'
import type { EarthThemeId } from '@/api/types'

/**
 * One icon + color per Earth theme. Detection and suppression reuse their
 * safety-topic colors; cleaner combustion stays neutral because it is an Earth
 * benefit outside fire safety.
 */
export const EARTH_THEME: Record<EarthThemeId, { icon: LucideIcon; color: string }> = {
  confined_spaces: { icon: Box, color: 'var(--color-flame)' },
  smoke_detection: { icon: Radar, color: 'var(--color-detection)' },
  suppression: { icon: Flame, color: 'var(--color-suppression)' },
  fire_modeling: { icon: Trees, color: 'var(--color-flame)' },
  test_methods: { icon: FlaskConical, color: 'var(--color-prevention)' },
  cleaner_combustion: { icon: Factory, color: 'var(--color-ink-dim)' },
}

/** Marks a quote as an excerpt when it starts or stops mid-sentence. */
export function excerpt(quote: string) {
  const start = /^[a-z]/.test(quote) ? '…' : ''
  const end = /[.!?]$/.test(quote) ? '' : '…'
  return `“${start}${quote}${end}”`
}
