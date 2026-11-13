import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { api } from '@/api/client'
import type { ScenarioCondition } from '@/api/types'
import { useAudience } from '@/features/audience/audience'
import { useAsync } from '@/hooks/useAsync'

const fieldClass = 'min-w-0 rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-panel)] px-3 py-2 text-sm'

export function ScenarioControls({ ids, conditions, onChange, allowSeparate = false }: {
  ids: string[]; conditions: ScenarioCondition[]; onChange: (conditions: ScenarioCondition[]) => void; allowSeparate?: boolean
}) {
  const audience = useAudience()
  const constraints = allowSeparate ? [] : conditions
  const request = useAsync((signal) => api.scenarioOptions(ids, constraints, audience, signal), JSON.stringify([ids, constraints]))
  const [key, setKey] = useState('')
  const [category, setCategory] = useState('')
  const [minimum, setMinimum] = useState('')
  const [maximum, setMaximum] = useState('')
  const fields = request.data ?? []
  const field = fields.find((item) => item.key === key)
  const remaining = fields.filter((item) => item.usable_records > 0 && !conditions.some((condition) => condition.key === item.key))
  const low = Number(minimum), high = maximum === '' ? low : Number(maximum)
  const canAdd = request.status === 'success' && !!field && remaining.includes(field) &&
    (field.compatible?.compatible_records ?? 0) > 0 && conditions.length < 8 && (field.kind === 'category'
      ? !!category && !!field.compatible?.categories?.includes(category)
      : minimum !== '' && Number.isFinite(low) && Number.isFinite(high) && low <= high &&
        (field.minimum === null || low >= field.minimum) && (field.maximum === null || high <= field.maximum))
  const reset = (value: string) => { setKey(value); setCategory(''); setMinimum(''); setMaximum('') }

  return (
    <div className="max-h-[38vh] space-y-3 overflow-auto border-b border-[var(--color-line)] px-4 py-3" data-lenis-prevent>
      <p className="flex items-center gap-2 text-sm"><SlidersHorizontal className="size-4 text-[var(--color-nebula)]" /> Reported test conditions</p>
      <div className="flex flex-wrap gap-2">
        {conditions.map((condition) => <button type="button" key={condition.key}
          onClick={() => onChange(conditions.filter((item) => item.key !== condition.key))}
          aria-label={`Remove ${fields.find((item) => item.key === condition.key)?.label ?? condition.key}`}
          className="flex items-center gap-2 rounded-full border border-[var(--color-nebula)]/40 px-3 py-1 text-xs">
          {fields.find((item) => item.key === condition.key)?.label ?? condition.key} · {'value' in condition ? condition.value :
            `${condition.minimum}${condition.maximum === condition.minimum ? '' : `–${condition.maximum}`} ${condition.unit}`}
          <X className="size-3" />
        </button>)}
      </div>
      {request.status === 'error' && <p role="alert" className="text-xs text-[var(--color-ember)]">{request.error.message} <button type="button" onClick={request.retry} className="underline">Retry</button></p>}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Scenario field" className={fieldClass} value={key} onChange={(event) => reset(event.target.value)} disabled={request.status !== 'success'}>
          <option value="">{request.status === 'loading' ? 'Loading conditions…' : 'Choose a condition'}</option>
          {remaining.map((item) => <option key={item.key} value={item.key} disabled={!item.compatible?.compatible_records}>
            {item.label}{item.unit ? ` (${item.unit})` : ''}
          </option>)}
        </select>
        {field?.kind === 'category' && <select aria-label="Scenario value" className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Choose a reported value</option>
          {field.compatible?.categories?.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>}
        {field?.kind === 'number' && <>
          <input aria-label={`${field.label} minimum`} className={`${fieldClass} w-24`} type="number" step="any" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="Value / min" />
          <input aria-label={`${field.label} maximum`} className={`${fieldClass} w-24`} type="number" step="any" value={maximum} onChange={(event) => setMaximum(event.target.value)} placeholder="Max (optional)" />
        </>}
        {field && <button type="button" disabled={!canAdd} className="rounded-lg bg-[var(--color-nebula)] px-3 py-2 text-sm text-[var(--color-void)] disabled:opacity-40"
          onClick={() => {
            const condition: ScenarioCondition = field.kind === 'category' ? { key, value: category } : { key, minimum: low, maximum: high, unit: field.unit! }
            onChange([...conditions, condition]); reset('')
          }}>Add condition</button>}
      </div>
      {field?.kind === 'number' && field.compatible?.observed_minimum != null && <p className="text-xs text-[var(--color-ink-dim)]">
        {allowSeparate ? 'Reported range in this scope:' : 'Reported range in compatible records:'} {field.compatible.observed_minimum}–{field.compatible.observed_maximum} {field.unit}
      </p>}
      <p className="text-xs text-[var(--color-ink-dim)]">{allowSeparate ? 'Choose conditions independently to check whether they were tested together.' :
        'The search checks all selected conditions together in each source record.'}</p>
    </div>
  )
}
