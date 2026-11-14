import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { CitedText, InvestigationResponse } from '@/api/types'
import { ButtonLink } from '@/components/ui/Button'
import { Cited } from '@/components/ui/CitationChip'
import { CitationCtx, groupCitations, indexCitations, isSynthetic } from '@/components/ui/citations'
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
  const synthetic = data.citations.some(isSynthetic)
  const s = data.summary_sections
  const inv = data.investigation
  const nasaSourceUrl = inv.citation?.psi_url ?? data.citations.find((c) => c.url === `https://psi.nasa.gov/physci/repo/data/investigations/${inv.id}`)?.url
  const availability = data.data_availability
  const noIndexedTables = availability.conditions_view === 'metadata_only' || availability.conditions_view === 'no_indexed_tables'
  const metadataOnly = availability.conditions_view === 'metadata_only'
  const grouped = !data.tests.length && ((availability.source_record_count ?? 0) + (availability.planned_record_count ?? 0) > 0)
  const sourceConditions = grouped || availability.conditions_view === 'source_tables'
  const citations = useMemo(() => {
    const used = new Set([
      ...Object.values(data.summary_sections).flat().flatMap((entry) => entry.citation_ids),
      ...data.findings.flatMap((entry) => entry.citation_ids),
      ...data.equipment_links.flatMap((entry) => entry.citation_ids),
    ])
    if (!sourceConditions) {
      const testSources = new Set(data.tests.map((test) => test.source_id))
      for (const citation of data.citations) {
        if (testSources.has(citation.id) || testSources.has(citation.source_id)) used.add(citation.id)
      }
    }
    return data.citations.filter((citation) => used.has(citation.id) || citation.location === 'Source document')
  }, [data, sourceConditions])
  const idx = useMemo(() => indexCitations(citations), [citations])
  const sourceCount = groupCitations(citations).length
  const conditionCount = sourceConditions ? availability.source_row_count : data.tests.length
  const conditionTitle = metadataOnly ? 'Study conditions' : noIndexedTables ? 'Modeling and benchmark conditions' : sourceConditions ? 'Reported conditions' : 'Test conditions'

  const sections: SectionDef[] = useMemo(
    () => [
      { id: 'overview', title: 'Overview' },
      { id: 'conditions', title: conditionTitle, count: noIndexedTables ? undefined : conditionCount, countUnit: sourceConditions ? 'rows' : 'tests' },
      { id: 'findings', title: 'Reviewed findings', count: data.findings.length },
      { id: 'limitations', title: 'Source notes & limitations', count: s.limitations.length },
      { id: 'equipment', title: 'Safety design links', count: data.equipment_links.length },
      { id: 'earth', title: 'On Earth', count: metadataOnly ? undefined : data.earth?.themes.length ?? 0 },
      { id: 'data', title: 'Source data & export', count: noIndexedTables ? undefined : availability.source_row_count, countUnit: 'rows' },
      { id: 'sources', title: 'Source references', count: sourceCount },
    ],
    [data, s.limitations.length, conditionTitle, conditionCount, availability.source_row_count, noIndexedTables, sourceConditions, sourceCount, metadataOnly],
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

        <div className="min-w-0 max-w-5xl" data-notebook-scope>
          <LearningPanel id={inv.id} />
          <DetailSection id="overview" n={1} title="Overview">
            <div className="grid gap-10 xl:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="label mb-3">{['PSI-10', 'PSI-20', 'PSI-23', 'PSI-159'].includes(inv.id) && s.study_context?.length ? 'Original objectives · includes proposed work' : 'Stated objectives'}</p>
                <EntryList entries={s.objectives} large />
                {!!s.study_context?.length && <div className="mt-8">
                  <p className="label mb-3">{metadataOnly ? 'Study context · cited sources' : noIndexedTables ? 'Research approach' : 'Work conducted · from the report'}</p>
                  <EntryList entries={s.study_context} />
                </div>}
              </div>
              <dl className="grid content-start gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)]">
                <Fact label="Materials & fuels"><EntryList entries={s.materials} /></Fact>
                <Fact label="Reported measurements & diagnostics">{s.measurements.length ? <EntryList entries={s.measurements} /> :
                  <p className="text-sm text-[var(--color-ink-dim)]">A measurement summary has not been prepared from the indexed sources. This does not mean the investigation recorded no measurements.</p>}</Fact>
                <Fact label="Fuel type">
                  {inv.fuel_types.length ? <span className="capitalize">{inv.fuel_types.join(', ')}</span> : <NotReported />}
                </Fact>
              </dl>
            </div>
          </DetailSection>

          <DetailSection id="conditions" n={2} title={conditionTitle}>
            <div className="mb-8">
              {metadataOnly ? <p className="label mb-3">Study scope · no individual test rows</p> : !noIndexedTables && <p className="label mb-3">{availability.record_label ?? 'Reported across test records'}</p>}
              <EntryList entries={s.conditions} />
            </div>
            {metadataOnly ? <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">{availability.record_description}</p> : sourceConditions ? <>
              <p className="mb-4 text-sm leading-relaxed text-[var(--color-ink-dim)]">{availability.record_description}</p>
              <p className="label mb-3">{availability.record_label ?? (grouped ? 'Source records' : availability.source_record_count ? 'Test and activity records' : 'Individual test records')} · source table</p>
              <ExperimentTables key={inv.id} id={inv.id} />
            </> : !noIndexedTables && <>
              <p className="label mb-3">Individual test records</p>
              <TestConditions tests={data.tests} unavailableReason={availability.unavailable_reason} />
            </>}
          </DetailSection>

          <DetailSection id="findings" n={3} title="Reviewed findings" aside={data.findings.length ? <EvidenceBadge kind="documented" /> : undefined}>
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
                <span className="text-[13px] text-[var(--color-ink-dim)]">A reviewed findings summary has not been prepared for this study. The indexed reports may contain results; use “Ask about this study” to explore them with citations.</span>
              </div>
            )}
            <p className="mt-4 text-[11px] text-[var(--color-ink-faint)]">
              {noIndexedTables ? 'The findings apply to the study configurations described in the cited sources.' : 'These findings summarize the cited sources. Their meaning depends on the tested fuels and conditions; the design links below explain possible relevance to fire safety.'}
            </p>
          </DetailSection>

          <DetailSection id="limitations" n={4} title="Source notes & limitations">
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

          <DetailSection id="data" n={7} title="Source data & export">
            {metadataOnly ? <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">This collection contains investigation metadata, with no indexed experiment table, raw images or numerical result files. There are no tabular rows to preview or export as CSV/JSON. The NASA PSI record and cited publication are linked below.</p> : sourceConditions ? <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">The {availability.source_row_count} source rows are shown with the reported conditions above. CSV and JSON exports use the same stored values as the table. <a href={`#source-table-${inv.id}`} className="text-[var(--color-flame)] underline">View the source table and export controls</a>.</p> :
              noIndexedTables ? <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">{availability.record_description}</p> :
                <ExperimentTables key={inv.id} id={inv.id} />}
          </DetailSection>

          <DetailSection id="sources" n={8} title="Source references">
            <p className="mb-4 text-sm leading-relaxed text-[var(--color-ink-dim)]">References are grouped into {sourceCount} sources. Expand a source or click a citation anywhere on this page to reveal its exact reference.</p>
            <SourcesList citations={citations} sharedSource={nasaSourceUrl ? inv.id === 'PSI-20' ? {
              url: 'https://psi.nasa.gov/physci/repo/search?q=PSI-20&data_source=psi&data_type=investigation',
              citationUrl: nasaSourceUrl,
              label: 'Find PSI-20 on NASA PSI',
              description: 'Investigation PSI-20 · Advanced Combustion via Microgravity Experiments – Burning Rate Emulator (ACME BRE).',
            } : { url: nasaSourceUrl, label: `Open ${inv.acronym} investigation on NASA PSI` } : undefined} />
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
