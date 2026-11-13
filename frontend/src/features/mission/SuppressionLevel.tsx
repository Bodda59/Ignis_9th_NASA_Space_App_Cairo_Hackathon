import { useReducedMotion } from 'framer-motion'
import { Crosshair, Flame, Play, Power, Wind } from 'lucide-react'
import { lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ACTIONS, ACTION_FEEDBACK, LEVELS, type ActionId } from './content'
import { sfx } from './sfx'
import { Debrief, Hud, LevelHeader, SceneFrame, Simplified } from './ui'
import { useToasts } from './useToasts'

const SuppressionScene = lazy(() => import('./scenes/SuppressionScene'))
const level = LEVELS[2]

type Props = { onDone: (stars: number) => void; onHub: () => void }

const START_SIZE = 0.25
const SPRAY_SECONDS = 1.4
const MISTAKES: ActionId[] = ['water', 'blow', 'wait']

export function SuppressionLevel({ onDone, onHub }: Props) {
  const reduced = !!useReducedMotion()
  const [stage, setStage] = useState<'brief' | 'fight' | 'won'>('brief')
  const [size, setSize] = useState(START_SIZE)
  const [powerOn, setPowerOn] = useState(true)
  const [fansOn, setFansOn] = useState(true)
  const [mistakes, setMistakes] = useState(0)
  const [actions, setActions] = useState(0)
  const [last, setLast] = useState<{ id: ActionId; n: number } | null>(null)
  const [spraying, setSpraying] = useState(false)
  const [aimed, setAimed] = useState(false)
  const { toasts, push, clear } = useToasts()
  // the fire is lost the moment it reaches full size
  const phase = stage === 'fight' && size >= 1 ? 'lost' : stage

  const live = useRef({ powerOn, fansOn, aimed })
  useEffect(() => { live.current = { powerOn, fansOn, aimed } }, [powerOn, fansOn, aimed])

  const stars = mistakes === 0 && actions <= 3 ? 3 : mistakes <= 1 ? 2 : 1

  // the fire grows on its own: fast with airflow and power, slowly decaying without both
  useEffect(() => {
    if (phase !== 'fight') return
    const id = window.setInterval(() => {
      const { powerOn: p, fansOn: f } = live.current
      const rate = (f ? 0.03 : 0.004) + (p ? 0.012 : -0.012)
      setSize((s) => Math.max(0.05, s + rate * 0.25))
    }, 250)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'fight') sfx.alarmStart()
    else sfx.alarmStop()
    return () => sfx.alarmStop()
  }, [phase])

  const reported = useRef(false)
  useEffect(() => {
    if (phase !== 'won') { reported.current = false; return }
    if (reported.current) return
    reported.current = true
    onDone(stars)
  }, [phase, stars, onDone])

  /** CO₂: spray for a moment, then judge by where the nozzle pointed and the rack's state. */
  const spray = useCallback(() => {
    if (spraying) return
    setSpraying(true)
    sfx.hiss()
    window.setTimeout(() => {
      setSpraying(false)
      const { aimed: hit, fansOn: f, powerOn: p } = live.current
      if (!hit) { push('Missed: put the crosshair on the flame and float closer before spraying.', 'info'); return }
      if (f) { setSize((s) => s * 0.6); sfx.whoosh(); push('The airflow blew most of the CO₂ away. Stop the fans first.', 'info'); return }
      if (p) { setSize(0.18); sfx.ignite(); push('It went out, then relit: the part is still powered and hot. Cut the power.', 'bad'); return }
      push(ACTION_FEEDBACK.co2, 'good')
      sfx.win()
      setStage('won')
    }, SPRAY_SECONDS * 1000)
  }, [spraying, push])

  function act(id: ActionId) {
    if (phase !== 'fight') return
    setActions((n) => n + 1)
    setLast((l) => ({ id, n: (l?.n ?? 0) + 1 }))
    if (id === 'co2') { spray(); return }
    if (MISTAKES.includes(id)) {
      setMistakes((m) => m + 1)
      setSize((s) => Math.min(1, s + (id === 'blow' ? 0.2 : id === 'water' ? 0.12 : 0.08)))
      sfx.bad()
      push(ACTION_FEEDBACK[id], 'bad')
      return
    }
    if (id === 'power') {
      if (!powerOn) { push('Power is already off.', 'info'); return }
      setPowerOn(false); sfx.good(); push(ACTION_FEEDBACK.power, 'good'); return
    }
    if (id === 'fans') {
      if (!fansOn) { push('The fans are already off.', 'info'); return }
      setFansOn(false); sfx.good(); push(ACTION_FEEDBACK.fans, 'good')
    }
  }

  // F = spray (keyboard play)
  const actRef = useRef(act)
  useEffect(() => { actRef.current = act })
  useEffect(() => {
    if (phase !== 'fight') return
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !(e.target instanceof HTMLInputElement)) actRef.current('co2')
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [phase])

  function reset() {
    sfx.alarmStop(); clear()
    setStage('brief'); setSize(START_SIZE); setPowerOn(true); setFansOn(true); setMistakes(0); setActions(0); setLast(null); setSpraying(false)
  }

  const out = phase === 'won'
  const objective = phase === 'brief' ? 'A fire alarm is sounding. Get ready.'
    : phase === 'fight' ? 'Make the rack safe, then aim the CO₂ extinguisher at the flame (Spray button or F).'
      : phase === 'won' ? 'Fire out. Read the debrief.' : 'The module had to be sealed.'

  return (
    <div>
      <LevelHeader level={level} step={phase === 'brief' ? 'Briefing' : phase === 'fight' ? 'Fire in rack' : phase === 'won' ? 'Debrief' : 'Module evacuated'} onExit={onHub} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <SceneFrame label="3D view of an open equipment rack with a spherical blue microgravity flame, switches and a handheld CO2 extinguisher"
          className="h-[52svh] min-h-[340px] lg:h-[640px]"
          overlay={<Hud objective={objective} toasts={toasts}
            status={phase === 'fight' ? <span className={aimed ? 'text-[#7dd3a7]' : ''}>Fire {Math.round(size * 100)}% · {aimed ? 'ON TARGET' : 'aim at flame'}</span> : undefined} />}>
          <SuppressionScene size={size} out={out} powerOn={powerOn} fansOn={fansOn} spraying={spraying} last={last} reduced={reduced}
            onAim={setAimed} onSwitch={(id) => act(id)} />
        </SceneFrame>

        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-5">
          {phase === 'brief' && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">{level.briefing}</p>
              <p className="text-sm font-medium">{level.goal}</p>
              <p className="text-xs text-[var(--color-ink-faint)]">The fire grows every second. Flip the glowing switches on the rack, float close (W) and aim the CO₂ with the crosshair.</p>
              <Button variant="accent" onClick={() => { sfx.click(); setStage('fight') }} iconLeft={<Play className="size-4" />}>Respond to the alarm</Button>
            </div>
          )}

          {phase === 'fight' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px] uppercase tracking-[0.08em]">
                <Status icon={<Flame className="size-4" />} label="Fire" value={`${Math.round(size * 100)}%`} bad={size > 0.5} />
                <Status icon={<Power className="size-4" />} label="Rack power" value={powerOn ? 'On' : 'Off'} bad={powerOn} />
                <Status icon={<Wind className="size-4" />} label="Fans" value={fansOn ? 'On' : 'Off'} bad={fansOn} />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Fire size" aria-valuenow={Math.round(size * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-flame)] to-[var(--color-ember)] transition-[width] duration-200" style={{ width: `${size * 100}%` }} />
              </div>
              <Button variant="accent" className="w-full" disabled={spraying} onClick={() => act('co2')} iconLeft={<Crosshair className="size-4" />}>
                {spraying ? 'Spraying CO₂…' : aimed ? 'Spray CO₂ now (F)' : 'Spray CO₂ (F): aim first'}
              </Button>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {ACTIONS.filter((a) => a.id !== 'co2').map((a) => (
                  <button key={a.id} type="button" onClick={() => act(a.id)}
                    className="rounded-lg border border-[var(--color-line-strong)] px-3 py-2 text-left transition-colors hover:border-[var(--color-flame)]">
                    <span className="block text-sm">{a.label}</span>
                    <span className="block text-xs text-[var(--color-ink-faint)]">{a.detail}</span>
                  </button>
                ))}
              </div>
              <Simplified>the steps are a simplified version of a station fire response; real crews follow a longer checklist and wear masks.</Simplified>
            </div>
          )}

          {phase === 'lost' && (
            <div className="space-y-4" role="alert">
              <p className="font-display text-xl uppercase text-[var(--color-ember)]">Fire out of control</p>
              <p className="text-sm text-[var(--color-ink-dim)]">
                The crew closes the hatch to seal off the module and retreats. Real crews train for this outcome, but it is the one everyone wants to avoid.
              </p>
              <div className="flex gap-2">
                <Button variant="accent" onClick={reset}>Try again</Button>
                <Button variant="ghost" onClick={onHub}>Mission map</Button>
              </div>
            </div>
          )}

          {phase === 'won' && (
            <div className="space-y-5">
              <p className="text-sm text-[var(--color-ink-dim)]">Fire out in {actions} action{actions === 1 ? '' : 's'} with {mistakes} mistake{mistakes === 1 ? '' : 's'}.</p>
              <Debrief level={level} stars={stars} title={stars === 3 ? 'Textbook response' : 'Fire out'}
                learned={[
                  'In microgravity a flame has no buoyant plume: it is a sphere fed by oxygen that slowly diffuses in, or that airflow blows in.',
                  'So stopping the ventilation starves the flame, and blowing on it feeds it.',
                  'Cutting power removes the heat source; otherwise a fire can relight.',
                  'Diluting the oxygen with CO₂ puts it out. FLEX showed CO₂ and helium dilution extinguish microgravity flames.',
                ]}
                onRetry={reset} onHub={onHub} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Status({ icon, label, value, bad }: { icon: ReactNode; label: string; value: string; bad: boolean }) {
  return (
    <div className={cn('rounded-lg border p-2', bad ? 'border-[var(--color-ember)]/50 text-[var(--color-ember)]' : 'border-[var(--color-prevention)]/40 text-[var(--color-prevention)]')}>
      <span className="mx-auto mb-1 block w-fit" aria-hidden="true">{icon}</span>
      <span className="block text-[var(--color-ink-faint)]">{label}</span>
      <span className="block text-sm">{value}</span>
    </div>
  )
}
