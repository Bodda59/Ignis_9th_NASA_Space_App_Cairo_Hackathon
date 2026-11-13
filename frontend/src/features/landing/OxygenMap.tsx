import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * 05 — Oxygen × pressure map. Points use the figures in the 2026 challenge brief.
 * The blue curve is COMPUTED: O₂ partial pressure = O₂ % × total pressure,
 * held equal to Earth sea level (21% × 14.7 psi ≈ 3.1 psi).
 */
const PSI_TO_KPA = 6.895
const EARTH_PPO2 = 0.21 * 14.7 // ≈ 3.09 psi

type Pt = { id: string; label: string; psi: number; o2: number; color: string; note: string }
const POINTS: Pt[] = [
  { id: 'earth', label: 'Earth · sea level', psi: 14.7, o2: 21, color: '#5aa6ff', note: '21% oxygen at 14.7 psi.' },
  { id: 'moon', label: 'Example lunar cabin', psi: 10.2, o2: 30, color: '#f5a54a', note: 'Illustrative case from the challenge brief: 30% oxygen at 10.2 psi.' },
  { id: 'suit', label: 'Spacesuit', psi: 4.3, o2: 100, color: '#c79bff', note: '100% oxygen at 4.3 psi, for flexibility; crews pre-breathe oxygen to avoid the bends.' },
]

// chart geometry
const W = 720
const H = 440
const M = { l: 56, r: 24, t: 24, b: 48 }
const XMAX = 16 // psi
const x = (psi: number) => M.l + (psi / XMAX) * (W - M.l - M.r)
const y = (o2: number) => H - M.b - (o2 / 100) * (H - M.t - M.b)

