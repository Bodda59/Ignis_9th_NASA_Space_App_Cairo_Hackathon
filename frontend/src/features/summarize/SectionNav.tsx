import { motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { scrollToEl } from '@/lib/scroll'

export type SectionDef = { id: string; title: string; count?: number; countUnit?: string }

/** Sticky numbered section index with scroll-spy. */
export function SectionNav({ sections }: { sections: SectionDef[] }) {
  const [active, setActive] = useState(sections[0]?.id)

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [sections])

  return (
    <nav aria-label="On this page" className="lg:sticky lg:top-24">
      <p className="label mb-4">On this page</p>
      <ol className="space-y-0.5">
        {sections.map((s, i) => {
          const on = active === s.id
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToEl(document.getElementById(s.id))
                  history.replaceState(null, '', `#${s.id}`)
                }}
                aria-current={on ? 'location' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg py-2 pl-4 pr-2 text-sm transition-colors',
                  on ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
                )}
              >
                {on && (
                  <motion.span
                    layoutId="section-indicator"
                    className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--color-flame)] shadow-[0_0_10px_var(--color-flame)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="font-mono text-[11px] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">{s.title}</span>
                {s.count !== undefined && <span className="whitespace-nowrap font-mono text-[11px] text-[var(--color-ink-faint)]">{s.count}{s.countUnit ? ` ${s.countUnit}` : ''}</span>}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Section wrapper with editorial number + title and a reveal on scroll. */
export function DetailSection({ id, n, title, aside, children }: { id: string; n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-h`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-28 border-t border-[var(--color-line)] py-14 first:border-t-0 first:pt-0"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-3">{String(n).padStart(2, '0')}</p>
          <h2 id={`${id}-h`} className="font-display text-3xl font-medium uppercase tracking-[-0.02em]">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </motion.section>
  )
}
