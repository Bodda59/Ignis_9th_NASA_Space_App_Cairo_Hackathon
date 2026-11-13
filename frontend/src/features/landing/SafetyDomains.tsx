import { motion } from 'framer-motion'
import { ArrowUpRight, Flame, Radar, ShieldCheck } from 'lucide-react'
import { useRef, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'

/** Entry points by safety topic. Investigation names are those cited in the challenge brief. */
const DOMAINS = [
  {
    id: 'prevention',
    n: '01',
    title: 'Prevention',
    icon: ShieldCheck,
    color: 'var(--color-prevention)',
    text: 'Material flammability — how solids ignite and spread flame under different oxygen and airflow.',
    refs: ['BASS', 'BASS-II', 'Saffire'],
  },
  {
    id: 'detection',
    n: '02',
    title: 'Detection',
    icon: Radar,
    color: 'var(--color-detection)',
    text: 'Smoke and aerosol behaviour in microgravity, informing how spacecraft sense a fire early.',
    refs: ['SAME', 'SAME-R'],
  },
  {
    id: 'suppression',
    n: '03',
    title: 'Suppression',
    icon: Flame,
    color: 'var(--color-suppression)',
    text: 'Extinguishing flames by diluting the atmosphere — studied with burning fuel droplets.',
    refs: ['FLEX', 'FLEX-2'],
  },
] as const

export function SafetyDomains() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
      {DOMAINS.map((d, i) => (
        <DomainCard key={d.id} d={d} i={i} />
      ))}
    </div>
  )
}

function DomainCard({ d, i }: { d: (typeof DOMAINS)[number]; i: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    ref.current!.style.setProperty('--x', `${e.clientX - r.left}px`)
    ref.current!.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  const Icon = d.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[var(--color-void)]"
    >
      <Link
        ref={ref}
        to={`/explore?topic=${d.id}`}
        onPointerMove={onMove}
        className="group relative flex h-full min-h-[340px] flex-col overflow-hidden p-8"
        style={{ ['--c' as string]: d.color }}
      >
        {/* cursor spotlight */}
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(420px circle at var(--x) var(--y), color-mix(in oklab, ${d.color} 14%, transparent), transparent 60%)` }}
        />
        <div className="relative flex items-start justify-between">
          <span className="font-mono text-xs text-[var(--color-ink-faint)]">{d.n}</span>
          <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-line-strong)] transition-all duration-500 group-hover:border-[var(--c)] group-hover:shadow-[0_0_24px_-4px_var(--c)]">
            <Icon className="h-4.5 w-4.5" style={{ color: d.color }} />
          </span>
        </div>

        <h3 className="relative mt-auto font-display text-3xl font-medium uppercase tracking-[-0.02em]">
          {d.title}
        </h3>
        <p className="relative mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">{d.text}</p>

        <div className="relative mt-6 flex items-center justify-between border-t border-[var(--color-line)] pt-5">
          <div className="flex gap-2">
            {d.refs.map((r) => (
              <span key={r} className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
                {r}
              </span>
            ))}
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--color-ink-faint)] transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--c)]" />
        </div>

        {/* bottom accent line */}
        <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-x-100" style={{ background: d.color }} />
      </Link>
    </motion.div>
  )
}
