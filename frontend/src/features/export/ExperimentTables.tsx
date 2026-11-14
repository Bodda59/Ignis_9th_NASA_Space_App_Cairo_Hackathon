import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { api, saveBlob } from '@/api/client'
import type { ExperimentTable } from '@/api/types'
import { EXPERIMENT_PAGE_SIZE } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { StateMessage } from '@/components/ui/StateMessage'
import { useAudience } from '@/features/audience/audience'
import { useAsync } from '@/hooks/useAsync'

export function ExperimentTables({ id }: { id: string }) {
  const catalog = useAsync((signal) => api.experimentTables(id, signal), id)
  const [choice, setChoice] = useState('')
  if (catalog.status === 'error') return <StateMessage tone="error" title="Experiment tables unavailable" message={catalog.error.message} onRetry={catalog.retry} />
  if (catalog.status === 'loading') return <p role="status">Loading experiment tables…</p>
  const tables = catalog.data.items
  const table = tables.find((item) => item.id === choice) ?? tables[0]
  if (!table) return <p className="text-sm text-[var(--color-ink-dim)]">This study has no indexed experiment table.</p>
  return <div className="space-y-4" id={`source-table-${id}`}>
    {tables.length > 1 && <label className="flex flex-wrap items-center gap-3 text-sm">Source table
      <select value={table.id} onChange={(event) => setChoice(event.target.value)} className="max-w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-2">
        {tables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>}
    <TableRows key={table.id} id={id} table={table} />
  </div>
}

function TableRows({ id, table }: { id: string; table: ExperimentTable }) {
  const audience = useAudience()
  return <PaginatedRows key={audience} id={id} table={table} />
}

function PaginatedRows({ id, table }: { id: string; table: ExperimentTable }) {
  const [hidden, setHidden] = useState<string[]>([])
  const [history, setHistory] = useState<(string | null)[]>([null])
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const viewport = useRef<HTMLDivElement>(null)
  const cursor = history.at(-1) ?? null
  const columns = hidden.length ? table.columns.filter(({ key }) => !hidden.includes(key)).map(({ key }) => key) : []
  const page = useAsync((signal) => api.experimentRows(id, table.id, cursor, columns, signal), JSON.stringify([cursor, columns]))
  const visible = page.data
  const pending = page.status === 'loading'
  const firstRow = visible?.items[0]?.row_number
  const lastRow = visible?.items.at(-1)?.row_number
  const totalPages = Math.max(1, Math.ceil(table.row_count / EXPERIMENT_PAGE_SIZE))
  function changePage(nextHistory: (string | null)[]) {
    setHistory(nextHistory)
    viewport.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
  function toggleColumn(key: string) {
    setHistory([null])
    setHidden((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }
  async function exportRows(format: 'csv' | 'json') {
    setExporting(true); setError('')
    try {
      const file = await api.exportTable(id, table.id, format, columns)
      saveBlob(file.blob, `${id}-${file.filename}`)
    } catch (failure) { setError((failure as Error).message) }
    finally { setExporting(false) }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--color-ink-dim)]" aria-live="polite">
        {pending ? `Loading page ${history.length} of ${totalPages}…` : firstRow !== undefined
          ? `Showing rows ${firstRow}–${lastRow} of ${table.row_count}` : `${table.row_count} source rows`}
      </p>
      <div className="flex gap-2">
        {(['csv', 'json'] as const).map((format) => <Button key={format} size="sm" variant="outline" disabled={exporting}
          iconLeft={<Download className="size-4" />} onClick={() => void exportRows(format)}>{format.toUpperCase()}</Button>)}
      </div>
    </div>
    {table.columns.length > 1 && <details className="rounded-xl border border-[var(--color-line)] px-4 py-3">
      <summary className="cursor-pointer text-sm">Columns for preview and export ({table.columns.length - hidden.length} of {table.columns.length})</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {table.columns.map(({ key, header }) => <label key={key} className="flex items-start gap-2 text-sm text-[var(--color-ink-dim)]">
          <input type="checkbox" checked={!hidden.includes(key)}
            disabled={pending || (!hidden.includes(key) && hidden.length === table.columns.length - 1)}
            onChange={() => toggleColumn(key)} className="mt-0.5 accent-[var(--color-flame)]" />
          {header}
        </label>)}
      </div>
    </details>}
    {error && <p role="alert" className="text-sm text-[var(--color-ember)]">{error}</p>}
    {page.status === 'error' && <StateMessage tone="error" title="Could not load rows" message={page.error.message} onRetry={() => {
      if (page.error.status === 409) setHistory([null])
      else page.retry()
    }} />}
      <div ref={viewport} role="region" aria-label={`${table.title} source rows`} aria-busy={pending} tabIndex={0}
        className="h-[32rem] max-w-full overflow-auto overscroll-contain rounded-xl border border-[var(--color-line)] [overflow-anchor:none]" data-lenis-prevent>
        {visible ? <>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{table.title}</caption>
          <thead className="sticky top-0 z-10 bg-[var(--color-panel)]"><tr><th scope="col" className="p-3">Source row</th>{visible.columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap p-3">{column.header}</th>)}</tr></thead>
          <tbody className={pending ? 'opacity-50' : undefined}>{visible.items.map((row) => <tr key={row.row_number} className="border-t border-[var(--color-line)]">
            <th scope="row" className="p-3 font-mono font-normal">{row.row_number}</th>
            {visible.columns.map((column) => <td key={column.key} className="min-w-28 max-w-96 p-3 text-[var(--color-ink-dim)]">
              {row.cells[column.key] === '' || row.cells[column.key] == null ? '—' : row.cells[column.key]}
            </td>)}
          </tr>)}</tbody>
        </table>
        {!visible.items.length && <p className="p-4 text-sm text-[var(--color-ink-dim)]">No source rows on this page.</p>}
        </> : <p role="status" className="p-4 text-sm text-[var(--color-ink-dim)]">Loading source rows…</p>}
      </div>
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" disabled={history.length === 1 || pending} onClick={() => changePage(history.slice(0, -1))}>Previous</Button>
      <span className="text-sm text-[var(--color-ink-dim)]">Page {history.length} of {totalPages}</span>
      <Button size="sm" variant="outline" disabled={page.status !== 'success' || !page.data.next_cursor}
        onClick={() => { if (page.status === 'success' && page.data.next_cursor) changePage([...history, page.data.next_cursor]) }}>Next</Button>
    </div>
  </div>
}
