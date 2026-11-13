import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CountUp } from '@/components/fx/CountUp'
import { RevealText } from '@/components/fx/RevealText'
import { Starfield } from '@/components/fx/Starfield'
import { FlameCanvas } from './FlameCanvas'
import { HudRings } from './HudRings'

type Mode = 'earth' | 'micro'

/** Qualitative physics from the challenge brief — not experimental results. */
const NOTES: Record<Mode, { title: string; text: string; pos: string }[]> = {
  earth: [
    { title: 'Buoyancy on', text: 'Hot gases rise and pull fresh air in from below.', pos: 'left-[2%] top-[22%]' },
    { title: 'Teardrop', text: 'Convection stretches the flame upward and makes it flicker.', pos: 'right-[-8%] top-[64%]' },
  ],
  micro: [
    { title: 'No buoyancy', text: 'Without “up”, hot gases no longer rise away from the flame.', pos: 'left-[2%] top-[22%]' },
    { title: 'Diffusion-fed', text: 'Oxygen reaches the flame by diffusion — it becomes a dim blue sphere.', pos: 'right-[-8%] top-[64%]' },
  ],
}

export function Hero() {
  const [mode, setMode] = useState<Mode>('earth')
  const micro = mode === 'micro'

  // Intro: start at 1g, then "drop" into freefall.
  useEffect(() => {
    const t = setTimeout(() => setMode('micro'), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="grain relative isolate min-h-[100svh] overflow-hidden">
      {/* backdrop: nebula glows + grid + stars */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-[38%] h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          animate={{
            background: micro
              ? 'radial-gradient(circle, rgba(123,92,255,0.30), rgba(47,107,255,0.10) 45%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255,130,50,0.20), rgba(123,92,255,0.08) 45%, transparent 70%)',
          }}
          transition={{ duration: 2 }}
        />
        <div className="absolute -right-[20vmax] -top-[20vmax] h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(circle,rgba(108,200,255,0.12),transparent_65%)] blur-3xl" />
        <div className="grid-backdrop absolute inset-0" />
        <Starfield className="absolute inset-0 h-full w-full" />
      </div>

      <div className="mx-auto grid min-h-[100svh] max-w-[1440px] grid-cols-1 items-center gap-8 px-6 pb-28 pt-28 lg:grid-cols-12 lg:px-10">
        {/* Left: editorial headline */}
        <div className="relative z-10 lg:col-span-6">
          <motion.p
            className="label mb-6 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-block h-px w-8 bg-[var(--color-flame)]" />
            NASA PSI · Microgravity combustion research
          </motion.p>

          <RevealText
            lines={['Flame', 'in free—', 'fall']}
            className="whitespace-nowrap font-display text-[clamp(2.6rem,6.6vw,6.5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.04em]"
            lineClassNames={[
              undefined,
              undefined,
              'bg-gradient-to-r from-[var(--color-flame)] via-[#a99bff] to-[var(--color-nebula)] bg-clip-text text-transparent',
            ]}
          />

          <motion.p
            className="mt-8 max-w-md text-[15px] leading-relaxed text-[var(--color-ink-dim)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            Find, compare and interpret decades of NASA microgravity fire research —
            with every insight traced back to its source — for safer spacecraft,
            stations, lunar bases and rovers.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.8 }}
          >
            <a
              href="#search"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[var(--color-ink)] px-6 py-3.5 text-sm font-medium text-[var(--color-void)]"
            >
              <span className="relative z-10">Explore the research</span>
              <ArrowDownRight className="relative z-10 h-4 w-4 transition-transform duration-500 group-hover:rotate-[-45deg]" />
              <span className="absolute inset-0 -translate-x-full bg-[var(--color-flame)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0" />
            </a>
            <Link
              to="/ask"
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-6 py-3.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)]"
            >
              Ask the research
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>

        {/* Right: interactive flame instrument */}
        <motion.div
          className="relative mx-auto aspect-square w-full max-w-[560px] lg:col-span-6"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <HudRings microgravity={micro} />
          <FlameCanvas gravity={micro ? 0 : 1} className="absolute inset-[12%] h-[76%] w-[76%]" />

          {/* annotations */}
          <AnimatePresence mode="wait">
            <motion.div key={mode} className="pointer-events-none absolute inset-0">
              {NOTES[mode].map((n, i) => (
                <motion.div
                  key={n.title}
                  className={`absolute hidden max-w-[11rem] sm:block ${n.pos}`}
                  initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.15 }}
                >
                  <p className="label !text-[var(--color-ink)]">
                    <span className={micro ? 'text-[var(--color-flame)]' : 'text-[var(--color-ember)]'}>◆ </span>
                    {n.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-dim)]">{n.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* readouts */}
          <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-8 sm:gap-12">
            <Readout label="Gravity" unit="g">
              <CountUp value={micro ? 0 : 1} decimals={2} />
            </Readout>
            <Readout label="Buoyancy">{micro ? 'Off' : 'On'}</Readout>
            <Readout label="Shape">{micro ? 'Sphere' : 'Teardrop'}</Readout>
          </div>
        </motion.div>
      </div>

      {/* gravity switch */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <GravitySwitch mode={mode} onChange={setMode} />
      </div>

      <p className="label absolute bottom-9 right-10 hidden lg:block">Illustrative · not a simulation</p>
      <p className="label absolute bottom-9 left-10 hidden lg:flex lg:items-center lg:gap-2">
        <motion.span
          className="inline-block h-6 w-px bg-[var(--color-ink-faint)]"
          animate={{ scaleY: [0, 1, 0], originY: [0, 0, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        Scroll
      </p>
    </section>
  )
}

function Readout({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-light tabular-nums tracking-tight sm:text-3xl">
        {children}
        {unit && <span className="ml-1 text-sm text-[var(--color-ink-faint)]">{unit}</span>}
      </p>
      <p className="label mt-1">{label}</p>
    </div>
  )
}

function GravitySwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  // μ must stay lowercase: uppercasing it yields Greek capital Mu ("M")
  const opts: { id: Mode; label: React.ReactNode }[] = [
    { id: 'earth', label: <>1<span className="normal-case">g</span> · Earth</> },
    { id: 'micro', label: <><span className="normal-case">μg</span> · Orbit</> },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Gravity"
      className="relative flex rounded-full border border-[var(--color-line-strong)] bg-[var(--color-void)]/60 p-1 backdrop-blur-md"
    >
      {opts.map((o) => {
        const active = mode === o.id
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className="relative px-5 py-2 font-mono text-[11px] uppercase tracking-[0.12em]"
          >
            {active && (
              <motion.span
                layoutId="gravity-thumb"
                className="absolute inset-0 rounded-full"
                style={{
                  background: o.id === 'micro' ? 'var(--color-flame)' : 'var(--color-ember)',
                  boxShadow: `0 0 24px ${o.id === 'micro' ? 'rgba(108,200,255,.5)' : 'rgba(255,174,66,.5)'}`,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className={`relative z-10 font-semibold transition-colors duration-300 ${active ? 'text-[var(--color-void)]' : 'text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]'}`}>
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
