import { motion } from 'framer-motion'
import { ArrowUpRight, CircleDashed, ExternalLink, FileCheck2, FlaskConical, Hourglass, Info, Orbit, Quote, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { GravityBracket, GravityResponse, OutsideEvidence, SourceLink } from '@/api/types'
import { CountUp } from '@/components/fx/CountUp'
import { RevealText } from '@/components/fx/RevealText'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateMessage } from '@/components/ui/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { scrollToEl } from '@/lib/scroll'

const EASE = [0.16, 1, 0.3, 1] as const
const MICRO = 'var(--color-flame)'
const EARTH = '#5aa6ff'
const OUTSIDE = 'var(--color-nebula)'

const BODIES = [
  { label: 'Orbit', sub: 'μg', g: 0 },
  { label: 'Moon', sub: '0.17 g', g: 0.166 },
  { label: 'Mars', sub: '0.38 g', g: 0.38 },
  { label: 'Earth', sub: '1 g', g: 1 },
]

const STATUS: Record<OutsideEvidence['status'], { label: string; icon: typeof Hourglass }> = {
  flown: { label: 'Flown · simulated lunar gravity', icon: FileCheck2 },
  published: { label: 'Published · drop tower', icon: FileCheck2 },
  planned: { label: 'Planned · on the Moon', icon: Hourglass },
}

/** Partial gravity: what orbit and Earth results can say about the Moon and Mars, and where that stops. */
export function GravityPage() {
  const res = useAsync((signal) => api.gravity(signal), 'gravity')
  const data = res.data

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-32 pt-28 lg:px-10">
      <header>
        <div>
          <p className="label mb-4">Partial gravity · Moon and Mars</p>
          <RevealText
            lines={['Between orbit', 'and Earth']}
            className="font-display text-[clamp(2.8rem,6vw,5.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]"
          />
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--color-ink-dim)]">
            Moon bases and rovers will sit at a sixth of Earth’s gravity, Mars at about four tenths. PSI has no combustion
            tests at either. This page gathers what can stand in: studies that compare orbit with Earth, an experiment that
            imitated buoyancy, and NASA partial-gravity tests published outside PSI.
          </p>
        </div>
        {data && (
          <dl className="mt-10 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--color-line)] pt-6 sm:grid-cols-4">
            <Stat label="Microgravity studies" value={data.counts.microgravity_studies} />
            <Stat label="Compare with 1 g" value={data.counts.earth_comparison_studies} />
            <Stat label="Partial-gravity studies" value={data.counts.partial_gravity_studies} warn />
            <Stat label="Tests outside PSI" value={data.counts.outside_psi} />
          </dl>
        )}
      </header>

      {res.status === 'error' && !data && (
        <StateMessage tone="error" title="Partial-gravity evidence unavailable" message={res.error.message}
          onRetry={res.error.retryable ? res.retry : undefined} />
      )}
      {res.status === 'loading' && !data && (
        <div className="mt-16 space-y-4" aria-busy="true" aria-label="Loading partial-gravity evidence">
          <Skeleton className="h-40" />
          <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48" />)}</div>
        </div>
      )}
      {data && <Content data={data} />}
    </div>
  )
}

