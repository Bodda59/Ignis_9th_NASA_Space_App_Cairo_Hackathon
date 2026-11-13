import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = {
  selected: boolean
  onToggle: () => void
  children: ReactNode
  /** accent color when selected (CSS color / var) */
  color?: string
  count?: number
  icon?: ReactNode
  disabled?: boolean
}

/** Toggleable filter chip. State is conveyed by check icon + border, not color alone. */
export function Chip({ selected, onToggle, children, color = 'var(--color-flame)', count, icon, disabled }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      style={{ ['--chip' as string]: color }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-300 disabled:opacity-35',
        selected
          ? 'border-[var(--chip)] bg-[color-mix(in_oklab,var(--chip)_14%,transparent)] text-[var(--color-ink)]'
          : 'border-[var(--color-line)] text-[var(--color-ink-dim)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]',
      )}
    >
      {selected ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
          <Check className="h-3 w-3" style={{ color }} />
        </motion.span>
      ) : (
        icon
      )}
      {children}
      {count !== undefined && <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{count}</span>}
    </button>
  )
}
