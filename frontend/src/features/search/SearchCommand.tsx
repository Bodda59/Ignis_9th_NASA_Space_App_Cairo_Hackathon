import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useAudience } from '@/features/audience/audience'
import { cn } from '@/lib/cn'

const EXAMPLES = [
  'Which experiments studied smoke detection in microgravity?',
  'Fabric flammability in an oxygen-rich habitat',
  'How does airflow change flame spread over solids?',
  'What suppressed burning fuel droplets?',
]

const MAX = 300

type Props = {
  /** current query (controlled from URL on Explore) */
  initial?: string
  /** defaults to navigating to /explore?q= */
  onSubmit?: (q: string) => void
  compact?: boolean
  showExamples?: boolean
}

/** Command-style search with an animated border and cycling example questions. */
export function SearchCommand({ initial = '', onSubmit, compact = false, showExamples = true }: Props) {
  const nav = useNavigate()
  const [q, setQ] = useState(initial)
  const [focused, setFocused] = useState(false)
  const [ex, setEx] = useState(0)
  const [suggestion, setSuggestion] = useState<{ query: string; terms: string[] }>()
  const audience = useAudience()
  const terms = suggestion?.query === q.trim() ? suggestion.terms : []
  useEffect(() => {
    const query = q.trim()
    if (!focused || query.length < 2 || query.length > 60) return
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => {
      api.autocomplete(query, 4, ctrl.signal)
        .then((data) => { if (!ctrl.signal.aborted) setSuggestion({ query, terms: data.items.map((item) => item.text) }) })
        .catch(() => { if (!ctrl.signal.aborted) setSuggestion(undefined) })
    }, 230)
    return () => { window.clearTimeout(timer); ctrl.abort() }
  }, [q, focused, audience])

  // keep in sync when the URL changes (back/forward) — derived during render, no effect
  const [prevInitial, setPrevInitial] = useState(initial)
  if (prevInitial !== initial) {
    setPrevInitial(initial)
    setQ(initial)
  }

  useEffect(() => {
    if (q || focused) return
    const t = setInterval(() => setEx((i) => (i + 1) % EXAMPLES.length), 3600)
    return () => clearInterval(t)
  }, [q, focused])

  const submit = (value: string) => {
    const v = value.trim()
    if (onSubmit) onSubmit(v)
    else nav(v ? `/explore?q=${encodeURIComponent(v)}` : '/explore')
  }

  const text = compact ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'

  return (
    <div>
      <form
        role="search"
        data-guide-action="explore"
        onSubmit={(e) => {
          e.preventDefault()
          submit(q)
        }}
        className="group relative"
        onFocus={() => setFocused(true)}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
        onKeyDown={(event) => { if (event.key === 'Escape') setFocused(false) }}
      >
        <div className={cn('absolute -inset-px overflow-hidden rounded-2xl transition-opacity duration-500', focused ? 'opacity-90' : 'opacity-50')}>
          <motion.div
            className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'conic-gradient(transparent 0deg, #6cc8ff 50deg, #7b5cff 110deg, transparent 180deg)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div
          className={cn(
            'relative flex items-center gap-4 rounded-2xl border bg-[var(--color-panel)] transition-colors duration-300',
            compact ? 'px-5 py-3.5' : 'px-5 py-5 sm:px-7 sm:py-6',
            focused ? 'border-[var(--color-flame)] ring-2 ring-[var(--color-flame)]/25' : 'border-[var(--color-line-input)]',
          )}
        >
          <Search className="h-5 w-5 shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
          <label htmlFor={compact ? 'q-compact' : 'q'} className="sr-only">
            Search investigations by keyword or question
          </label>
          <div className="relative flex-1">
            <input
              id={compact ? 'q-compact' : 'q'}
              value={q}
              maxLength={MAX}
              onChange={(e) => setQ(e.target.value)}
              className={cn('w-full bg-transparent text-[var(--color-ink)] outline-none', text)}
              autoComplete="off"
            />
            {!q && (
              <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={ex}
                    className={cn('truncate text-[var(--color-ink-faint)]', text)}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -24, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {EXAMPLES[ex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </div>
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQ('')
                submit('')
              }}
              className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-faint)] transition-colors hover:bg-white/5 hover:text-[var(--color-ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="hidden items-center gap-2 rounded-lg border border-[var(--color-line-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)] sm:flex"
          >
            Search <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </div>
        {focused && terms.length > 0 && <ul aria-label="Search suggestions" className="relative mt-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-1">
          {terms.map((term) => <li key={term}><button type="button" className="w-full rounded-lg px-4 py-2 text-left text-sm hover:bg-white/5"
            onClick={() => { setQ(term); setFocused(false); submit(term) }}>{term}</button></li>)}
        </ul>}
      </form>

      {showExamples && (
        <div className="mt-5 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => {
                setQ(e)
                submit(e)
              }}
              className="rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-xs text-[var(--color-ink-dim)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
