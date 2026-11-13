import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Hand, Box } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { RACKS, type RackId } from './racks'

const StationScene = lazy(() => import('./StationScene'))

/** 02 — interactive 3D station with the two combustion racks from the brief. */
export function StationSection() {
  const [sel, setSel] = useState<RackId | null>('cir')
  const box = useRef<HTMLDivElement>(null)
  const inView = useInView(box, { once: true, margin: '200px' })
  const reduced = !!useReducedMotion()
  const rack = sel ? RACKS[sel] : null

  return (
    <section id="station" className="relative overflow-hidden border-t border-[var(--color-line)]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-24 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-4">
          <p className="label mb-5">02 — Where the flames were studied</p>
          <h2 className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em] sm:text-4xl">
            Two racks,
            <br />
            <span className="text-[var(--color-flame)]">countless flames.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--color-ink-dim)]">
            Most PSI combustion experiments ran inside two pieces of hardware on the space station. Pick one to see what flew in it.
          </p>

          <div className="mt-8 space-y-3" role="tablist" aria-label="Experiment hardware">
            {(Object.keys(RACKS) as RackId[]).map((id) => {
              const r = RACKS[id]
              const on = sel === id
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSel(id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300',
                    on ? 'border-[var(--color-flame)]/60 bg-[var(--color-flame)]/[0.06]' : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold', on ? 'bg-[var(--color-flame)] text-[var(--color-void)]' : 'border border-[var(--color-line-strong)] text-[var(--color-ink-dim)]')}>
                    {r.short}
                  </span>
                  <span>
                    <span className="block text-sm text-[var(--color-ink)]">{r.name}</span>
                    <span className="block text-xs text-[var(--color-ink-faint)]">{r.studies.length} investigations</span>
                  </span>
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {rack && (
              <motion.div
                key={sel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="mt-6"
                role="tabpanel"
              >
                <p className="text-[13px] leading-relaxed text-[var(--color-ink-dim)]">{rack.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {rack.studies.map((s, i) => (
                    <motion.span key={s.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}>
                      <Link
                        to={`/investigations/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
                      >
                        {s.acronym} <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={box} className="relative lg:col-span-8">
          {/* earth limb glow behind the station */}
          <div className="pointer-events-none absolute inset-x-[-10%] bottom-[-55%] h-[90%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(108,200,255,0.35),rgba(47,107,255,0.12)_35%,transparent_65%)] blur-2xl" />
          <div className="relative h-[460px] sm:h-[560px]">
            {inView && (
              <Suspense fallback={<SceneFallback />}>
                <StationScene selected={sel} onSelect={setSel} reduced={reduced} />
              </Suspense>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-between px-2">
            <span className="label inline-flex items-center gap-1.5"><Hand className="h-3 w-3" /> Drag to rotate</span>
            <span className="label inline-flex items-center gap-1.5"><Box className="h-3 w-3" /> Illustrative · not to scale</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function SceneFallback() {
  return (
    <div className="grid h-full place-items-center">
      <motion.span
        className="h-16 w-16 rounded-full border border-dashed border-[var(--color-line-strong)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
