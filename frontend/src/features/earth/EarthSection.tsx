import { ArrowUpRight, ExternalLink, Info, Quote } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StudyEarth } from '@/api/types'
import { EARTH_THEME, excerpt } from './themes'

/** A study's Earth benefits: NASA's own text beside the themes this project reads from it. */
export function EarthSection({ earth }: { earth?: StudyEarth | null }) {
  if (!earth) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--color-line-strong)] p-6 text-sm text-[var(--color-ink-dim)]">
        The PSI record for this study states no research impacts or Earth benefits.
      </p>
    )
  }
  return (
    <div className="space-y-6">
      <div className={earth.themes.length ? 'grid gap-8 xl:grid-cols-[1.4fr_1fr]' : 'space-y-6'}>
        <figure className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50 p-6">
          <figcaption className="label mb-4 flex items-center gap-2">
            <Quote className="h-3.5 w-3.5" aria-hidden="true" /> NASA’s words · Research impacts / Earth benefits
          </figcaption>
          <blockquote className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-ink)]">{earth.text}</blockquote>
          {earth.source_url && (
            <a href={earth.source_url} target="_blank" rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-flame)] hover:underline">
              Read the PSI record <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </figure>

        {!!earth.themes.length && <div>
          <p className="label mb-3">Where it could help</p>
          <ul className="space-y-3">
            {earth.themes.map((theme) => {
              const { icon: Icon, color } = EARTH_THEME[theme.id]
              return (
                <li key={theme.id} className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] p-4 pl-5">
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
                  <Link to={`/earth#${theme.id}`} className="group inline-flex items-center gap-2 text-sm text-[var(--color-ink)] hover:text-[var(--color-flame)]">
                    <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
                    {theme.label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-ink-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <p className="mt-2 text-[13px] leading-snug text-[var(--color-ink-dim)]">{excerpt(theme.quote)}</p>
                  {!theme.fire_safety && <p className="label mt-2">Outside fire safety</p>}
                </li>
              )
            })}
          </ul>
        </div>}
      </div>

      {earth.note && (
        <p className="flex gap-2 text-[13px] leading-snug text-[var(--color-ink-dim)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ember)]" aria-hidden="true" />
          {earth.note}
        </p>
      )}
      <p className="text-[11px] text-[var(--color-ink-faint)]">
        The text is NASA’s statement of potential benefits, not a measured outcome.
        {!!earth.themes.length && ' The themes are this project’s grouping; each one quotes the sentence it rests on.'}
      </p>
    </div>
  )
}
