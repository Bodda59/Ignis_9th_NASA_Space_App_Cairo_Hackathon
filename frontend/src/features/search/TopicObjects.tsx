import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { SAFETY_TOPICS, type SafetyTopic } from '@/api/types'
import { cn } from '@/lib/cn'
import { TOPIC } from '@/lib/labels'

const TopicScene = lazy(() => import('./TopicScene'))

/** 3D topic objects that double as Safety-topic filters (buttons below for keyboard / screen readers). */
export function TopicObjects({ active, onToggle }: { active: SafetyTopic[]; onToggle: (t: SafetyTopic) => void }) {
  const reduced = !!useReducedMotion()
  return (
    <div className="hidden w-[440px] lg:block">
      <div className="h-[170px]">
        <Suspense fallback={null}>
          <TopicScene active={active} onToggle={onToggle} reduced={reduced} />
        </Suspense>
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filter by safety topic">
        {SAFETY_TOPICS.map((t) => {
          const on = active.includes(t)
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              aria-pressed={on}
              className={cn(
                'rounded-full py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors',
                on ? 'text-[var(--color-void)]' : 'text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]',
              )}
              style={on ? { background: TOPIC[t].color } : undefined}
            >
              {TOPIC[t].label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
