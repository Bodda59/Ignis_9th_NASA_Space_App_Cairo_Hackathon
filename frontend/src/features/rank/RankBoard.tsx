import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Rocket } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export type BoardItem = {
  id: string
  rank: number
  name: string
  /** 0–1 position of this result between the weakest and strongest in the list. */
  signal: number
  /** The real value behind the meter, e.g. "0.0328" or "12 records". */
  value: string
  /** What the meter measures, e.g. "Top source relevance 0.0328". */
  signalLabel: string
  /** Short facts shown on the card, e.g. "4 / 6 collections". */
  tags: string[]
  detail: ReactNode
}

/**
 * Ranked results as cards that expand downward in place. Opening a card mounts its
 * detail, so the branch lines in the source map draw down from the rank hub.
 */
export function RankBoard({ items, meterNote }: { items: BoardItem[]; meterNote: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(items[0] ? [items[0].id] : []))
  const toggle = (id: string) => setOpen((o) => {
    const next = new Set(o)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return (
    <div>
      <p className="mb-3 text-xs text-[var(--color-ink-faint)]">{meterNote}</p>
      <ol className="space-y-3">
        {items.map((item, i) => (
          <motion.li key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }}>
            <Card item={item} open={open.has(item.id)} onToggle={() => toggle(item.id)} />
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

function Card({ item, open, onToggle }: { item: BoardItem; open: boolean; onToggle: () => void }) {
  const panel = useId()
  return (
    <div className={cn('overflow-hidden rounded-2xl border transition-[border-color,box-shadow,background-color] duration-300',
      open ? 'border-[var(--color-flame)]/45 bg-[var(--color-panel)]/80 shadow-[0_0_44px_-22px_var(--color-flame)]'
        : 'border-[var(--color-line)] bg-[var(--color-panel)]/60 hover:border-[var(--color-line-strong)]')}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panel}
        className="group flex w-full items-start gap-4 p-4 text-left sm:p-5">
        <RankBadge rank={item.rank} on={open} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={cn('text-[15px] font-medium leading-snug sm:text-base', open ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)] group-hover:text-[var(--color-ink)]')}>
              {item.name}
            </p>
            <span className={cn('shrink-0 font-mono text-xs tabular-nums', open ? 'text-[var(--color-flame)]' : 'text-[var(--color-ink-faint)]')}>{item.value}</span>
          </div>
          <SignalTrack value={item.signal} on={open} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full border border-[var(--color-line)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-ink-faint)]">{t}</span>
            ))}
          </div>
        </div>
        <ChevronDown className={cn('mt-1 size-4 shrink-0 text-[var(--color-ink-faint)] transition-transform duration-300', open && 'rotate-180 text-[var(--color-flame)]')} aria-hidden="true" />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panel} className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
            <div className="space-y-3 border-t border-[var(--color-line)] px-4 pb-5 pt-4 text-sm leading-relaxed text-[var(--color-ink-dim)] sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{item.signalLabel}</span>
                <Link to={'/investigations/' + encodeURIComponent(item.id)} className="inline-flex items-center gap-1 text-sm text-[var(--color-flame)] hover:underline">
                  Open the study <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              {item.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Hexagon rank badge. */
function RankBadge({ rank, on }: { rank: number; on: boolean }) {
  return (
    <span className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0" aria-hidden="true">
        <path d="M24 3 L42 13.5 V34.5 L24 45 L6 34.5 V13.5 Z" fill={on ? 'rgba(108,200,255,0.14)' : 'rgba(255,255,255,0.03)'}
          stroke={on ? '#6cc8ff' : 'rgba(255,255,255,0.18)'} strokeWidth="1.5" />
      </svg>
      <span className={cn('relative font-display text-lg', on ? 'text-[var(--color-flame)]' : 'text-[var(--color-ink)]')}>
        <span className="sr-only">Rank </span>{rank}
      </span>
    </span>
  )
}

/** Thin "trajectory" track with a rocket at the signal position. */
function SignalTrack({ value, on }: { value: number; on: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="relative mr-2 mt-3 h-5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Position between the weakest and strongest result">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_4px,transparent_4px_8px)]" />
      <motion.div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[var(--color-nebula)] to-[var(--color-flame)]"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ boxShadow: on ? '0 0 12px var(--color-flame)' : undefined }} />
      <motion.span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ left: '0%' }} animate={{ left: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
        <Rocket className={cn('size-3.5 rotate-45', on ? 'text-[var(--color-flame)]' : 'text-[var(--color-ink-dim)]')} aria-hidden="true" />
      </motion.span>
    </div>
  )
}
