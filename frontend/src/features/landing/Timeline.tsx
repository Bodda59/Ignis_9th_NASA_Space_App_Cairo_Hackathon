import { motion, useScroll, useSpring } from 'framer-motion'
import { Flame, FlaskConical, Moon, Rocket, TriangleAlert } from 'lucide-react'
import { useRef } from 'react'

/**
 * 06 — Fire and spaceflight. Incident descriptions come from the 2026 challenge
 * brief; experiment years are intentionally omitted until verified from PSI.
 */
type Kind = 'incident' | 'research' | 'next'
const KIND: Record<Kind, { label: string; color: string }> = {
  incident: { label: 'Incident', color: 'var(--color-ember)' },
  research: { label: 'Research', color: 'var(--color-flame)' },
  next: { label: 'Next', color: 'var(--color-nebula)' },
}

const EVENTS: { when: string; title: string; text: string; kind: Kind; icon: typeof Flame }[] = [
  { when: '1967', title: 'Apollo 1', text: 'Fire erupted in the oxygen-filled spacecraft during a pre-launch test; the crew died.', kind: 'incident', icon: Flame },
  { when: '1970', title: 'Apollo 13', text: 'An oxygen tank exploded on the way to the Moon, and the crew endured life-threatening results.', kind: 'incident', icon: TriangleAlert },
  { when: '1997', title: 'Mir', text: 'An oxygen generator failure caused a fire aboard the station; the multinational crew survived.', kind: 'incident', icon: Flame },
  {
    when: 'Space station era',
    title: 'Microgravity combustion research',
    text: 'Prevention (BASS, Saffire), detection (SAME), suppression (FLEX) and gaseous-flame studies (ACME) — the evidence collected in NASA’s PSI database.',
    kind: 'research',
    icon: FlaskConical,
  },
  { when: '2026', title: 'Artemis II', text: '“Make the fire alarm go off in your spacecraft when you’re still about 80,000 miles from home.” — the commander, on a smoke alarm.', kind: 'incident', icon: Rocket },
  { when: 'Next', title: 'Partial-gravity data', text: 'LUCI has published results from lunar-like acceleration. FM2 is designed to test materials on the Moon.', kind: 'next', icon: FlaskConical },
  { when: 'Future', title: 'Moon base & pressurized rovers', text: 'Exploration cabin concepts combine lower pressure and a higher oxygen percentage. Material tests help assess that combination.', kind: 'next', icon: Moon },
]

export function Timeline() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section id="timeline" className="relative border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-[1440px] px-6 py-24 lg:px-10">
        <div className="mb-16 max-w-xl">
          <p className="label mb-5">06 — Fire and spaceflight</p>
          <h2 className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em] sm:text-4xl">
            Every leap
            <br />
            <span className="text-[var(--color-ember)]">has met fire.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-[var(--color-ink-dim)]">
            From Apollo to Artemis, fire has followed crews into space. The research in this dashboard is how the next missions learn from it.
          </p>
        </div>

        <ol ref={ref} className="relative mx-auto max-w-4xl">
          {/* spine */}
          <span className="absolute bottom-0 left-4 top-0 w-px bg-[var(--color-line-strong)] md:left-1/2" aria-hidden="true" />
          <motion.span
            className="absolute left-4 top-0 w-px origin-top bg-gradient-to-b from-[var(--color-ember)] via-[var(--color-flame)] to-[var(--color-nebula)] md:left-1/2"
            style={{ scaleY: progress, height: '100%' }}
            aria-hidden="true"
          />

          {EVENTS.map((e, i) => {
            const left = i % 2 === 0
            const k = KIND[e.kind]
            const Icon = e.icon
            return (
              <li key={e.title} className="relative grid pb-14 pl-12 last:pb-0 md:grid-cols-2 md:gap-16 md:pl-0">
                {/* node */}
                <motion.span
                  className="absolute left-4 top-1 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border bg-[var(--color-void)] md:left-1/2"
                  style={{ borderColor: k.color, color: k.color }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: '-30%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </motion.span>

                <motion.div
                  className={left ? 'md:col-start-1 md:text-right' : 'md:col-start-2'}
                  initial={{ opacity: 0, x: left ? -24 : 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-20%' }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="font-display text-2xl font-light tabular-nums tracking-tight" style={{ color: k.color }}>{e.when}</p>
                  <h3 className="mt-1 text-lg text-[var(--color-ink)]">{e.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">{e.text}</p>
                  <span className="label mt-3 inline-block" style={{ color: k.color }}>{k.label}</span>
                </motion.div>
              </li>
            )
          })}
        </ol>
        <p className="label mx-auto mt-12 max-w-4xl text-center">Incident descriptions: 2026 challenge brief</p>
      </div>
    </section>
  )
}
