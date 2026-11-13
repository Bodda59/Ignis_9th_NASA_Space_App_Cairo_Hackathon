import type { SafetyTopic } from '@/api/types'
import { TOPIC } from '@/lib/labels'

export function TopicBadge({ topic }: { topic: SafetyTopic }) {
  const t = TOPIC[topic]
  const Icon = t.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em]"
      style={{ borderColor: `color-mix(in oklab, ${t.color} 40%, transparent)`, color: t.color }}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t.label}
    </span>
  )
}
