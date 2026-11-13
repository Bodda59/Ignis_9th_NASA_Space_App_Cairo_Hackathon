import { motion } from 'framer-motion'
import { ArrowUpRight, CircleCheck, RotateCcw, TriangleAlert, XCircle } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EASE_OUT } from '@/lib/cn'
import { CFI_G_MAX_O2, missionPassed, type Finding, type Verdict } from './mission'

const LOOK: Record<Verdict, { color: string; Icon: typeof CircleCheck; word: string }> = {
  good: { color: 'var(--color-prevention)', Icon: CircleCheck, word: 'Good' },
  warn: { color: 'var(--color-ember)', Icon: TriangleAlert, word: 'Trade-off' },
  bad: { color: 'var(--color-ember)', Icon: XCircle, word: 'Problem' },
}

/** End of the mission: what happened, why, and where the real research is. */
export function Debrief({ findings, onRestart }: { findings: Finding[]; onRestart: () => void }) {
  const passed = missionPassed(findings)
  return (
    <div className="space-y-5">
      <div aria-live="polite">
        <h3 className="font-display text-xl uppercase tracking-[-0.02em]">{passed ? 'Moonwalk complete' : 'Mission cut short'}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {passed
            ? 'The astronaut made it outside and back. Here is what each decision did.'
            : 'Something went wrong on the way out. Here is what each decision did — change one and try again.'}
        </p>
      </div>

      <ul className="space-y-3">
        {findings.map((f, i) => {
          const { color, Icon, word } = LOOK[f.verdict]
          return (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: EASE_OUT }}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-4"
            >
              <p className="flex items-center justify-between gap-3">
                <span className="label">{f.label}</span>
                <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color }}>
                  <Icon className="size-4" aria-hidden="true" /> {word}
                </span>
              </p>
              <p className="mt-1.5 text-[15px] font-medium text-[var(--color-ink)]">{f.headline}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">{f.detail}</p>
            </motion.li>
          )
        })}
      </ul>

      <div className="rounded-2xl border border-[var(--color-line)] p-4">
        <p className="label">From the game to the data</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          The microgravity tests with the most oxygen were in ACME’s Cool Flames Investigation with Gases (CFI-G): up to {Math.round(CFI_G_MAX_O2 * 100)}% oxygen
          flowed from a spherical burner into a fuel-and-nitrogen chamber, making an inside-out flame.
        </p>
        <ButtonLink to="/explore?q=CFI-G" size="sm" className="mt-3" icon={<ArrowUpRight className="size-3.5" aria-hidden="true" />}>Find CFI-G</ButtonLink>
      </div>

      <Button variant="accent" onClick={onRestart} iconLeft={<RotateCcw className="size-4" aria-hidden="true" />}>Fly it again</Button>
    </div>
  )
}
