import { useState } from 'react'
import { Download } from 'lucide-react'
import { api, saveBlob } from '@/api/client'
import type { ExperimentTable } from '@/api/types'
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
  return <div className="space-y-4">
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
  const cursor = history.at(-1) ?? null
  const columns = hidden.length ? table.columns.filter(({ key }) => !hidden.includes(key)).map(({ key }) => key) : []
  const page = useAsync((signal) => api.experimentRows(id, table.id, cursor, columns, signal), JSON.stringify([cursor, columns]))
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
      <p className="text-sm text-[var(--color-ink-dim)]">{table.row_count} source rows</p>
      <div className="flex gap-2">
        {(['csv', 'json'] as const).map((format) => <Button key={format} size="sm" variant="outline" disabled={exporting}
          iconLeft={<Download className="size-4" />} onClick={() => void exportRows(format)}>Export {format.toUpperCase()}</Button>)}
      </div>
    </div>
    {table.columns.length > 1 && <details className="rounded-xl border border-[var(--color-line)] px-4 py-3">
      <summary className="cursor-pointer text-sm">Columns for preview and export ({table.columns.length - hidden.length} of {table.columns.length})</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {table.columns.map(({ key, header }) => <label key={key} className="flex items-start gap-2 text-sm text-[var(--color-ink-dim)]">
          <input type="checkbox" checked={!hidden.includes(key)}
            disabled={!hidden.includes(key) && hidden.length === table.columns.length - 1}
            onChange={() => toggleColumn(key)} className="mt-0.5 accent-[var(--color-flame)]" />
          {header}
        </label>)}
      </div>
    </details>}
    {error && <p role="alert" className="text-sm text-[var(--color-ember)]">{error}</p>}
    {page.status === 'error' ? <StateMessage tone="error" title="Could not load rows" message={page.error.message} onRetry={() => {
      if (page.error.status === 409) setHistory([null])
      else page.retry()
    }} /> : page.status === 'loading' ? <p role="status">Loading rows…</p> :
      <div className="max-w-full overflow-x-auto rounded-xl border border-[var(--color-line)]" data-lenis-prevent>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{table.title}</caption>
          <thead><tr><th scope="col" className="p-3">Row</th>{page.data.columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap p-3">{column.header}</th>)}</tr></thead>
          <tbody>{page.data.items.map((row) => <tr key={row.row_number} className="border-t border-[var(--color-line)]">
            <th scope="row" className="p-3 font-mono font-normal">{row.row_number}</th>
            {page.data.columns.map((column) => <td key={column.key} className="min-w-28 max-w-96 p-3 text-[var(--color-ink-dim)]">{row.cells[column.key] || '—'}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" disabled={history.length === 1 || page.status === 'loading'} onClick={() => setHistory((old) => old.slice(0, -1))}>Previous</Button>
      <span className="text-sm text-[var(--color-ink-dim)]">Page {history.length}</span>
      <Button size="sm" variant="outline" disabled={page.status !== 'success' || !page.data.next_cursor}
        onClick={() => { if (page.status === 'success' && page.data.next_cursor) setHistory((old) => [...old, page.data.next_cursor]) }}>Next</Button>
    </div>
  </div>
}
