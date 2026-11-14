import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react'
import { lazy, useRef } from 'react'
import { RevealText } from '@/components/fx/RevealText'
import { Button } from '@/components/ui/Button'
import { SceneFrame } from '@/features/mission/ui'
import { scrollToEl } from '@/lib/scroll'
import { AirBars } from '@/features/moonwalk/AirBars'
import { ChoiceList } from '@/features/moonwalk/ChoiceList'
import { Debrief } from '@/features/moonwalk/Debrief'
import { FieldNotes } from '@/features/moonwalk/FieldNotes'
import { MissionScene } from '@/features/moonwalk/MissionScene'
import { PrebreathePanel } from '@/features/moonwalk/PrebreathePanel'
import { byId, CABINS, EARTH_O2, EARTH_PSI, MATERIALS, STEPS, SUITS, type StepId } from '@/features/moonwalk/mission'
import { useMission } from '@/features/moonwalk/useMission'

const MoonHeroScene = lazy(() => import('@/features/moonwalk/MoonHeroScene'))

const HEADING: Record<StepId, { title: string; ask: string }> = {
  cabin: { title: 'Choose the cabin air', ask: 'What will the crew breathe inside the Moon Base?' },
  materials: { title: 'Choose the cabin materials', ask: 'How were the fabrics and plastics inside the base selected?' },
  prebreathe: { title: 'Pre-breathe before the airlock', ask: 'How long does the astronaut breathe pure oxygen before suiting up?' },
  suit: { title: 'Fill the spacesuit', ask: 'What goes in the suit, and at what pressure?' },
  debrief: { title: 'Debrief', ask: '' },
}

/** Moonwalk mission: a small decision game built on the brief's spacesuit and oxygen facts. */
export function MoonwalkPage() {
  const m = useMission()
  const reduced = !!useReducedMotion()
  const { step, state } = m
  const cabin = byId(CABINS, state.cabin)
  const suit = byId(SUITS, state.suit)
  const canContinue = step === 'cabin' ? !!state.cabin : step === 'materials' ? !!state.materials : step === 'suit' ? !!state.suit : true

  const game = useRef<HTMLDivElement>(null)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="space-window relative">
        <SceneFrame bare label="The Moon seen from space, with Earth in the distance"
          className="h-[72svh] min-h-[460px] border-b border-[var(--color-line)]">
          <MoonHeroScene reduced={reduced} />
        </SceneFrame>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-void)] via-[var(--color-void)]/70 to-transparent pt-32">
          <div className="pointer-events-auto mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
            <p className="label mb-4 flex items-center gap-2 !text-[var(--color-flame)]">
              <Rocket className="size-4" aria-hidden="true" /> Mission game · Moon Base
            </p>
            <RevealText lines={['Moonwalk', 'prep']}
              className="font-display text-[clamp(2.2rem,6.5vw,5.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]" />
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[var(--color-ink-dim)] sm:text-base">
              Get an astronaut from the Moon Base out onto the surface. Four decisions about air, pressure and oxygen decide whether
              the walk is safe — and how flammable home becomes.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="accent" onClick={() => game.current && scrollToEl(game.current)} icon={<ArrowRight className="size-4" />}>
                {m.index ? 'Continue the mission' : 'Start the mission'}
              </Button>
              <span className="font-mono text-xs text-[var(--color-ink-faint)]">Step {Math.min(m.index + 1, STEPS.length - 1)} of {STEPS.length - 1}</span>
            </div>
          </div>
        </div>
      </section>

      <div ref={game} className="mx-auto max-w-[1440px] scroll-mt-20 px-6 pt-12 lg:px-10">
      <ol className="mb-6 flex flex-wrap gap-x-5 gap-y-2" aria-label="Mission steps">
        {STEPS.map((s, i) => (
          <li key={s.id} aria-current={s.id === step ? 'step' : undefined}
            className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] ${
              s.id === step ? 'text-[var(--color-ink)]' : i < m.index ? 'text-[var(--color-ink-dim)]' : 'text-[var(--color-ink-faint)]'}`}>
            <span className={`grid size-5 place-items-center rounded-full border text-[11px] ${
              s.id === step ? 'border-[var(--color-flame)] text-[var(--color-flame)]' : 'border-[var(--color-line-strong)]'}`}>
              {i < m.index ? '✓' : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 pb-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <MissionScene step={step} n2={state.n2} breathing={m.breathing} cabinSpec={cabin?.spec} findings={m.findings} />
          <AirBars columns={[
            { label: 'Earth', air: { psi: EARTH_PSI, o2: EARTH_O2 } },
            { label: 'Moon Base', air: cabin, active: step !== 'suit' && step !== 'debrief' },
            { label: 'Spacesuit', air: suit, active: step === 'suit' || step === 'debrief' },
          ]} />
        </div>

        <section aria-labelledby="step-title" className="min-w-0">
          {step !== 'debrief' && (
            <>
              <p className="label">Step {m.index + 1} of {STEPS.length - 1}</p>
              <h2 id="step-title" className="mt-2 font-display text-2xl uppercase tracking-[-0.02em]">{HEADING[step].title}</h2>
              <p className="mb-5 mt-2 text-sm text-[var(--color-ink-dim)]">{HEADING[step].ask}</p>
            </>
          )}
          {step === 'debrief' && <h2 id="step-title" className="sr-only">Debrief</h2>}

          {step === 'cabin' && <ChoiceList legend="Cabin air" options={CABINS} value={state.cabin} onChoose={m.chooseCabin} />}
          {step === 'materials' && <ChoiceList legend="Cabin materials" options={MATERIALS} value={state.materials} onChoose={m.chooseMaterials} />}
          {step === 'prebreathe' && (
            <PrebreathePanel state={state} breathing={m.breathing} clockFull={m.clockFull} onToggle={m.toggleBreathing} onReset={m.resetPrebreathe} />
          )}
          {step === 'suit' && <ChoiceList legend="Spacesuit fill" options={SUITS} value={state.suit} onChoose={m.chooseSuit} />}
          {step === 'debrief' && m.findings && <Debrief findings={m.findings} onRestart={m.restart} />}

          {step !== 'debrief' && (
            <div className="mt-7 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={m.back} disabled={m.index === 0} iconLeft={<ArrowLeft className="size-4" aria-hidden="true" />}>Back</Button>
              <Button variant="primary" onClick={m.next} disabled={!canContinue} icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                {step === 'prebreathe' ? (state.ticks ? 'Stop and suit up' : 'Skip pre-breathing') : step === 'suit' ? 'Open the airlock' : 'Continue'}
              </Button>
            </div>
          )}
        </section>
      </div>

      <FieldNotes />
      <p className="mb-16 mt-10 max-w-3xl text-xs leading-relaxed text-[var(--color-ink-faint)]">
        Moon imagery: NASA Scientific Visualization Studio, CGI Moon Kit (LRO LROC colour and LOLA elevation) · Earth: NASA Blue Marble ·
        “Astronaut” by PW Wu (CC-BY 3.0, via Poly Pizza).
      </p>
      </div>
    </motion.div>
  )
}
