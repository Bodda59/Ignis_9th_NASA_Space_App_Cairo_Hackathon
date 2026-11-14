import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Compare hero: the same candle flame under three gravities, side by side.
 * With less gravity, hot gas rises less, so the flame gets shorter and rounder
 * and burns bluer (less soot). Shapes are illustrative, not measured.
 */
const FLAMES = [
  { place: 'Earth', g: '1 g', pull: 1, outer: '#ff9a3c', inner: '#ffe27a', glow: '#ff8a3d' },
  { place: 'Mars', g: '0.38 g', pull: 0.45, outer: '#c98bff', inner: '#ffd2a8', glow: '#b07cff' },
  { place: 'Orbit', g: 'μg', pull: 0, outer: '#3f8cff', inner: '#bfe6ff', glow: '#4aa8ff' },
]

/** Teardrop whose point shrinks as `pull` (gravity) goes to zero. */
function flamePath(pull: number, cx = 60, cy = 120, r = 30) {
  const tip = 1.9 * r * pull
  const top = cy - r - tip
  const k = 0.552 * r
  const c1x = cx + k * (1 - 0.75 * pull)
  const c1y = top + tip * 0.55
  return [
    `M ${cx} ${top}`,
    `C ${c1x} ${c1y} ${cx + r} ${cy - k} ${cx + r} ${cy}`,
    `C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}`,
    `C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}`,
    `C ${cx - r} ${cy - k} ${2 * cx - c1x} ${c1y} ${cx} ${top}`,
    'Z',
  ].join(' ')
}

export function GravityFlames({ className }: { className?: string }) {
  const still = !!useReducedMotion()
  const id = useId().replace(/:/g, '')
  return (
    <figure className={cn('pointer-events-none isolate select-none', className)} aria-label="Illustration: a candle flame on Earth is tall and yellow, on Mars shorter, and in orbit a round blue ball">
      {/* Same deep-space backdrop as the Rank hero: nebula glow and stars, fading at the edges. */}
      <div aria-hidden="true" className="absolute -inset-x-10 -inset-y-12 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_78%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_55%,rgba(245,165,74,0.12),transparent_50%),radial-gradient(ellipse_at_55%_45%,rgba(157,140,255,0.16),transparent_50%),radial-gradient(ellipse_at_80%_50%,rgba(47,107,255,0.22),transparent_55%)]" />
        <div className="space-stars absolute inset-0" />
        <div className="space-stars space-stars--twinkle absolute inset-0" />
      </div>
      <div className="relative grid h-full grid-cols-3 items-center">
        {FLAMES.map((f, i) => (
          <motion.div key={f.place} className="flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <svg viewBox="0 0 120 190" className="h-[clamp(170px,19vw,250px)] w-auto overflow-visible" aria-hidden="true">
              <defs>
                <radialGradient id={`${id}-glow-${i}`}>
                  <stop offset="0%" stopColor={f.glow} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={f.glow} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-core-${i}`} cx="50%" cy="68%" r="62%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor={f.inner} />
                  <stop offset="100%" stopColor={f.outer} />
                </radialGradient>
              </defs>
              {/* halo */}
              <motion.circle cx="60" cy={120 - 30 * f.pull} r="62" fill={`url(#${id}-glow-${i})`}
                animate={still ? undefined : { opacity: [0.75, 1, 0.8] }} transition={{ duration: 2.4 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }} />
              {/* flame: Earth flickers fast and tall, the orbit flame breathes slowly */}
              <motion.path d={flamePath(f.pull)} fill={`url(#${id}-core-${i})`}
                style={{ originX: '60px', originY: '150px', transformBox: 'view-box' }}
                animate={still ? undefined : { scaleX: [1, 1.04, 0.98, 1], scaleY: [1, 0.97 + 0.08 * f.pull, 1.02, 1] }}
                transition={{ duration: 0.9 + (1 - f.pull) * 2, repeat: Infinity, ease: 'easeInOut' }} />
              {/* wick */}
              <rect x="57" y="146" width="6" height="16" rx="2" fill="#2a2a3a" />
              <rect x="44" y="160" width="32" height="10" rx="4" fill="#1b2030" stroke="rgba(255,255,255,0.12)" />
            </svg>
            <figcaption className="mt-2 text-center">
              <span className="block font-display text-sm uppercase tracking-[0.06em] text-[var(--color-ink)]">{f.place}</span>
              <span className="block font-mono text-[11px] text-[var(--color-ink-faint)]">{f.g}</span>
            </figcaption>
          </motion.div>
        ))}
      </div>
      <p className="absolute bottom-0 right-0 text-[10px] text-[var(--color-ink-faint)]">Same flame, less gravity · illustrative</p>
    </figure>
  )
}
