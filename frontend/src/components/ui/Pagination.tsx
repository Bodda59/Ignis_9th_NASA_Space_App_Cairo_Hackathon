import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const btn =
    'grid h-10 w-10 place-items-center rounded-full border border-[var(--color-line-strong)] transition-all hover:border-[var(--color-flame)] hover:text-[var(--color-flame)] disabled:pointer-events-none disabled:opacity-30'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-[var(--color-line)] pt-6">
      <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-full px-3 font-mono text-xs tabular-nums transition-colors',
              p === page ? 'bg-[var(--color-ink)] text-[var(--color-void)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]',
            )}
          >
            {String(p).padStart(2, '0')}
          </button>
        ))}
      </div>
      <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ArrowRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
