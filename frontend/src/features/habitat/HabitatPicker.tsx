import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Orbit } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { HabitatId } from '@/api/types'
import { cn } from '@/lib/cn'
import { HABITATS } from './habitats'

type Option = { id: HabitatId | undefined; label: string; sub: string; orb?: string }

const OPTIONS: Option[] = [
  { id: undefined, label: 'No habitat context', sub: 'Answer from all evidence' },
  ...HABITATS.map((h) => ({ id: h.id, label: h.name, sub: `${h.gravityLabel} · ${h.gravityG} g`, orb: h.orb })),
]

/** Styled habitat context picker (custom listbox replacing the native <select>). */
export function HabitatPicker({ value, onChange, dropUp = true }: { value?: HabitatId; onChange: (h?: HabitatId) => void; dropUp?: boolean }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const openMenu = () => {
    setActive(Math.max(0, OPTIONS.findIndex((o) => o.id === value)))
    setOpen(true)
  }

  const choose = (o: Option) => {
    onChange(o.id)
    setOpen(false)
    btn.current?.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      openMenu()
      return
    }
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % OPTIONS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + OPTIONS.length) % OPTIONS.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(OPTIONS[active])
    }
  }

  const selected = value !== undefined

  return (
    <div ref={box} className="relative">
      <button
        ref={btn}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Habitat context: ${current.label}`}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full border pl-1.5 pr-2 text-[11px] transition-all duration-300',
          selected
            ? 'border-[var(--color-nebula)]/60 bg-[var(--color-nebula)]/[0.1] text-[var(--color-ink)]'
            : 'border-[var(--color-line)] text-[var(--color-ink-dim)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]',
          open && 'border-[var(--color-nebula)] ring-2 ring-[var(--color-nebula)]/25',
        )}
      >
        {current.orb ? (
          <span className="h-4 w-4 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.6)]" style={{ background: current.orb }} />
        ) : (
          <span className="grid h-4 w-4 place-items-center">
            <Orbit className="h-3 w-3 text-[var(--color-nebula)]" />
          </span>
        )}
        {selected ? current.label : 'Habitat'}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="Habitat context"
            aria-activedescendant={`${listId}-${active}`}
            tabIndex={-1}
            initial={{ opacity: 0, y: dropUp ? 8 : -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute left-0 z-50 w-64 overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]',
              dropUp ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-2 origin-top-left',
            )}
          >
            <li role="presentation" className="label px-3 pb-1.5 pt-2">Crew environment</li>
            {OPTIONS.map((o, i) => {
              const isSel = o.id === value
              return (
                <li
                  key={o.label}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                    i === active && 'bg-white/[0.06]',
                    i === 0 && 'mb-1 border-b border-[var(--color-line)] pb-2.5 rounded-b-none',
                  )}
                >
                  {o.orb ? (
                    <span className="h-6 w-6 shrink-0 rounded-full shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.65),0_0_10px_rgba(157,140,255,0.15)]" style={{ background: o.orb }} />
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-[var(--color-line-strong)]">
                      <Orbit className="h-3 w-3 text-[var(--color-ink-faint)]" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px]', isSel ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]')}>{o.label}</span>
                    <span className="block text-[11px] text-[var(--color-ink-faint)]">{o.sub}</span>
                  </span>
                  {isSel && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-nebula)]" />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
