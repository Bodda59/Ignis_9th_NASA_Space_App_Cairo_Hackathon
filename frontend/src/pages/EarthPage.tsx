import { motion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, ExternalLink, Info } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { EarthResponse, EarthTheme, Spinoff } from '@/api/types'
import { CountUp } from '@/components/fx/CountUp'
import { RevealText } from '@/components/fx/RevealText'
import { EarthGlobe } from '@/components/three/EarthGlobe'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateMessage } from '@/components/ui/StateMessage'
import { EARTH_THEME, excerpt } from '@/features/earth/themes'
import { useAsync } from '@/hooks/useAsync'
import { scrollToEl } from '@/lib/scroll'

const EASE = [0.16, 1, 0.3, 1] as const

/** Fire safety on Earth: NASA spin-offs already in use, and what each PSI study says it could offer. */
export function EarthPage() {
  const res = useAsync((signal) => api.earth(signal), 'earth')
  const data = res.data

  // Links such as /earth#smoke_detection land on the theme once the page has loaded.
  useEffect(() => {
    const target = data && window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) scrollToEl(target)
  }, [data])

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-32 pt-28 lg:px-10">
      <header className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="label mb-4">Back on the ground · NASA’s stated Earth benefits</p>
          <RevealText
            lines={['Fire safety', 'on Earth']}
            className="font-display text-[clamp(2.8rem,6vw,5.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]"
          />
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--color-ink-dim)]">
            Work done to keep crews safe in orbit also points at fire problems here: mines, aircraft, submarines, wildfires
            and the gear firefighters wear. This page collects the NASA technology already in use on Earth and what each
            PSI combustion study says it could offer.
          </p>
        </div>
        {/* Globe centred above the stats; positioned out of flow so it adds no height to the header */}
        {/* min width keeps the globe in place even when the stats are missing (loading / error) */}
        <div className="relative lg:min-w-[clamp(280px,23vw,360px)]">
          <EarthGlobe interactive className="pointer-events-none absolute bottom-full left-1/2 hidden size-[clamp(280px,23vw,360px)] -translate-x-1/2 translate-y-[22%] lg:block" />
          {data && (
            <dl className="relative z-10 grid w-full grid-cols-3 gap-8 border-t border-[var(--color-line)] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Stat label="Studies" value={data.study_count} />
              <Stat label="Fire-safety themes" value={data.themes.filter((theme) => theme.fire_safety).length} />
              <Stat label="Spin-offs" value={data.spinoffs.length} />
            </dl>
          )}
        </div>
      </header>

      {res.status === 'error' && !data && (
        <StateMessage tone="error" title="Earth applications unavailable" message={res.error.message}
          onRetry={res.error.retryable ? res.retry : undefined} />
      )}
      {res.status === 'loading' && !data && (
        <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading Earth applications">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      )}
      {data && <Content data={data} />}
    </div>
  )
}

