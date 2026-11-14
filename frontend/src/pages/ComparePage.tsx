import { motion } from 'framer-motion'
import { MessageSquareText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { SearchItem } from '@/api/types'
import { RevealText } from '@/components/fx/RevealText'
import { ButtonLink } from '@/components/ui/Button'
import { CitationCtx, indexCitations } from '@/components/ui/citations'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateMessage } from '@/components/ui/StateMessage'
import { ComparabilityNotes } from '@/features/compare/ComparabilityNotes'
import { CompareTable } from '@/features/compare/CompareTable'
import { rowStatus } from '@/features/compare/compareStatus'
import { COMPARE_MAX, COMPARE_MIN, useCompare } from '@/features/compare/compareStore'
import { StudyPicker } from '@/features/compare/StudyPicker'
import { SourcesList } from '@/features/summarize/SourcesList'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const cmp = useCompare()
  const [diffOnly, setDiffOnly] = useState(false)

  // URL is the source of truth: ?ids=a,b,c (deduped, max 3)
  const ids = useMemo(
    () => [...new Set((params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean))].slice(0, COMPARE_MAX),
    [params],
  )
  const setIds = (next: string[]) => setParams(next.length ? { ids: next.join(',') } : {}, { replace: false })

  const ready = ids.length >= COMPARE_MIN
  const res = useAsync((sig) => (ready ? api.compare(ids, sig) : Promise.resolve(null)), ids.join(','))
  const data = res.data && res.status !== 'error' ? res.data : null

  // keep the global compare selection in sync with what is on screen
  const { replace } = cmp
  useEffect(() => {
    if (data) replace(data.investigations.map(({ id, acronym, name }) => ({ id, acronym, name })))
  }, [data, replace])

  const idx = useMemo(() => indexCitations(data?.citations ?? []), [data])

  const add = (s: SearchItem) => {
    if (ids.includes(s.id) || ids.length >= COMPARE_MAX) return
    setIds([...ids, s.id])
    if (!cmp.has(s.id)) cmp.toggle({ id: s.id, acronym: s.acronym, name: s.name })
  }
  const remove = (id: string) => {
    setIds(ids.filter((x) => x !== id))
    cmp.remove(id)
  }

  return (
    <CitationCtx.Provider value={idx}>
      <div className="mx-auto max-w-[1440px] px-6 pb-40 pt-28 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label mb-4">Side by side · 2–3 studies</p>
            <RevealText
              lines={['Compare']}
              className="font-display text-[clamp(2.8rem,6vw,5.5rem)] font-semibold uppercase leading-none tracking-[-0.04em]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data && (
              <DiffToggle on={diffOnly} onChange={setDiffOnly} count={data.fields.filter((f) => rowStatus(f) !== 'same').length} />
            )}
            {data && (
              <ButtonLink to={`/ask?ids=${ids.join(',')}`} variant="primary" iconLeft={<MessageSquareText className="h-4 w-4" />}>
                Ask about these studies
              </ButtonLink>
            )}
          </div>
        </header>

        <div className="mt-12">
          {!ready && <SelectionStart ids={ids} labels={cmp.items} onAdd={add} onRemove={remove} />}

          {ready && res.status === 'error' && (
            <StateMessage
              tone="error"
              title={res.error.status === 400 || res.error.status === 404 ? 'Can’t compare this selection' : 'Comparison unavailable'}
              message={res.error.message}
              onRetry={res.error.retryable ? res.retry : undefined}
              action={<ButtonLink to="/explore" size="sm" variant="outline">Pick studies in Explore</ButtonLink>}
            />
          )}

          {ready && res.status === 'loading' && !data && <CompareSkeleton cols={ids.length} />}

          {data && (
            <div className={cn('space-y-10 transition-opacity', res.status === 'loading' && 'opacity-60')}>
              <ComparabilityNotes notes={data.comparability_notes} />
              <CompareTable data={data} diffOnly={diffOnly} onRemove={remove} onAdd={add} />
              {data.citations.length > 0 && (
                <section aria-labelledby="sources-h" className="pt-6">
                  <h2 id="sources-h" className="label mb-4">Sources</h2>
                  <SourcesList citations={data.citations} />
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </CitationCtx.Provider>
  )
}

/** Fewer than 2 studies: guide the user to build a selection in place. */
function SelectionStart({ ids, labels, onAdd, onRemove }: { ids: string[]; labels: { id: string; acronym: string; name: string }[]; onAdd: (s: SearchItem) => void; onRemove: (id: string) => void }) {
  return (
    <div>
      <p className="mb-8 max-w-xl text-[15px] leading-relaxed text-[var(--color-ink-dim)]">
        Choose at least two studies. We’ll line up their objectives, materials, conditions, measurements, findings and
        limitations — and flag where results can’t be treated as equivalent.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: COMPARE_MAX }, (_, i) => {
          const id = ids[i]
          const label = labels.find((l) => l.id === id)
          if (id) {
            return (
              <motion.div key={id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-[var(--color-flame)]/40 bg-[var(--color-flame)]/[0.05] p-5">
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{String.fromCharCode(65 + i)}</span>
                <div>
                  <p className="font-display text-2xl font-medium uppercase">{label?.acronym ?? id}</p>
                  {label && <p className="mt-1 text-xs text-[var(--color-ink-dim)]">{label.name}</p>}
                  <button onClick={() => onRemove(id)} className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">Remove</button>
                </div>
              </motion.div>
            )
          }
          return (
            <div key={`slot-${i}`} className={i === ids.length ? '' : 'pointer-events-none opacity-40'}>
              <StudyPicker exclude={ids} onPick={onAdd} variant="hero" />
            </div>
          )
        })}
      </div>
      <p className="label mt-6">{ids.length} of {COMPARE_MIN} required · up to {COMPARE_MAX}</p>
    </div>
  )
}

function DiffToggle({ on, onChange, count }: { on: boolean; onChange: (v: boolean) => void; count: number }) {
  // knob: page color on the accent track when on, a mid tone when off
  const knob = useTheme() === 'light' ? { on: '#c5cedd', off: '#435275' } : { on: '#08090e', off: '#a7aec0' }
  return (
    <button
      role="switch"
      data-guide-action="compare"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex h-11 items-center gap-3 rounded-full border border-[var(--color-line-strong)] pl-2 pr-4 text-sm transition-colors hover:border-[var(--color-ink-dim)]"
    >
      <span className={cn('relative h-6 w-10 rounded-full transition-colors duration-300', on ? 'bg-[var(--color-flame)]' : 'bg-white/10')}>
        <motion.span
          className="absolute top-1 h-4 w-4 rounded-full bg-[var(--color-void)]"
          animate={{ left: on ? 20 : 4, backgroundColor: on ? knob.on : knob.off }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
      Differences only
      <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{count}</span>
    </button>
  )
}

function CompareSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading comparison">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${cols}, 1fr)` }}>
        <span />
        {Array.from({ length: cols }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        {Array.from({ length: 4 * (cols + 1) }, (_, i) => <Skeleton key={`r${i}`} className="h-12" />)}
      </div>
    </div>
  )
}
