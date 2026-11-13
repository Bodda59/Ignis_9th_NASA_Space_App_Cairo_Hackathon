import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CountUp } from '@/components/fx/CountUp'
import { HABITATS } from './habitats'

/** degrees between labels on the arc — wider on small screens where the arc is tighter */
const useStep = () => {
  const [step, setStep] = useState(13)
  useEffect(() => {
    const mq = matchMedia('(max-width: 640px)')
    const set = () => setStep(mq.matches ? 26 : 13)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])
  return step
}
const EASE = [0.16, 1, 0.3, 1] as const

/** Planet-overview-style selector: habitats sit on an arc above a rising orb. */
export function HabitatOrbit() {
  const [active, setActive] = useState(2)
  const STEP = useStep()
  const h = HABITATS[active]
  const go = (i: number) => setActive((i + HABITATS.length) % HABITATS.length)

  return (
    <section id="habitats" className="relative isolate overflow-hidden border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-[1440px] px-6 pt-24 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="label mb-5">
              03 — Crew environment · <span className="text-[var(--color-ink-dim)]">{h.name}</span>
            </p>
            <div className="relative h-[clamp(2.8rem,7.5vw,7rem)] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.h2
                  key={h.id}
                  className="whitespace-nowrap font-display text-[clamp(2.8rem,7.5vw,7rem)] font-semibold uppercase leading-none tracking-[-0.04em]"
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '-105%' }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  {h.short}
                </motion.h2>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={h.id}
                className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-ink-dim)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
              >
                {h.blurb}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* stats */}
          <div className="flex gap-10 sm:gap-16 lg:pt-10">
            <Stat label="Surface gravity" unit="g">
              <CountUp value={h.gravityG} decimals={2} />
            </Stat>
            <Stat label="Regime" small>
              <AnimatePresence mode="wait">
                <motion.span
                  key={h.gravityLabel}
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                >
                  {h.gravityLabel.split(' (')[0]}
                </motion.span>
              </AnimatePresence>
            </Stat>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to={`/explore?habitat=${h.id}`}
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-[var(--color-void)] transition-colors hover:bg-[var(--color-flame)]"
          >
            Find research for a {h.name.toLowerCase()}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <AnimatePresence>
            {h.partialGravity && (
              <motion.p
                className="flex max-w-md items-start gap-2 text-xs leading-relaxed text-[var(--color-ink-dim)]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ember)]" />
                <span>
                  The PSI collection primarily covers microgravity. Earth and ISS results provide reference points for surface research.{' '}
                  <Link to="/gravity" className="text-[var(--color-flame)] hover:underline">See the partial-gravity evidence</Link>
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Orb + arc */}
      <div className="relative -mt-4 h-[46vw] max-h-[560px] min-h-[320px] overflow-hidden">
        <div className="absolute left-1/2 top-[18%] aspect-square w-[min(110vw,1300px)] -translate-x-1/2">
          {/* glow */}
          <motion.div
            className="absolute inset-[12%] rounded-full blur-[80px]"
            animate={{ background: h.orb, opacity: 0.35 }}
            transition={{ duration: 1.2 }}
          />
          {/* orb */}
          <div className="absolute inset-[16%] overflow-hidden rounded-full shadow-[inset_0_0_120px_rgba(0,0,0,0.9)]">
            <AnimatePresence initial={false}>
              <motion.div
                key={h.id}
                className="absolute inset-0"
                style={{ background: h.orb }}
                initial={{ opacity: 0, rotate: -12, scale: 1.08 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: EASE }}
              />
            </AnimatePresence>
            <SurfaceTexture seed={active} />
            <div className="grain absolute inset-0 mix-blend-overlay" />
            <div className="absolute inset-0 rounded-full shadow-[inset_-40px_-30px_120px_rgba(0,0,0,0.85),inset_10px_10px_60px_rgba(255,255,255,0.08)]" />
          </div>

          {/* orbit ring */}
          <div className="absolute inset-[9%] rounded-full border border-[var(--color-line-strong)]" />

          {/* labels on the arc */}
          <div role="tablist" aria-label="Crew environment" className="absolute inset-0"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') go(active + 1)
              if (e.key === 'ArrowLeft') go(active - 1)
            }}
          >
            {HABITATS.map((hab, i) => {
              const angle = (i - active) * STEP
              const isActive = i === active
              return (
                <motion.div
                  key={hab.id}
                  className="absolute left-1/2 top-1/2 h-0 w-0"
                  initial={false}
                  animate={{ rotate: angle }}
                  transition={{ duration: 1, ease: EASE }}
                >
                  <button
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActive(i)}
                    className="absolute left-0 top-0 flex flex-col items-center gap-2"
                    style={{ transform: 'translate(-50%, calc(-1 * min(110vw,1300px) * 0.41 - 100%))' }}
                  >
                    <span
                      className={`font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-500 ${
                        isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]'
                      }`}
                    >
                      {hab.short}
                    </span>
                    <motion.span
                      className="block h-1.5 w-1.5 rounded-full"
                      animate={{
                        backgroundColor: isActive ? '#6cc8ff' : 'rgba(255,255,255,0.25)',
                        boxShadow: isActive ? '0 0 14px #6cc8ff' : '0 0 0 transparent',
                        scale: isActive ? 1.4 : 1,
                      }}
                    />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* prev / next */}
        <div className="absolute inset-x-0 top-[30%] mx-auto flex max-w-[1440px] justify-between px-6 lg:px-10">
          <RoundButton label="Previous habitat" onClick={() => go(active - 1)}><ArrowLeft className="h-4 w-4" /></RoundButton>
          <RoundButton label="Next habitat" onClick={() => go(active + 1)}><ArrowRight className="h-4 w-4" /></RoundButton>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-void)] to-transparent" />
      </div>

      <p className="label relative mx-auto -mt-10 max-w-[1440px] px-6 pb-16 lg:px-10">
        Context guides relevance only — it adds no hidden conditions and doesn’t prove a study applies.
      </p>
    </section>
  )
}

function Stat({ label, unit, small, children }: { label: string; unit?: string; small?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={`font-display font-light tabular-nums tracking-tight ${small ? 'pt-2 text-2xl sm:pt-3 sm:text-3xl' : 'text-4xl sm:text-5xl'}`}>
        {children}
        {unit && <span className="ml-1 text-base text-[var(--color-ink-faint)]">{unit}</span>}
      </p>
      <p className="label mt-2">{label}</p>
    </div>
  )
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-void)]/40 backdrop-blur transition-all duration-300 hover:scale-105 hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
    >
      {children}
    </button>
  )
}

/** Procedural surface (SVG turbulence) drifting slowly to suggest rotation. */
function SurfaceTexture({ seed }: { seed: number }) {
  return (
    <motion.svg
      className="absolute inset-y-0 left-0 h-full w-[200%] mix-blend-overlay"
      aria-hidden="true"
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
    >
      <filter id={`surf-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="5" seed={seed + 3} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.6 -0.55" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#surf-${seed})`} opacity="0.9" />
    </motion.svg>
  )
}
