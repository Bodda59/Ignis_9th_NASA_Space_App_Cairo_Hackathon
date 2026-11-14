import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { useContext, useState } from 'react'
import { scrollToEl } from '@/lib/scroll'
import { AnchorCtx, isSynthetic, useCitations } from './citations'

/** Footnote-style citation [n] with a hover/focus card. Click jumps to the source list. */
/** `footnote` renders an editorial superscript number instead of the boxed chip. */
export function CitationChip({ id, footnote = false }: { id: string; footnote?: boolean }) {
  const idx = useCitations()
  const prefix = useContext(AnchorCtx)
  const entry = idx.get(id)
  const [open, setOpen] = useState(false)

  if (!entry) {
    // contract: cited IDs must resolve — surface it instead of hiding it
    return <span className="ml-1 rounded bg-[var(--color-ember)]/15 px-1 font-mono text-[11px] text-[var(--color-ember)]">unresolved citation</span>
  }
  const { n, citation } = entry
  const synthetic = isSynthetic(citation)

  return (
    <span className="relative inline-block align-baseline" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => {
          const target = document.getElementById(`${prefix}${id}`)
          const group = target?.closest('details')
          if (group) group.open = true
          target?.focus({ preventScroll: true })
          scrollToEl(target, -140)
        }}
        aria-label={`Source ${n}: ${citation.file_name ?? citation.title}, ${citation.location}`}
        className={
          footnote
            ? `ml-0.5 align-super font-sans text-[0.68em] font-semibold leading-none underline-offset-2 hover:underline ${synthetic ? 'text-[var(--color-ember)]' : 'text-[var(--color-flame)]'}`
            : `ml-1 inline-grid h-[18px] min-w-[18px] -translate-y-0.5 place-items-center rounded-[5px] border px-1 font-mono text-[11px] leading-none transition-colors ${
                synthetic
                  ? 'border-[var(--color-ember)]/50 text-[var(--color-ember)] hover:bg-[var(--color-ember)]/10'
                  : 'border-[var(--color-flame)]/40 text-[var(--color-flame)] hover:bg-[var(--color-flame)]/10'
              }`
        }
      >
        {n}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full left-1/2 z-30 mb-2 block w-72 -translate-x-1/2 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-3.5 text-left shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]"
          >
            <span className="label block">Source {n}{synthetic && ' · synthetic'}</span>
            <span className="mt-1.5 block break-words text-[13px] leading-snug text-[var(--color-ink)]">{citation.file_name ?? citation.title}</span>
            <span className="mt-1 block font-mono text-[11px] text-[var(--color-ink-dim)]">{citation.location}</span>
            {citation.url && (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-flame)]">
                <ExternalLink className="h-3 w-3" /> Jump to reference
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export function Cited({ text, ids }: { text: string; ids: string[] }) {
  return (
    <>
      {text}
      {[...new Set(ids)].map((id) => (
        <CitationChip key={id} id={id} />
      ))}
    </>
  )
}
