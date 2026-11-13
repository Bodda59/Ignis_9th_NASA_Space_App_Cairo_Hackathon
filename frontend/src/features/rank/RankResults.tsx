import { ArrowUpRight, Circle, GitFork, Minus } from 'lucide-react'
import './rank-map.css'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { citation } from '@/api/citation'
import type { RankResponse, ScenarioRanking, SourceRelevance } from '@/api/types'
import type { ResearchSourceRef, SearchResponse } from '@/api/types'

export type Ranking =
  | { mode: 'question'; data: RankResponse }
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
  return <li className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-4 sm:p-7 lg:p-9">
    <h3 className="mb-3 flex items-baseline gap-3 text-base font-medium sm:text-lg">
      <span className="font-mono text-[var(--color-flame)]">{rank}.</span>
      <Link to={'/investigations/' + encodeURIComponent(id)} className="text-[var(--color-nebula)] hover:underline">{name}</Link>
    </h3>
    <div className="space-y-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">{children}</div>
  </li>
}

type CollectionArm = { key: string; path: string; x: number; y: number; matched: boolean }

function SourceBreakdown({ sources, rank }: { sources: SourceRelevance[]; rank?: number }) {
  const graph = useRef<HTMLDivElement>(null)
  const hub = useRef<HTMLDivElement>(null)
  const [arms, setArms] = useState<CollectionArm[]>([])
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())

  useLayoutEffect(() => {
    const container = graph.current
    const origin = hub.current
    if (!container || !origin) return
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-collection]'))
    function draw() {
      if (!container || !origin) return
      const bounds = container.getBoundingClientRect()
      const root = origin.getBoundingClientRect()
      const stacked = root.left === bounds.left
      const startX = root.left - bounds.left + (stacked ? 12 : root.width / 2)
      const startY = root.bottom - bounds.top - 1

      setArms(cards.map((card, index) => {
        const rect = card.getBoundingClientRect()
        const toLeft = !stacked && rect.right <= root.left + root.width / 2
        const direction = toLeft ? -1 : 1
        const x = (toLeft ? rect.right : rect.left) - bounds.left
        const y = rect.top - bounds.top + 26
        const distance = Math.abs(x - startX)
        const laneIndex = Math.floor(index / (stacked ? 1 : 2))
        const lanes = Math.ceil(cards.length / (stacked ? 1 : 2))
        const lane = startX + direction * distance * (0.2 + (laneIndex / Math.max(lanes - 1, 1)) * 0.55)
        const bend = Math.min(24, (y - startY) / 3)
        return {
          key: sources[index].source_type, x, y, matched: sources[index].status === 'matched',
          path: `M ${startX} ${startY} C ${lane} ${startY + bend}, ${lane} ${startY + bend}, ${lane} ${startY + 2 * bend}
            L ${lane} ${y - bend} Q ${lane} ${y}, ${x} ${y}`,
        }
      }))
    }

    draw()
    const observer = new ResizeObserver(draw)
    for (const element of [container, origin, ...cards]) observer.observe(element)
    const visibility = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      if (!visible.length) return
      setRevealed((previous) => {
        const next = new Set(previous)
        for (const entry of visible) next.add((entry.target as HTMLElement).dataset.collection!)
        return next
      })
      for (const entry of visible) visibility.unobserve(entry.target)
    }, { rootMargin: '0px 0px -24px 0px' })
    for (const card of cards) visibility.observe(card)
    return () => {
      observer.disconnect()
      visibility.disconnect()
    }
  }, [sources])

  return <div ref={graph} className="rank-map relative isolate mt-5 py-3 sm:mt-7">
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {arms.map((arm) => <g key={arm.key} data-revealed={revealed.has(arm.key)} className={arm.matched ? 'text-[var(--color-flame)]' : 'text-[var(--color-ink-faint)]'}>
        <path className="rank-arm" pathLength={1} d={arm.path} fill="none" stroke="currentColor" strokeWidth={arm.matched ? 7 : 2}
          strokeOpacity={arm.matched ? 0.18 : 0.35} strokeLinecap="round" />
        {arm.matched && <path className="rank-arm" pathLength={1} d={arm.path} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.85} strokeLinecap="round" />}
        <circle className="rank-arm-tip" cx={arm.x} cy={arm.y} r={arm.matched ? 3.5 : 2} fill="currentColor" />
      </g>)}
    </svg>
    <div className="relative flex md:justify-center">
      <div ref={hub} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-flame)]/50 bg-[var(--color-void)] px-5 py-2.5 shadow-[0_0_24px_rgba(108,200,255,0.13)]">
        <GitFork className="size-4 text-[var(--color-flame)]" aria-hidden="true" />
        <span className="text-xs font-medium text-[var(--color-ink)]">{rank ? `Rank ${rank}` : 'Source coverage'}</span>
      </div>
    </div>
    <ul aria-label="Evidence by source collection" className="mt-9 grid items-start gap-y-4 pl-8 md:grid-cols-2 md:gap-x-[clamp(6rem,13vw,14rem)] md:pl-0">
      {sources.map((source) => {
        const matched = source.status === 'matched'
        const unavailable = source.status === 'unavailable'
        const evidence = source.evidence
        const reference = evidence ? citation(evidence) : null
        const location = evidence?.location.page != null ? `Page ${evidence.location.page}` :
          evidence?.location.csv_record != null ? `CSV row ${evidence.location.csv_record}` : 'Source document'

        return <li key={source.source_type} data-collection={source.source_type} data-revealed={revealed.has(source.source_type)} className={`rank-collection min-w-0 rounded-xl border px-4 py-3 lg:px-6 lg:py-4
          ${matched ? 'border-[var(--color-flame)]/35 bg-[var(--color-panel)]' : 'border-[var(--color-line)] bg-[var(--color-void)]/50'}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-sm font-medium leading-snug sm:text-base text-[var(--color-ink)]">{source.source_type}</span>
            {matched && source.relevance_score != null && <span className="font-mono text-xs tabular-nums text-[var(--color-flame)]">
              <span className="sr-only">Relevance score </span>{source.relevance_score.toFixed(4)}
            </span>}
          </div>
          <p className="mt-1 text-xs">{source.document_count} indexed {source.document_count === 1 ? 'file' : 'files'}</p>
          {evidence && reference ? <figure className="mt-3 border-t border-[var(--color-line)] pt-3">
            <blockquote className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-ink)]">{evidence.text}</blockquote>
            <figcaption className="mt-2 break-words text-xs">
              <SourceLink url={reference.url} label={`${reference.title} · ${location}`} />
            </figcaption>
          </figure> : <p className="mt-1 flex items-center gap-1 text-xs">
            {unavailable ? <Circle className="size-3" aria-hidden="true" /> : <Minus className="size-3" aria-hidden="true" />}
            {unavailable ? 'No indexed sources' : 'No relevant match'}
          </p>}
        </li>
      })}
    </ul>
  </div>
}

export function RankResults({ result }: { result: Ranking }) {
  const count = result.mode === 'habitat' ? result.data.items.length : result.data.investigations.length
  const remainingCoverage = result.mode === 'question' ? (result.data.source_coverage ?? []).filter(
    (study) => !result.data.investigations.some((ranked) => ranked.investigation_id === study.investigation_id),
  ) : []
  return <section aria-labelledby="rank-results" className="mt-8">
    <h2 id="rank-results" className="mb-2 font-display text-lg">Ranked investigations</h2>
    <p role="status" className="mb-4 text-sm text-[var(--color-ink-dim)]">
      {count ? count + (count === 1 ? ' investigation shown' : ' investigations shown') : 'No investigations matched.'}
    </p>
    {result.mode === 'habitat' ? <div className="space-y-3">
      {result.data.warnings.map((warning) => <p key={warning.code} className="text-sm text-[var(--color-ember)]">
        {warning.message}
        {warning.code === 'GRAVITY_GAP' && <> <Link to="/gravity" className="text-[var(--color-flame)] hover:underline">See the partial-gravity evidence</Link></>}
      </p>)}
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
      {result.mode === 'question' ? <>
        {result.data.source_coverage && <p className="mb-3 text-xs text-[var(--color-ink-dim)]">Each arm connects a collection to its strongest matching passage and relevance score.</p>}
        <ol className="space-y-6">{result.data.investigations.map((study) =>
        <StudyCard key={study.investigation_id} id={study.investigation_id} rank={study.rank} name={study.name}>
          <ul className="list-disc space-y-1 pl-4">{study.match_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {study.source_relevance && <SourceBreakdown sources={study.source_relevance} rank={study.rank} />}
          {study.evidence.map((evidence) => {
            const source = citation(evidence)
            return <details key={source.id} className="border-t border-[var(--color-line)] pt-2">
              <summary className="cursor-pointer text-[var(--color-ink)]">{source.title} · {source.location}</summary>
              <blockquote className="my-2 whitespace-pre-wrap break-words border-l border-[var(--color-line-strong)] pl-3">{evidence.text}</blockquote>
              {source.url && <SourceLink url={source.url} label="Open source" />}
            </details>
          })}
        </StudyCard>)}</ol>
        {remainingCoverage.length > 0 && <details className="mt-4 rounded-xl border border-[var(--color-line)] p-4" open={!count}>
          <summary className="cursor-pointer text-sm">Source coverage for {remainingCoverage.length} {remainingCoverage.length === 1 ? 'investigation' : 'investigations'} outside the ranking</summary>
          {remainingCoverage.map((study) => <div key={study.investigation_id} className="mt-4">
            <h3 className="mb-2 text-sm">{study.name}</h3>
            <SourceBreakdown sources={study.source_relevance} />
          </div>)}
        </details>}
      </> : <ol className="space-y-3">{result.data.investigations.map((study) =>
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
