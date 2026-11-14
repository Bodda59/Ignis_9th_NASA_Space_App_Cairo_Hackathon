import { ArrowUpRight, Circle, GitFork, Minus } from 'lucide-react'
import './rank-map.css'
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { citation } from '@/api/citation'
import { RankBoard, type BoardItem } from './RankBoard'
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

type CollectionArm = { key: string; path: string; travel: string; x: number; y: number; jx: number; matched: boolean; order: number }
/** The spine is lit down to the last matched branch; below that it is a dim line to empty collections. */
type Spine = { x: number; top: number; lit: number; bottom: number } | null

/** A small meteor (glowing head, fading tail) that streaks along `path`, turning with it. */
function Meteor({ id, path, begin }: { id: string; path: string; begin: number }) {
  const timing = { dur: '2.4s', repeatCount: 'indefinite', begin: `${begin}s` }
  return <g opacity={0}>
    <path d="M -26 0 L 0 0" stroke={`url(#${id}-tail)`} strokeWidth={3} strokeLinecap="round" />
    <path d="M -14 0 L 0 0" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1.2} strokeLinecap="round" />
    <circle r={5} fill="#6cc8ff" opacity={0.6} filter={`url(#${id}-glow)`} />
    <circle r={2.4} fill="#ffffff" />
    <animateMotion {...timing} path={path} rotate="auto" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.45 0 0.2 1" />
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.85;1" {...timing} />
  </g>
}