function Content({ data }: { data: EarthResponse }) {
  const labels = Object.fromEntries(data.themes.map((theme) => [theme.id, theme.label]))
  const fireSafety = data.themes.filter((theme) => theme.fire_safety)
  const other = data.themes.filter((theme) => !theme.fire_safety)
  return (
    <>
      <section aria-labelledby="spinoffs-h" className="mt-16 border-t border-[var(--color-line)] pt-14">
        <SectionHead n="01" id="spinoffs-h" title="Already in use"
          text="NASA technology that reached fire services and industry. These came from spacesuit, shuttle and station hardware, and are separate from the PSI combustion studies below." />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.spinoffs.map((spinoff, i) => <SpinoffCard key={spinoff.id} spinoff={spinoff} i={i} themeLabel={spinoff.related_theme ? labels[spinoff.related_theme] : undefined} />)}
        </ul>
      </section>

      <section aria-labelledby="themes-h" className="mt-20 border-t border-[var(--color-line)] pt-14">
        <SectionHead n="02" id="themes-h" title="What the studies could offer"
          text="Each study is listed under the Earth problem its PSI record names, with the sentence from NASA’s text that puts it there. Open a study to read the full statement." />
        <div className="space-y-6">
          {fireSafety.map((theme) => <ThemeBlock key={theme.id} theme={theme} />)}
        </div>
      </section>

      {other.length > 0 && (
        <section aria-labelledby="other-h" className="mt-20 border-t border-[var(--color-line)] pt-14">
          <SectionHead n="03" id="other-h" title="Beyond fire safety"
            text="Many flame studies name a different Earth benefit: more efficient, lower-emission combustion. It is listed apart so it is not read as fire-safety evidence." />
          <div className="space-y-6">
            {other.map((theme) => <ThemeBlock key={theme.id} theme={theme} compact />)}
          </div>
        </section>
      )}

      <p className="mt-16 flex max-w-3xl gap-3 rounded-2xl border border-[var(--color-line)] p-5 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ember)]" aria-hidden="true" />
        <span>
          {data.caveat} The theme groupings are this project’s reading of that text, not NASA’s classification.
        </span>
      </p>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="label mt-2">{label}</dt>
      <dd className="font-display text-4xl font-light tabular-nums tracking-tight"><CountUp value={value} /></dd>
    </div>
  )
}

function SectionHead({ n, id, title, text }: { n: string; id: string; title: string; text: string }) {
  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="label mb-3">{n}</p>
        <h2 id={id} className="font-display text-3xl font-medium uppercase leading-[1.05] tracking-[-0.02em]">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-ink-dim)] lg:col-span-7 lg:pt-8">{text}</p>
    </div>
  )
}

function SpinoffCard({ spinoff, i, themeLabel }: { spinoff: Spinoff; i: number; themeLabel?: string }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.08, duration: 0.7, ease: EASE }}
      className="flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 p-6"
    >
      <p className="label">{spinoff.era}</p>
      <h3 className="mt-3 font-display text-xl font-medium leading-snug tracking-[-0.01em]">{spinoff.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">{spinoff.text}</p>
      <div className="mt-5 space-y-2 border-t border-[var(--color-line)] pt-4 text-[13px]">
        {spinoff.url ? (
          <a href={spinoff.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--color-flame)] hover:underline">
            {spinoff.source_title} <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <p className="text-[var(--color-ink-faint)]">Source: {spinoff.source_title}</p>
        )}
        {spinoff.related_theme && themeLabel && (
          <a href={`#${spinoff.related_theme}`}
            onClick={(event) => { event.preventDefault(); scrollToEl(document.getElementById(spinoff.related_theme!)) }}
            className="flex items-center gap-1.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Related PSI research: {themeLabel}
          </a>
        )}
      </div>
    </motion.li>
  )
}

function ThemeBlock({ theme, compact }: { theme: EarthTheme; compact?: boolean }) {
  const { icon: Icon, color } = EARTH_THEME[theme.id]
  return (
    <motion.article
      id={theme.id}
      aria-labelledby={`${theme.id}-h`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE }}
      className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
      <div className="grid gap-6 p-6 pl-7 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color }}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {theme.studies.length} {theme.studies.length === 1 ? 'study' : 'studies'}
          </p>
          <h3 id={`${theme.id}-h`} className="mt-3 font-display text-2xl font-medium leading-snug tracking-[-0.01em]">{theme.label}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">{theme.description}</p>
        </div>
        <ul className={compact ? 'grid gap-x-8 gap-y-4 md:grid-cols-2' : 'space-y-4'}>
          {theme.studies.map((study) => (
            <li key={study.id} className="border-l border-[var(--color-line-strong)] pl-4">
              <Link to={`/investigations/${study.id}#earth`} className="group inline-flex items-baseline gap-2 hover:text-[var(--color-flame)]">
                <span className="font-display text-base font-medium uppercase tracking-[-0.01em]">{study.acronym}</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{study.id}</span>
                <ArrowUpRight className="h-3.5 w-3.5 self-center text-[var(--color-ink-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-dim)]">{excerpt(study.quote)}</p>
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  )
}
