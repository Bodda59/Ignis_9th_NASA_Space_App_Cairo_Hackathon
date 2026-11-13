import { motion } from 'framer-motion'
import { CircleDashed, Info, Orbit, Split, Wrench } from 'lucide-react'
import type { ComparabilityNote } from '@/api/types'

const KIND = {
  incompatible: { icon: Split, color: 'var(--color-ember)', label: 'Not directly comparable' },
  method: { icon: Wrench, color: 'var(--color-ember)', label: 'Method differs' },
  gravity: { icon: Orbit, color: 'var(--color-nebula)', label: 'Gravity' },
  missing: { icon: CircleDashed, color: 'var(--color-ink-dim)', label: 'Missing data' },
  info: { icon: Info, color: 'var(--color-ink-faint)', label: 'Note' },
} as const

/** "Can these be considered together?" — shown above the table, never hidden. */
export function ComparabilityNotes({ notes }: { notes: ComparabilityNote[] }) {
  const blocking = notes.filter((n) => n.kind === 'incompatible' || n.kind === 'method').length
  return (
    <section aria-labelledby="comparability-h" className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-6 py-4">
        <h2 id="comparability-h" className="text-sm">Can these results be considered together?</h2>
        <span
          className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]"
          style={{
            color: blocking ? 'var(--color-ember)' : 'var(--color-ink-dim)',
            borderColor: blocking ? 'color-mix(in oklab, var(--color-ember) 40%, transparent)' : 'var(--color-line-strong)',
          }}
        >
          {blocking ? `${blocking} comparability ${blocking === 1 ? 'issue' : 'issues'}` : 'Review study conditions'}
        </span>
      </header>
      <ul className="grid gap-px bg-[var(--color-line)] md:grid-cols-2">
        {notes.map((n, i) => {
          const k = KIND[n.kind ?? 'info']
          const Icon = k.icon
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex gap-3 bg-[var(--color-void)] px-6 py-4"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: k.color }} aria-hidden="true" />
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
                <span className="sr-only">{k.label}: </span>
                {n.text}
              </p>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
