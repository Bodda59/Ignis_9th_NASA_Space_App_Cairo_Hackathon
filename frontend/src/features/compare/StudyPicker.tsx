import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import type { SearchItem } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'

/** "Add study" slot with a searchable dropdown (uses the same search API). */
export function StudyPicker({ exclude, onPick, variant = 'slot', dropUp = false, disabled = false }: { exclude: string[]; onPick: (s: SearchItem) => void; variant?: 'slot' | 'hero' | 'chip'; dropUp?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 220)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const res = useAsync(
    (sig) => api.search({ query: debounced, filters: {}, context: {}, page: 1, page_size: 20 }, sig),
    open ? `pick:${debounced}` : 'closed',
  )
  const items = (res.data?.items ?? []).filter((i) => !exclude.includes(i.id))

  return (
    <div ref={box} className={cn('relative', variant !== 'chip' && 'h-full')}>
      {variant === 'chip' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-[var(--color-line-strong)] px-2.5 text-[11px] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-ink)] disabled:opacity-40"
        >
          <Plus className="h-3 w-3" /> Add study
        </button>
      ) : (
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'group flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-sm transition-all duration-300',
          variant === 'hero' ? 'min-h-[180px] border-[var(--color-line-strong)]' : 'min-h-[150px] border-[var(--color-line)]',
          open ? 'border-[var(--color-flame)] text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]',
        )}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full border border-current transition-transform duration-500 group-hover:rotate-90">
          <Plus className="h-4 w-4" />
        </span>
        Add a study
      </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn('absolute left-0 z-40 w-[min(380px,90vw)]', dropUp ? 'bottom-full mb-2' : 'top-full mt-2', ' overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]')}
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--color-ink-faint)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a study…"
                aria-label="Find a study to compare"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-faint)]"
              />
              {res.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-ink-faint)]" />}
            </div>
            <ul role="listbox" className="max-h-72 overflow-y-auto p-1.5" data-lenis-prevent>
              {res.status === 'error' && <li className="px-3 py-4 text-xs text-[var(--color-ember)]">{res.error.message}</li>}
              {res.data && !items.length && <li className="px-3 py-4 text-xs text-[var(--color-ink-faint)]">No other studies match.</li>}
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onPick(it)
                      setOpen(false)
                      setQ('')
                    }}
                    className="flex w-full items-baseline gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.05]"
                  >
                    <span className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink)]">{it.acronym}</span>
                    <span className="truncate text-xs text-[var(--color-ink-dim)]">{it.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