function Content({ data }: { data: GravityResponse }) {
  return (
    <>
      <Section n="01" id="axis" title="The gravity gap"
        text="Orbit and Earth are the two ends PSI can speak to. Everything between them is a gap in the catalog; the pins show NASA tests that reached partial gravity elsewhere.">
        <GravityAxis data={data} />
      </Section>

      <Section n="02" id="brackets" title="Both ends, one study"
        text="These studies set their microgravity results against Earth gravity in their own PSI record. They are the closest thing in the catalog to a bracket around the Moon and Mars.">
        <div className="space-y-10">
          {data.topics.map((topic) => {
            const items = data.brackets.filter((item) => item.topic === topic.id)
            if (!items.length) return null
            return (
              <div key={topic.id}>
                <h3 className="label mb-4">{topic.label} · {items.length}</h3>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item, i) => <BracketCard key={item.id} item={item} i={i} />)}
                </ul>
              </div>
            )
          })}
        </div>
      </Section>

      <Section n="03" id="bounding" title="Does the bracket hold?"
        text="The challenge brief suggests orbit and Earth results could bound what happens in between. NASA’s own partial-gravity tests add a caution.">
        <Bounding data={data} />
      </Section>

      <Section n="04" id="stand-ins" title="Stand-ins for partial gravity"
        text="No PSI test burned at lunar or Martian gravity. These come closest: one imitates buoyancy with electricity, the others reached partial gravity outside the PSI collection.">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SimulatedCard data={data} />
          {data.outside.map((item, i) => <OutsideCard key={item.id} item={item} i={i + 1} />)}
        </ul>
      </Section>

      <aside aria-labelledby="limits-h" className="mt-16 max-w-3xl rounded-2xl border border-[var(--color-line)] p-6">
        <h2 id="limits-h" className="label mb-3 flex items-center gap-2"><Info className="h-3.5 w-3.5 text-[var(--color-ember)]" aria-hidden="true" /> Limits of this evidence</h2>
        <ul className="space-y-2 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
          {data.limits.map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </aside>
    </>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="label mt-2">{label}</dt>
      <dd className={cn('font-display text-4xl font-light tabular-nums tracking-tight', warn && 'text-[var(--color-ember)]')}>
        <CountUp value={value} />
      </dd>
    </div>
  )
}

function Section({ n, id, title, text, children }: { n: string; id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-16 scroll-mt-28 border-t border-[var(--color-line)] pt-14 first:mt-16">
      <div className="mb-8 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="label mb-3">{n}</p>
          <h2 id={`${id}-h`} className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em]">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--color-ink-dim)] lg:col-span-7 lg:pt-8">{text}</p>
      </div>
      {children}
    </section>
  )
}

const pct = (g: number) => `${g * 100}%`
const PIN_ROW = 30

/** 0 → 1 g axis: evidence at both ends, the gap between, and pins for tests outside PSI. */
function GravityAxis({ data }: { data: GravityResponse }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 px-6 pb-8 pt-6 sm:px-10">
      {/* pins for evidence outside PSI: one row each, so labels never overlap */}
      <div className="relative" style={{ height: data.outside.length * PIN_ROW + 12 }} aria-hidden="true">
        {data.outside.map((item, row) => (
          <div key={item.id}>
            <span className="absolute bottom-0 w-px -translate-x-1/2" style={{ left: pct(item.g), top: row * PIN_ROW + 22, background: OUTSIDE }} />
            <button type="button" tabIndex={-1}
              onClick={() => scrollToEl(document.getElementById(`outside-${item.id}`))}
              className="absolute -translate-x-1/2 whitespace-nowrap rounded-full border bg-[var(--color-panel)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors hover:bg-white/5 sm:text-[11px]"
              style={{ left: pct(item.g), top: row * PIN_ROW, color: OUTSIDE, borderColor: 'color-mix(in oklab, var(--color-nebula) 45%, transparent)' }}>
              {item.short}
            </button>
          </div>
        ))}
      </div>

      {/* track */}
      <div className="relative h-12">
        <div className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(-45deg,rgba(245,165,74,0.16)_0_8px,transparent_8px_16px)] ring-1 ring-[var(--color-ember)]/30" />
        <motion.div className="absolute inset-y-0 left-0 w-[4%] rounded-l-full shadow-[0_0_24px_var(--color-flame)]" style={{ background: MICRO, originX: 0 }}
          initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }} />
        <motion.div className="absolute inset-y-0 right-0 w-[4%] rounded-r-full" style={{ background: EARTH, originX: 1 }}
          initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.15, ease: EASE }} />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--color-void)]/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ember)] sm:text-[11px]">
          No PSI tests
        </span>
        {data.outside.map((item) => (
          <span key={item.id} className="absolute inset-y-[-6px] w-px -translate-x-1/2" style={{ left: pct(item.g), background: OUTSIDE }} aria-hidden="true" />
        ))}
      </div>

      {/* bodies (Moon and Mars drop to a second line on phones so they clear the Orbit label) */}
      <div className="relative mt-3 h-[76px] sm:h-10">
        {BODIES.map((body) => (
          <div key={body.label} className={cn('absolute text-center',
            body.g === 0 ? 'left-0' : body.g === 1 ? 'right-0 text-right' : 'top-9 -translate-x-1/2 sm:top-0')}
            style={body.g > 0 && body.g < 1 ? { left: pct(body.g) } : undefined}>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink)]">{body.label}</p>
            <p className="font-mono text-[11px] text-[var(--color-ink-faint)]">{body.sub}</p>
          </div>
        ))}
      </div>

      <ul className="mt-6 grid gap-3 text-[13px] leading-snug text-[var(--color-ink-dim)] md:grid-cols-3">
        <li className="flex gap-2"><Orbit className="mt-0.5 h-4 w-4 shrink-0" style={{ color: MICRO }} aria-hidden="true" />
          <span><strong className="font-medium text-[var(--color-ink)]">{data.counts.microgravity_studies} PSI studies</strong> burned in microgravity.</span></li>
        <li className="flex gap-2"><CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ember)]" aria-hidden="true" />
          <span><strong className="font-medium text-[var(--color-ink)]">No PSI study</strong> burned at lunar or Martian gravity.</span></li>
        <li className="flex gap-2"><Orbit className="mt-0.5 h-4 w-4 shrink-0" style={{ color: EARTH }} aria-hidden="true" />
          <span><strong className="font-medium text-[var(--color-ink)]">{data.counts.earth_comparison_studies} studies</strong> set their results against Earth gravity.</span></li>
      </ul>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--color-ink-dim)]">
        <Zap className="h-4 w-4 shrink-0 text-[var(--color-ink-faint)]" aria-hidden="true" />
        {data.simulated.acronym} imitated part of buoyancy with an electric field; it has no gravity value, so it is not on the axis.
      </p>
    </div>
  )
}

