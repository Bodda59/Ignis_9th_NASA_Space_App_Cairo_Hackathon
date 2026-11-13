import { motion } from 'framer-motion'
import { Flame, Wind } from 'lucide-react'
import type { ReactNode } from 'react'
import { EarthGlobe } from '@/components/three/EarthGlobe'
import { Astronaut3D } from '@/features/interpret/Astronaut3D'
import { EARTH_PSI, type Finding, type StepId } from './mission'

/** Fixed pseudo-random spots over the astronaut's body for the nitrogen bubbles. */
const SPOTS = Array.from({ length: 24 }, (_, i) => ({
  left: 32 + ((i * 37) % 36),
  top: 30 + ((i * 53) % 46),
  size: 5 + ((i * 7) % 5),
  delay: (i % 6) * 0.25,
}))

const STARS = Array.from({ length: 40 }, (_, i) => ({ left: (i * 61) % 100, top: (i * 29) % 62, o: 0.25 + ((i * 13) % 6) / 10 }))

const PLACE: Record<StepId, string> = {
  cabin: 'Inside the Moon Base',
  materials: 'Inside the Moon Base',
  prebreathe: 'Moon Base airlock · pre-breathing',
  suit: 'Moon Base airlock · suiting up',
  debrief: 'On the lunar surface',
}

/**
 * The stage: an astronaut at the Moon Base, with Earth in the sky. It reacts to
 * the game — nitrogen bubbles thin out while pre-breathing, turn amber if the
 * astronaut gets the bends, and the base glows if the cabin fire risk is unmanaged.
 */
export function MissionScene({ step, n2, breathing, cabinSpec, findings }: {
  step: StepId
  /** Nitrogen left in the body, psi. */
  n2: number
  breathing: boolean
  cabinSpec?: string
  findings: Finding[] | null
}) {
  const outside = step === 'debrief'
  const verdict = (id: Finding['id']) => findings?.find((f) => f.id === id)?.verdict
  const bends = verdict('body') === 'bad'
  const fire = verdict('fire') === 'bad'
  const bubbles = Math.round((n2 / (EARTH_PSI * 0.79)) * SPOTS.length)

  return (
    <figure>
    <div className="grain relative h-[380px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[radial-gradient(ellipse_at_50%_0%,#141a33_0%,#08090e_70%)] sm:h-[460px]">
      {/* sky */}
      <div className="absolute inset-0" aria-hidden="true">
        {STARS.map((s, i) => (
          <i key={i} className="absolute size-[2px] rounded-full bg-white" style={{ left: `${s.left}%`, top: `${s.top}%`, opacity: s.o }} />
        ))}
      </div>
      {/* Earth from the Moon: lit from the side, so the terminator and city lights show */}
      <EarthGlobe className="absolute right-[4%] top-[4%] size-28 sm:size-32" sun={[-0.8, 0.3, 0.75]} longitude={20} spin={0.08} />
      <Tag className="right-[4%] top-[calc(4%+7.5rem)] text-right sm:top-[calc(4%+8.5rem)]" title="Earth" lines={['14.7 psi · 21% O₂']} />

      {/* lunar ground */}
      <div className="absolute inset-x-[-10%] bottom-[-34%] h-[62%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_0%,#b9bcc7_0%,#6d7080_38%,#2c2e38_75%)]" aria-hidden="true">
        <i className="absolute left-[22%] top-[14%] h-3 w-10 rounded-[50%] bg-black/25" />
        <i className="absolute left-[63%] top-[9%] h-2.5 w-8 rounded-[50%] bg-black/25" />
        <i className="absolute left-[46%] top-[24%] h-4 w-14 rounded-[50%] bg-black/20" />
      </div>

      {/* Moon Base dome: wraps the astronaut indoors, sits to the side outdoors */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-[14%] left-1/2 rounded-t-full border border-b-0 border-[var(--color-flame)]/45 bg-[linear-gradient(180deg,rgba(108,200,255,0.10),rgba(108,200,255,0.02))]"
        initial={false}
        animate={outside ? { width: '24%', height: '26%', x: '-175%' } : { width: '86%', height: '80%', x: '-50%' }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {fire && (
          <motion.span
            className="absolute inset-0 rounded-t-full bg-[radial-gradient(circle_at_50%_80%,rgba(245,165,74,0.75),transparent_65%)]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
      </motion.div>
      <Tag
        className={outside ? 'bottom-[42%] left-[4%]' : 'left-[9%] top-[26%]'}
        title="Moon Base"
        lines={[cabinSpec ? cabinSpec.replace('oxygen', 'O₂') : 'Cabin air not chosen']}
        icon={fire ? <Flame className="size-3.5 text-[var(--color-ember)]" aria-hidden="true" /> : undefined}
        note={fire ? 'Fire risk unmanaged' : undefined}
      />

      {/* astronaut */}
      <div className="absolute bottom-[9%] left-1/2 size-[250px] -translate-x-1/2 sm:size-[310px]">
        <Astronaut3D className="size-full" talking={breathing} credit={false} />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {SPOTS.slice(0, bubbles).map((b, i) => (
            <motion.i
              key={i}
              className="absolute rounded-full border"
              style={{
                left: `${b.left}%`, top: `${b.top}%`, width: b.size, height: b.size,
                borderColor: bends ? 'var(--color-ember)' : 'rgba(226,229,237,0.75)',
                background: bends ? 'rgba(245,165,74,0.55)' : 'rgba(226,229,237,0.12)',
              }}
              animate={bends ? { scale: [1, 2.1, 1] } : { y: [0, -5, 0] }}
              transition={{ duration: bends ? 0.9 : 2.6, repeat: Infinity, delay: b.delay }}
            />
          ))}
        </div>
      </div>
      {(step === 'suit' || outside) && (
        <Tag className="bottom-[44%] right-[4%] text-right" title="Spacesuit" lines={['4.3 psi · 100% O₂']} />
      )}
      {breathing && (
        <p className="absolute left-1/2 top-[14%] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[var(--color-flame)]/50 bg-[var(--color-void)]/80 px-3 py-1.5 text-[12px] text-[var(--color-ink)]">
          <Wind className="size-3.5 text-[var(--color-flame)]" aria-hidden="true" /> Breathing 100% oxygen
        </p>
      )}

      <p className="label absolute left-4 top-4 !text-[var(--color-ink-dim)]">{PLACE[step]}</p>
    </div>
    <figcaption className="mt-2 px-1 text-[12px] text-[var(--color-ink-dim)]">
      <span>
        <span aria-hidden="true">○ </span>
        {bends ? 'Nitrogen bubbles forming — the bends' : `Bubbles show nitrogen dissolved in the body: ${n2 ? `${n2.toFixed(1)} psi` : 'pick a cabin first'}`}
      </span>
    </figcaption>
    </figure>
  )
}

function Tag({ title, lines, className, icon, note }: { title: string; lines: string[]; className: string; icon?: ReactNode; note?: string }) {
  return (
    <div className={`absolute z-10 max-w-[44%] ${className}`}>
      <p className="text-[12px] font-medium text-[var(--color-ink)]">{title}</p>
      {lines.map((l) => (
        <p key={l} className="font-mono text-[11px] tabular-nums text-[var(--color-ink-dim)]">{l}</p>
      ))}
      {note && <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--color-ember)]">{icon}{note}</p>}
    </div>
  )
}
