import { useReducedMotion } from 'framer-motion'
import { Check, Play, TriangleAlert, X } from 'lucide-react'
import { lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { DUST, LEVELS, RACK_X, SLOTS, dustTime, reachTime } from './content'
import { sfx } from './sfx'
import { Debrief, Hud, LevelHeader, SceneFrame, Simplified } from './ui'
import { useToasts } from './useToasts'

const DetectionScene = lazy(() => import('./scenes/DetectionScene'))
const level = LEVELS[1]
const MAX_DETECTORS = 3
const RUN_LIMIT = 11 // seconds: long enough for smoke from the most forward rack to reach the vent (~10.1 s)

type Props = { onDone: (stars: number) => void; onNext: () => void; onHub: () => void }

const pickSource = () => Math.floor(Math.random() * RACK_X.length)

export function DetectionLevel({ onDone, onNext, onHub }: Props) {
  const reduced = !!useReducedMotion()
  const [source, setSource] = useState(pickSource)
  const [placed, setPlaced] = useState<string[]>([])
  const [phase, setPhase] = useState<'place' | 'run' | 'done'>('place')
  const [clock, setClock] = useState(0)
  const raf = useRef(0)

  const sourceX = RACK_X[source]
  const hits = placed
    .map((id) => SLOTS.find((s) => s.id === id)!)
    .map((s) => ({ slot: s, t: reachTime(sourceX, s) }))
  const detection = hits.filter((h) => h.t !== null).sort((a, b) => a.t! - b.t!)[0]
  const best = Math.min(...SLOTS.map((s) => reachTime(sourceX, s) ?? Infinity))
  const dustAt = placed.includes(DUST.hits) ? dustTime() : null
  const endAt = Math.min(RUN_LIMIT, (detection?.t ?? RUN_LIMIT) + 1.6)

  const alarms: Record<string, 'smoke' | 'dust'> = {}
  for (const h of hits) if (h.t !== null && clock >= h.t) alarms[h.slot.id] = 'smoke'
  if (dustAt !== null && clock >= dustAt && !alarms[DUST.hits]) alarms[DUST.hits] = 'dust'

  const stars = !detection ? 1 : detection.t! <= best + 0.6 ? 3 : 2
  const { toasts, push, clear } = useToasts()

  // alarm events of this run, in time order (fired from the animation loop)
  const events = useMemo(() => {
    const list: { t: number; label: string; kind: 'smoke' | 'dust' }[] = []
    for (const id of placed) {
      const slot = SLOTS.find((s) => s.id === id)!
      const t = reachTime(sourceX, slot)
      if (t !== null) list.push({ t, label: slot.label, kind: 'smoke' })
    }
    if (dustAt !== null) {
      const smokeAt = list.find((e) => e.label === SLOTS.find((s) => s.id === DUST.hits)!.label)?.t
      if (smokeAt === undefined || dustAt < smokeAt) list.push({ t: dustAt, label: SLOTS.find((s) => s.id === DUST.hits)!.label, kind: 'dust' })
    }
    return list.sort((a, b) => a.t - b.t)
  }, [placed, sourceX, dustAt])

  // latest outcome for the end-of-run sound, without restarting the loop on every render
  const outcome = useRef({ detected: false, stars: 1 })
  useEffect(() => { outcome.current = { detected: !!detection, stars } })

  useEffect(() => {
    if (phase !== 'run') return
    const start = performance.now()
    let fired = 0
    const tick = () => {
      const t = (performance.now() - start) / 1000
      while (fired < events.length && events[fired].t <= t) {
        const e = events[fired++]
        if (e.kind === 'smoke') { sfx.alarmStart(); push(`SMOKE ALARM · ${e.label}`, 'bad') }
        else { sfx.bad(); push(`False alarm at ${e.label}: just dust from a cargo bag`, 'info') }
      }
      setClock(t)
      if (t >= endAt) {
        setPhase('done')
        sfx.alarmStop()
        const o = outcome.current
        if (o.detected) { if (o.stars === 3) sfx.win(); else sfx.good() } else sfx.bad()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [phase, endAt, events, push])

  useEffect(() => () => sfx.alarmStop(), [])

  // report the result once per finished run
  const reported = useRef(false)
  useEffect(() => {
    if (phase !== 'done') { reported.current = false; return }
    if (reported.current) return
    reported.current = true
    onDone(stars)
  }, [phase, stars, onDone])

  function toggle(id: string) {
    if (phase !== 'place') return
    if (!placed.includes(id) && placed.length >= MAX_DETECTORS) { sfx.bad(); push('You only have three detectors. Click one to move it.', 'info'); return }
    if (placed.includes(id)) sfx.click(); else sfx.place()
    setPlaced((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  function reset() {
    sfx.alarmStop(); clear()
    setSource(pickSource()); setPlaced([]); setPhase('place'); setClock(0)
  }

  const objective = phase === 'place'
    ? 'Click the glowing spots to mount up to 3 smoke detectors, then run the ventilation.'
    : phase === 'run' ? 'Watch where the smoke goes. Which detector hears it first?' : 'Debrief: see what your detectors caught.'

  return (
    <div>
      <LevelHeader level={level} step={phase === 'place' ? 'Place detectors' : phase === 'run' ? 'Ventilation running' : 'Debrief'} onExit={onHub} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <SceneFrame label="3D view of a station module with smoke detector positions and ventilation airflow" className="h-[52svh] min-h-[340px] lg:h-[640px]"
          overlay={<Hud objective={objective} toasts={toasts}
            status={phase === 'place' ? <>Detectors {placed.length}/{MAX_DETECTORS}</> : <>T+{clock.toFixed(1)} s</>} />}>
          <DetectionScene source={source} placed={placed} phase={phase} clock={clock} alarms={alarms} onSlot={toggle} reduced={reduced} />
        </SceneFrame>

        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-5">
          {phase !== 'done' && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">{level.briefing}</p>
              <p className="text-sm font-medium">{level.goal}</p>
              <p className="text-xs text-[var(--color-ink-faint)]">
                Air flows from the <span className="text-[var(--color-ink-dim)]">fan (forward)</span> to the <span className="text-[var(--color-ink-dim)]">return vent (aft)</span>.
                The overheating part is behind one of the four middle racks on the wall you are facing. You don’t know which one.
              </p>
              <fieldset>
                <legend className="label mb-2">Detector positions ({placed.length}/{MAX_DETECTORS})</legend>
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.map((s) => {
                    const on = placed.includes(s.id)
                    const alarm = alarms[s.id]
                    return (
                      <button key={s.id} type="button" aria-pressed={on} disabled={phase !== 'place' || (!on && placed.length >= MAX_DETECTORS)} onClick={() => toggle(s.id)}
                        className={cn('flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:opacity-60',
                          alarm === 'smoke' ? 'border-[#ff4b3a] bg-[#ff4b3a]/15' : alarm === 'dust' ? 'border-[var(--color-ember)] bg-[var(--color-ember)]/10'
                            : on ? 'border-[var(--color-flame)] bg-[var(--color-flame)]/10' : 'border-[var(--color-line-strong)] hover:border-[var(--color-ink-dim)]')}>
                        <span>{s.label}</span>
                        {alarm === 'smoke' ? <span className="font-mono text-[10px] text-[#ff8a7a]">SMOKE</span>
                          : alarm === 'dust' ? <span className="font-mono text-[10px] text-[var(--color-ember)]">DUST</span>
                            : on ? <Check className="size-3.5 text-[var(--color-flame)]" aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              {phase === 'run' && <p role="status" className="font-mono text-sm tabular-nums">Ventilation running · {clock.toFixed(1)} s</p>}
              <Button variant="accent" disabled={phase !== 'place' || placed.length === 0} onClick={() => { setClock(0); setPhase('run') }}
                iconLeft={<Play className="size-4" />}>
                Run the ventilation
              </Button>
              <Simplified>smoke moves at the air speed and widens as it travels; real cabin airflow is messier, but it still carries smoke instead of letting it rise.</Simplified>
            </div>
          )}

          {phase === 'done' && (
            <div className="space-y-5">
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  {detection ? <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-prevention)]" aria-label="OK" /> : <X className="mt-0.5 size-4 shrink-0 text-[var(--color-ember)]" aria-label="Missed" />}
                  <span>{detection
                    ? `Smoke detected by "${detection.slot.label}" after ${detection.t!.toFixed(1)} s (fastest possible: ${best.toFixed(1)} s).`
                    : 'No detector saw the smoke. It never reached the spots you chose.'}</span>
                </li>
                {hits.filter((h) => h.slot.kind === 'ceiling' && h.t === null).length > 0 && (
                  <li className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-ember)]" aria-label="Note" />
                    <span>Your ceiling detector stayed quiet. On Earth smoke rises to the ceiling; in orbit it only goes where the air takes it.</span></li>
                )}
                {hits.filter((h) => h.t === null && h.slot.kind === 'wall').length > 0 && (
                  <li className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-ember)]" aria-label="Note" />
                    <span>A wall detector upstream of the fire never saw smoke: the air was flowing away from it.</span></li>
                )}
                {dustAt !== null && (
                  <li className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-ember)]" aria-label="Note" />
                    <span>“Wall, middle” raised a false alarm when a crew member shook out a dusty bag. To a detector, dust and smoke can look alike.</span></li>
                )}
              </ul>
              <Debrief level={level} stars={stars} title={stars === 3 ? 'Fire caught early' : stars === 2 ? 'Fire caught' : 'Fire missed'}
                learned={[
                  'Without gravity, hot smoke does not rise. It drifts with the ventilation flow, so detectors belong downstream, in the airflow path.',
                  'Smoke particles from overheated materials behave differently in microgravity. SAME and SAME-R measured them to design better detectors.',
                  'Dust can trigger smoke detectors. DAFT reused a smoke instrument to study dust so detectors can tell the two apart.',
                ]}
                onRetry={reset} onNext={onNext} onHub={onHub} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
