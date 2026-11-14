import { ExternalLink, FlaskConical } from 'lucide-react'
import type { Citation } from '@/api/types'
import { groupCitations, isSynthetic, useCitations } from '@/components/ui/citations'

/** Numbered source list; citation chips scroll here. */
export function SourcesList({ citations, sharedSource }: { citations: Citation[]; sharedSource?: { url: string; label: string; citationUrl?: string; description?: string } }) {
  const index = useCitations()
  if (!citations.length) return <p className="text-sm text-[var(--color-ink-faint)]">No sources listed.</p>
  return (
    <div className="space-y-5">
    {sharedSource && <div className="space-y-3 text-sm text-[var(--color-ink-dim)]">
      <p>{sharedSource.description ?? 'Open NASA’s investigation record to browse its dataset files. The references below identify the evidence used on this page; cited publications may open in a separate repository.'}</p>
      <a href={sharedSource.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-4 py-2 text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]">
        {sharedSource.label} <ExternalLink className="size-4 shrink-0" />
      </a>
    </div>}
    <div className="divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)]">
      {groupCitations(citations).map((group) => <details key={group[0].source_id} className="min-w-0">
        <summary className="cursor-pointer break-words px-5 py-4 text-sm text-[var(--color-ink)]">
          {group[0].file_name ?? group[0].title}
          <span className="ml-2 text-xs text-[var(--color-ink-faint)]">{group.length} {group.length === 1 ? 'reference' : 'references'}</span>
        </summary>
        <ol className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
      {group.map((c) => {
        const synthetic = isSynthetic(c)
        return (
          <li key={c.id} id={`cite-${c.id}`} tabIndex={-1} className="group flex scroll-mt-28 items-start gap-5 px-5 py-4 target:bg-[var(--color-flame)]/5 focus:outline-2 focus:outline-[var(--color-flame)]">
            <span className={`mt-0.5 font-mono text-xs tabular-nums ${synthetic ? 'text-[var(--color-ember)]' : 'text-[var(--color-flame)]'}`}>
              [{index.get(c.id)?.n ?? citations.indexOf(c) + 1}]
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-mono text-[11px] text-[var(--color-ink-dim)]">{c.location}</p>
            </div>
            {synthetic ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ember)]">
                <FlaskConical className="h-3 w-3" /> Synthetic
              </span>
            ) : c.url && c.url !== (sharedSource?.citationUrl ?? sharedSource?.url) ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
              >
                Open source <ExternalLink className="h-3 w-3" />
              </a>
            ) : !c.url ? (
              <span className="text-[11px] italic text-[var(--color-ink-faint)]">Source unavailable</span>
            ) : null}
          </li>
        )
      })}
        </ol>
      </details>)}
    </div>

    </div>
  )
}
