import { useId, useState } from 'react'
import { cn } from '@/lib/cn'

type Props = {
  label: string
  unit: string
  value?: number
  /** called on blur / Enter with a validated number, or undefined when cleared */
  onCommit: (v: number | undefined) => void
  validate?: (v: number) => string | null
  placeholder?: string
  disabled?: boolean
  hideLabel?: boolean
}

/**
 * Numeric input that commits on blur/Enter (no URL churn per keystroke).
 * Empty stays empty — never coerced to 0.
 */
export function NumberField({ label, unit, value, onCommit, validate, placeholder = '—', disabled, hideLabel }: Props) {
  const id = useId()
  const [raw, setRaw] = useState(value?.toString() ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [prevValue, setPrevValue] = useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    setRaw(value?.toString() ?? '')
  }

  const commit = () => {
    if (raw.trim() === '') {
      setErr(null)
      if (value !== undefined) onCommit(undefined)
      return
    }
    const n = Number(raw)
    const e = !Number.isFinite(n) ? 'Enter a number' : (validate?.(n) ?? null)
    setErr(e)
    if (!e && n !== value) onCommit(n)
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={cn('label mb-1.5 block', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div
        className={cn(
          'flex items-center rounded-lg border bg-[var(--color-void)] transition-colors focus-within:border-[var(--color-flame)] focus-within:ring-2 focus-within:ring-[var(--color-flame)]/25',
          err ? 'border-[var(--color-ember)]' : 'border-[var(--color-line-input)]',
          disabled && 'opacity-40',
        )}
      >
        <input
          id={id}
          inputMode="decimal"
          value={raw}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-full min-w-0 bg-transparent px-3 py-2 font-mono text-sm tabular-nums outline-none placeholder:text-[var(--color-ink-faint)]"
        />
        <span className="pr-3 font-mono text-[11px] text-[var(--color-ink-faint)]">{unit}</span>
      </div>
      {err && (
        <p id={`${id}-err`} className="mt-1 text-[11px] text-[var(--color-ember)]">
          {err}
        </p>
      )}
    </div>
  )
}
