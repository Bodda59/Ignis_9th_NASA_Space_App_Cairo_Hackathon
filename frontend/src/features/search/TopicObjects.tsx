import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { SAFETY_TOPICS, type SafetyTopic } from '@/api/types'
import { cn } from '@/lib/cn'
import { TOPIC } from '@/lib/labels'

const TopicScene = lazy(() => import('./TopicScene'))

const NOTE: Record<SafetyTopic, string> = {
  prevention: 'Stop a fire starting',
  detection: 'Spot it early',
  suppression: 'Put it out',
}

/**
 * Explore hero: the three safety topics as 3D objects on the same deep-space backdrop as the
 * Rank and Compare heroes. Objects and captions both toggle the Safety-topic filter
 * (the captions are the keyboard / screen-reader controls).
 */
export function TopicObjects({ active, onToggle, className }: { active: SafetyTopic[]; onToggle: (t: SafetyTopic) => void; className?: string }) {
  const reduced = !!useReducedMotion()
  return (
    <figure className={cn('relative isolate select-none', className)}>
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_78%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_50%,rgba(125,211,167,0.14),transparent_50%),radial-gradient(ellipse_at_50%_45%,rgba(108,200,255,0.16),transparent_50%),radial-gradient(ellipse_at_80%_50%,rgba(199,155,255,0.16),transparent_55%)]" />
        <div className="space-stars absolute inset-0" />
        <div className="space-stars space-stars--twinkle absolute inset-0" />
      </div>
      <div className="h-[clamp(220px,21vw,300px)]">
        <Suspense fallback={null}>
          <TopicScene active={active} onToggle={onToggle} reduced={reduced} />
        </Suspense>
      </div>
      <div className="grid grid-cols-3" role="group" aria-label="Filter by safety topic">
        {SAFETY_TOPICS.map((t) => {
          const on = active.includes(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              aria-pressed={on}
              className="group flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-colors hover:bg-white/[0.03]"
            >
              <span
                className={cn('font-display text-sm uppercase tracking-[0.06em] transition-colors', on ? '' : 'text-[var(--color-ink)]')}
                style={on ? { color: TOPIC[t].color } : undefined}
              >
                {TOPIC[t].label}
              </span>
              <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{NOTE[t]}</span>
              <span
                aria-hidden="true"
                className={cn('mt-1 h-0.5 w-6 rounded-full transition-opacity', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')}
                style={{ background: TOPIC[t].color }}
              />
            </button>
          )
        })}
      </div>
      <p className="absolute -bottom-5 right-0 text-[10px] text-[var(--color-ink-faint)]">Click an object to filter by topic</p>
    </figure>
  )
}
