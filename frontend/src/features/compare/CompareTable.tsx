import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Split, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CompareField, CompareGroup, CompareResponse, CompareValue, SearchItem } from '@/api/types'
import { CitationChip } from '@/components/ui/CitationChip'
import { NotReported } from '@/components/ui/Evidence'
import { TopicBadge } from '@/components/ui/TopicBadge'
import { cn } from '@/lib/cn'
import { COMPARE_MAX } from './compareStore'
import { rowStatus, STATUS } from './compareStatus'
import { StudyPicker } from './StudyPicker'

const GROUPS: { id: CompareGroup; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'materials', label: 'Materials & fuels' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'findings', label: 'Findings' },
  { id: 'limitations', label: 'Limitations' },
]

type Props = {
  data: CompareResponse
  diffOnly: boolean
  onRemove: (id: string) => void
  onAdd: (s: SearchItem) => void
}

/**
 * Semantic comparison table. Study headers stick to the top on desktop;
 * the table scrolls horizontally on small screens.
 */
export function CompareTable({ data, diffOnly, onRemove, onAdd }: Props) {
  const cols = data.investigations
  const canAdd = cols.length < COMPARE_MAX
  const colCount = cols.length + (canAdd ? 1 : 0)
  const order = new Map(cols.map((c, i) => [c.id, i]))

  return (
    <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:overflow-visible lg:px-0" data-lenis-prevent-horizontal>
      <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">Side-by-side comparison of {cols.map((c) => c.acronym).join(', ')}</caption>
        <colgroup>
          <col className="w-[200px]" />
          {Array.from({ length: colCount }, (_, i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr>
            <td className="sticky top-0 z-20 bg-[var(--color-void)]/90 pb-4 align-bottom backdrop-blur-xl">
              <span className="label">Field</span>
            </td>
            {cols.map((c, i) => (
              <th key={c.id} scope="col" className="sticky top-0 z-20 bg-[var(--color-void)]/90 px-2 pb-4 align-top font-normal backdrop-blur-xl">
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative h-full min-h-[150px] overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-5"
                >
                  <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(108,200,255,0.14),transparent_65%)]" />
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{String.fromCharCode(65 + i)}</span>
                    <button
                      onClick={() => onRemove(c.id)}
                      aria-label={`Remove ${c.acronym} from comparison`}
                      className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-faint)] transition-colors hover:bg-white/5 hover:text-[var(--color-ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 font-display text-2xl font-medium uppercase tracking-[-0.02em] text-[var(--color-ink)]">{c.acronym}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-dim)]">{c.name}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">{c.safety_topics.map((t) => <TopicBadge key={t} topic={t} />)}</div>
                    <Link to={`/investigations/${c.id}`} className="inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-flame)]">
                      Study <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              </th>
            ))}
            {canAdd && (
              <td className="sticky top-0 z-30 bg-[var(--color-void)]/90 px-2 pb-4 align-top backdrop-blur-xl">
                <StudyPicker exclude={cols.map((c) => c.id)} onPick={onAdd} />
              </td>
            )}
          </tr>
        </thead>

        {GROUPS.map((g) => {
          const rows = data.fields.filter((f) => (f.group ?? 'overview') === g.id && (!diffOnly || rowStatus(f) !== 'same'))
          if (!rows.length) return null
          return (
            <tbody key={g.id}>
              <tr>
                <th colSpan={colCount + 1} scope="colgroup" className="pb-3 pt-10 text-left font-normal">
                  <span className="label">{g.label}</span>
                </th>
              </tr>
              <AnimatePresence initial={false}>
                {rows.map((f) => (
                  <FieldRow key={f.key} field={f} order={order} extra={canAdd} />
                ))}
              </AnimatePresence>
            </tbody>
          )
        })}
      </table>
    </div>
  )
}

function FieldRow({ field, order, extra }: { field: CompareField; order: Map<string, number>; extra: boolean }) {
  const values = [...field.values].sort((a, b) => (order.get(a.investigation_id) ?? 0) - (order.get(b.investigation_id) ?? 0))
  const status = rowStatus(field)
  const highlight = status === 'differs' || status === 'incompatible'
  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <th scope="row" className={cn('relative border-t border-[var(--color-line)] py-4 pr-4 align-top text-sm font-normal', highlight ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]')}>
        {highlight && <span className="absolute -left-4 top-4 h-5 w-[2px] rounded-full bg-[var(--color-flame)] lg:-left-5" aria-hidden="true" />}
        {field.label}
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: STATUS[status].color }}>
            {status === 'incompatible' && <Split className="h-3 w-3" />}
            {STATUS[status].text}
          </span>
        </span>
      </th>
      {values.map((v) => (
        <td key={v.investigation_id} className="border-t border-[var(--color-line)] px-4 py-4 align-top transition-colors group-hover:bg-white/[0.015]">
          <ValueCell v={v} />
        </td>
      ))}
      {extra && <td className="border-t border-[var(--color-line)]" />}
    </motion.tr>
  )
}

function ValueCell({ v }: { v: CompareValue }) {
  const cites = v.citation_ids.length > 0 && (
    <span className="whitespace-nowrap">{[...new Set(v.citation_ids)].map((id) => <CitationChip key={id} id={id} />)}</span>
  )
  const val = v.value
  if (val === null) return <NotReported reason={v.missing_reason ?? undefined} />

  if (Array.isArray(val)) {
    return (
      <ul className="space-y-1.5">
        {val.map((x, i) => (
          <li key={i} className="text-[13px] leading-snug text-[var(--color-ink)]/90">
            {val.length > 1 && <span className="mr-1.5 text-[var(--color-ink-faint)]">·</span>}
            {x}
            {i === val.length - 1 && cites}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof val === 'object') {
    // reported range — shown exactly as reported, never averaged
    const txt = val.min !== undefined && val.max !== undefined
      ? val.min === val.max ? `${val.min}` : `${val.min} – ${val.max}`
      : val.max !== undefined ? `up to ${val.max}` : `from ${val.min}`
    return (
      <span className="font-mono text-[15px] tabular-nums text-[var(--color-ink)]">
        {txt}
        {v.unit && <span className="ml-1 text-[11px] text-[var(--color-ink-faint)]">{v.unit}</span>}
        {cites}
      </span>
    )
  }
  if (typeof val === 'number') {
    return (
      <span className="font-display text-2xl font-light tabular-nums">
        {val}
        {v.unit && <span className="ml-1 text-xs text-[var(--color-ink-faint)]">{v.unit}</span>}
        {cites}
      </span>
    )
  }
  return (
    <p className="text-[13px] leading-relaxed text-[var(--color-ink)]/90">
      {val}
      {cites}
    </p>
  )
}

