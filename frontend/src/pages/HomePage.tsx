import { motion } from 'framer-motion'
import { HabitatOrbit } from '@/features/habitat/HabitatOrbit'
import { GravityStrip } from '@/features/landing/GravityStrip'
import { OxygenMap } from '@/features/landing/OxygenMap'
import { Timeline } from '@/features/landing/Timeline'
import { StationSection } from '@/features/station/StationSection'
import { Hero } from '@/features/landing/Hero'
import { ExperimentJourney } from '@/features/landing/ExperimentJourney'
import { SafetyDomains } from '@/features/landing/SafetyDomains'
import { SearchCommand } from '@/features/search/SearchCommand'

export function HomePage() {
  return (
    <>
      <Hero />
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
