import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Bordered surface with an optional mono title row. */
export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60', className)}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
          {title && <h2 className="label !text-[var(--color-ink-dim)]">{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  )
}