function SourceA({ source, children }: { source: SourceLink; children?: ReactNode }) {
  if (!source.url) return <span className="text-[var(--color-ink-faint)]">{children ?? source.title}</span>
  return (
    <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-[var(--color-flame)] hover:underline">
      <span>{children ?? source.title}</span> <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

function StudyLink({ id, acronym }: { id: string; acronym: string }) {
  return (
    <Link to={`/investigations/${id}`} className="group inline-flex items-baseline gap-2 hover:text-[var(--color-flame)]">
      <span className="font-display text-lg font-medium uppercase tracking-[-0.01em]">{acronym}</span>
      <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{id}</span>
      <ArrowUpRight className="h-3.5 w-3.5 self-center text-[var(--color-ink-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}

function BracketCard({ item, i }: { item: GravityBracket; i: number }) {
  return (
    <motion.li initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ delay: i * 0.06, duration: 0.7, ease: EASE }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 p-6">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: `linear-gradient(${MICRO}, ${EARTH})` }} />
      <StudyLink id={item.id} acronym={item.acronym} />
      <p className="mt-2 text-sm text-[var(--color-ink)]">{item.summary}</p>
      <figure className="mt-4 flex-1">
        <figcaption className="label mb-1.5 flex items-center gap-1.5"><Quote className="h-3 w-3" aria-hidden="true" /> PSI record · {item.field}</figcaption>
        <blockquote className="text-[13px] leading-snug text-[var(--color-ink-dim)]">“{item.quote}”</blockquote>
      </figure>
      {item.finding && (
        <div className="mt-4 rounded-xl border border-[var(--color-prevention)]/30 bg-[var(--color-prevention)]/[0.05] p-3">
          <p className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-prevention)]">
            <FileCheck2 className="h-3 w-3" aria-hidden="true" /> Reviewed finding
          </p>
          <p className="text-[13px] leading-snug text-[var(--color-ink)]">{item.finding.text}</p>
          <p className="mt-2 text-[12px]"><SourceA source={{ title: item.finding.source_title, url: item.finding.source_url }} /></p>
        </div>
      )}
    </motion.li>
  )
}

function Bounding({ data }: { data: GravityResponse }) {
  const b = data.bounding
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 p-6">
          <figcaption className="label mb-3">The challenge brief</figcaption>
          <blockquote className="font-display text-xl font-medium leading-snug tracking-[-0.01em]">“{b.brief_quote}”</blockquote>
          <p className="mt-4 text-[13px]"><SourceA source={b.brief_source}>Flame in Freefall challenge brief</SourceA></p>
        </figure>
        <div className="rounded-2xl border border-[var(--color-ember)]/35 bg-[var(--color-ember)]/[0.05] p-6">
          <p className="label mb-3 !text-[var(--color-ember)]">NASA partial-gravity tests</p>
          <p className="text-[15px] leading-relaxed text-[var(--color-ink)]">{b.nasa_summary}</p>
          <p className="mt-4 text-[13px]"><SourceA source={b.nasa_source} /></p>
          <figure className="mt-5 border-t border-[var(--color-ember)]/20 pt-4">
            <figcaption className="label mb-1.5">The {b.caveat_study.acronym} PSI record agrees</figcaption>
            <blockquote className="text-[13px] leading-snug text-[var(--color-ink-dim)]">“{b.caveat_quote}”</blockquote>
            <p className="mt-2 text-[13px]"><Link to={`/investigations/${b.caveat_study.id}`} className="text-[var(--color-flame)] hover:underline">Open {b.caveat_study.acronym}</Link></p>
          </figure>
        </div>
      </div>
      <p className="flex gap-3 rounded-2xl border border-[var(--color-line-strong)] p-5 text-[15px] leading-relaxed text-[var(--color-ink)]">
        <FlaskConical className="mt-1 h-4 w-4 shrink-0 text-[var(--color-flame)]" aria-hidden="true" />
        <span><span className="label mr-2">For engineers</span>{b.takeaway}</span>
      </p>
    </div>
  )
}

