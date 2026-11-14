import { Component, lazy, Suspense, useRef, type PointerEvent, type ReactNode } from 'react'
import { motion, useInView, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowDown, ArrowUpRight } from 'lucide-react'

const JourneyScene = lazy(() => import('./JourneyScene'))

export function ExperimentJourney() {
  const section = useRef<HTMLElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const nearby = useInView(section, { once: true, margin: '320px' })
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })

  const cursorX = useSpring(50, { stiffness: 110, damping: 24 })
  const cursorY = useSpring(46, { stiffness: 110, damping: 24 })
  const driftX = useTransform(cursorX, [0, 100], [-32, 32])
  const driftY = useTransform(cursorY, [0, 100], [-22, 22])
  const cursorGlow = useMotionTemplate`radial-gradient(ellipse 42% 56% at ${cursorX}% ${cursorY}%, #294d798f, #1429494d 50%, transparent 100%)`

  function moveBackdrop(event: PointerEvent<HTMLElement>) {
    if (reduced || event.pointerType === 'touch' || !visual.current) return
    const bounds = visual.current.getBoundingClientRect()
    cursorX.set((event.clientX - bounds.left) / bounds.width * 100)
    cursorY.set((event.clientY - bounds.top) / bounds.height * 100)
  }

  return (
    <section
      ref={section}
      id="experiment-journey"
      onPointerMove={moveBackdrop}
      onPointerLeave={() => { cursorX.set(50); cursorY.set(46) }}
      aria-labelledby="journey-title"
      className="space-window relative isolate grid border-y border-[var(--color-line)] bg-[#070b14]"
    >
      <div
        ref={visual}
        aria-hidden="true"
        className="pointer-events-none sticky top-0 col-start-1 row-start-1 h-[100svh] overflow-hidden motion-reduce:relative motion-reduce:h-full"
      >
        <motion.div data-journey-backdrop className="absolute inset-0" style={{ backgroundImage: cursorGlow }} />
        <motion.div
          className="absolute -inset-10 opacity-60"
          style={{
            x: driftX,
            y: driftY,
            backgroundImage: 'radial-gradient(1px 1px at 21px 45px, #a8c9ea 95%, transparent), radial-gradient(1px 1px at 74px 136px, #6893ba 95%, transparent), radial-gradient(1.5px 1.5px at 195px 59px, #d3e9ff 92%, transparent)',
            backgroundSize: '263px 193px, 167px 211px, 311px 233px',
          }}
        />
        <motion.div className="grid-backdrop absolute -inset-10 opacity-25" style={{ x: driftX, y: driftY }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#162946_0%,transparent_60%)] lg:bg-[radial-gradient(ellipse_at_67%_50%,#162946_0%,transparent_58%)]" />
        <div className="absolute inset-x-0 top-0 h-[70%] lg:h-full">
          <div className="absolute left-1/2 top-1/2 aspect-square w-[min(65vw,33rem)] -translate-1/2 rounded-full border border-[var(--color-flame)]/15 shadow-[inset_0_0_100px_#4b7dd21a,0_0_100px_#4b7dd21a] lg:left-[67%]" />
          <div className="absolute left-1/2 top-1/2 aspect-square w-[min(12vw,6rem)] -translate-1/2 rounded-full bg-[radial-gradient(circle,#bdedff,rgba(71,142,255,.5)_35%,transparent_72%)] opacity-50 lg:left-[67%]" />
          {nearby && !reduced && (
            <SceneBoundary>
              <Suspense fallback={null}><JourneyScene progress={scrollYProgress} /></Suspense>
            </SceneBoundary>
          )}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#070b14_3%,#070b14f2_29%,transparent_52%)] lg:bg-[linear-gradient(90deg,#070b14_0%,#070b14b8_24%,transparent_49%)]" />
      </div>

      <div className="relative col-start-1 row-start-1 mx-auto w-full max-w-[1440px] px-6 lg:px-10">
        <div className="flex min-h-[100svh] flex-col justify-end pb-16 pt-24 lg:justify-center lg:pb-24 motion-reduce:min-h-0 motion-reduce:pb-10">
          <p className="label mb-4 !text-[var(--color-flame)]">Microgravity combustion</p>
          <h2 id="journey-title" className="max-w-md font-display text-[clamp(1.85rem,4vw,3.65rem)] font-medium leading-[1.06] tracking-tight">
            Inside a NASA fire experiment
          </h2>
          <p className="mt-4 max-w-[22rem] text-sm leading-relaxed text-[var(--color-ink-dim)] sm:text-base">
            The BASS-II team studied how solid materials burn aboard the International Space Station.
          </p>
          <a href="#journey-hardware" className="mt-6 inline-flex w-fit items-center gap-2 text-sm text-[var(--color-flame)] hover:underline motion-reduce:hidden">
            Look inside <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </div>

        <div id="journey-hardware" className="flex min-h-[100svh] flex-col justify-end pb-16 pt-24 lg:justify-center lg:pb-24 motion-reduce:min-h-0 motion-reduce:pb-10 motion-reduce:pt-0">
          <h3 className="max-w-md font-display text-[clamp(1.7rem,3.7vw,3.4rem)] font-medium leading-[1.06] tracking-tight">
            Inside the flow duct
          </h3>
          <p className="mt-4 max-w-[20rem] text-sm leading-relaxed text-[var(--color-ink-dim)] sm:text-base">
            A fan moves air past the sample. Cameras observe the flame through windows in the duct.
          </p>
        </div>

        <div id="journey-flame" className="flex min-h-[100svh] flex-col justify-end pb-16 pt-24 lg:justify-center lg:pb-24 motion-reduce:min-h-0 motion-reduce:pt-0">
          <h3 className="max-w-md font-display text-[clamp(1.7rem,3.7vw,3.4rem)] font-medium leading-[1.06] tracking-tight">
            What changes in freefall?
          </h3>
          <p className="mt-4 max-w-[22rem] text-sm leading-relaxed text-[var(--color-ink-dim)] sm:text-base">
            With little buoyancy, hot gases barely rise. Airflow and the material being tested help shape how a flame spreads.
          </p>
          <a href="#search" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-[var(--color-void)] transition-colors hover:bg-[var(--color-flame)]">
            Explore the evidence <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
          <p className="label mt-4">Illustration based on NASA’s BASS-II hardware</p>
        </div>
      </div>

      {!reduced && (
        <div aria-hidden="true" className="pointer-events-none sticky bottom-0 col-start-1 row-start-1 h-px self-end bg-[var(--color-line)]">
          <motion.div className="h-full origin-left bg-[var(--color-flame)]" style={{ scaleX: scrollYProgress }} />
        </div>
      )}
    </section>
  )
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
