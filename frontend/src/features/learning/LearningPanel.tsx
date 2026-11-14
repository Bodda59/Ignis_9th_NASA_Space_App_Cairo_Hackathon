import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, NotebookPen, Pin, Plus, Presentation, Quote, X } from 'lucide-react'
import { api, saveBlob } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { useAudience } from '@/features/audience/audience'
import { useCompare } from '@/features/compare/compareStore'
import { cn } from '@/lib/cn'
import { NOTES_LIMIT, TOPIC_LIMIT, serializeNotes, useNotebook, type Note, type NoteColor } from './notebook'

type LearningAudience = 'professor' | 'graduate' | 'undergraduate'

export function LearningPanel({ id }: { id: string }) {
  const audience = useAudience()
  if (audience !== 'professor' && audience !== 'graduate' && audience !== 'undergraduate') return null
  return <Notebook key={`${id}:${audience}`} id={id} audience={audience} />
}

/** Paper colours stay light in both themes, so the ink on them is always dark. */
const PAPER: Record<NoteColor, string> = {
  sun: 'bg-[#f4e3a1]',
  rose: 'bg-[#f3c6d1]',
  mint: 'bg-[#c2e6d1]',
  sky: 'bg-[#c9d8fb]',
}
const TILT = ['-rotate-[1.2deg]', 'rotate-[0.8deg]', '-rotate-[0.5deg]', 'rotate-[1.4deg]']

function Notebook({ id, audience }: { id: string; audience: LearningAudience }) {
  const book = useNotebook(id)
  const [open, setOpen] = useState(false)
  const [bump, setBump] = useState(0)
  const professor = audience === 'professor'
  const pinned = (quote: string, section?: string) => {
    book.add({ quote, section })
    setBump((n) => n + 1)
  }

  return (
    <>
      <IntroCard professor={professor} count={book.notes.length} onOpen={() => setOpen(true)} />
      <SelectionPin onPin={pinned} />
      {createPortal(
        <>
          <Dock count={book.notes.length} bump={bump} open={open} onToggle={() => setOpen((o) => !o)} />
          <AnimatePresence>
            {open && <Drawer id={id} audience={audience} book={book} onClose={() => setOpen(false)} />}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  )
}

function IntroCard({ professor, count, onOpen }: { professor: boolean; count: number; onOpen: () => void }) {
  return (
    <section aria-label="Study notebook" className="my-8 flex flex-wrap items-center gap-5 rounded-2xl border border-[var(--color-nebula)]/30 bg-[var(--color-panel)]/60 p-5">
      <div aria-hidden="true" className="relative h-14 w-14 shrink-0">
        <span className={cn('absolute inset-0 rounded-sm shadow-md', PAPER.sky, 'rotate-[8deg]')} />
        <span className={cn('absolute inset-0 rounded-sm shadow-md', PAPER.rose, '-rotate-[5deg]')} />
        <span className={cn('absolute inset-0 grid place-items-center rounded-sm shadow-md', PAPER.sun)}>
          <NotebookPen className="size-6 text-[#1c1f27]" />
        </span>
      </div>
      <div className="min-w-[14rem] flex-1">
        <h2 className="font-display text-lg">{professor ? 'Lecture notebook' : 'Study notebook'}</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Highlight any sentence on this page to pin it as a sticky note, then add your own thoughts.
          Your notes go into a cited PDF{professor ? ' next to editable slides' : ''}. They stay in this browser.
        </p>
      </div>
      <Button size="sm" variant="outline" iconLeft={<NotebookPen className="size-4" />} onClick={onOpen}>
        Open notebook{count ? ` (${count})` : ''}
      </Button>
    </section>
  )
}

/** "Pin to notebook" bubble above a text selection inside the study content. */
function SelectionPin({ onPin }: { onPin: (quote: string, section?: string) => void }) {
  const [sel, setSel] = useState<{ x: number; y: number; text: string; section?: string } | null>(null)

  useEffect(() => {
    let frame = 0
    function read() {
      const s = window.getSelection()
      const text = s?.toString().replace(/\s+/g, ' ').trim() ?? ''
      if (!s || s.isCollapsed || !s.rangeCount || text.length < 3) return setSel(null)
      const node = s.anchorNode
      const el = node instanceof Element ? node : node?.parentElement
      if (!el?.closest('[data-notebook-scope]')) return setSel(null)
      const rect = s.getRangeAt(0).getBoundingClientRect()
      const section = el.closest('section[id]')?.querySelector('h2')?.textContent?.trim() || undefined
      setSel({ x: rect.left + rect.width / 2, y: rect.top, text, section })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read) }
    const hide = () => setSel(null)
    document.addEventListener('mouseup', schedule)
    document.addEventListener('keyup', schedule)
    document.addEventListener('touchend', schedule)
    window.addEventListener('scroll', hide, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mouseup', schedule)
      document.removeEventListener('keyup', schedule)
      document.removeEventListener('touchend', schedule)
      window.removeEventListener('scroll', hide)
    }
  }, [])

  if (!sel) return null
  const left = Math.min(Math.max(sel.x, 90), window.innerWidth - 90)
  const above = sel.y > 120
  return createPortal(
    <button
      type="button"
      style={{ left, top: above ? sel.y - 48 : sel.y + 28 }}
      className="fixed z-[45] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#f4e3a1] px-4 py-2 text-xs font-semibold text-[#1c1f27] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-flame)]"
      // Keep the selection alive while the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onPin(sel.text, sel.section)
        window.getSelection()?.removeAllRanges()
        setSel(null)
      }}
    >
      <Pin className="size-3.5" /> Pin to notebook
    </button>,
    document.body,
  )
}

