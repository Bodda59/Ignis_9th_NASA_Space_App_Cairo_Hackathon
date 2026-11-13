/**
 * One CSV cell for exports: an empty cell means missing (never zero), quotes,
 * commas and newlines are escaped, and formula-like text is neutralised.
 */
export function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // formula injection guard for text cells
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
