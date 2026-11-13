import { motion } from 'framer-motion'
import { AlertTriangle, RotateCw, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

type Props = {
  tone: 'empty' | 'error'
  title: string
  message?: string
  action?: ReactNode
  onRetry?: () => void
}

/** Shared empty / error state with an orbiting-ring motif. */
export function StateMessage({ tone, title, message, action, onRetry }: Props) {
  const Icon = tone === 'error' ? AlertTriangle : SearchX
  const color = tone === 'error' ? 'var(--color-ember)' : 'var(--color-ink-dim)'
  return (
    <motion.div
      role={tone === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-6 py-20 text-center"
    >
      <div className="relative mb-8 grid h-24 w-24 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full border border-dashed border-[var(--color-line-strong)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        />
        <span className="absolute inset-3 rounded-full border border-[var(--color-line)]" />
        <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-medium uppercase tracking-[-0.01em]">{title}</h3>
      {message && <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-dim)]">{message}</p>}
      <div className="mt-6 flex gap-3">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} iconLeft={<RotateCw className="h-3.5 w-3.5" />}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </motion.div>
  )
}
