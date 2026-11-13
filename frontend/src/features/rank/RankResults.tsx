import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { citation } from '@/api/citation'
import type { RankedStudy, ScenarioRanking } from '@/api/types'
import type { ResearchSourceRef, SearchResponse } from '@/api/types'

export type Ranking =
  | { mode: 'question'; data: { investigations: RankedStudy[]; message: string | null } }
  | { mode: 'scenario'; data: ScenarioRanking }
  | { mode: 'habitat'; data: SearchResponse }

function SourceLink({ url, label }: { url?: string | null; label: string }) {
  return url && /^https?:\/\//i.test(url)
    ? <a href={url} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1 text-[var(--color-flame)] hover:underline">
        {label} <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
      </a>
    : <span>{label}</span>
}

function CatalogSource({ source }: { source: ResearchSourceRef }) {
  const label = [source.title ?? source.file_name ?? 'NASA source',
    source.csv_record == null ? source.field : 'CSV row ' + source.csv_record].filter(Boolean).join(' · ')
  return <SourceLink url={source.source_url} label={label} />
}

function StudyCard({ id, rank, name, children }: { id: string; rank: number; name: string; children: ReactNode }) {
  return <li className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-4 sm:p-5">
    <h3 className="mb-3 flex items-baseline gap-2 text-sm font-medium">
      <span className="font-mono text-[var(--color-flame)]">{rank}.</span>
      <Link to={'/investigations/' + encodeURIComponent(id)} className="text-[var(--color-nebula)] hover:underline">{name}</Link>
    </h3>
    <div className="space-y-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">{children}</div>
  </li>
}

export function RankResults({ result }: { result: Ranking }) {
  const count = result.mode === 'habitat' ? result.data.items.length : result.data.investigations.length
  return <section aria-labelledby="rank-results" className="mt-8">
    <h2 id="rank-results" className="mb-2 font-display text-lg">Ranked investigations</h2>
    <p role="status" className="mb-4 text-sm text-[var(--color-ink-dim)]">
      {count ? count + (count === 1 ? ' investigation shown' : ' investigations shown') : 'No investigations matched.'}
    </p>
    {result.mode === 'habitat' ? <div className="space-y-3">
      {result.data.warnings.map((warning) => <p key={warning.code} className="text-sm text-[var(--color-ember)]">{warning.message}</p>)}
      <ol className="space-y-3">{result.data.items.map((study, index) => <StudyCard key={study.id} id={study.id} rank={index + 1} name={study.name}>
        {study.relevance.reasons.length > 0 && <ul className="list-disc space-y-1 pl-4">{study.relevance.reasons.map((reason) =>
          <li key={reason.text}>{reason.text}{reason.source && <> · <CatalogSource source={reason.source} /></>}</li>)}</ul>}
        {!study.relevance.reasons.length && <p>Background study with no matching habitat evidence found.</p>}
        {study.relevance.mismatches.map((gap) => <p key={gap.text} className="text-xs text-[var(--color-ember)]">{gap.text}</p>)}
        {study.summary_snippet && <div className="border-t border-[var(--color-line)] pt-3">
          <p className="label mb-1">Investigation excerpt</p>
          <p>{study.summary_snippet}</p>
          {study.snippet_sources?.map((source, i) => <p key={i} className="mt-1 text-xs"><CatalogSource source={source} /></p>)}
        </div>}
      </StudyCard>)}</ol>
    </div> : <>
      {result.data.message && <p className="mb-3 text-sm text-[var(--color-ink-dim)]">{result.data.message}</p>}
      {result.mode === 'question' ? <ol className="space-y-3">{result.data.investigations.map((study) =>
        <StudyCard key={study.investigation_id} id={study.investigation_id} rank={study.rank} name={study.name}>
          <ul className="list-disc space-y-1 pl-4">{study.match_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {study.evidence.map((evidence) => {
            const source = citation(evidence)
            return <details key={source.id} className="border-t border-[var(--color-line)] pt-2">
              <summary className="cursor-pointer text-[var(--color-ink)]">{source.title} · {source.location}</summary>
              <blockquote className="my-2 whitespace-pre-wrap break-words border-l border-[var(--color-line-strong)] pl-3">{evidence.text}</blockquote>
              {source.url && <SourceLink url={source.url} label="Open source" />}
            </details>
          })}
        </StudyCard>)}</ol> : <ol className="space-y-3">{result.data.investigations.map((study) =>
        <StudyCard key={study.investigation_id} id={study.investigation_id} rank={study.rank} name={study.name}>
          {study.records.map((record) => {
            const source = citation(record.source)
            return <details key={record.record_id} className="border-t border-[var(--color-line)] pt-2">
              <summary className="cursor-pointer text-[var(--color-ink)]">
                {record.record_kind === 'reported_test' ? 'Test' : 'Source record'} {record.test_id} · {record.category.replaceAll('_', ' ')}
              </summary>
              <ul className="my-2 list-disc space-y-1 pl-4">{record.comparisons.map((comparison) =>
                <li key={comparison.key}>{comparison.key.replaceAll('_', ' ')} · {comparison.reason}</li>)}</ul>
              {record.source.text && <blockquote className="my-2 whitespace-pre-wrap break-words border-l border-[var(--color-line-strong)] pl-3">{record.source.text}</blockquote>}
              <SourceLink url={source.url} label={source.title + ' · ' + source.location} />
            </details>
          })}
        </StudyCard>)}</ol>}
    </>}
  </section>
}
