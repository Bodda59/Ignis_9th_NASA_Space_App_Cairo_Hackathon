import { motion } from 'framer-motion'
import { ArrowLeft, Check, ExternalLink, MessageSquareText, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { InvestigationResponse } from '@/api/types'
import { CountUp } from '@/components/fx/CountUp'
import { RevealText } from '@/components/fx/RevealText'
import { ButtonLink } from '@/components/ui/Button'
import { EvidenceBadge } from '@/components/ui/Evidence'
import { TopicBadge } from '@/components/ui/TopicBadge'
import { useCompare } from '@/features/compare/compareStore'
import { cn } from '@/lib/cn'

export function DetailHero({ data, synthetic }: { data: InvestigationResponse; synthetic: boolean }) {
  const inv = data.investigation
  const cmp = useCompare()
  const nav = useNavigate()
  const selected = cmp.has(inv.id)

  const stats = [
    { label: 'Numeric tests', value: data.data_availability.numeric_test_count },
    { label: 'Findings', value: data.findings.length },
    { label: 'Design links', value: data.equipment_links.length },
    { label: 'Sources', value: new Set(data.citations.map((c) => c.source_id)).size },
  ]

  return (
    <header className="relative isolate overflow-hidden border-b border-[var(--color-line)]">
      {/* backdrop: slow orbit rings + glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-backdrop absolute inset-0 opacity-70" />
        <div className="absolute -right-40 top-1/2 h-[720px] w-[720px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(123,92,255,0.16),transparent_62%)] blur-2xl" />
        {[560, 760].map((size, i) => (
          <motion.div
            key={size}
            className="absolute right-[-120px] top-1/2 rounded-full border border-dashed border-white/[0.07]"
            style={{ width: size, height: size, marginTop: -size / 2 }}
            animate={{ rotate: i ? -360 : 360 }}
            transition={{ duration: 120 + i * 60, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-flame)] shadow-[0_0_12px_var(--color-flame)]" />
          </motion.div>
        ))}
      </div>

      {synthetic && (
        <div className="mt-16 bg-[repeating-linear-gradient(-45deg,rgba(255,174,66,0.14)_0_10px,transparent_10px_20px)] py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ember)]">
          Synthetic fixture · placeholder values for interface testing · not experimental data
        </div>
      )}

      <div className={cn('mx-auto max-w-[1440px] px-6 pb-14 lg:px-10', synthetic ? 'pt-12' : 'pt-28')}>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
          <button
            onClick={() => (window.history.length > 1 ? nav(-1) : nav('/explore'))}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <span>/</span>
          <Link to="/explore" className="hover:text-[var(--color-ink)]">Explore</Link>
          <span>/</span>
          <span className="text-[var(--color-ink-dim)]">{inv.acronym}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap gap-2">
              {inv.safety_topics.map((t) => <TopicBadge key={t} topic={t} />)}
              {synthetic && <EvidenceBadge kind="synthetic" />}
            </div>
            <RevealText
              lines={[inv.acronym]}
              className={cn(
                'break-words font-display font-semibold uppercase leading-[0.9] tracking-[-0.04em]',
                // Long names (e.g. "ACME CLD Flame") get a smaller size so words wrap whole, never mid-word.
                inv.acronym.length > 10 ? 'text-[clamp(2.6rem,6.5vw,6.5rem)]' : 'text-[clamp(3.4rem,10vw,9rem)]',
              )}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="mt-5 max-w-2xl text-lg text-[var(--color-ink-dim)]"
            >
              {inv.name}
            </motion.p>
            {!!inv.indexed_source_types?.length && <div className="mt-4">
              <p className="label mb-2">Indexed source types</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-dim)]">
                {inv.indexed_source_types.map((source) => <li key={source.source_type}>
                  {source.source_type} ({source.document_count})
                </li>)}
              </ul>
            </div>}
            {inv.hardware && (
              <p className="label mt-3">{inv.hardware}</p>
            )}
            {inv.citation?.doi && (
              <p className="label mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  DOI{' '}
                  <a href={inv.citation.doi_url ?? undefined} target="_blank" rel="noreferrer"
                    className="normal-case tracking-normal text-[var(--color-ink-dim)] hover:text-[var(--color-flame)] hover:underline">
                    {inv.citation.doi}<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </span>
                {inv.citation.psi_url && (
                  <a href={inv.citation.psi_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--color-flame)] hover:underline">
                    Cite this study on PSI <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </p>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-3 lg:max-w-md lg:justify-end"
          >
            <button
              onClick={() => cmp.toggle({ id: inv.id, acronym: inv.acronym, name: inv.name })}
              disabled={!selected && cmp.full}
              aria-pressed={selected}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm transition-all disabled:opacity-35',
                selected ? 'border-[var(--color-flame)] bg-[var(--color-flame)]/10 text-[var(--color-flame)]' : 'border-[var(--color-line-strong)] hover:border-[var(--color-ink-dim)]',
              )}
            >
              {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {selected ? 'In compare' : 'Add to compare'}
            </button>
            <ButtonLink to={`/ask?ids=${inv.id}`} variant="primary" iconLeft={<MessageSquareText className="h-4 w-4" />}>
              Ask about this study
            </ButtonLink>
            <ButtonLink to={`/ask?ids=${inv.id}&mode=scenario`} variant="outline">
              Ask with test conditions
            </ButtonLink>
            <ButtonLink to={'/rank?ids=' + encodeURIComponent(inv.id)}>Rank evidence in this study</ButtonLink>
          </motion.div>
        </div>

        {/* stat strip */}
        <div className="mt-12 grid grid-cols-2 border-t border-[var(--color-line)] sm:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-[var(--color-line)] py-6 pr-6 sm:border-b-0 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:pl-6"
            >
              <p className="font-display text-4xl font-light tabular-nums tracking-tight">
                <CountUp value={s.value} />
              </p>
              <p className="label mt-2">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </header>
  )
}
