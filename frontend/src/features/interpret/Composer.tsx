import { motion } from 'framer-motion'
import { ArrowUp, Loader2, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import type { HabitatId, SearchItem } from '@/api/types'
import { StudyPicker } from '@/features/compare/StudyPicker'
import { HabitatPicker } from '@/features/habitat/HabitatPicker'
import { cn } from '@/lib/cn'

export type ScopeItem = { id: string; acronym: string }
const MAX = 2000
const MAX_SCOPE = 5

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  pending: boolean
  disabled?: boolean
  modePicker?: ReactNode
  scope: ScopeItem[]
  onScope: (s: ScopeItem[]) => void
  habitat?: HabitatId
  onHabitat: (h?: HabitatId) => void
}

/** Question box + scope + optional habitat. Enter submits, Shift+Enter = newline. */
export function Composer({ value, onChange, onSubmit, pending, disabled, modePicker, scope, onScope, habitat, onHabitat }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const [touched, setTouched] = useState(false)
  const empty = !value.trim()
  const tooLong = value.length > MAX

  const submit = () => {
    setTouched(true)
    if (empty || tooLong || pending || disabled) return
    onSubmit()
    setTouched(false)
  }

  return (
    <div className="rounded-2xl border border-[var(--color-line-input)] bg-[var(--color-panel)]/90 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors focus-within:border-[var(--color-flame)] focus-within:ring-2 focus-within:ring-[var(--color-flame)]/25">
      {modePicker}
      <label htmlFor="ask-q" className="sr-only">Your question</label>
      <textarea
        ref={ta}
        id="ask-q"
        rows={2}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Ask what the research means for fire safety…"
        aria-invalid={touched && (empty || tooLong)}
        aria-describedby="ask-help"
        className="block w-full resize-none bg-transparent px-5 pt-4 text-[15px] leading-relaxed outline-none placeholder:text-[var(--color-ink-faint)]"
        data-lenis-prevent
      />

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-2">
        <span className="label mr-1">Scope</span>
        {scope.length === 0 ? (
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-[var(--color-ink-dim)]">All studies</span>
        ) : (
          scope.map((s) => (
            <motion.span key={s.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--color-flame)]/40 bg-[var(--color-flame)]/[0.07] pl-2.5 pr-1 font-mono text-[11px] uppercase tracking-[0.06em]">
              {s.acronym}
              <button onClick={() => onScope(scope.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.acronym} from scope`} className="grid h-5 w-5 place-items-center rounded-full text-[var(--color-ink-faint)] hover:bg-white/10 hover:text-[var(--color-ink)]">
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))
        )}
        <StudyPicker
          variant="chip"
          dropUp
          disabled={scope.length >= MAX_SCOPE}
          exclude={scope.map((s) => s.id)}
          onPick={(it: SearchItem) => onScope([...scope, { id: it.id, acronym: it.acronym }])}
        />

        <span className="mx-1 h-4 w-px bg-[var(--color-line-strong)]" />
        <HabitatPicker value={habitat} onChange={onHabitat} />

        <div className="ml-auto flex items-center gap-3">
          <span id="ask-help" className={cn('font-mono text-[11px] tabular-nums', tooLong ? 'text-[var(--color-ember)]' : 'text-[var(--color-ink-faint)]')}>
            {touched && empty ? 'Type a question first' : `${value.length}/${MAX}`}
          </span>
          <button
            data-guide-action="ask"
            onClick={submit}
            disabled={pending || empty || tooLong || disabled}
            aria-label={pending ? 'Waiting for answer' : 'Ask'}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-flame)] text-[var(--color-void)] shadow-[0_0_24px_-4px_var(--color-flame)] transition-all hover:brightness-110 disabled:bg-white/10 disabled:text-[var(--color-ink-faint)] disabled:shadow-none"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
