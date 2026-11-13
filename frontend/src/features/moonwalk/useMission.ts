import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  byId, CABINS, CLOCK_TICKS, debrief, nitrogenPsi, STEPS, washOut,
  type CabinId, type MaterialsId, type MissionState, type StepId, type SuitId,
} from './mission'

const START: MissionState = { ticks: 0, n2: 0 }
const TICK_MS = 110

/** Game state for the moonwalk mission: one choice per step, plus the pre-breathe clock. */
export function useMission() {
  const [step, setStep] = useState<StepId>('cabin')
  const [state, setState] = useState<MissionState>(START)
  const [breathing, setBreathing] = useState(false)

  const clockFull = state.ticks >= CLOCK_TICKS
  const running = breathing && step === 'prebreathe' && !clockFull

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setState((s) => (s.ticks >= CLOCK_TICKS ? s : { ...s, ticks: s.ticks + 1, n2: washOut(s.n2) }))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running])

  const index = STEPS.findIndex((s) => s.id === step)
  const go = useCallback((id: StepId) => { setBreathing(false); setStep(id) }, [])
  const next = useCallback(() => go(STEPS[Math.min(index + 1, STEPS.length - 1)].id), [go, index])
  const back = useCallback(() => go(STEPS[Math.max(index - 1, 0)].id), [go, index])

  const chooseCabin = useCallback((cabin: CabinId) => {
    // A new cabin resets the body's nitrogen load and the clock.
    setState((s) => ({ ...s, cabin, ticks: 0, n2: nitrogenPsi(byId(CABINS, cabin)!) }))
  }, [])
  const chooseMaterials = useCallback((materials: MaterialsId) => setState((s) => ({ ...s, materials })), [])
  const chooseSuit = useCallback((suit: SuitId) => setState((s) => ({ ...s, suit })), [])
  const resetPrebreathe = useCallback(() => {
    setBreathing(false)
    setState((s) => ({ ...s, ticks: 0, n2: s.cabin ? nitrogenPsi(byId(CABINS, s.cabin)!) : 0 }))
  }, [])
  const restart = useCallback(() => { setBreathing(false); setState(START); setStep('cabin') }, [])

  const findings = useMemo(
    () => (step === 'debrief' && state.cabin && state.materials && state.suit ? debrief(state) : null),
    [step, state],
  )

  return {
    step, index, state, findings,
    breathing: running, clockFull,
    toggleBreathing: () => setBreathing((b) => !b),
    chooseCabin, chooseMaterials, chooseSuit, resetPrebreathe, next, back, restart,
  }
}

export type Mission = ReturnType<typeof useMission>
