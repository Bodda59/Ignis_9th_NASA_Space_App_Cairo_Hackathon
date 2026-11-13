import { motion, useReducedMotion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { cn } from '@/lib/cn'

const AstronautScene = lazy(() => import('./AstronautScene'))

/** Lazy-loaded 3D astronaut with a soft glow and the required CC-BY model credit. */
export function Astronaut3D({ talking = false, className, credit = true }: { talking?: boolean; className?: string; credit?: boolean }) {
  const reduced = !!useReducedMotion()
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0" aria-hidden="true">
        <motion.span
          className="absolute inset-[12%] -z-10 rounded-full bg-[radial-gradient(circle,rgba(108,200,255,0.28),transparent_65%)] blur-2xl"
          animate={{ opacity: talking ? [0.6, 1, 0.6] : 0.55 }}
          transition={talking ? { duration: 1.2, repeat: Infinity } : { duration: 0.6 }}
        />
        <Suspense fallback={null}>
          <AstronautScene talking={talking} reduced={reduced} />
        </Suspense>
      </div>
      {credit && (
        <a
          href="https://poly.pizza/m/erlAEWfFKH3"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-[var(--color-ink-faint)] underline-offset-2 hover:text-[var(--color-ink-dim)] hover:underline"
        >
          Astronaut by PW Wu · CC-BY
        </a>
      )}
    </div>
  )
}
