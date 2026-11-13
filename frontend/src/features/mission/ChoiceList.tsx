import { AnimatePresence, motion } from 'framer-motion'
import { Check, Lightbulb } from 'lucide-react'
import { cn, EASE_OUT } from '@/lib/cn'
import type { Option } from './mission'

/** One decision: a radio group of option cards. The "why" appears once an option is picked. */
export function ChoiceList<T extends string>({ legend, options, value, onChoose }: {
  legend: string
  options: Option<T>[]
  value: T | undefined
  onChoose: (id: T) => void
}) {
  const chosen = options.find((o) => o.id === value)
  return (
    <div>
      <div role="radiogroup" aria-label={legend} className="grid gap-3">
        {options.map((o) => {
          const selected = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChoose(o.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-colors duration-300',
                selected
                  ? 'border-[var(--color-flame)] bg-[color-mix(in_oklab,var(--color-flame)_10%,transparent)]'
                  : 'border-[var(--color-line-strong)] hover:border-[var(--color-flame)]/60',
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-[15px] font-medium text-[var(--color-ink)]">{o.title}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
                    selected ? 'border-[var(--color-flame)] bg-[var(--color-flame)] text-[var(--color-void)]' : 'border-[var(--color-line-input)]',
                  )}
                >
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </span>
              </span>
              <span className="mt-1 block font-mono text-[12px] tabular-nums text-[var(--color-flame)]">{o.spec}</span>
              <span className="mt-2 block text-sm leading-relaxed text-[var(--color-ink-dim)]">{o.blurb}</span>
            </button>
          )
        })}
      </div>

      <div aria-live="polite">
        <AnimatePresence mode="wait">
          {chosen && (
            <motion.p
              key={chosen.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="mt-4 flex gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-4 text-sm leading-relaxed text-[var(--color-ink-dim)]"
            >
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--color-flame)]" aria-hidden="true" />
              <span><strong className="font-medium text-[var(--color-ink)]">Why it matters. </strong>{chosen.why}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
