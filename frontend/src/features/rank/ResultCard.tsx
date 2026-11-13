import { motion } from 'framer-motion'
import { ArrowUpRight, Check, CircleCheck, FileText, Orbit, Plus, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { RelevanceNote, SearchItem } from '@/api/types'
import { TopicBadge } from '@/components/ui/TopicBadge'
import { useCompare } from '@/features/compare/compareStore'
import { useSpotlight } from '@/hooks/useSpotlight'
import { cn } from '@/lib/cn'

type Props = { item: SearchItem; rank: number; ranked: boolean; index: number }

/**
 * One ranked investigation (F02). Order comes from the API and is never changed here.
 * Shows WHY it matched and WHERE it doesn't — no score, gauge or percentage.
 */
export function ResultCard({ item, rank, ranked, index }: Props) {
  const cmp = useCompare()
  const selected = cmp.has(item.id)
  const disabled = !selected && cmp.full
  const { ref, onPointerMove } = useSpotlight<HTMLElement>()
  const { reasons, mismatches } = item.relevance
  // gravity gaps are always listed first so they can't be overlooked
  const sortedMismatches = [...mismatches].sort((a, b) => Number(b.kind === 'gravity') - Number(a.kind === 'gravity'))

  return (
    <motion.article
      ref={ref}
      onPointerMove={onPointerMove}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-[var(--color-panel)]/50 transition-colors duration-500',
        selected ? 'border-[var(--color-flame)]/50' : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
      )}
      aria-labelledby={`r-${item.id}`}
    >
      {/* spotlight */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(520px circle at var(--x) var(--y), rgba(108,200,255,0.06), transparent 60%)' }}
      />

      <div className="relative grid gap-6 p-6 md:grid-cols-[72px_1fr] lg:p-7">
        {/* rank */}
        <div className="flex items-start gap-3 md:flex-col md:gap-1">
          <span className="font-display text-4xl font-light tabular-nums leading-none text-[var(--color-ink-faint)] transition-colors duration-500 group-hover:text-[var(--color-ink)]">
            {String(rank).padStart(2, '0')}
          </span>
          <span className="label mt-1">{ranked ? 'Rank' : 'A–Z'}</span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id={`r-${item.id}`} className="font-display text-2xl font-medium uppercase tracking-[-0.02em]">
                <Link to={`/investigations/${item.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {item.acronym}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-[var(--color-ink-dim)]">{item.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.safety_topics.length ? (
                item.safety_topics.map((t) => <TopicBadge key={t} topic={t} />)
              ) : (
                <span className="rounded-full border border-dashed border-[var(--color-line)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
                  No safety topic tagged
                </span>
              )}
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--color-ink)]/85"><SearchSnippet item={item} /></p>

          {item.material_labels.length > 0 && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">
              {item.material_labels.join('  ·  ')}
            </p>
          )}

          {(reasons.length > 0 || mismatches.length > 0) && (
            <div className="mt-5 grid gap-4 border-t border-[var(--color-line)] pt-5 lg:grid-cols-2">
              <NoteList title="Why it’s relevant" notes={reasons} tone="match" />
              <NoteList title="Gaps & mismatches" notes={sortedMismatches} tone="gap" />
            </div>
          )}

          <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-ink-faint)]">
              <FileText className="h-3.5 w-3.5" />
              {item.source_count} {item.source_count === 1 ? 'source' : 'sources'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => cmp.toggle({ id: item.id, acronym: item.acronym, name: item.name })}
                disabled={disabled}
                aria-pressed={selected}
                title={disabled ? 'Compare holds up to 3 studies — remove one first' : undefined}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35',
                  selected
                    ? 'border-[var(--color-flame)] bg-[var(--color-flame)]/10 text-[var(--color-flame)]'
                    : 'border-[var(--color-line-strong)] text-[var(--color-ink-dim)] hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]',
                )}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {selected ? 'In compare' : 'Compare'}
              </button>
              <Link
                to={`/investigations/${item.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 text-xs font-medium text-[var(--color-void)] transition-colors hover:bg-[var(--color-flame)]"
              >
                Open study
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function SearchSnippet({ item }: { item: SearchItem }) {
  const matches = item.snippet_matches
  if (!matches?.length) return item.summary_snippet
  const text = Array.from(item.summary_snippet)
  const parts = []
  let end = 0
  for (const match of matches) {
    parts.push(text.slice(end, match.start).join(''), <mark key={match.start} className="rounded-sm bg-[var(--color-flame)]/20 text-[var(--color-ink)]">{text.slice(match.start, match.end).join('')}</mark>)
    end = match.end
  }
  return [...parts, text.slice(end).join('')]
}

function NoteList({ title, notes, tone }: { title: string; notes: RelevanceNote[]; tone: 'match' | 'gap' }) {
  return (
    <div>
      <p className="label mb-2.5">{title}</p>
      {notes.length === 0 ? (
        <p className="text-xs text-[var(--color-ink-faint)]">{tone === 'match' ? 'No specific match reasons' : 'None reported for this query'}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n, i) => {
            const Icon = tone === 'match' ? CircleCheck : n.kind === 'gravity' ? Orbit : TriangleAlert
            const color = tone === 'match' ? 'var(--color-prevention)' : 'var(--color-ember)'
            return (
              <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-[var(--color-ink-dim)]">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />
                <span>
                  <span className="sr-only">{tone === 'match' ? 'Match: ' : 'Gap: '}</span>
                  {n.text}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
