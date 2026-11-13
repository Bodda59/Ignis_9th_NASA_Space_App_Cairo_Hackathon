import { CSV_COLUMNS, type DataRow } from '@/api/types'

/**
 * Export CSV rules: fixed column order, empty numeric cell = missing (never zero),
 * escape quotes/commas/newlines, neutralise formula-like text.
 */
function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // formula injection guard for text cells
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: DataRow[]): string {
  const head = CSV_COLUMNS.join(',')
  const body = rows.map((r) => CSV_COLUMNS.map((c) => cell(r[c])).join(','))
  return [head, ...body].join('\r\n') + '\r\n'
}
