import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { HabitatOrbit } from '@/features/habitat/HabitatOrbit'
import { GravityStrip } from '@/features/landing/GravityStrip'
import { OxygenMap } from '@/features/landing/OxygenMap'
import { Timeline } from '@/features/landing/Timeline'
import { StationSection } from '@/features/station/StationSection'
import { Hero } from '@/features/landing/Hero'
import { IntroFilm } from '@/features/landing/IntroFilm'
import { ExperimentJourney } from '@/features/landing/ExperimentJourney'
import { SafetyDomains } from '@/features/landing/SafetyDomains'
import { SearchCommand } from '@/features/search/SearchCommand'
import { readSeen } from '@/features/landing/introSeen'
import { jumpBy } from '@/lib/scroll'

/**
 * The hero rises up *behind* the opening film while it zooms away, so the dive reads as
 * passing through the film into the site. Its entrance animation starts on the first scroll.
 */
function HeroGate({ intro, gate }: { intro: boolean; gate: RefObject<HTMLDivElement | null> }) {
  const [show, setShow] = useState(!intro)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (v) => { if (v > 8) setShow(true) })
  useEffect(() => { if (window.scrollY > 8) setShow(true) }, [])
  return <div ref={gate} className={`relative z-0 min-h-[100svh] ${intro ? '-mt-[85svh]' : ''}`}>{show && <Hero />}</div>
}

export function HomePage() {
  // The film is shown once per session; after it is watched and scrolled past it is removed,
  // so scrolling up stops at the hero.
  const [intro, setIntro] = useState(() => !readSeen())
  const gate = useRef<HTMLDivElement>(null)
  const heroTop = useRef<number | null>(null)
  const passIntro = useCallback(() => {
    heroTop.current = gate.current?.getBoundingClientRect().top ?? null
    setIntro(false)
  }, [])
  // Removing the film shifts everything up; scroll by the same amount in the same frame so nothing jumps.
  useLayoutEffect(() => {
    if (intro || heroTop.current === null || !gate.current) return
    jumpBy(gate.current.getBoundingClientRect().top - heroTop.current)
    heroTop.current = null
  }, [intro])

  return (
    <>
      {intro && <IntroFilm onPassed={passIntro} />}
      <HeroGate intro={intro} gate={gate} />
      <ExperimentJourney />

      <section id="search" className="relative scroll-mt-20 border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-[1440px] px-6 py-24 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-12">
            <motion.div
              className="lg:col-span-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="label mb-5">01 — Search the research</p>
              <h2 className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em] sm:text-4xl">
                Ask in plain
                <br />
                language.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--color-ink-dim)]">
                Keywords or full questions. Results are ranked by research relevance — never by fire danger —
                and every result explains why it matched and where it doesn’t.
              </p>
            </motion.div>
            <motion.div
              className="lg:col-span-8 lg:pt-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <SearchCommand />
            </motion.div>
          </div>

          <div className="mt-20">
            <SafetyDomains />
          </div>
        </div>
      </section>

      <StationSection />
      <HabitatOrbit />
      <GravityStrip />
      <OxygenMap />
      <Timeline />
    </>
  )
}
