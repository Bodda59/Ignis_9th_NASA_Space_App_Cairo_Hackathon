import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SAFETY_TOPICS, type SafetyTopic } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { FUEL_ICONS, JOB_ICONS, jobIcon } from '@/features/kids/icons'
import { FUELS, JOBS, jobOf } from '@/features/kids/kidsCopy'
import { hasMissionName, loadStudies } from '@/features/kids/kidsData'
import { KidError, KidLoading } from '@/features/kids/KidState'
import { Guide } from '@/features/kids/Mascot'
import { useKidsProgress } from '@/features/kids/progress'
import { sfx } from '@/features/kids/sfx'


export function KidsExplore() {
  const [params, setParams] = useSearchParams()
  const job = SAFETY_TOPICS.includes(params.get('job') as SafetyTopic) ? (params.get('job') as SafetyTopic) : null
  const fuel = params.get('fuel') && FUELS[params.get('fuel')!] ? params.get('fuel')! : null
  const studies = useAsync(loadStudies, 'kids-studies')
  const { discovered } = useKidsProgress()

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    sfx.pop()
  }

  const all = studies.data?.items ?? []
  const named = all.filter(hasMissionName)
  const shown = named.filter((s) => (!job || s.safety_topics.includes(job)) && (!fuel || s.fuel_types?.includes(fuel)))
  const grownUp = all.filter((s) => !hasMissionName(s))

  const say = job
    ? `${JOBS[job].title}! ${JOBS[job].explain}`
    : 'Explore NASA studies about flames, smoke, and how liquids move in space. Pick a job or fuel to filter the cards.'

  return (
    <div className="space-y-8">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_1fr]">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Explore experiments</h1>
        <Guide say={say} size={64} />
      </div>

      <div className="space-y-4 toon rounded-[2rem] bg-[#1b2260] p-5">
        <FilterRow label="Job">
          <FilterChip active={!job} onClick={() => set('job', null)} icon={Sparkles}>All jobs</FilterChip>
          {SAFETY_TOPICS.map((t) => (
            <FilterChip key={t} active={job === t} onClick={() => set('job', job === t ? null : t)} icon={JOB_ICONS[t]} color={JOBS[t].color}>
              {JOBS[t].short}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Fuel">
          <FilterChip active={!fuel} onClick={() => set('fuel', null)} icon={Sparkles}>All fuels</FilterChip>
          {Object.entries(FUELS).map(([k, f]) => (
            <FilterChip key={k} active={fuel === k} onClick={() => set('fuel', fuel === k ? null : k)} icon={FUEL_ICONS[k]} color="#e8833a">
              {f.title}
            </FilterChip>
          ))}
        </FilterRow>
        {fuel && <p className="text-[#dfe3ff]"><b>{FUELS[fuel].title} fuel:</b> {FUELS[fuel].explain}</p>}
      </div>

      {studies.status === 'error' && !studies.data ? (
        <KidError onRetry={studies.retry} />
      ) : !studies.data ? (
        <KidLoading />
      ) : (
        <>
          <p className="font-display text-lg font-bold" aria-live="polite">
            {shown.length} experiment{shown.length === 1 ? '' : 's'} found
          </p>
          {shown.length === 0 ? (
            <div className="toon rounded-[2rem] bg-white p-8 text-center text-[#1b1740]">
              <p className="font-display text-xl font-bold">No experiment does both of those.</p>
              <button type="button" onClick={() => setParams({}, { replace: true })} className="toon-btn mt-4 min-h-12 rounded-2xl bg-[#7a5cf0] px-6 font-display text-white">
                Show all experiments
              </button>
            </div>
          ) : (
            <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {shown.map((s) => {
                  const main = s.safety_topics[0]
                  const look = jobOf(main)
                  const Icon = jobIcon(main)
                  const done = discovered.includes(s.id)
                  return (
                    <motion.li key={s.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
                      <Link
                        to={`/kids/experiments/${encodeURIComponent(s.id)}`}
                        className="toon toon-lift group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-white p-5 text-[#1b1740]"
                      >
                        {done && (
                          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#2fbf7f] px-3 py-1 text-sm font-bold text-white">
                            <Check size={16} aria-hidden="true" /> Discovered
                          </span>
                        )}
                        <span className="grid h-14 w-14 place-items-center rounded-2xl border-[3px] border-[#0d0a26] text-white" style={{ background: look.color }}>
                          <Icon size={28} aria-hidden="true" />
                        </span>
                        <h2 className="mt-4 font-display text-2xl font-bold">{s.acronym}</h2>
                        <p className="mt-1 text-sm leading-snug text-[#5b5785]">{s.name}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {s.safety_topics.map((t) => (
                            <span key={t} className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: JOBS[t].soft, color: JOBS[t].color }}>{JOBS[t].short}</span>
                          ))}
                          {(s.fuel_types ?? []).filter((f) => FUELS[f]).map((f) => {
                            const F = FUEL_ICONS[f]
                            return (
                              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-[#fdeedd] px-3 py-1 text-sm font-bold text-[#b45a17]">
                                <F size={14} aria-hidden="true" /> {FUELS[f].title}
                              </span>
                            )
                          })}
                        </div>
                        <span className="mt-auto inline-flex items-center gap-2 pt-5 font-display font-bold text-[#7a5cf0]">
                          {done ? 'Read again' : 'Start the story'}
                          <ArrowRight size={18} className="transition group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </Link>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          )}

          {grownUp.length > 0 && (
            <details className="toon rounded-[2rem] bg-[#1b2260] p-5">
              <summary className="cursor-pointer font-display text-lg font-bold">More studies for grown-ups ({grownUp.length})</summary>
              <p className="mt-3 text-[#c9cdf5]">Open these studies on the grown-up site for their findings and sources.</p>
              <ul className="mt-3 space-y-2">
                {grownUp.map((s) => (
                  <li key={s.id}>
                    <Link to={`/investigations/${encodeURIComponent(s.id)}`} className="text-[#b9c0ff] underline underline-offset-4 hover:text-white">{s.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="w-14 font-display font-bold text-[#c9cdf5]">{label}</span>
      {children}
    </div>
  )
}

function FilterChip({ active, onClick, icon: Icon, color = '#7a5cf0', children }: { active: boolean; onClick: () => void; icon: LucideIcon; color?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('toon-btn inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 font-display text-lg', active ? 'bg-[#ffcf4a] text-[#1b1740]' : 'bg-white text-[#1b1740]')}
    >
      <Icon size={20} strokeWidth={2.5} style={{ color }} aria-hidden="true" />
      {children}
    </button>
  )
}
