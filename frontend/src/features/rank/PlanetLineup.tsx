import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { HabitatId } from '@/api/types'
import { cn } from '@/lib/cn'
import { BODIES, CENTRE_DROP, CRAFT, OFFSET_X, SCENE_H, SCENE_W } from './planets'

const PlanetLineupScene = lazy(() => import('./PlanetLineupScene'))

/**
 * Rank hero: Earth, Mars and the Moon at true relative size, with a craft or base for each
 * crew environment. Picking one ranks research for that environment.
 */
export function PlanetLineup({ onPick, className }: { onPick: (habitat: HabitatId) => void; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [active, setActive] = useState<string | null>(null)
  const reduced = !!useReducedMotion()

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pixels per Earth radius; the 3D scene and the HTML labels share it.
  const zoom = size.w ? Math.min(size.w / SCENE_W, size.h / SCENE_H) : 0
  const cx = size.w / 2 + OFFSET_X * zoom
  const cy = size.h / 2 + CENTRE_DROP * zoom
  const toScreen = (x: number, y: number) => ({ left: cx + x * zoom, top: cy - y * zoom })

  return (
    <div>
    <figure className={cn('relative isolate', className)} aria-label="Earth, Mars and the Moon at true relative size, with a station, spacecraft, bases and a rover">
      <SpaceBackdrop />
      <div ref={box} className="absolute inset-0">
        {zoom > 0 && (
          <div className="absolute inset-x-0" style={{ top: cy - size.h / 2, height: size.h }}>
            <Suspense fallback={null}>
              <PlanetLineupScene zoom={zoom} reduced={reduced} active={active} onHover={setActive} onPick={(c) => onPick(c.habitat)} />
            </Suspense>
          </div>
        )}

        {zoom > 0 && BODIES.map((b) => (
          <div key={b.id} className="pointer-events-none absolute -translate-x-1/2 text-center"
            style={{ ...toScreen(b.x, -b.r * 1.07), width: Math.max(130, b.r * zoom * 2), marginTop: 10 }}>
            <span className="block font-display text-sm uppercase tracking-[0.04em] text-[var(--color-ink)]">{b.name}</span>
            <span className="mt-0.5 block whitespace-nowrap font-mono text-[11px] text-[var(--color-ink-dim)]">{b.gravity} · {b.diameterKm.toLocaleString('en-US')} km</span>
          </div>
        ))}

        {zoom > 0 && CRAFT.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.habitat)}
            onMouseEnter={() => setActive(c.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(c.id)}
            onBlur={() => setActive(null)}
            aria-label={`Rank research for: ${c.name}`}
            className={cn('group absolute whitespace-nowrap rounded-md px-1.5 py-0.5',
              c.label === 'right' ? '-translate-y-1/2 text-left' : '-translate-x-1/2 -translate-y-full text-center')}
            style={c.label === 'right' ? toScreen(c.x + 0.14, c.y) : toScreen(c.x, c.y + 0.17)}
          >
            <span className={cn('block text-[11px] font-medium uppercase tracking-[0.06em] transition-colors',
              active === c.id ? 'text-[var(--color-flame)]' : 'text-[var(--color-ink)]')}>
              {c.name} <span aria-hidden="true" className="opacity-60">→</span>
            </span>
            <span className={cn('block text-[10px] transition-colors', active === c.id ? 'text-[var(--color-ink-dim)]' : 'text-[var(--color-ink-faint)]')}>{c.note}</span>
          </button>
        ))}
      </div>
      <figcaption className="sr-only">
        Earth is 12,742 km across with 1 g gravity, Mars is 6,779 km with 0.38 g, and the Moon is 3,475 km with 0.17 g.
        Select the space station, spacecraft, Mars base, pressurized rover or lunar base to rank research for that crew environment.
      </figcaption>
    </figure>
    <p className="mt-2 text-right text-[10px] text-[var(--color-ink-faint)]">
      Planets to scale · craft and orbit enlarged · Textures: NASA (Earth, Moon), Solar System Scope CC BY 4.0 (Mars)
    </p>
    </div>
  )
}

/** Deep-space backdrop: faint nebula glow and two layers of stars, fading out at the edges. */
function SpaceBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_78%)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgba(47,107,255,0.22),transparent_55%),radial-gradient(ellipse_at_75%_55%,rgba(157,140,255,0.18),transparent_50%),radial-gradient(ellipse_at_60%_30%,rgba(245,165,74,0.08),transparent_45%)]" />
      <div className="space-stars absolute inset-0" />
      <div className="space-stars space-stars--twinkle absolute inset-0" />
    </div>
  )
}
