import { ExternalLink, FlaskConical } from 'lucide-react'
import type { Citation } from '@/api/types'
import { isSynthetic } from '@/components/ui/citations'

/** Numbered source list; citation chips scroll here. */
export function SourcesList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return <p className="text-sm text-[var(--color-ink-faint)]">No sources listed.</p>
  return (
    <ol className="divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)]">
      {citations.map((c, i) => {
        const synthetic = isSynthetic(c)
        return (
          <li key={c.id} id={`cite-${c.id}`} className="group flex scroll-mt-28 items-start gap-5 px-5 py-4 target:bg-[var(--color-flame)]/5">
            <span className={`mt-0.5 font-mono text-xs tabular-nums ${synthetic ? 'text-[var(--color-ember)]' : 'text-[var(--color-flame)]'}`}>
              [{i + 1}]
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--color-ink)]">{c.title}</p>
              <p className="mt-1 font-mono text-[11px] text-[var(--color-ink-dim)]">{c.location}</p>
            </div>
            {synthetic ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ember)]">
                <FlaskConical className="h-3 w-3" /> Synthetic
              </span>
            ) : c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
              >
                Open source <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-[11px] italic text-[var(--color-ink-faint)]">Source unavailable</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
