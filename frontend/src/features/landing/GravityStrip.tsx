import { AnimatePresence, motion, useInView } from 'framer-motion'
import { CircleDashed, FlaskConical, Hourglass, Orbit } from 'lucide-react'
import { lazy, Suspense, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { useWarmUp } from '@/hooks/useWarmUp'
import { Link } from 'react-router-dom'

const GravityModel = lazy(() => import('./GravityModel'))

/**
 * 04 — The gravity gap. Evidence status per gravity level, as described in the
 * 2026 challenge brief (Partial-gravity data). Gravity values are physical constants.
 */
const BODIES = [
  { id: 'ug', label: 'Orbit', sub: 'μg', g: 0, color: '#6cc8ff' },
  { id: 'moon', label: 'Moon', sub: '0.17 g', g: 0.166, color: '#c9cbd3' },
  { id: 'mars', label: 'Mars', sub: '0.38 g', g: 0.38, color: '#d9774b' },
  { id: 'earth', label: 'Earth', sub: '1 g', g: 1, color: '#5aa6ff' },
] as const

function status(g: number) {
  if (g < 0.01)
    return { tone: 'have', title: 'Direct PSI evidence', text: 'This is where PSI combustion experiments were run — microgravity on the space station.' }
  if (g > 0.99)
    return { tone: 'have', title: 'Normal-gravity results', text: 'Earth’s 1 g tests are a reference point. Compare them with ISS results under similar test conditions.' }
  const nearMoon = Math.abs(g - 0.166) < 0.05
  return {
    tone: 'gap',
    title: 'Partial-gravity evidence',
    text: nearMoon
      ? 'LUCI reproduced lunar-like acceleration in a rotating rocket. Its NASA report is outside the indexed PSI collection.'
      : 'Earth and ISS tests are reference points, but they may not bound this gravity: NASA drop-tower tests found materials that burn more readily below Earth gravity than on Earth.',
  }
}

export function GravityStrip() {
  const [g, setG] = useState(0.166)
  const id = useId()
  const model = useRef<HTMLDivElement>(null)
  const visible = useInView(model, { margin: '100px' })
  const warm = useWarmUp()
  const body = BODIES.reduce((nearest, item) => Math.abs(item.g - g) < Math.abs(nearest.g - g) ? item : nearest)
  const habitat = body.id === 'mars' ? 'mars_base' : body.id === 'moon' ? 'lunar_base' : body.id === 'ug' ? 'space_station' : null
  const st = status(g)
  const pct = (v: number) => `${v * 100}%`

  return (
    <section id="gravity" className="relative border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-[1440px] px-6 py-24 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="label mb-5">04 — The gravity gap</p>
            <h2 className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em] sm:text-4xl">
              Gravity changes
              <br />
              <span className="text-[var(--color-ember)]">how flames behave.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--color-ink-dim)]">
              Earth is the 1 g baseline. Choose the ISS, Moon, or Mars to see which measurements can inform fire-safety research at that gravity.
            </p>
          </div>

          <div className="lg:col-span-8">
            {/* scale */}
            <div className="relative px-2 pb-6 pt-20">
              {/* bodies */}
              {BODIES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setG(b.g)}
                  className="group absolute top-0 -translate-x-1/2 text-center"
                  style={{ left: pct(b.g) }}
                  aria-label={`Set gravity to ${b.label}, ${b.sub}`}
                >
                  <motion.span
                    className="mx-auto block rounded-full"
                    style={{
                      width: b.id === 'ug' ? 14 : b.id === 'earth' ? 30 : b.id === 'mars' ? 20 : 22,
                      height: b.id === 'ug' ? 14 : b.id === 'earth' ? 30 : b.id === 'mars' ? 20 : 22,
                      background: `radial-gradient(circle at 35% 30%, #fff8, ${b.color} 45%, #0008 100%)`,
                      boxShadow: `0 0 18px ${b.color}55`,
                    }}
                    whileHover={{ scale: 1.15 }}
                  />
                  <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink)]">{b.label}</span>
                  <span className="block font-mono text-[11px] text-[var(--color-ink-faint)]">{b.sub}</span>
                </button>
              ))}

              {/* track with evidence bands */}
              <div className="relative mt-6 h-14">
                <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-[repeating-linear-gradient(-45deg,rgba(245,165,74,0.16)_0_8px,transparent_8px_16px)] ring-1 ring-[var(--color-ember)]/30" />
                <motion.div
                  className="absolute inset-y-0 left-0 w-[3%] rounded-l-full bg-[var(--color-flame)]/80 shadow-[0_0_24px_var(--color-flame)]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  style={{ originX: 0 }}
                  transition={{ duration: 1 }}
                />
                <motion.div
                  className="absolute inset-y-0 right-0 w-[3%] rounded-r-full bg-[#5aa6ff]/70"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  style={{ originX: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--color-void)]/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-ember)]">
                  Partial-gravity gap in the PSI catalog
                </span>

                {/* future data markers */}
                <span className="absolute -bottom-7 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-[var(--color-nebula)]" style={{ left: pct(0.166) }}>
                  <Hourglass className="mr-1 inline h-3 w-3" />LUCI report
                </span>

                {/* draggable marker */}
                <motion.div className="pointer-events-none absolute inset-y-[-10px] w-[2px] -translate-x-1/2 bg-[var(--color-ink)] shadow-[0_0_12px_white]" animate={{ left: pct(g) }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                  <span className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--color-ink)]" />
                </motion.div>
                <label htmlFor={id} className="sr-only">Gravity level in g</label>
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={g}
                  onChange={(e) => setG(Number(e.target.value))}
                  aria-valuetext={`${g.toFixed(2)} g`}
                  className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                />
              </div>
            </div>

            {/* readout */}
            <div className="mt-12 grid gap-4 sm:grid-cols-[auto_1fr]">
              <div className="rounded-2xl border border-[var(--color-line)] px-6 py-5">
                <p className="font-display text-5xl font-light tabular-nums tracking-tight">
                  {g.toFixed(2)}
                  <span className="ml-1 text-base text-[var(--color-ink-faint)]">g</span>
                </p>
                <p className="label mt-2">Selected gravity</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={st.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  aria-live="polite"
                  className={cn(
                    'rounded-2xl border px-6 py-5',
                    st.tone === 'have' ? 'border-[var(--color-flame)]/35 bg-[var(--color-flame)]/[0.05]' : 'border-[var(--color-ember)]/35 bg-[var(--color-ember)]/[0.05]',
                  )}
                >
                  <p className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                    {st.tone === 'have' ? <Orbit className="h-4 w-4 text-[var(--color-flame)]" /> : <CircleDashed className="h-4 w-4 text-[var(--color-ember)]" />}
                    {st.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">{st.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div ref={model} aria-hidden="true" className="h-40">
              {(visible || warm) && <Suspense><GravityModel gravity={body.g} color={body.color} active={visible} /></Suspense>}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--color-flame)]">
              <Link to="/gravity" className="font-medium hover:underline">See the partial-gravity evidence</Link>
              {habitat && <Link to={`/explore?habitat=${habitat}`} className="hover:underline">Explore research for {body.label === 'Orbit' ? 'the ISS' : body.label}</Link>}
              {body.id === 'moon' && <a href="https://ntrs.nasa.gov/citations/20250010653" target="_blank" rel="noreferrer" className="hover:underline">Read LUCI results</a>}
              {body.id === 'mars' && <a href="https://ntrs.nasa.gov/citations/20130010991" target="_blank" rel="noreferrer" className="hover:underline">Read Martian-gravity tests</a>}
              {body.id === 'earth' && <Link to="/explore?gravity=normal_gravity" className="hover:underline">Explore Earth-gravity comparisons</Link>}
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--color-ink-dim)]">
              <li className="inline-flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-[var(--color-flame)]/80" /> Evidence exists</li>
              <li className="inline-flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-[repeating-linear-gradient(-45deg,rgba(245,165,74,0.5)_0_3px,transparent_3px_6px)] ring-1 ring-[var(--color-ember)]/40" /> Gap</li>
              <li className="inline-flex items-center gap-2"><Hourglass className="h-3 w-3 text-[var(--color-nebula)]" /> Published evidence outside PSI</li>
              <li className="inline-flex items-center gap-2"><FlaskConical className="h-3 w-3 text-[var(--color-ink-faint)]" /> Source: 2026 challenge brief</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
