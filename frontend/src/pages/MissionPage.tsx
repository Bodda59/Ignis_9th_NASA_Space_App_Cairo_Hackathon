import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Award, Flame, Radar, ShieldCheck } from 'lucide-react'
import { lazy, useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RevealText } from '@/components/fx/RevealText'
import { Button } from '@/components/ui/Button'
import { LEVELS, loadProgress, saveStars, type LevelId } from '@/features/mission/content'
import { ControlsGuide } from '@/features/mission/ControlsGuide'
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
        <ControlsGuide key={current.id} levelTitle={current.title} />
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
  )
}