function SourceBreakdown({ sources, rank }: { sources: SourceRelevance[]; rank?: number }) {
  const graph = useRef<HTMLDivElement>(null)
  const hub = useRef<HTMLDivElement>(null)
  const [arms, setArms] = useState<CollectionArm[]>([])
  const [spine, setSpine] = useState<Spine>(null)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const flow = useId().replace(/:/g, '')
  const still = !!useReducedMotion()

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
      // One spine runs down from the hub; each branch leaves it at its card's height.
      const sx = root.left - bounds.left + (stacked ? 12 : root.width / 2)
      const sy = root.bottom - bounds.top
      const radius = 16

      const raw = cards.map((card, index) => {
        const rect = card.getBoundingClientRect()
        const toLeft = !stacked && rect.right <= root.left + root.width / 2
        const x = (toLeft ? rect.right : rect.left) - bounds.left
        const y = rect.top - bounds.top + 30
        const dir = toLeft ? -1 : 1
        const r = Math.min(radius, Math.abs(x - sx) / 2)
        return {
          key: sources[index].source_type, x, y, jx: sx, matched: sources[index].status === 'matched',
          path: `M ${sx} ${y - r} Q ${sx} ${y}, ${sx + dir * r} ${y} L ${x} ${y}`,
          // Whole route from the hub, for the comet that travels to this source.
          travel: `M ${sx} ${sy} L ${sx} ${y - r} Q ${sx} ${y}, ${sx + dir * r} ${y} L ${x} ${y}`,
        }
      })
      // Branches draw in order down the spine.
      const order = [...raw].sort((a, b) => a.y - b.y).map((a) => a.key)
      setArms(raw.map((a) => ({ ...a, order: order.indexOf(a.key) })))
      const bottom = Math.max(sy, ...raw.map((a) => a.y - radius))
      const lit = Math.max(sy, ...raw.filter((a) => a.matched).map((a) => a.y - radius))
      setSpine(raw.length ? { x: sx, top: sy, lit, bottom } : null)
    }

    draw()
    const observer = new ResizeObserver(draw)
    for (const element of [container, origin, ...cards]) observer.observe(element)
    // The map mounts when its result card is opened: start drawing on the next frames.
    // CSS delays (--i) draw the branches one by one, then fade in each source card.
    const timer = window.setTimeout(() => setRevealed(new Set(sources.map((source) => source.source_type))), 60)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [sources])

  return <div ref={graph} className="rank-map relative isolate mt-5 py-3 sm:mt-7">
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      <defs>
        <linearGradient id={`${flow}-spine`} gradientUnits="userSpaceOnUse" x1="0" y1={spine?.top ?? 0} x2="0" y2={spine ? Math.max(spine.lit, spine.top + 1) : 1}>
          <stop offset="0%" stopColor="#6cc8ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9d8cff" stopOpacity="0.35" />
        </linearGradient>
        <filter id={`${flow}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {/* Meteor tail, drawn in the meteor's own coordinates (it points backwards along the path). */}
        <linearGradient id={`${flow}-tail`} gradientUnits="userSpaceOnUse" x1="-26" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#6cc8ff" stopOpacity="0" />
          <stop offset="70%" stopColor="#9fdcff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
      </defs>
      {spine && spine.lit > spine.top && <g data-revealed={revealed.size > 0} className="rank-spine">
        <path d={`M ${spine.x} ${spine.top} L ${spine.x} ${spine.lit}`} stroke="#6cc8ff" strokeOpacity={0.35} strokeWidth={6} filter={`url(#${flow}-glow)`} fill="none" className="rank-arm" pathLength={1} />
        <path d={`M ${spine.x} ${spine.top} L ${spine.x} ${spine.lit}`} stroke={`url(#${flow}-spine)`} strokeWidth={2} fill="none" strokeLinecap="round" className="rank-arm" pathLength={1} />
        <path d={`M ${spine.x} ${spine.top} L ${spine.x} ${spine.lit}`} stroke="#e8f6ff" strokeWidth={2} fill="none" strokeLinecap="round" className="rank-flow" strokeDasharray="2 14" />
      </g>}
      {spine && spine.bottom > spine.lit && <g data-revealed={revealed.size > 0} className="rank-spine rank-spine--dim">
        <path d={`M ${spine.x} ${spine.lit} L ${spine.x} ${spine.bottom}`} stroke="rgba(167,174,192,0.35)" strokeWidth={1.25} fill="none" strokeLinecap="round" className="rank-arm" pathLength={1} />
      </g>}
      {arms.map((arm) => <g key={arm.key} data-revealed={revealed.has(arm.key)} style={{ '--i': arm.order } as CSSProperties}>
        {arm.matched ? <>
          <path className="rank-arm" pathLength={1} d={arm.path} fill="none" stroke="#6cc8ff" strokeOpacity={0.4} strokeWidth={6} filter={`url(#${flow}-glow)`} />
          <path className="rank-arm" pathLength={1} d={arm.path} fill="none" stroke="#6cc8ff" strokeWidth={2} strokeLinecap="round" />
          <path className="rank-flow" d={arm.path} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 12" />
          <circle className="rank-arm-tip" cx={arm.jx} cy={arm.y - 16} r={3} fill="#6cc8ff" />
          <circle className="rank-arm-tip" cx={arm.x} cy={arm.y} r={4.5} fill="#6cc8ff" />
          <circle className="rank-arm-tip rank-pulse" cx={arm.x} cy={arm.y} r={4.5} fill="none" stroke="#6cc8ff" strokeWidth={1.5} />
          {!still && revealed.has(arm.key) && <Meteor id={flow} path={arm.travel} begin={1.3 + arm.order * 0.45} />}
        </> : <>
          <path className="rank-arm" pathLength={1} d={arm.path} fill="none" stroke="rgba(167,174,192,0.45)" strokeWidth={1.25} strokeLinecap="round" />
          <circle className="rank-arm-tip" cx={arm.jx} cy={arm.y - 16} r={2} fill="rgba(167,174,192,0.6)" />
          <circle className="rank-arm-tip" cx={arm.x} cy={arm.y} r={3} fill="var(--color-void)" stroke="rgba(167,174,192,0.6)" strokeWidth={1.25} />
        </>}
      </g>)}
    </svg>
    <div className="relative flex md:justify-center">
      <div ref={hub} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-flame)]/50 bg-[var(--color-void)] px-5 py-2.5 shadow-[0_0_24px_rgba(108,200,255,0.13)]">
        <GitFork className="size-4 text-[var(--color-flame)]" aria-hidden="true" />
        <span className="text-xs font-medium text-[var(--color-ink)]">{rank ? `Rank ${rank}` : 'Source coverage'}</span>
      </div>
    </div>
    <ul aria-label="Evidence by source collection" className="mt-9 grid items-start gap-y-4 pl-8 md:grid-cols-2 md:gap-x-[clamp(6rem,13vw,14rem)] md:pl-0">
      {sources.map((source, i) => {
        const matched = source.status === 'matched'
        const unavailable = source.status === 'unavailable'
        const evidence = source.evidence
        const reference = evidence ? citation(evidence) : null
        const location = evidence?.location.page != null ? `Page ${evidence.location.page}` :
          evidence?.location.csv_record != null ? `CSV row ${evidence.location.csv_record}` : 'Source document'

        return <li key={source.source_type} data-collection={source.source_type} data-revealed={revealed.has(source.source_type)} style={{ '--i': arms.find((a) => a.key === source.source_type)?.order ?? i } as CSSProperties} className={`rank-collection min-w-0 rounded-xl border px-4 py-3 lg:px-6 lg:py-4
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

/**
 * Place each value between the weakest (0.15) and strongest (1) result in this list, so close
 * scores still read as different. The real value is always shown next to the meter.
 */
function relative(values: number[]) {
  const top = Math.max(...values)
  const low = Math.min(...values)
  return values.map((v) => (top === low ? 1 : 0.15 + 0.85 * ((v - low) / (top - low))))
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
      <HabitatBoard data={result.data} />
    </div> : <>
      {result.data.message && <p className="mb-3 text-sm text-[var(--color-ink-dim)]">{result.data.message}</p>}
      {result.mode === 'question' ? <>
        {result.data.source_coverage && <p className="mb-3 text-xs text-[var(--color-ink-dim)]">Each arm connects a collection to its strongest matching passage and relevance score.</p>}
        <QuestionBoard data={result.data} />
        {remainingCoverage.length > 0 && <details className="mt-4 rounded-xl border border-[var(--color-line)] p-4" open={!count}>
          <summary className="cursor-pointer text-sm">Source coverage for {remainingCoverage.length} {remainingCoverage.length === 1 ? 'investigation' : 'investigations'} outside the ranking</summary>
          {remainingCoverage.map((study) => <div key={study.investigation_id} className="mt-4">
            <h3 className="mb-2 text-sm">{study.name}</h3>
            <SourceBreakdown sources={study.source_relevance} />
          </div>)}
        </details>}
      </> : <ScenarioBoard data={result.data} />}
    </>}
  </section>
}

function QuestionBoard({ data }: { data: RankResponse }) {
  const best = data.investigations.map((s) => Math.max(0, ...(s.source_relevance ?? []).map((r) => (r.status === 'matched' ? r.relevance_score ?? 0 : 0))))
  const hasScores = best.some((b) => b > 0)
  const count = data.investigations.length
  const signal = hasScores ? relative(best) : data.investigations.map((s) => 1 - (s.rank - 1) / Math.max(count, 1))
  const items: BoardItem[] = data.investigations.map((study, i) => {
    const sources = study.source_relevance ?? []
    const matched = sources.filter((s) => s.status === 'matched').length
    return {
      id: study.investigation_id, rank: study.rank, name: study.name, signal: signal[i],
      value: hasScores ? best[i].toFixed(4) : `#${study.rank}`,
      signalLabel: hasScores ? `Top source relevance ${best[i].toFixed(4)}` : `Rank ${study.rank} of ${count}`,
      tags: [
        ...(sources.length ? [`${matched}/${sources.length} collections`] : []),
        `${study.evidence.length} passage${study.evidence.length === 1 ? '' : 's'}`,
      ],
      detail: <>
        {study.match_reasons.length > 0 && <div>
          <p className="label mb-2">Why it matched</p>
          <ul className="flex flex-wrap gap-2">{study.match_reasons.map((reason) =>
            <li key={reason} className="rounded-lg border border-[var(--color-flame)]/25 bg-[var(--color-flame)]/[0.05] px-3 py-1.5 text-xs text-[var(--color-ink)]">{reason}</li>)}</ul>
        </div>}
        {study.source_relevance && <SourceBreakdown sources={study.source_relevance} rank={study.rank} />}
        {study.evidence.map((evidence) => {
          const source = citation(evidence)
          return <details key={source.id} className="border-t border-[var(--color-line)] pt-2">
            <summary className="cursor-pointer text-[var(--color-ink)]">{source.title} · {source.location}</summary>
            <blockquote className="my-2 whitespace-pre-wrap break-words border-l border-[var(--color-line-strong)] pl-3">{evidence.text}</blockquote>
            {source.url && <SourceLink url={source.url} label="Open source" />}
          </details>
        })}
      </>,
    }
  })
  return <RankBoard items={items} meterNote={hasScores
    ? 'Each meter places a study’s strongest source relevance between the lowest and highest in this list; the score is shown on the right.'
    : 'Meters show rank position.'} />
}

