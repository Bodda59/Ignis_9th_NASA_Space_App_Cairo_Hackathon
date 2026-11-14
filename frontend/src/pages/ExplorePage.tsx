import { AnimatePresence, motion } from 'framer-motion'
import { Info, TriangleAlert, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api, recent } from '@/api/client'
import type { SearchRequest } from '@/api/types'
import { CountUp } from '@/components/fx/CountUp'
import { RevealText } from '@/components/fx/RevealText'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateMessage } from '@/components/ui/StateMessage'
import { ContextBar } from '@/features/habitat/ContextBar'
import { ResultCard } from '@/features/rank/ResultCard'
import { FilterPanel } from '@/features/search/FilterPanel'
import { TopicObjects } from '@/features/search/TopicObjects'
import { SearchCommand } from '@/features/search/SearchCommand'
import { PAGE_SIZE, useSearchState } from '@/features/search/useSearchState'
import { useAsync } from '@/hooks/useAsync'
import { CONDITION_LABEL, EQUIPMENT_LABEL, GRAVITY_LABEL, TOPIC } from '@/lib/labels'

export function ExplorePage() {
  const s = useSearchState()

  const req: SearchRequest = useMemo(
    () => ({ query: s.query, filters: s.filters, context: s.context, page: s.page, page_size: PAGE_SIZE }),
    [s.query, s.filters, s.context, s.page],
  )
  const reqKey = JSON.stringify(req)

  const filters = useAsync((sig) => api.filters(sig), 'filters', recent.filters())
  const search = useAsync((sig) => api.search(req, sig), reqKey, recent.search(req))

  const ranked = !!s.query.trim() || Object.keys(s.context).length > 0
  const data = search.data
  const firstLoad = search.status === 'loading' && !data
  const refreshing = search.status === 'loading' && !!data

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-40 pt-28 lg:px-10">
      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label mb-4">Search · Rank · Habitat context</p>
          <RevealText
            lines={['Explore']}
            className="font-display text-[clamp(2.8rem,6vw,5.5rem)] font-semibold uppercase leading-none tracking-[-0.04em]"
          />
        </div>
        <TopicObjects active={s.filters.safety_topics ?? []} onToggle={(t) => s.toggleIn('topic', t)} />
        <div className="text-right" aria-live="polite">
          <p className="font-display text-5xl font-light tabular-nums tracking-tight">
            {data ? <CountUp value={data.total} /> : '—'}
          </p>
          <p className="label mt-1">{data?.total === 1 ? 'Investigation' : 'Investigations'}</p>
        </div>
      </header>

      <div className="mt-10">
        <SearchCommand compact initial={s.query} showExamples={false} onSubmit={(q) => s.update({ q: q || null })} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
        {/* filters */}
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2" data-lenis-prevent>
          {filters.status === 'error' ? (
            <div className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-xs text-[var(--color-ink-dim)]">
              Filters couldn’t load. <button onClick={filters.retry} className="underline">Retry</button>
            </div>
          ) : (
            <FilterPanel meta={filters.data} s={s} />
          )}
        </aside>

        {/* results */}
        <section aria-labelledby="results-h" className="min-w-0 space-y-5">
          <h2 id="results-h" className="sr-only">Results</h2>
          <ContextBar s={s} />

          {/* toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="flex items-center gap-2 text-xs text-[var(--color-ink-dim)]">
              <Info className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
              {ranked ? (
                <>Ordered by <strong className="font-medium text-[var(--color-ink)]">research relevance</strong> — not fire danger or safety.</>
              ) : (
                <>Browsing all studies A–Z. Search or add context to rank by relevance.</>
              )}
            </p>
            <ActiveFilters s={s} />
          </div>

          {/* warnings — never hide ignored or unindexed filters */}
          <AnimatePresence>
            {data?.warnings.map((w) => (
              <motion.div
                key={w.code + w.field}
                role="status"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-ember)]/30 bg-[var(--color-ember)]/[0.06] px-4 py-3 text-[13px] text-[var(--color-ink)]">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ember)]" />
                  <span>
                    {w.message}
                    {w.code === 'GRAVITY_GAP' && <> <Link to="/gravity" className="text-[var(--color-flame)] hover:underline">See the partial-gravity evidence</Link></>}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* loading bar while refreshing */}
          <div className="relative h-px overflow-hidden">
            {refreshing && (
              <motion.span
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--color-flame)] to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>

          {search.status === 'error' && (
            <StateMessage
              tone="error"
              title="Search unavailable"
              message={`${search.error.message} Your query and filters are kept.`}
              onRetry={search.error.retryable || search.error.status === 0 ? search.retry : undefined}
            />
          )}

          {firstLoad && <ResultSkeletons />}

          {search.status !== 'error' && data && data.items.length === 0 && (
            <StateMessage
              tone="empty"
              title="No matching studies"
              message={
                s.activeFilterCount
                  ? 'No investigation matches every filter. Filters within a category are OR, across categories AND — try removing one.'
                  : 'Nothing in the collection matches those words. Try a broader term or one of the example questions.'
              }
              action={
                s.activeFilterCount > 0 ? (
                  <Button size="sm" variant="primary" onClick={s.resetFilters}>Reset filters</Button>
                ) : undefined
              }
            />
          )}

          {search.status !== 'error' && data && data.items.length > 0 && (
            <motion.ol className={refreshing ? 'space-y-4 opacity-60 transition-opacity' : 'space-y-4 transition-opacity'} layout>
              <AnimatePresence mode="popLayout">
                {data.items.map((it, i) => (
                  <motion.li key={it.id} layout exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}>
                    <ResultCard item={it} rank={(data.page - 1) * data.page_size + i + 1} ranked={ranked} index={i} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ol>
          )}

          {data && (
            <Pagination
              page={data.page}
              total={data.total}
              pageSize={data.page_size}
              onPage={(p) => {
                s.update({ page: p === 1 ? null : p })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function ActiveFilters({ s }: { s: ReturnType<typeof useSearchState> }) {
  const f = s.filters
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  f.safety_topics?.forEach((v) => chips.push({ key: `t${v}`, label: TOPIC[v].label, onRemove: () => s.toggleIn('topic', v) }))
  f.equipment_categories?.forEach((v) => chips.push({ key: `e${v}`, label: EQUIPMENT_LABEL[v], onRemove: () => s.toggleIn('equipment', v) }))
  f.fuel_types?.forEach((v) => chips.push({ key: `f${v}`, label: v.charAt(0).toUpperCase() + v.slice(1), onRemove: () => s.toggleIn('fuel', v) }))
  f.materials?.forEach((v) => chips.push({ key: `m${v}`, label: v, onRemove: () => s.toggleIn('material', v) }))
  f.gravity_regimes?.forEach((v) => chips.push({ key: `g${v}`, label: GRAVITY_LABEL[v], onRemove: () => s.toggleIn('gravity', v) }))
  ;([['oxygen_pct', 'o2', '%'], ['pressure_kpa', 'p', 'kPa'], ['airflow_m_s', 'af', 'm/s']] as const).forEach(([k, p, u]) => {
    const r = f[k]
    if (r) chips.push({ key: k, label: `${CONDITION_LABEL[k]} ${r.min ?? '…'}–${r.max ?? '…'} ${u}`, onRemove: () => s.update({ [`${p}_min`]: null, [`${p}_max`]: null }) })
  })
  if (!chips.length) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Active filters">
      <AnimatePresence>
        {chips.map((c) => (
          <motion.li key={c.key} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
            <button
              onClick={c.onRemove}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] py-1 pl-2.5 pr-1.5 text-[11px] text-[var(--color-ink)] transition-colors hover:bg-white/10"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label}
              <X className="h-3 w-3 text-[var(--color-ink-faint)]" />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

function ResultSkeletons() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-6 rounded-2xl border border-[var(--color-line)] p-7 md:grid-cols-[72px_1fr]">
          <Skeleton className="h-9 w-12" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3.5 w-72" />
            <Skeleton className="mt-4 h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <div className="grid gap-3 pt-4 lg:grid-cols-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
