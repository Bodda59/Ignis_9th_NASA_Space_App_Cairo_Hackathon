import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const STEPS = ['Searching the research collection', 'Reading the matching passages', 'Checking every citation', 'Writing the answer']

/** Small μg-flame orb used as the message avatar; pulses while the assistant works. */
export function AssistantAvatar({ busy = false }: { busy?: boolean }) {
  return (
    <span className="relative mt-0.5 grid h-8 w-8 shrink-0 place-items-center" aria-hidden="true">
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: '0 0 0 1.5px rgba(108,200,255,0.85), 0 0 16px rgba(108,200,255,0.45), inset 0 0 10px rgba(157,140,255,0.55)' }}
        animate={busy ? { scale: [1, 1.1, 1], opacity: [0.75, 1, 0.75] } : { scale: 1, opacity: 1 }}
        transition={busy ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      />
    </span>
  )
}

/** One-line, Perplexity-style progress with shimmering text. */
export function ThinkingState() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 700)
    return () => clearInterval(t)
  }, [])

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3">
      <AssistantAvatar busy />
      <div className="relative h-11 overflow-hidden rounded-2xl rounded-tl-md border border-[var(--color-line-strong)] bg-[var(--color-panel)]/85 px-4 py-2.5 backdrop-blur-md">
        <AnimatePresence mode="wait">
          <motion.span
            key={step}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="block animate-[shimmer-text_1.6s_linear_infinite] bg-[linear-gradient(90deg,var(--color-ink-faint)_0%,var(--color-ink)_45%,var(--color-ink-faint)_90%)] bg-[length:200%_100%] bg-clip-text text-[15px] text-transparent"
          >
            {STEPS[step]}…
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
