import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { HabitatId } from '@/api/types'
import { Starfield } from '@/components/fx/Starfield'
import { useTheme } from '@/lib/theme'

/**
 * Fixed space wallpaper behind the chat that adapts to the habitat context:
 * Moon by default (and for lunar base / rover), Mars for a Mars base,
 * Earth from orbit for a spacecraft or space station. Decorative only.
 */
type PlanetId = 'moon' | 'mars' | 'earth'

const PLANETS: Record<PlanetId, { label: string; surface: string; glow: string; nebulaA: string; nebulaB: string; rim: string }> = {
  moon: {
    label: 'Moon',
    surface: 'radial-gradient(circle at 50% 6%, #c4c5ce 0%, #7d7e89 14%, #43444d 32%, #16161c 52%, #08090e 66%)',
    glow: 'rgba(225,230,245,0.35)',
    nebulaA: 'rgba(157,140,255,0.16)',
    nebulaB: 'rgba(108,200,255,0.10)',
    rim: 'rgba(230,235,250,0.35)',
  },
  mars: {
    label: 'Mars',
    surface: 'radial-gradient(circle at 50% 6%, #e8a07a 0%, #b4532f 14%, #6a2415 32%, #250b06 52%, #08090e 66%)',
    glow: 'rgba(255,140,90,0.45)',
    nebulaA: 'rgba(245,120,74,0.14)',
    nebulaB: 'rgba(157,140,255,0.10)',
    rim: 'rgba(255,160,110,0.45)',
  },
  earth: {
    label: 'Earth',
    surface: 'radial-gradient(circle at 50% 6%, #8fd4f5 0%, #2f78c8 13%, #10336f 30%, #061331 50%, #08090e 66%)',
    glow: 'rgba(108,200,255,0.6)',
    nebulaA: 'rgba(108,200,255,0.14)',
    nebulaB: 'rgba(157,140,255,0.12)',
    rim: 'rgba(140,215,255,0.6)',
  },
}

/** Light theme: the same worlds seen in daylight; edges fade into the light page instead of black. */
const PLANETS_LIGHT: typeof PLANETS = {
  moon: {
    label: 'Moon',
    surface: 'radial-gradient(circle at 50% 6%, #f7f8fb 0%, #c3c7d2 14%, #9ea4b4 32%, #b2bbcd 52%, #c5cedd 66%)',
    glow: 'rgba(255,255,255,0.75)',
    nebulaA: 'rgba(91,63,208,0.10)',
    nebulaB: 'rgba(26,86,196,0.08)',
    rim: 'rgba(255,255,255,0.85)',
  },
  mars: {
    label: 'Mars',
    surface: 'radial-gradient(circle at 50% 6%, #f6c3a2 0%, #d58258 14%, #b4603f 32%, #bf9a8e 52%, #c5cedd 66%)',
    glow: 'rgba(232,140,100,0.45)',
    nebulaA: 'rgba(184,68,14,0.10)',
    nebulaB: 'rgba(91,63,208,0.07)',
    rim: 'rgba(255,214,190,0.85)',
  },
  earth: {
    label: 'Earth',
    surface: 'radial-gradient(circle at 50% 6%, #c4e8fb 0%, #5d9fe0 13%, #2f6dbf 30%, #93acd3 50%, #c5cedd 66%)',
    glow: 'rgba(90,160,230,0.5)',
    nebulaA: 'rgba(26,86,196,0.10)',
    nebulaB: 'rgba(91,63,208,0.08)',
    rim: 'rgba(225,242,255,0.9)',
  },
}

function planetFor(habitat?: HabitatId): PlanetId {
  if (habitat === 'mars_base') return 'mars'
  if (habitat === 'spacecraft' || habitat === 'space_station') return 'earth'
  return 'moon'
}

export function ChatBackdrop({ habitat, raised = false }: { habitat?: HabitatId; raised?: boolean }) {
  const reduced = useReducedMotion()
  const id = planetFor(habitat)
  const light = useTheme() === 'light'
  const p = (light ? PLANETS_LIGHT : PLANETS)[id]

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className={`absolute inset-0 ${light ? 'bg-[radial-gradient(120%_80%_at_50%_0%,#a9b8d6_0%,#c5cedd_60%)]' : 'bg-[radial-gradient(120%_80%_at_50%_0%,#11142b_0%,#08090e_60%)]'}`} />

      {/* nebula clouds tinted by the planet */}
      <motion.div
        className="absolute -left-[15%] top-[2%] h-[70vmax] w-[70vmax] rounded-full blur-3xl"
        animate={{ background: `radial-gradient(circle, ${p.nebulaA}, transparent 60%)`, ...(reduced ? {} : { x: [0, 40, 0], y: [0, 20, 0] }) }}
        transition={{ background: { duration: 1.5 }, x: { duration: 40, repeat: Infinity, ease: 'easeInOut' }, y: { duration: 40, repeat: Infinity, ease: 'easeInOut' } }}
      />
      <motion.div
        className="absolute -right-[20%] top-[20%] h-[60vmax] w-[60vmax] rounded-full blur-3xl"
        animate={{ background: `radial-gradient(circle, ${p.nebulaB}, transparent 60%)`, ...(reduced ? {} : { x: [0, -30, 0], y: [0, -25, 0] }) }}
        transition={{ background: { duration: 1.5 }, x: { duration: 50, repeat: Infinity, ease: 'easeInOut' }, y: { duration: 50, repeat: Infinity, ease: 'easeInOut' } }}
      />

      <Starfield className="absolute inset-0 h-full w-full" density={0.00018} />

      {/* the planet on the horizon — crossfades when the habitat changes */}
      <AnimatePresence initial={false}>
        <motion.div
          key={id}
          className={`absolute left-1/2 aspect-square w-[170vmax] -translate-x-1/2 transition-[top] duration-1000 ${raised ? 'top-[58%]' : 'top-[80%]'}`}
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: p.surface, boxShadow: `0 -40px 140px -30px ${p.glow}` }} />
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <Surface seed={id === 'moon' ? 3 : id === 'mars' ? 7 : 11} cloudy={id === 'earth'} reduced={!!reduced} />
          </div>
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: `inset 0 2px 0 0 ${p.rim}` }} />
        </motion.div>
      </AnimatePresence>

      {/* current world label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="label absolute bottom-6 left-8 hidden !text-[var(--color-ink-dim)] lg:block"
        >
          Horizon · {p.label}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/** Procedural surface (SVG turbulence) drifting slowly to suggest rotation. */
function Surface({ seed, cloudy, reduced }: { seed: number; cloudy: boolean; reduced: boolean }) {
  return (
    <motion.svg
      className="absolute inset-y-0 left-0 h-[40%] w-[200%] mix-blend-overlay"
      animate={reduced ? undefined : { x: ['0%', '-50%'] }}
      transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
    >
      <filter id={`chat-surf-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency={cloudy ? '0.004 0.012' : '0.006 0.014'} numOctaves="5" seed={seed} stitchTiles="stitch" />
        <feColorMatrix values={cloudy ? '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -1.1' : '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.6 -0.55'} />
      </filter>
      <rect width="100%" height="100%" filter={`url(#chat-surf-${seed})`} opacity="0.85" />
    </motion.svg>
  )
}
