import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { CitedText, InvestigationResponse } from '@/api/types'
import { ButtonLink } from '@/components/ui/Button'
import { Cited } from '@/components/ui/CitationChip'
import { CitationCtx, indexCitations, isSynthetic } from '@/components/ui/citations'
import { EvidenceBadge, NotReported } from '@/components/ui/Evidence'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateMessage } from '@/components/ui/StateMessage'
import { EarthSection } from '@/features/earth/EarthSection'
import { EquipmentLinks } from '@/features/equipment/EquipmentLinks'
import { ExperimentTables } from '@/features/export/ExperimentTables'
import { LearningPanel } from '@/features/learning/LearningPanel'
import { DetailHero } from '@/features/summarize/DetailHero'
import { DetailSection, SectionNav, type SectionDef } from '@/features/summarize/SectionNav'
import { SourcesList } from '@/features/summarize/SourcesList'
import { TestConditions } from '@/features/summarize/TestConditions'
import { useAsync } from '@/hooks/useAsync'
import { scrollToEl } from '@/lib/scroll'

export function InvestigationPage() {
  const { id = '' } = useParams()
  const res = useAsync((sig) => api.investigation(id, sig), id)

  if (res.status === 'error') {
    const notFound = res.error.status === 404
    return (
      <div className="mx-auto max-w-[1440px] px-6 pt-32 lg:px-10">
        <StateMessage
          tone={notFound ? 'empty' : 'error'}
          title={notFound ? 'Unknown study' : 'Study unavailable'}
          message={res.error.message}
          onRetry={res.error.retryable ? res.retry : undefined}
          action={<ButtonLink to="/explore" variant="primary" size="sm">Back to Explore</ButtonLink>}
        />
      </div>
    )
  }
  if (res.status === 'loading' && (!res.data || res.data.investigation.id !== id)) return <DetailSkeleton />
  return <Detail data={res.data!} />
}

function Detail({ data }: { data: InvestigationResponse }) {
  const idx = useMemo(() => indexCitations(data.citations), [data.citations])
  const synthetic = data.citations.some(isSynthetic)
  const s = data.summary_sections
  const inv = data.investigation

  const sections: SectionDef[] = useMemo(
    () => [
      { id: 'overview', title: 'Overview' },
      { id: 'conditions', title: 'Test conditions', count: data.tests.length },
      { id: 'findings', title: 'Findings', count: data.findings.length },
      { id: 'limitations', title: 'Limitations', count: s.limitations.length },
      { id: 'equipment', title: 'Safety design links', count: data.equipment_links.length },
      { id: 'earth', title: 'On Earth', count: data.earth?.themes.length ?? 0 },
      { id: 'data', title: 'Data for modeling', count: data.data_availability.numeric_test_count },
      { id: 'sources', title: 'Sources', count: data.citations.length },
    ],
    [data, s.limitations.length],
  )

  // Links such as /investigations/PSI-25#earth land on the section once the study has loaded.
  useEffect(() => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) scrollToEl(target)
  }, [inv.id])

  return (
    <CitationCtx.Provider value={idx}>
      <DetailHero data={data} synthetic={synthetic} />

      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 pb-40 pt-14 lg:grid-cols-[220px_1fr] lg:px-10">
        <aside className="hidden lg:block">
          <SectionNav sections={sections} />
        </aside>

        <div className="min-w-0 max-w-5xl">
          <LearningPanel id={inv.id} />
          <DetailSection id="overview" n={1} title="Overview">
            <div className="grid gap-10 xl:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="label mb-3">Objective</p>
                <EntryList entries={s.objectives} large />
              </div>
              <dl className="grid content-start gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)]">
                <Fact label="Materials & fuels"><EntryList entries={s.materials} /></Fact>
                <Fact label="Measurements"><EntryList entries={s.measurements} /></Fact>
                <Fact label="Fuel type">
                  {inv.fuel_types.length ? <span className="capitalize">{inv.fuel_types.join(', ')}</span> : <NotReported />}
                </Fact>
              </dl>
            </div>
          </DetailSection>

          <DetailSection id="conditions" n={2} title="Test conditions">
            <div className="mb-8">
              <p className="label mb-3">Study-wide</p>
              <EntryList entries={s.conditions} />
            </div>
            <p className="label mb-3">Per test</p>
            <TestConditions tests={data.tests} unavailableReason={data.data_availability.unavailable_reason} />
          </DetailSection>

          <DetailSection id="findings" n={3} title="Findings" aside={<EvidenceBadge kind="documented" />}>
            {data.findings.length ? (
              <ol className="space-y-3">
                {data.findings.map((f, i) => (
                  <motion.li
                    key={f.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    className="flex gap-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 p-5"
                  >
                    <span className="font-display text-2xl font-light tabular-nums text-[var(--color-ink-faint)]">{String(i + 1).padStart(2, '0')}</span>
                    <p className="pt-1 text-[15px] leading-relaxed">
                      <Cited text={f.text} ids={f.citation_ids} />
                    </p>
                  </motion.li>
                ))}
              </ol>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--color-line-strong)] p-6">
                <NotReported />
                <span className="text-[13px] text-[var(--color-ink-dim)]">No reviewed findings for this study in the collection yet.</span>
              </div>
            )}
            <p className="mt-4 text-[11px] text-[var(--color-ink-faint)]">
              Documented findings only. For what they could mean for fire safety, ask the AI — interpretations are labeled separately.
            </p>
          </DetailSection>

          <DetailSection id="limitations" n={4} title="Limitations">
            <ul className="space-y-3">
              {s.limitations.map((l, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-[var(--color-ink-dim)]">
                  <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-[var(--color-ember)]" />
                  <span><Cited text={l.text} ids={l.citation_ids} /></span>
                </li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection id="equipment" n={5} title="Safety design links">
            <EquipmentLinks links={data.equipment_links} findings={data.findings} />
          </DetailSection>

          <DetailSection id="earth" n={6} title="On Earth">
            <EarthSection earth={data.earth} />
          </DetailSection>

          <DetailSection id="data" n={7} title="Data for modeling">
            <ExperimentTables key={inv.id} id={inv.id} />
          </DetailSection>

          <DetailSection id="sources" n={8} title="Sources">
            <SourcesList citations={data.citations} />
          </DetailSection>
        </div>
      </div>
    </CitationCtx.Provider>
  )
}

function EntryList({ entries, large }: { entries: CitedText[]; large?: boolean }) {
  if (!entries.length) return <NotReported />
  return (
    <ul className="space-y-2">
      {entries.map((e, i) => (
        <li key={i} className={large ? 'text-xl leading-relaxed text-[var(--color-ink)]' : 'text-sm leading-relaxed text-[var(--color-ink-dim)]'}>
          <Cited text={e.text} ids={e.citation_ids} />
        </li>
      ))}
    </ul>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-[var(--color-void)] p-5">
      <dt className="label mb-2">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-32 lg:px-10" aria-busy="true" aria-label="Loading study">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-8 h-28 w-[min(560px,80%)]" />
      <Skeleton className="mt-6 h-5 w-96" />
      <div className="mt-12 grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
      <div className="mt-16 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
