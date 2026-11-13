import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { byId, CABINS, CLOCK_TICKS, nitrogenPsi, safeNitrogenPsi, SUIT_PSI, type MissionState } from './mission'

/** Pre-breathe step: run the clock, watch nitrogen leave the body, decide when to stop. */
export function PrebreathePanel({ state, breathing, clockFull, onToggle, onReset }: {
  state: MissionState
  breathing: boolean
  clockFull: boolean
  onToggle: () => void
  onReset: () => void
}) {
  const start = nitrogenPsi(byId(CABINS, state.cabin)!)
  const safe = safeNitrogenPsi(SUIT_PSI)
  const isSafe = state.n2 <= safe
  // Scale both meters to Earth-like air so the two cabins are comparable.
  const scale = nitrogenPsi(CABINS[0])

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">
        The astronaut breathes 100% oxygen through a mask. With no nitrogen coming in, the nitrogen dissolved in the body slowly leaves.
        Stop whenever you like — but every moment here is a moment not spent on the surface.
      </p>

      <Meter
        label="Nitrogen left in the body"
        value={`${state.n2.toFixed(1)} psi`}
        fraction={state.n2 / scale}
        marker={safe / scale}
        markerLabel={`Safe line for a ${SUIT_PSI} psi suit`}
        color={isSafe ? 'var(--color-prevention)' : 'var(--color-ember)'}
        status={isSafe ? '✓ Below the safe line' : '⚠ Above the safe line'}
      />
      <Meter
        label="Excursion clock used"
        value={`${state.ticks}%`}
        fraction={state.ticks / CLOCK_TICKS}
        color="var(--color-flame)"
        status={clockFull ? 'Clock used up — no time left outside' : `${CLOCK_TICKS - state.ticks}% left for the surface`}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="accent" onClick={onToggle} disabled={clockFull}
          iconLeft={breathing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}>
          {breathing ? 'Pause' : state.ticks ? 'Keep pre-breathing' : 'Start pre-breathing'}
        </Button>
        <Button variant="ghost" onClick={onReset} disabled={!state.ticks} iconLeft={<RotateCcw className="size-4" aria-hidden="true" />}>
          Start over
        </Button>
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
        Started at {start.toFixed(1)} psi of nitrogen. The wash-out speed and safe line are a simplified model for learning, not medical guidance.
      </p>
    </div>
  )
}

function Meter({ label, value, fraction, marker, markerLabel, color, status }: {
  label: string
  value: string
  fraction: number
  marker?: number
  markerLabel?: string
  color: string
  status: string
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-[var(--color-ink)]">{label}</span>
        <span className="font-mono text-sm tabular-nums text-[var(--color-ink)]">{value}</span>
      </div>
      <div className="relative mt-2">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-[width] duration-150 ease-linear" style={{ width: `${pct}%`, background: color }} />
        </div>
        {marker !== undefined && (
          <span className="absolute -top-1 h-[18px] w-0.5 bg-[var(--color-ink)]" style={{ left: `${marker * 100}%` }} aria-hidden="true" />
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-[var(--color-ink-faint)]">
        <span style={{ color }}>{status}</span>
        {markerLabel && <span>│ {markerLabel}</span>}
      </div>
    </div>
  )
}
