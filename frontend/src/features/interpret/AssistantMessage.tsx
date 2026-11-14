import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, Copy, Crosshair, Lightbulb, ListOrdered, TriangleAlert } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { citation } from '@/api/citation'
import type { RankedRecord } from '@/api/types'
import type { Citation, InterpretResponse } from '@/api/types'
import { CitationChip } from '@/components/ui/CitationChip'
import { AnchorCtx, CitationCtx, indexCitations } from '@/components/ui/citations'
import { ScenarioEvidenceMap } from './ScenarioEvidenceMap'
import { AssistantAvatar } from './ThinkingState'

export type FollowUp = { q: string; ids?: string[]; label?: string }

type Props = {
  res: InterpretResponse
  turnId: number
  onFollowUp: (f: FollowUp) => void
  disabled?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Evidence-trail answer. Each backend field becomes one step, in the backend's order:
 *
 *   findings[]                                       → What the studies show
 *   interpretations[]                                → What it could mean
 *   scenario.evidence_map                            → How your scenario was tested
 *   ranked[] (+ match_reasons, evidence)             → Most relevant studies
 *   scenario.investigations[].records[].comparisons  → Matching test records
 *   limitations[] + message                          → Caveats
 *   citations[] (grouped by investigation_id)        → Notes
 *
 * Steps without data are omitted. Plain text only (no server HTML).
 */
export function AssistantMessage({ res, turnId, onFollowUp, disabled }: Props) {
  const idx = useMemo(() => indexCitations(res.citations), [res.citations])
  const prefix = `t${turnId}-cite-`
  const insufficient = res.status === 'insufficient_evidence'
  const evidenceOnly = !!res.evidence_only
  const n = res.citations.length

  // study names come from whichever backend block carried them
  const names = useMemo(() => {
    const m = new Map<string, string>()
    res.related_investigations?.forEach((r) => m.set(r.id, r.acronym || r.name))
    res.ranked?.forEach((r) => m.set(r.investigation_id, r.name))
    res.scenario?.investigations.forEach((r) => m.set(r.investigation_id, r.name))
    return m
  }, [res])
  const related =
    res.related_investigations ?? res.related_investigation_ids.map((id) => ({ id, acronym: names.get(id) ?? id, name: names.get(id) ?? id }))
  const followUps: FollowUp[] = related.slice(0, 3).map((r) => ({ q: `What did ${r.acronym} study and find?`, ids: [r.id], label: r.acronym }))

  const cites = (ids: string[]) => [...new Set(ids)].map((id) => <CitationChip key={id} id={id} footnote />)

  // which steps exist decides where the rail ends
  const steps = [
    res.findings.length > 0 && 'findings',
    res.interpretations.length > 0 && 'meaning',
    !!res.scenario?.evidence_map && 'map',
    !!res.ranked?.length && 'ranked',
    !!res.scenario?.investigations.length && 'records',
    res.gaps.length > 0 && 'caveats',
    n > 0 && 'notes',
  ].filter(Boolean) as string[]
  const isLast = (k: string) => steps[steps.length - 1] === k

  const byline = evidenceOnly
    ? 'Research assistant · evidence search, no written answer'
    : res.clarification ? 'Research assistant' : insufficient
      ? 'Research assistant · no supporting passages found'
      : `Research assistant · based on ${n} ${n === 1 ? 'source' : 'sources'}`

  let leadIn: ReactNode = null
  if (evidenceOnly) leadIn = res.evidence_message ?? 'Here is the research evidence ranked for your question.'
  else if (res.clarification) leadIn = res.clarification
  else if (insufficient && !res.findings.length && res.scenario)
    leadIn = 'No written answer was published for this scenario. The tested records below show what the research does cover.'
  else if (insufficient && !res.findings.length)
    leadIn = (
      <>
        I couldn’t find anything in the research collection that answers this, so I’d rather not guess. Try wording it differently, widening the
        scope, or browsing the studies in{' '}
        <Link to="/explore" className="text-[var(--color-flame)] underline decoration-[var(--color-flame)]/40 underline-offset-4 hover:decoration-[var(--color-flame)]">
          Explore
        </Link>
        .
      </>
    )

  return (
    <AnchorCtx.Provider value={prefix}>
      <CitationCtx.Provider value={idx}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex gap-5">
          <div className="pt-1">
            <AssistantAvatar />
          </div>

          <article className="min-w-0 flex-1 rounded-[28px] bg-[var(--color-void)]/75 px-6 py-8 backdrop-blur-xl sm:px-9 sm:py-9">
            <p className="mb-7 pl-12 text-[13px] text-[var(--color-ink-faint)]">{byline}</p>

            {leadIn && (
              <div className="mb-8 pl-12">
                <Prose>{leadIn}</Prose>
              </div>
            )}

            {/* findings[] */}
            {res.findings.length > 0 && (
              <Section title="What the studies show" tone="evidence" last={isLast('findings')}>
                <Prose>
                  {res.findings.map((f, i) => (
                    <span key={i}>
                      {f.text}
                      {cites(f.citation_ids)}{' '}
                    </span>
                  ))}
                </Prose>
              </Section>
            )}

            {/* interpretations[] */}
            {res.interpretations.length > 0 && (
              <Section title="What it could mean" note="My interpretation, not a reported result" tone="meaning" last={isLast('meaning')}>
                <Prose muted>
                  {res.interpretations.map((f, i) => (
                    <span key={i}>
                      {f.text}
                      {cites(f.citation_ids)}{' '}
                    </span>
                  ))}
                </Prose>
              </Section>
            )}

            {/* scenario.evidence_map */}
            {res.scenario?.evidence_map && (
              <Section title="How your scenario was tested" tone="scenario" last={isLast('map')}>
                <ScenarioEvidenceMap evidence={res.scenario.evidence_map} />
              </Section>
            )}

            {/* ranked[] with match_reasons */}
            {!!res.ranked?.length && (
              <Section title="Most relevant studies" note="Ranked by relevance, not fire danger" tone="ranked" last={isLast('ranked')}>
                <ol className="space-y-7">
                  {res.ranked.map((study) => (
                    <li key={study.investigation_id}>
                      <Link className="font-serif text-[19px] text-[var(--color-ink)] hover:text-[var(--color-flame)]" to={`/investigations/${study.investigation_id}`}>
                        <span className="mr-2 font-sans text-[13px] tabular-nums text-[var(--color-ink-faint)]">#{study.rank}</span>
                        {study.name}
                      </Link>
                      {study.match_reasons.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Why it matched">
                          {study.match_reasons.map((r) => (
                            <li key={r} className="rounded-full bg-[var(--color-prevention)]/10 px-2.5 py-0.5 text-[12px] text-[var(--color-prevention)]">
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                      <ul className="mt-3 space-y-3 border-l border-[var(--color-line-strong)] pl-4">
                        {study.evidence.map((item) => {
                          const source = citation(item)
                          return (
                            <li key={source.id} className="text-[14px] leading-relaxed text-[var(--color-ink-dim)]">
                              <p>
                                “{item.text.slice(0, 450)}
                                {item.text.length > 450 ? '…' : ''}”
                              </p>
                              <SourceLine c={source} />
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* scenario.investigations[].records[] with comparisons */}
            {!!res.scenario?.investigations.length && (
              <Section title="Matching test records" note={res.scenario.message} tone="ranked" last={isLast('records')}>
                <div className="space-y-6">
                  {res.scenario.investigations.map((study) => (
                    <div key={study.investigation_id}>
                      <Link className="font-serif text-[18px] text-[var(--color-ink)] hover:text-[var(--color-flame)]" to={`/investigations/${study.investigation_id}`}>
                        <span className="mr-2 font-sans text-[13px] tabular-nums text-[var(--color-ink-faint)]">#{study.rank}</span>
                        {study.name}
                      </Link>
                      <ul className="mt-2 divide-y divide-[var(--color-line)]">
                        {study.records.map((record) => (
                          <RecordRow key={record.record_id} record={record} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* limitations[] + message */}
            {res.gaps.length > 0 && (
              <Section title={insufficient && !evidenceOnly ? 'Why there’s no answer' : 'Caveats'} tone="limits" last={isLast('caveats')}>
                <ul className="space-y-2.5">
                  {res.gaps.map((g) => (
                    <li key={g.text} className="flex gap-3 text-[15px] leading-relaxed text-[var(--color-ink-dim)]">
                      <span className="mt-[0.7em] h-px w-3 shrink-0 bg-[var(--color-ember)]" aria-hidden="true" />
                      {g.text}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* citations[] grouped by investigation */}
            {n > 0 && (
              <Section title="Notes" note={`${n} ${n === 1 ? 'source' : 'sources'}`} tone="notes" last>
                <Notes citations={res.citations} prefix={prefix} names={names} />
              </Section>
            )}

            {/* keep reading + actions */}
            {(followUps.length > 0 || !insufficient) && (
              <footer className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-[var(--color-line)] pl-12 pt-6">
                {followUps.length > 0 && (
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-dim)]">Keep reading</p>
                    <ul className="space-y-1">
                      {followUps.map((f) => (
                        <li key={f.q}>
                          <button
                            onClick={() => onFollowUp(f)}
                            disabled={disabled}
                            className="group inline-flex items-center gap-2 py-1 text-left font-serif text-[16px] text-[var(--color-ink)] transition-colors hover:text-[var(--color-flame)] disabled:opacity-40"
                          >
                            {f.q}
                            <ArrowRight className="h-3.5 w-3.5 text-[var(--color-ink-faint)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-flame)]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!insufficient && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--color-ink-faint)]">
                    <CopyButton res={res} />
                    {related.length >= 2 && (
                      <Link to={`/compare?ids=${related.slice(0, 3).map((r) => r.id).join(',')}`} className="hover:text-[var(--color-ink)]">
                        Compare studies
                      </Link>
                    )}
                  </div>
                )}
              </footer>
            )}
          </article>
        </motion.div>
      </CitationCtx.Provider>
    </AnchorCtx.Provider>
  )
}

/** One scenario record and how each requested condition compared (backend `comparisons`). */
function RecordRow({ record }: { record: RankedRecord }) {
  const source = citation(record.source)
  return (
    <li className="py-3">
      <p className="text-[14px] text-[var(--color-ink)]">
        {record.record_kind === 'reported_test' ? 'Test' : 'Source record'} <span className="font-mono text-[13px]">{record.test_id}</span>
        <span className="text-[var(--color-ink-faint)]"> · {record.category.replaceAll('_', ' ')}</span>
      </p>
      {record.comparisons.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="How each condition compared">
          {record.comparisons.map((c) => {
            const color = statusColor(c.status)
            return (
              <li key={c.key} title={c.reason} className="rounded-full px-2.5 py-0.5 text-[12px]" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)` }}>
                {c.key.replaceAll('_', ' ')}: {c.status.replaceAll('_', ' ')}
              </li>
            )
          })}
        </ul>
      )}
      <SourceLine c={source} />
    </li>
  )
}

/** Comparison statuses are backend strings: colour by meaning, the status text is always shown too. */
function statusColor(status: string) {
  const s = status.toLowerCase()
  if (/(missing|unknown|not_reported|unavailable)/.test(s)) return 'var(--color-ink-dim)'
  if (/(match|within|same|equal|tested)/.test(s) && !/(no_|not_|mis|out|partial)/.test(s)) return 'var(--color-prevention)'
  return 'var(--color-ember)'
}

function SourceLine({ c }: { c: Citation }) {
  if (!c.url)
    return (
      <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">
        {c.title} · {c.location}
      </p>
    )
  return (
    <a href={c.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--color-flame)] hover:underline">
      {c.title} · {c.location} <ArrowUpRight className="h-3 w-3" />
    </a>
  )
}

/** Notes grouped by investigation when the backend tags citations with one. */
function Notes({ citations, prefix, names }: { citations: Citation[]; prefix: string; names: Map<string, string> }) {
  const groups = new Map<string, { c: Citation; i: number }[]>()
  citations.forEach((c, i) => {
    const key = c.investigation_id ?? ''
    groups.set(key, [...(groups.get(key) ?? []), { c, i }])
  })
  const grouped = groups.size > 1 || !groups.has('')
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([inv, items]) => (
        <div key={inv || 'all'}>
          {grouped && inv && (
            <Link to={`/investigations/${inv}`} className="mb-2 inline-block text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-dim)] hover:text-[var(--color-flame)]">
              {names.get(inv) ?? inv}
            </Link>
          )}
          <ol className="space-y-3">
            {items.map(({ c, i }) => (
              <li key={c.id} id={`${prefix}${c.id}`} className="flex scroll-mt-32 gap-3 text-[14px] leading-snug">
                <span className="w-5 shrink-0 text-right font-mono text-[12px] tabular-nums text-[var(--color-ink-faint)]">{i + 1}.</span>
                <span className="min-w-0">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="group text-[var(--color-ink)] hover:text-[var(--color-flame)]">
                      {c.title}
                      <ArrowUpRight className="ml-1 inline h-3 w-3 text-[var(--color-ink-faint)] group-hover:text-[var(--color-flame)]" />
                    </a>
                  ) : (
                    <span className="text-[var(--color-ink)]">{c.title}</span>
                  )}
                  <span className="text-[var(--color-ink-faint)]"> — {c.location}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

type Tone = 'evidence' | 'meaning' | 'scenario' | 'ranked' | 'limits' | 'notes'

const TONE: Record<Tone, { color: string; icon: typeof BookOpen; wash: boolean }> = {
  evidence: { color: 'var(--color-prevention)', icon: BookOpen, wash: false },
  meaning: { color: 'var(--color-nebula)', icon: Lightbulb, wash: true },
  scenario: { color: 'var(--color-flame)', icon: Crosshair, wash: false },
  ranked: { color: 'var(--color-prevention)', icon: ListOrdered, wash: false },
  limits: { color: 'var(--color-ember)', icon: TriangleAlert, wash: true },
  notes: { color: 'var(--color-ink-dim)', icon: Bookmark, wash: false },
}

/**
 * One step on the evidence trail: coloured node + rail on the left, heading in
 * the step colour (colour + icon + heading, never colour alone).
 */
function Section({ title, note, tone, last, children }: { title: string; note?: string | null; tone: Tone; last?: boolean; children: ReactNode }) {
  const t = TONE[tone]
  const Icon = t.icon
  return (
    <section className={`relative pl-12 ${last ? '' : 'pb-9'}`}>
      {!last && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[15px] top-9 w-px"
          style={{ background: `linear-gradient(to bottom, color-mix(in oklab, ${t.color} 70%, transparent), color-mix(in oklab, ${t.color} 10%, transparent))` }}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full"
        style={{
          color: t.color,
          background: `color-mix(in oklab, ${t.color} 14%, var(--color-void))`,
          boxShadow: `0 0 0 1px color-mix(in oklab, ${t.color} 45%, transparent), 0 0 18px -4px ${t.color}`,
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="mb-3 flex min-h-8 flex-wrap items-center gap-x-3 text-[15px] font-semibold" style={{ color: t.color }}>
        {title}
        {note && <span className="text-[13px] font-normal italic text-[var(--color-ink-faint)]">{note}</span>}
      </h3>
      <div className={t.wash ? 'rounded-2xl px-5 py-4' : ''} style={t.wash ? { background: `color-mix(in oklab, ${t.color} 7%, transparent)` } : undefined}>
        {children}
      </div>
    </section>
  )
}

function Prose({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <p className={`font-serif text-[19px] leading-[1.7] ${muted ? 'text-[var(--color-ink)]/85' : 'text-[var(--color-ink)]'}`}>{children}</p>
}

function CopyButton({ res }: { res: InterpretResponse }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    const num = new Map(res.citations.map((c, i) => [c.id, i + 1]))
    const cite = (ids: string[]) => ids.map((id) => `[${num.get(id)}]`).join('')
    const text = [
      'What the studies show:',
      ...res.findings.map((f) => `${f.text} ${cite(f.citation_ids)}`),
      '',
      'What it could mean (interpretation):',
      ...res.interpretations.map((f) => `${f.text} ${cite(f.citation_ids)}`),
      '',
      'Caveats:',
      ...res.gaps.map((g) => `- ${g.text}`),
      '',
      'Notes:',
      ...res.citations.map((c, i) => `${i + 1}. ${c.title} — ${c.location}${c.url ? ` (${c.url})` : ''}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 hover:text-[var(--color-ink)]">
      {done ? <Check className="h-3.5 w-3.5 text-[var(--color-prevention)]" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}
