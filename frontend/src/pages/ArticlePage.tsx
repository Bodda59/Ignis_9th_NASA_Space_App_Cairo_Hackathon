import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useRef } from 'react'
import { RevealText } from '@/components/fx/RevealText'
import { articleGroups, challengeResources, resources } from '@/features/articles/resources'

const ease = [0.16, 1, 0.3, 1] as const
/** Scans with a white scanner margin on the left: widen and anchor right so the margin falls outside the frame. */
const SCAN_TRIM: Record<string, string> = {
  'air-tanks': 'inset-y-0 right-0 h-full w-[110%] max-w-none', // 45px margin on a 522px-wide scan
  'fire-attire': 'inset-y-0 right-0 h-full w-[101.5%] max-w-none', // 4px margin on a 675px-wide scan
}

const photoMotion = {
  waiting: { scale: 1.12, opacity: 0.72 },
  visible: { scale: 1, opacity: 1, transition: { duration: 1.05, ease } },
}

export function ArticlePage() {
  const page = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: page, offset: ['start start', 'end end'] })

  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.12])

  return (
    <div ref={page} className="mx-auto max-w-[1440px] px-5 pb-20 pt-24 sm:px-8 lg:px-10">
      {!reduced && <motion.div aria-hidden="true" style={{ scaleX: scrollYProgress }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-0.5 origin-left bg-[var(--color-flame)]" />}
      <header className="grid items-center gap-8 border-b border-[var(--color-line)] pb-10 md:grid-cols-2 md:gap-12 lg:pb-14">
        <div>
          <RevealText lines={['Articles &', 'resources']}
            className="font-display text-[clamp(2.3rem,5.3vw,5.4rem)] font-semibold uppercase leading-[1.02] tracking-[-0.04em]" />
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-ink-dim)]">
            Explore NASA’s combustion research, spacecraft incidents, and firefighting technology from the Flame in Freefall challenge.
          </p>
          <nav aria-label="Article topics" className="mt-6 flex flex-wrap gap-2">
            {articleGroups.map(({ id, title }) => <a key={id} href={`#${id}`}
              className="rounded-full border border-[var(--color-line-strong)] px-3 py-2 text-xs hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]">
              {title}
            </a>)}
          </nav>
        </div>
        <motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.65, ease }}
          className="space-window overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]">
          <motion.img style={reduced ? undefined : { scale: heroScale }} src="/articles/combustion-rack.jpg" width={1200} height={800} fetchPriority="high"
            alt="NASA astronaut Jessica Meir working at the International Space Station’s Combustion Integrated Rack"
            className="aspect-[16/10] w-full object-cover object-center" />
        </motion.div>
      </header>

      {articleGroups.map(({ id, title }) => (
        <section key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-b border-[var(--color-line)] py-10 sm:py-14">
          <div className="mb-6 flex items-center gap-4 sm:gap-7">
            <h2 id={`${id}-title`} className="font-display text-xl font-medium tracking-tight sm:text-2xl">{title}</h2>
            <motion.span aria-hidden="true" className="h-px origin-left flex-1 bg-linear-to-r from-[var(--color-flame)]/60 to-[var(--color-line)]"
              initial={reduced ? false : { scaleX: 0.12 }} whileInView={{ scaleX: 1 }}
              viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.85, ease }} />
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {resources.filter((resource) => resource.group === id).map((resource, index) => (
              <motion.li key={resource.id}
                initial={reduced ? false : 'waiting'}
                whileInView="visible"
                variants={{
                  waiting: { opacity: 0.8, y: 24 },
                  visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.65, delay: reduced ? 0 : index * 0.08, ease } },
                }}
                viewport={{ once: true, amount: 0.12 }}
                className="min-w-0">
                <article aria-labelledby={resource.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/55 transition-colors hover:border-[var(--color-line-strong)]">
                  {/* photos sit on a deep-space mat in both themes, so letterboxed covers and scans look framed */}
                  <div className="space-window relative aspect-[16/10] overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-void)]">
                    <motion.img
                      src={`/articles/${resource.id}.webp`} alt={resource.imageAlt} loading="lazy" decoding="async"
                      variants={reduced ? undefined : photoMotion}
                      className={`absolute ${SCAN_TRIM[resource.id] ?? 'inset-0 size-full'} ${resource.id === 'researchers-guide' ? 'object-contain py-3' : 'object-cover'}`} />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="label mb-3 text-[var(--color-flame)]">{resource.kind}</p>
                    <h3 id={resource.id} className="font-display text-base leading-snug sm:text-lg">{resource.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">{resource.summary}</p>
                    <details className="group mt-4 border-t border-[var(--color-line)] pt-3 text-sm">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                        Read summary<span className="sr-only"> for {resource.title}</span>
                        <ChevronDown className="size-4 shrink-0 motion-safe:transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <p className="pb-2 pt-3 leading-relaxed text-[var(--color-ink-dim)]">{resource.takeaway}</p>
                    </details>
                    <a href={resource.url} target="_blank" rel="noreferrer"
                      className="mt-auto inline-flex w-fit items-center gap-2 pt-4 text-sm text-[var(--color-flame)] hover:underline">
                      {resource.id === 'sciencecasts' ? 'Watch on YouTube' : 'Open NASA source'}
                      <span className="sr-only"> for {resource.title} (opens in a new tab)</span>
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              </motion.li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-[var(--color-ink-dim)]">
        <a className="text-[var(--color-flame)] hover:underline" href={challengeResources}>NASA Space Apps challenge resources</a>
        <span>Images: NASA, including the NASA ScienceCasts thumbnail</span>
      </footer>
    </div>
  )
}
