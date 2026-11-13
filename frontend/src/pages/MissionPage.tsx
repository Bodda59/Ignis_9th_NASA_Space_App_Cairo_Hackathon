import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Award, Flame, Radar, ShieldCheck } from 'lucide-react'
import { lazy, useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RevealText } from '@/components/fx/RevealText'
import { Button } from '@/components/ui/Button'
import { LEVELS, loadProgress, saveStars, type LevelId } from '@/features/mission/content'
import { DetectionLevel } from '@/features/mission/DetectionLevel'
import { PreventionLevel } from '@/features/mission/PreventionLevel'
import { SuppressionLevel } from '@/features/mission/SuppressionLevel'
import { SceneFrame, Stars } from '@/features/mission/ui'

const BriefingScene = lazy(() => import('@/features/mission/scenes/BriefingScene'))
const ICONS = { prevention: ShieldCheck, detection: Radar, suppression: Flame }

/** "Mission: Fire Safety Officer": a three-level game for high-school students. */
export function MissionPage() {
  const [params, setParams] = useSearchParams()
  const reduced = !!useReducedMotion()
  const [progress, setProgress] = useState(loadProgress)
  const current = LEVELS.find((l) => l.id === params.get('level'))

  const go = useCallback((id?: LevelId) => {
    setParams(id ? { level: id } : {})
    window.scrollTo({ top: 0 })
  }, [setParams])
  // one stable callback per level, so each level reports its result once
  const [onDone] = useState(() => Object.fromEntries(LEVELS.map((l) => [l.id, (stars: number) => setProgress(saveStars(l.id, stars))])) as Record<LevelId, (stars: number) => void>)

  const total = LEVELS.reduce((sum, l) => sum + (progress[l.id] ?? 0), 0)
  const complete = LEVELS.every((l) => progress[l.id])

  if (current) {
    return (
      <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-[1440px] px-5 pb-24 pt-24 sm:px-6 lg:px-10">
        {current.id === 'prevention' && <PreventionLevel onDone={onDone.prevention} onNext={() => go('detection')} onHub={() => go()} />}
        {current.id === 'detection' && <DetectionLevel onDone={onDone.detection} onNext={() => go('suppression')} onHub={() => go()} />}
        {current.id === 'suppression' && <SuppressionLevel onDone={onDone.suppression} onHub={() => go()} />}
      </motion.div>
    )
  }

  return (
    <div className="pb-24">
      <section className="relative">
        <SceneFrame bare label="The International Space Station orbiting above Earth" className="h-[72svh] min-h-[460px] border-b border-[var(--color-line)]">
          <BriefingScene reduced={reduced} />
        </SceneFrame>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-void)] via-[var(--color-void)]/70 to-transparent pt-32">
          <div className="pointer-events-auto mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
            <p className="label mb-4 !text-[var(--color-flame)]">Interactive mission · for high-school students</p>
            <RevealText lines={['Mission:', 'Fire Safety Officer']}
              className="font-display text-[clamp(2.2rem,6.5vw,5.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]" />
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[var(--color-ink-dim)] sm:text-base">
              Fire behaves strangely in space. Flames turn into blue spheres and smoke never rises. You are the new fire-safety
              officer of a space station. Three missions, three skills: prevent, detect, suppress. Each one is based on real NASA experiments.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="accent" onClick={() => go(LEVELS.find((l) => !progress[l.id])?.id ?? 'prevention')} icon={<ArrowRight className="size-4" />}>
                {total ? 'Continue mission' : 'Start mission'}
              </Button>
              <span className="font-mono text-xs text-[var(--color-ink-faint)]">{total} / 9 stars</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="levels" className="mx-auto max-w-[1440px] px-6 pt-12 lg:px-10">
        <h2 id="levels" className="label mb-5">Mission map</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {LEVELS.map((l) => {
            const Icon = ICONS[l.id]
            const stars = progress[l.id] ?? 0
            return (
              <li key={l.id}>
                <button type="button" onClick={() => go(l.id)}
                  className="group flex h-full w-full flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-5 text-left transition-colors hover:border-[var(--color-line-strong)]">
                  <span className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-full border" style={{ borderColor: l.color, color: l.color }}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <Stars value={stars} size="sm" />
                  </span>
                  <span className="label mt-5" style={{ color: l.color }}>Level {l.n} · {l.topic}</span>
                  <span className="mt-1 font-display text-lg uppercase leading-tight">{l.title}</span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">{l.goal}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--color-flame)]">
                    {stars ? 'Play again' : 'Play'} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {complete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-[#f5c84a]/40 bg-[#f5c84a]/5 p-5">
            <Award className="size-10 text-[#f5c84a]" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-display text-lg uppercase">Certified Fire Safety Officer</p>
              <p className="text-sm text-[var(--color-ink-dim)]">You completed all three missions with {total} of 9 stars.{total < 9 ? ' Replay a level to earn the rest.' : ' A perfect record.'}</p>
            </div>
            <Stars value={total} max={9} size="sm" />
          </motion.div>
        )}

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-[var(--color-ink-faint)]">
          3D models: “International Space Station (ISS) (B)”, NASA 3D Resources · station props from Kenney’s Space Station Kit (CC0, kenney.nl) ·
          “Astronaut” by PW Wu (CC-BY 3.0, via Poly Pizza). The game simplifies the science to keep it playable,
          and each simplification is labelled in the level. This is a learning game, not fire-safety guidance.
        </p>
      </section>
    </div>
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AirBars } from '@/features/mission/AirBars'
import { ChoiceList } from '@/features/mission/ChoiceList'
import { Debrief } from '@/features/mission/Debrief'
import { FieldNotes } from '@/features/mission/FieldNotes'
import { MissionScene } from '@/features/mission/MissionScene'
import { PrebreathePanel } from '@/features/mission/PrebreathePanel'
import { byId, CABINS, EARTH_O2, EARTH_PSI, MATERIALS, STEPS, SUITS, type StepId } from '@/features/mission/mission'
import { useMission } from '@/features/mission/useMission'

const HEADING: Record<StepId, { title: string; ask: string }> = {
  cabin: { title: 'Choose the cabin air', ask: 'What will the crew breathe inside the Moon Base?' },
  materials: { title: 'Choose the cabin materials', ask: 'How were the fabrics and plastics inside the base selected?' },
  prebreathe: { title: 'Pre-breathe before the airlock', ask: 'How long does the astronaut breathe pure oxygen before suiting up?' },
  suit: { title: 'Fill the spacesuit', ask: 'What goes in the suit, and at what pressure?' },
  debrief: { title: 'Debrief', ask: '' },
}

/** Moonwalk mission: a small decision game built on the brief's spacesuit and oxygen facts. */
export function MissionPage() {
  const m = useMission()
  const { step, state } = m
  const cabin = byId(CABINS, state.cabin)
  const suit = byId(SUITS, state.suit)
  const canContinue = step === 'cabin' ? !!state.cabin : step === 'materials' ? !!state.materials : step === 'suit' ? !!state.suit : true

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1440px] px-6 pt-28 lg:px-10">
      <header className="mb-8 max-w-2xl">
        <div className="mb-3 flex items-center gap-2 text-[var(--color-flame)]">
          <Rocket className="size-5" aria-hidden="true" /> <span className="label">Mission game</span>
        </div>
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] uppercase leading-tight tracking-[-0.02em]">Moonwalk prep</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          Get an astronaut from the Moon Base out onto the surface. Four decisions about air, pressure and oxygen decide whether
          the walk is safe — and how flammable home becomes.
        </p>
      </header>

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
    </motion.div>
  )
}