function Dock({ count, bump, open, onToggle }: { count: number; bump: number; open: boolean; onToggle: () => void }) {
  const trayShown = useCompare().items.length > 0
  return (
    <motion.button
      type="button"
      aria-expanded={open}
      aria-controls="study-notebook"
      onClick={onToggle}
      className={cn(
        'fixed right-4 z-40 flex items-center gap-2.5 rounded-2xl border border-[var(--color-nebula)]/40 bg-[var(--color-panel)]/90 py-2.5 pl-3 pr-4 text-sm shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-[bottom,border-color] hover:border-[var(--color-nebula)] sm:right-6',
        trayShown ? 'bottom-28 xl:bottom-6' : 'bottom-6',
      )}
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <span className="relative grid size-8 place-items-center rounded-md bg-[#f4e3a1] text-[#1c1f27]">
        <NotebookPen className="size-4" />
        {count > 0 && (
          <motion.span
            key={bump}
            initial={{ scale: bump ? 1.8 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-[var(--color-nebula)] px-1 text-[10px] font-bold text-[var(--color-void)]"
          >
            {count}
          </motion.span>
        )}
      </span>
      <span className="font-medium">{open ? 'Close notebook' : 'Notebook'}</span>
    </motion.button>
  )
}

type Book = ReturnType<typeof useNotebook>

function Drawer({ id, audience, book, onClose }: { id: string; audience: LearningAudience; book: Book; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const listEnd = useRef<HTMLDivElement>(null)
  const count = useRef(book.notes.length)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const professor = audience === 'professor'
  const notes = serializeNotes(book.notes)
  const over = notes.length - NOTES_LIMIT

  useEffect(() => heading.current?.focus(), [])
  // Bring a newly pinned note into view.
  useEffect(() => {
    if (book.notes.length > count.current) listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    count.current = book.notes.length
  }, [book.notes.length])

  function addDraft() {
    if (!draft.trim()) return
    book.add({ text: draft })
    setDraft('')
  }

  async function getFile(format: 'pdf' | 'pptx' | 'docx') {
    setBusy(true); setMessage('')
    try {
      // Only the PDF carries personal notes.
      const file = await api.learning(id, audience, format, format === 'pdf' ? notes : '', book.topic.trim())
      saveBlob(file.blob, file.filename)
      setMessage(`${format.toUpperCase()} ready to download.`)
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <motion.aside
      id="study-notebook"
      aria-labelledby="study-notebook-h"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="fixed inset-x-2 bottom-2 z-[46] flex max-h-[82dvh] flex-col overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-20 sm:max-h-none sm:w-[25rem]"
    >
      {/* Ring binding */}
      <div aria-hidden="true" className="flex justify-around border-b border-[var(--color-line)] bg-[var(--color-void)]/60 px-6 py-1.5">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className="size-2 rounded-full bg-[var(--color-line-strong)]" />)}
      </div>

      <header className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <p className="label">{id}</p>
          <h2 id="study-notebook-h" ref={heading} tabIndex={-1} className="font-display text-lg outline-none">
            {professor ? 'Lecture notebook' : 'Study notebook'}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close notebook" className="rounded-full p-1.5 text-[var(--color-ink-dim)] hover:bg-white/5 hover:text-[var(--color-ink)]">
          <X className="size-4" />
        </button>
      </header>

      {/* data-lenis-prevent: let the touchpad/wheel scroll this list instead of the smooth-scrolled page */}
      <div data-lenis-prevent className="scroll-slim min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5">
        <label className="block text-xs text-[var(--color-ink-dim)]">
          Topic focus <span className="text-[var(--color-ink-faint)]">(optional, shapes the download)</span>
          <input
            className="mt-1 w-full border-0 border-b border-[var(--color-line-input)] bg-transparent px-0 py-1.5 font-serif text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-flame)]"
            value={book.topic}
            maxLength={TOPIC_LIMIT}
            onChange={(e) => book.setTopic(e.target.value)}
            placeholder="For example, sample materials"
          />
        </label>

        {book.notes.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--color-line-strong)] p-4 text-sm text-[var(--color-ink-dim)]">
            <Pin className="mb-1 inline size-3.5 text-[var(--color-ember)]" /> Highlight a sentence anywhere in the study and press
            <strong className="font-semibold text-[var(--color-ink)]"> Pin to notebook</strong>, or write a note below.
          </p>
        )}

        <ol className="space-y-4">
          <AnimatePresence initial={false}>
            {book.notes.map((n, i) => (
              <StickyNote key={n.id} note={n} tilt={TILT[i % TILT.length]} onChange={(t) => book.update(n.id, t)} onRemove={() => book.remove(n.id)} />
            ))}
          </AnimatePresence>
        </ol>
        <div ref={listEnd} />

        <div className="rounded-sm border border-dashed border-[var(--color-line-strong)] p-3">
          <label htmlFor="notebook-draft" className="sr-only">New note</label>
          <textarea
            id="notebook-draft"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addDraft() } }}
            placeholder="Write a note…"
            className="w-full resize-none bg-transparent font-serif text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-ink-faint)]">Ctrl + Enter to add</span>
            <Button size="sm" variant="ghost" disabled={!draft.trim()} iconLeft={<Plus className="size-4" />} onClick={addDraft}>Add note</Button>
          </div>
        </div>
      </div>

      <footer className="space-y-3 border-t border-[var(--color-line)] bg-[var(--color-void)]/40 px-5 py-4">
        <Budget used={notes.length} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="accent" disabled={busy || over > 0} iconLeft={<Download className="size-4" />} onClick={() => void getFile('pdf')}>
            PDF with my notes
          </Button>
          <Button size="sm" variant="outline" disabled={busy} iconLeft={professor ? <Presentation className="size-4" /> : <Download className="size-4" />} onClick={() => void getFile(professor ? 'pptx' : 'docx')}>
            {professor ? 'PowerPoint slides' : 'Word study notes'}
          </Button>
        </div>
        <p role="status" className="min-h-4 text-xs text-[var(--color-ink-dim)]">
          {busy ? 'Preparing your download…' : over > 0 ? `Shorten your notes by ${over.toLocaleString()} characters to include them in the PDF.` : message}
        </p>
      </footer>
    </motion.aside>
  )
}

