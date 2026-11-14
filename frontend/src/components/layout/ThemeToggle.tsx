import { AnimatePresence, motion } from 'framer-motion'
import { MoonStar, Sun } from 'lucide-react'
import { setTheme, useTheme } from '@/lib/theme'

/** Light / dark switch in the top bar. The choice is saved and applied before first paint. */
export function ThemeToggle() {
  const theme = useTheme()
  const light = theme === 'light'
  const label = light ? 'Switch to dark mode' : 'Switch to light mode'

  return (
    <button
      type="button"
      onClick={() => setTheme(light ? 'dark' : 'light')}
      aria-label={label}
      title={label}
      className="ml-1 grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-line-strong)] bg-[var(--color-panel)] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="grid place-items-center"
          initial={{ y: 12, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -12, rotate: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {light ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
