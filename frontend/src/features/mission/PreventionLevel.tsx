import { useReducedMotion } from 'framer-motion'
import { Check, TriangleAlert } from 'lucide-react'
import { lazy, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ATMOSPHERE, CABIN_ITEMS, LEVELS, partialPressure } from './content'
import type { BurnTest } from './scenes/PreventionScene'
import { sfx } from './sfx'
import { Debrief, Hud, LevelHeader, SceneFrame, Simplified } from './ui'
import { useToasts } from './useToasts'

const PreventionScene = lazy(() => import('./scenes/PreventionScene'))
const level = LEVELS[0]

type Props = { onDone: (stars: number) => void; onNext: () => void; onHub: () => void }

export function PreventionLevel({ onDone, onNext, onHub }: Props) {
  const reduced = !!useReducedMotion()
  const [step, setStep] = useState<'air' | 'materials' | 'done'>('air')
  const [o2, setO2] = useState(ATMOSPHERE.earth.o2)
  const [psi, setPsi] = useState(ATMOSPHERE.earth.psi)
  const [airPerfect, setAirPerfect] = useState(false)
  const [choices, setChoices] = useState<Record<string, number | undefined>>({})
  const [focus, setFocus] = useState<string>()
  const [test, setTest] = useState<BurnTest | null>(null)
  const { toasts, push, clear } = useToasts()

  function choose(itemId: string, index: number) {
    const item = CABIN_ITEMS.find((i) => i.id === itemId)!
    const c = item.choices[index]
    setChoices((v) => ({ ...v, [itemId]: index }))
    setFocus(itemId)
    setTest((t) => ({ item: itemId, choice: index, safe: c.safe, n: (t?.n ?? 0) + 1 }))
    sfx.ignite()
    window.setTimeout(() => {
      if (c.safe) { sfx.good(); push(`${c.label}: flame went out on its own`, 'good') }
      else { sfx.bad(); push(`${c.label}: caught fire and kept burning`, 'bad') }
    }, 1100)
  }

  const pp = partialPressure(o2, psi)
  const breathable = pp >= ATMOSPHERE.breathe.min && pp <= ATMOSPHERE.breathe.max
  const evaReady = psi <= ATMOSPHERE.evaReady
  const fireOk = o2 <= ATMOSPHERE.fireRisk
  const allChosen = CABIN_ITEMS.every((i) => choices[i.id] !== undefined)
  const safeCount = CABIN_ITEMS.filter((i) => choices[i.id] !== undefined && i.choices[choices[i.id]!].safe).length
  const stars = 1 + (airPerfect ? 1 : 0) + (safeCount === CABIN_ITEMS.length ? 1 : 0)

  function reset() {
    setStep('air'); setO2(ATMOSPHERE.earth.o2); setPsi(ATMOSPHERE.earth.psi); setAirPerfect(false); setChoices({}); setFocus(undefined); setTest(null); clear()
  }

  const objective = step === 'air'
    ? 'Tune the cabin air: breathable, quick to suit up, low fire risk. Watch the test flame and the wall screen.'
    : step === 'materials' ? 'Click each floating item and pick its material. Every choice gets a burn test.' : 'Debrief: see how your cabin did.'
  const status = step === 'air'
    ? <>ppO₂ {pp.toFixed(2)} psi</>
    : <>Materials {Object.keys(choices).length}/{CABIN_ITEMS.length}</>

  return (
    <div>
      <LevelHeader level={level} step={step === 'air' ? 'Cabin air' : step === 'materials' ? 'Materials' : 'Debrief'} onExit={onHub} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <SceneFrame label="3D view of a space station module with a flammability test stand" className="h-[52svh] min-h-[340px] lg:h-[640px]"
          overlay={<Hud objective={objective} status={status} toasts={toasts} />}>
          <PreventionScene o2={o2} psi={psi} step={step === 'air' ? 'air' : 'materials'} choices={choices} focus={focus} test={test} reduced={reduced}
            onPickItem={(id) => { if (step === 'materials') { sfx.click(); setFocus(id); document.getElementById(`item-${id}`)?.focus({ preventScroll: true }) } }} />
        </SceneFrame>

        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-5">
          {step === 'air' && (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">{level.briefing}</p>
              <p className="text-sm font-medium">{level.goal}</p>
              <Slider label="Oxygen in the air" unit="%" min={18} max={40} step={1} value={o2} onChange={setO2} />
              <Slider label="Cabin pressure" unit="psi" min={6} max={15} step={0.1} value={psi} onChange={setPsi} />
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-void)]/60 p-3 font-mono text-xs">
                <p>Oxygen the crew actually breathes: <span className="text-[var(--color-ink)]">{pp.toFixed(2)} psi</span></p>
                <p className="mt-1 text-[var(--color-ink-faint)]">= {o2}% × {psi.toFixed(1)} psi · Earth sea level: {ATMOSPHERE.earth.o2}% × {ATMOSPHERE.earth.psi} psi ≈ 3.1 psi</p>
              </div>
              <ul className="space-y-2 text-sm">
                <Check3 ok={breathable} good="Crew can breathe normally" bad={pp < ATMOSPHERE.breathe.min ? 'Too little oxygen: crew would get hypoxic' : 'Too much oxygen pressure for long stays'} />
                <Check3 ok={evaReady} good="Low pressure: quick to suit up for a moonwalk" bad="High pressure: hours of oxygen pre-breathing before every moonwalk" />
                <Check3 ok={fireOk} good="Oxygen % is not raising the fire risk too far" bad="Oxygen-rich air: many materials ignite much more easily (watch the test flame)" />
              </ul>
              <Simplified>the green ranges are rounded rules of thumb for this game. Real habitat designs weigh these trade-offs in much more detail.</Simplified>
              <Button variant="accent" disabled={!breathable} onClick={() => {
                const perfect = breathable && evaReady && fireOk
                setAirPerfect(perfect); setStep('materials')
                if (perfect) { sfx.good(); push('Cabin air locked in: a solid trade-off', 'good') } else { sfx.click(); push('Cabin air locked in, but not the best trade-off', 'info') }
              }}>
                Lock in cabin air
              </Button>
              {!breathable && <p className="text-xs text-[var(--color-ember)]">The crew must be able to breathe before you can continue.</p>}
            </div>
          )}

          {step === 'materials' && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">
                Every item launched to a spacecraft is flammability-tested first. Pick the material for each item. You can also click the floating items.
              </p>
              {CABIN_ITEMS.map((item) => (
                <fieldset key={item.id} className={cn('rounded-xl border p-3 transition-colors', focus === item.id ? 'border-[var(--color-flame)]' : 'border-[var(--color-line)]')}>
                  <legend className="px-1 text-sm font-medium">{item.name}</legend>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {item.choices.map((c, i) => (
                      <button key={c.label} id={i === 0 ? `item-${item.id}` : undefined} type="button" aria-pressed={choices[item.id] === i}
                        onClick={() => choose(item.id, i)}
                        className={cn('rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          choices[item.id] === i ? 'border-[var(--color-flame)] bg-[var(--color-flame)]/10' : 'border-[var(--color-line-strong)] hover:border-[var(--color-ink-dim)]')}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              <Button variant="accent" disabled={!allChosen} onClick={() => { setStep('done'); onDone(stars); if (stars === 3) sfx.win(); else sfx.good() }}>Load the cargo</Button>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-5">
              <ul className="space-y-2 text-sm">
                {CABIN_ITEMS.map((item) => {
                  const c = item.choices[choices[item.id]!]
                  return <Check3 key={item.id} ok={c.safe} good={`${item.name}: ${c.label}. ${c.why}`} bad={`${item.name}: ${c.label}. ${c.why}`} />
                })}
                <Check3 ok={airPerfect} good="Cabin air: breathable, quick to suit up, and not oxygen-rich enough to raise fire risk much."
                  bad="Cabin air: the crew could breathe, but the mix was not the best trade-off." />
              </ul>
              <Debrief level={level} stars={stars} title={stars === 3 ? 'Cabin certified' : 'Cabin approved, with notes'}
                learned={[
                  `What you breathe is the oxygen partial pressure (oxygen % × pressure). Earth gives about 3.1 psi of it.`,
                  `Lunar habitat designs like ${ATMOSPHERE.lunarCabin.o2}% oxygen at ${ATMOSPHERE.lunarCabin.psi} psi keep that breathable level at lower pressure, so suiting up is faster.`,
                  'A higher oxygen percentage makes materials easier to ignite, so material choice matters even more in those cabins.',
                  'That is why NASA flammability-tests materials, and why experiments like BASS-II and Saffire burn real materials in microgravity.',
                ]}
                onRetry={reset} onNext={onNext} onHub={onHub} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Slider({ label, unit, min, max, step, value, onChange }: {
  label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void
}) {
  const id = `slider-${unit}`
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="label">{label}</label>
        <span className="font-mono text-sm tabular-nums">{unit === 'psi' ? value.toFixed(1) : value} {unit}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-flame)]" />
    </div>
  )
}

function Check3({ ok, good, bad }: { ok: boolean; good: string; bad: string }) {
  return (
    <li className="flex gap-2">
      {ok
        ? <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-prevention)]" aria-label="OK" />
        : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-ember)]" aria-label="Problem" />}
      <span className={ok ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'}>{ok ? good : bad}</span>
    </li>
  )
}