function StickyNote({ note, tilt, onChange, onRemove }: { note: Note; tilt: string; onChange: (text: string) => void; onRemove: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
      className={cn('paper group relative rounded-sm p-4 pt-5 text-[#1c1f27] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.9)]', PAPER[note.color], tilt)}
    >
      <span aria-hidden="true" className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] bg-white/45" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove note"
        className="absolute right-1.5 top-1.5 rounded-full p-1 text-[#1c1f27]/60 opacity-70 hover:bg-black/10 hover:text-[#1c1f27] focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
      {note.quote && (
        <Pinned section={note.section}>
          <Quote className="mr-1 inline size-3 -translate-y-0.5 opacity-60" />
          {note.quote}
        </Pinned>
      )}
      <label className="sr-only" htmlFor={`note-${note.id}`}>{note.quote ? 'Your comment on this quote' : 'Note'}</label>
      <textarea
        id={`note-${note.id}`}
        rows={note.quote ? 1 : 2}
        value={note.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={note.quote ? 'Why does this matter?' : 'Note'}
        className="field-sizing-content w-full resize-none bg-transparent font-serif text-[15px] leading-snug outline-none placeholder:text-[#1c1f27]/50"
      />
    </motion.li>
  )
}

function Pinned({ section, children }: { section?: string; children: ReactNode }) {
  return (
    <figure className="mb-2 border-l-2 border-[#1c1f27]/30 pl-2.5">
      <blockquote className="font-serif text-[13px] italic leading-snug text-[#1c1f27]/85">{children}</blockquote>
      {section && <figcaption className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1c1f27]/60">{section}</figcaption>}
    </figure>
  )
}

function Budget({ used }: { used: number }) {
  const ratio = Math.min(used / NOTES_LIMIT, 1)
  const tone = used > NOTES_LIMIT ? 'bg-[var(--color-ember)]' : ratio > 0.85 ? 'bg-[#f4e3a1]' : 'bg-[var(--color-nebula)]'
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-[var(--color-ink-faint)]">
        <span>Notes in the PDF</span>
        <span className="tabular-nums">{used.toLocaleString()} / {NOTES_LIMIT.toLocaleString()}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}
