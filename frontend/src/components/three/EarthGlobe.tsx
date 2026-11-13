import { lazy, Suspense } from 'react'
import type { EarthGlobeProps } from './EarthGlobeScene'

const EarthGlobeScene = lazy(() => import('./EarthGlobeScene'))

/**
 * NASA Blue Marble globe (day, city lights and ocean mask from NASA Visible Earth, public domain).
 * Three.js loads lazily; a flat gradient Earth stands in until it is ready.
 * `className` must position the wrapper (e.g. `absolute` or `relative`) and size it.
 */
export function EarthGlobe({ className, ...props }: EarthGlobeProps & { className: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Suspense fallback={<div className="absolute inset-[15%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#9fd4ff_0%,#2f6bff_40%,#0b1f4d_72%,#050a18_100%)] opacity-70" />}>
        <EarthGlobeScene {...props} />
      </Suspense>
    </div>
  )
}