function SimulatedCard({ data }: { data: GravityResponse }) {
  const s = data.simulated
  return (
    <motion.li initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}
      className="flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 p-6">
      <p className="label inline-flex items-center gap-1.5"><Zap className="h-3 w-3" aria-hidden="true" /> In PSI · simulated effect</p>
      <div className="mt-3"><StudyLink id={s.id} acronym={s.acronym} /></div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">{s.brief_quote}</p>
      <p className="mt-1 text-[12px]"><SourceA source={s.brief_source}>Challenge brief</SourceA></p>
      <figure className="mt-4">
        <figcaption className="label mb-1.5 flex items-center gap-1.5"><Quote className="h-3 w-3" aria-hidden="true" /> PSI record · approach</figcaption>
        {s.record_quotes.map((q) => <blockquote key={q.quote} className="text-[13px] leading-snug text-[var(--color-ink-dim)]">“{q.quote}”</blockquote>)}
      </figure>
      <p className="mt-4 flex flex-1 items-end gap-2 text-[12px] leading-snug text-[var(--color-ink-faint)]">
        <Info className="mb-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ember)]" aria-hidden="true" />{s.limit}
      </p>
    </motion.li>
  )
}

function OutsideCard({ item, i }: { item: OutsideEvidence; i: number }) {
  const status = STATUS[item.status]
  const Icon = status.icon
  return (
    <motion.li id={`outside-${item.id}`} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ delay: i * 0.06, duration: 0.7, ease: EASE }}
      className="flex scroll-mt-28 flex-col rounded-2xl border p-6"
      style={{ borderColor: 'color-mix(in oklab, var(--color-nebula) 30%, transparent)' }}>
      <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: OUTSIDE }}>
        <Icon className="h-3 w-3" aria-hidden="true" /> Outside PSI · {status.label}
      </p>
      <h3 className="mt-3 font-display text-lg font-medium leading-snug tracking-[-0.01em]">{item.name}</h3>
      <p className="label mt-1">{item.g} g · {item.method}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">{item.text}</p>
      <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-[12px]"><SourceA source={item.source} /></p>
    </motion.li>
  )
}