export function OxygenMap() {
  const [unit, setUnit] = useState<'psi' | 'kPa'>('psi')
  const [hover, setHover] = useState<string | null>('moon')
  const fmt = (psi: number) => (unit === 'psi' ? `${psi} psi` : `${(psi * PSI_TO_KPA).toFixed(0)} kPa`)

  // iso-ppO2 curve: o2% = ppO2 / P × 100
  const curve = Array.from({ length: 60 }, (_, i) => 3.1 + (i / 59) * (XMAX - 3.1))
    .map((p) => [x(p), y(Math.min(100, (EARTH_PPO2 / p) * 100))] as const)
    .map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`)
    .join(' ')

  const active = POINTS.find((p) => p.id === hover)

  return (
    <section id="context" className="relative border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-[1440px] px-6 py-24 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="label mb-5">05 — Why it matters</p>
            <h2 className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em] sm:text-4xl">
              Two numbers,
              <br />
              <span className="text-[var(--color-ember)]">different effects.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--color-ink-dim)]">
              Oxygen percentage tells you how much of the gas is oxygen. Total pressure tells you how strongly the gas pushes.
              The lunar cabin example has a higher oxygen percentage and lower total pressure than Earth sea level.
              Use both values when comparing fire experiments.
            </p>

            <div className="mt-8 space-y-2">
              {POINTS.map((p) => (
                <button
                  key={p.id}
                  onMouseEnter={() => setHover(p.id)}
                  onFocus={() => setHover(p.id)}
                  onClick={() => setHover(p.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors',
                    hover === p.id ? 'border-[var(--color-line-strong)] bg-white/[0.03]' : 'border-transparent hover:bg-white/[0.02]',
                  )}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color, boxShadow: `0 0 12px ${p.color}` }} />
                  <span className="flex-1 text-sm text-[var(--color-ink)]">{p.label}</span>
                  <span className="font-mono text-xs tabular-nums text-[var(--color-ink-dim)]">
                    {p.id === 'moon' ? '≥' : ''}
                    {p.o2}% · {p.id === 'moon' ? '≤' : ''}
                    {fmt(p.psi)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Oxygen concentration vs total pressure</p>
              <div role="radiogroup" aria-label="Pressure unit" className="flex rounded-full border border-[var(--color-line-strong)] p-0.5">
                {(['psi', 'kPa'] as const).map((u) => (
                  <button
                    key={u}
                    role="radio"
                    aria-checked={unit === u}
                    onClick={() => setUnit(u)}
                    className={cn('rounded-full px-3 py-1 font-mono text-[11px] transition-colors', unit === u ? 'bg-[var(--color-ink)] text-[var(--color-void)]' : 'text-[var(--color-ink-dim)]')}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/40 p-2">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart of oxygen percentage against total pressure for Earth, a planned Moon base and a spacesuit">
                <defs>
                  <linearGradient id="moonZone" x1="1" x2="0" y1="0" y2="0">
                    <stop offset="0%" stopColor="#f5a54a" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#f5a54a" stopOpacity="0" />
                  </linearGradient>
                  <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#f5a54a" strokeOpacity="0.18" strokeWidth="2" />
                  </pattern>
                </defs>

                {/* grid + axes */}
                {[0, 20, 40, 60, 80, 100].map((v) => (
                  <g key={`y${v}`}>
                    <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="white" strokeOpacity="0.06" />
                    <text x={M.l - 10} y={y(v) + 4} textAnchor="end" className="fill-[var(--color-ink-faint)] font-mono text-[11px]">{v}%</text>
                  </g>
                ))}
                {[0, 4, 8, 12, 16].map((v) => (
                  <g key={`x${v}`}>
                    <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} stroke="white" strokeOpacity="0.06" />
                    <text x={x(v)} y={H - M.b + 20} textAnchor="middle" className="fill-[var(--color-ink-faint)] font-mono text-[11px]">
                      {unit === 'psi' ? v : (v * PSI_TO_KPA).toFixed(0)}
                    </text>
                  </g>
                ))}
                <text x={(W + M.l) / 2} y={H - 6} textAnchor="middle" className="fill-[var(--color-ink-dim)] text-[12px]">Total pressure ({unit})</text>
                <text x={14} y={(H - M.b + M.t) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(H - M.b + M.t) / 2})`} className="fill-[var(--color-ink-dim)] text-[12px]">
                  Oxygen (%)
                </text>

                {/* Moon-base zone: ≥30% O₂, ≤10.2 psi */}
                <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}>
                  <rect x={x(0)} y={y(100)} width={x(10.2) - x(0)} height={y(30) - y(100)} fill="url(#moonZone)" />
                  <rect x={x(0)} y={y(100)} width={x(10.2) - x(0)} height={y(30) - y(100)} fill="url(#hatch)" />
                  <line x1={x(10.2)} x2={x(10.2)} y1={y(100)} y2={y(30)} stroke="#f5a54a" strokeOpacity="0.5" strokeDasharray="3 4" />
                  <line x1={x(0)} x2={x(10.2)} y1={y(30)} y2={y(30)} stroke="#f5a54a" strokeOpacity="0.5" strokeDasharray="3 4" />
                  <text x={x(10.2) - 8} y={y(96)} textAnchor="end" className="fill-[var(--color-ember)] font-mono text-[11px]">PLANNED LUNAR RANGE</text>
                </motion.g>

                {/* iso-ppO2 curve */}
                <motion.path
                  d={curve}
                  fill="none"
                  stroke="#6cc8ff"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />
                <text x={x(9.6)} y={y(12)} className="fill-[var(--color-flame)] text-[11px]">
                  same oxygen partial pressure as Earth <tspan className="fill-[var(--color-ink-faint)]">(computed)</tspan>
                </text>

                {/* points */}
                {POINTS.map((p, i) => {
                  const on = hover === p.id
                  return (
                    <g key={p.id} onMouseEnter={() => setHover(p.id)} className="cursor-pointer">
                      <motion.circle
                        cx={x(p.psi)}
                        cy={y(p.o2)}
                        fill={p.color}
                        opacity={0.15}
                        initial={{ r: 0 }}
                        whileInView={{ r: on ? 18 : 12 }}
                        animate={{ r: on ? 18 : 12 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                      />
                      <motion.circle
                        cx={x(p.psi)}
                        cy={y(p.o2)}
                        fill={p.color}
                        stroke="#08090e"
                        strokeWidth="2"
                        initial={{ r: 0 }}
                        whileInView={{ r: on ? 7 : 5.5 }}
                        animate={{ r: on ? 7 : 5.5 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.15, type: 'spring', stiffness: 260, damping: 16 }}
                      />
                      <text x={x(p.psi) + (p.id === 'suit' ? 12 : -12)} y={y(p.o2) - 12} textAnchor={p.id === 'suit' ? 'start' : 'end'} className="fill-[var(--color-ink-dim)] text-[11px]">
                        {p.id === 'earth' ? 'Earth' : p.id === 'moon' ? 'Moon base' : 'Spacesuit'}
                      </text>
                    </g>
                  )
                })}
              </svg>

              <AnimatePresence mode="wait">
                {active && (
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute right-4 top-4 max-w-[240px] rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-panel)]/95 p-3.5 backdrop-blur"
                  >
                    <p className="flex items-center gap-2 text-[13px] text-[var(--color-ink)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: active.color }} />
                      {active.label}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-dim)]">{active.note}</p>
                    <p className="mt-2 font-mono text-[11px] text-[var(--color-ink-faint)]">
                      O₂ partial pressure ≈ {((active.o2 / 100) * active.psi).toFixed(1)} psi
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Figures from the 2026 challenge brief. The blue curve is computed (O₂ % × total pressure = Earth’s ≈3.1 psi). Context only — not
              safety limits. Study test conditions will be plotted here once test-level data is imported.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
