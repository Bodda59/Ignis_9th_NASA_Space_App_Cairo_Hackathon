import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COMPARE_MAX, COMPARE_MIN, useCompare } from './compareStore'

/** Floating tray showing the 2–3 study compare selection. */
export function CompareTray() {
  const { items, remove, clear } = useCompare()
  const nav = useNavigate()
  const { pathname } = useLocation()
  // hidden where it duplicates the page (Compare) or would cover the composer (Ask)
  const onComparePage = pathname === '/compare' || pathname === '/ask'
  const ready = items.length >= COMPARE_MIN
  const slots = Array.from({ length: COMPARE_MAX }, (_, i) => items[i])

  return (
    <AnimatePresence>
      {items.length > 0 && !onComparePage && (
        <motion.div
          role="region"
          aria-label="Compare selection"
          className="fixed bottom-6 left-1/2 z-40 w-[min(680px,calc(100vw-2rem))] -translate-x-1/2"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)]/85 p-2.5 pl-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <p className="label hidden shrink-0 sm:block">Compare</p>
            <div className="flex min-w-0 flex-1 gap-2">
              {slots.map((it, i) => (
                <div key={it?.id ?? `empty-${i}`} className="min-w-0 flex-1">
                  <AnimatePresence mode="popLayout">
                    {it ? (
                      <motion.div
                        key={it.id}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex h-10 items-center justify-between gap-1 rounded-xl border border-[var(--color-flame)]/40 bg-[var(--color-flame)]/[0.07] pl-3 pr-1"
                        title={it.name}
                      >
                        <span className="truncate font-mono text-[11px] uppercase tracking-[0.1em]">{it.acronym}</span>
                        <button
                          onClick={() => remove(it.id)}
                          aria-label={`Remove ${it.acronym} from compare`}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--color-ink-faint)] hover:bg-white/5 hover:text-[var(--color-ink)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid h-10 place-items-center rounded-xl border border-dashed border-[var(--color-line)] font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]"
                      >
                        {i < COMPARE_MIN ? 'Add study' : 'Optional'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <button
              onClick={clear}
              className="hidden h-10 shrink-0 px-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] sm:block"
            >
              Clear
            </button>
            <button
              disabled={!ready}
              onClick={() => nav(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--color-flame)] px-4 text-xs font-medium text-[var(--color-void)] shadow-[0_0_24px_-6px_var(--color-flame)] transition-all hover:brightness-110 disabled:bg-white/10 disabled:text-[var(--color-ink-faint)] disabled:shadow-none"
              title={ready ? undefined : 'Select at least 2 studies'}
            >
              Compare {items.length}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
