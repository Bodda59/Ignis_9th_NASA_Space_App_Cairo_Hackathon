import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronDown, Compass, FlaskConical, GraduationCap, Presentation } from 'lucide-react'
import { useId, useState } from 'react'
import { AUDIENCES, setAudience, useAudience, type Audience } from './audience'

const LENSES = {
  undergraduate: { name: 'Undergraduate', focus: 'Explore concepts and create study notes', icon: BookOpen },
  graduate: { name: 'Graduate', focus: 'Study methods, variables, and measurements', icon: GraduationCap },
  professor: { name: 'Professor', focus: 'Prepare lecture slides and teaching material', icon: Presentation },
  researcher: { name: 'Researcher', focus: 'Inspect evidence, methods, and provenance', icon: FlaskConical },
  engineer: { name: 'Engineer', focus: 'Review operating conditions and applicability', icon: Compass },
} satisfies Record<Audience, { name: string; focus: string; icon: typeof Compass }>

export function AudiencePicker() {
  const current = useAudience()
  const [open, setOpen] = useState(false)
  const id = useId()
  const Icon = LENSES[current].icon
  return (
    <div className="relative" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
      <button type="button" data-guide-highlight="audience" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
        aria-label={`Research lens: ${LENSES[current].name}`}
        className="ml-1 flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-nebula)]/40 bg-[var(--color-panel)] px-1.5 text-xs text-[var(--color-ink)] min-[360px]:px-2.5">
        <Icon className="h-3.5 w-3.5 text-[var(--color-nebula)]" />
        <span className="hidden md:inline">{LENSES[current].name}</span>
        <ChevronDown aria-hidden="true" className="hidden h-3 w-3 min-[360px]:block" />
      </button>
      <AnimatePresence>
        {open && <motion.div id={id} role="group" aria-label="Research lens" initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          className="absolute right-0 top-11 w-[min(19rem,85vw)] rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-3 shadow-2xl">
          <p className="label px-2 pb-2">Choose a research lens</p>
          {AUDIENCES.map((value) => {
            const lens = LENSES[value]
            const LensIcon = lens.icon
            return <button type="button" data-guide-action="audience" key={value} aria-pressed={current === value}
              onClick={() => { setAudience(value); setOpen(false) }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/5 ${current === value ? 'bg-[var(--color-nebula)]/10' : ''}`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--color-nebula)]/30">
                <LensIcon className="size-4 text-[var(--color-nebula)]" />
              </span>
              <span className="block"><span className="block text-sm">{lens.name}</span>
                <span className="block text-xs text-[var(--color-ink-dim)]">{lens.focus}</span></span>
            </button>
          })}
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}