function ScenarioBoard({ data }: { data: ScenarioRanking }) {
  const signal = relative(data.investigations.map((s) => s.records.length))
  const items: BoardItem[] = data.investigations.map((study, i) => ({
    id: study.investigation_id, rank: study.rank, name: study.name, signal: signal[i],
    value: `${study.records.length} rec`,
    signalLabel: `${study.records.length} matching record${study.records.length === 1 ? '' : 's'}`,
    tags: [`${study.records.length} record${study.records.length === 1 ? '' : 's'}`],
    detail: <>{study.records.map((record) => {
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
    })}</>,
  }))
  return <RankBoard items={items} meterNote="Each meter places a study’s matching test records between the fewest and most in this list." />
}

function HabitatBoard({ data }: { data: SearchResponse }) {
  const signal = relative(data.items.map((s) => s.relevance.reasons.length))
  const items: BoardItem[] = data.items.map((study, index) => ({
    id: study.id, rank: index + 1, name: study.name, signal: signal[index],
    value: `${study.relevance.reasons.length} match${study.relevance.reasons.length === 1 ? '' : 'es'}`,
    signalLabel: `${study.relevance.reasons.length} habitat match${study.relevance.reasons.length === 1 ? '' : 'es'}`,
    tags: [
      `${study.relevance.reasons.length} match${study.relevance.reasons.length === 1 ? '' : 'es'}`,
      ...(study.relevance.mismatches.length ? [`${study.relevance.mismatches.length} gap${study.relevance.mismatches.length === 1 ? '' : 's'}`] : []),
    ],
    detail: <>
      {study.relevance.reasons.length > 0 && <ul className="list-disc space-y-1 pl-4">{study.relevance.reasons.map((reason) =>
        <li key={reason.text}>{reason.text}{reason.source && <> · <CatalogSource source={reason.source} /></>}</li>)}</ul>}
      {!study.relevance.reasons.length && <p>Background study with no matching habitat evidence found.</p>}
      {study.relevance.mismatches.map((gap) => <p key={gap.text} className="text-xs text-[var(--color-ember)]">{gap.text}</p>)}
      {study.summary_snippet && <div className="border-t border-[var(--color-line)] pt-3">
        <p className="label mb-1">Investigation excerpt</p>
        <p>{study.summary_snippet}</p>
        {study.snippet_sources?.map((source, i) => <p key={i} className="mt-1 text-xs"><CatalogSource source={source} /></p>)}
      </div>}
    </>,
  }))
  return <RankBoard items={items} meterNote="Each meter places a study’s habitat matches between the fewest and most in this list." />
}
