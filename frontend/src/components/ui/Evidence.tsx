import { CircleDashed, FileCheck2, FlaskConical, Sparkles, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

type Kind = 'documented' | 'interpretation' | 'not_reported' | 'gap' | 'synthetic'

const KIND: Record<Kind, { label: string; color: string; icon: typeof FileCheck2 }> = {
  documented: { label: 'Documented finding', color: 'var(--color-prevention)', icon: FileCheck2 },
  interpretation: { label: 'AI interpretation', color: 'var(--color-nebula)', icon: Sparkles },
  not_reported: { label: 'Not reported', color: 'var(--color-ink-faint)', icon: CircleDashed },
  gap: { label: 'Evidence gap', color: 'var(--color-ember)', icon: TriangleAlert },
  synthetic: { label: 'Synthetic fixture', color: 'var(--color-ember)', icon: FlaskConical },
}

/** Always icon + text — never color alone. */
export function EvidenceBadge({ kind, className }: { kind: Kind; className?: string }) {
  const k = KIND[kind]
  const Icon = k.icon
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em]', className)}
      style={{ color: k.color, borderColor: `color-mix(in oklab, ${k.color} 35%, transparent)` }}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {k.label}
    </span>
  )
}

/** Inline marker for an unknown value. Unknown is never shown as 0 or blank. */
export function NotReported({ reason, compact }: { reason?: string; compact?: boolean }) {
  return (
    <span
      title={reason ?? 'Not reported in the source'}
      className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] italic text-[var(--color-ink-faint)]"
    >
      <CircleDashed className="h-3 w-3 shrink-0" aria-hidden="true" />
      {compact ? 'n/r' : 'Not reported'}
      {reason && <span className="sr-only">: {reason}</span>}
    </span>
  )
}
