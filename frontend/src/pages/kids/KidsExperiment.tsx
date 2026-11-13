import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarDays, Earth, FlaskConical, Puzzle, Satellite, Star, Telescope, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { InvestigationResponse } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { FUEL_ICONS, jobIcon } from '@/features/kids/icons'
import { EARTH_OXYGEN_PCT, EARTH_PRESSURE_KPA, EARTH_THEMES, FUELS, JOBS, jobOf, plainMaterial, platformWords } from '@/features/kids/kidsCopy'
import { kidNumber, kidStats, type KidStats } from '@/features/kids/kidsData'
import { KidError, KidLoading } from '@/features/kids/KidState'
import { Guide } from '@/features/kids/Mascot'
import { Burst } from '@/features/kids/Burst'
import { reward, useKidsProgress } from '@/features/kids/progress'
import { sfx } from '@/features/kids/sfx'

type Step = { key: string; label: string; say: string; body: ReactNode }

export function KidsExperiment() {
  const { id = '' } = useParams()
  const detail = useAsync((signal) => api.investigation(id, signal), `kids-detail-${id}`)

  if (detail.status === 'error' && !detail.data) {
    return detail.error.status === 404
      ? <KidError onRetry={detail.retry} text="Orbi could not find that experiment. Try picking one from Explore." />
      : <KidError onRetry={detail.retry} />
  }
  if (!detail.data || detail.data.investigation.id !== id) return <KidLoading />
  return <Story key={id} detail={detail.data} />
}

function Story({ detail }: { detail: InvestigationResponse }) {
  const inv = detail.investigation
  const stats = useMemo(() => kidStats(detail), [detail])
  const steps = useMemo(() => buildSteps(detail, stats), [detail, stats])
  const [params] = useSearchParams()
  const [i, setI] = useState(() => Math.min(Math.max(Number(params.get('step')) - 1 || 0, 0), steps.length - 1))
  const { discovered } = useKidsProgress()
  const already = discovered.includes(inv.id)
  const last = i === steps.length - 1
  const look = jobOf(inv.safety_topics[0])

  useEffect(() => {
    if (last) sfx.levelUp()
    if (last && !already) reward({ stars: 3, discovered: inv.id })
  }, [last, already, inv.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.length])

  const step = steps[i]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/kids/explore" className="toon-btn inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 font-display text-lg text-[#1b1740]">
          <ArrowLeft size={20} aria-hidden="true" /> All experiments
        </Link>
        <span className="toon rounded-full px-4 py-2 font-display text-lg text-[#1b1740]" style={{ background: look.soft }}>{inv.acronym}</span>
      </div>

      {/* Step trail */}
      <ol className="flex flex-wrap gap-2" aria-label="Story steps">
        {steps.map((s, n) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => { sfx.pop(); setI(n) }}
              aria-current={n === i ? 'step' : undefined}
              className={cn(
                'min-h-11 rounded-full border-[3px] border-[#0d0a26] px-4 text-[15px] font-bold transition',
                n === i ? 'bg-[#ffcf4a] text-[#1b1740]' : n < i ? 'bg-[#7ee2a8] text-[#1b1740]' : 'bg-[#1b2260] text-[#c9cdf5] hover:bg-[#26307a]',
              )}
            >
              {n + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.section
          key={step.key}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          aria-labelledby="step-title"
          className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        >
          <div className="space-y-5">
            <h1 id="step-title" className="font-display text-3xl font-bold sm:text-4xl">{step.label}</h1>
            <Guide say={step.say} mood={last ? 'wow' : 'happy'} size={64} />
          </div>
          <div className="toon relative rounded-[2rem] bg-white p-5 text-[#1b1740] sm:p-7">{last && <Burst fire={1} count={30} />}{step.body}</div>
        </motion.section>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => { sfx.pop(); setI((n) => Math.max(n - 1, 0)) }}
          disabled={i === 0}
          className="inline-flex min-h-14 items-center gap-2 toon-btn rounded-2xl bg-white px-5 font-display text-xl text-[#1b1740] disabled:opacity-40"
        >
          <ArrowLeft size={22} aria-hidden="true" /> Back
        </button>
        <span className="font-bold text-[#c9cdf5]">{i + 1} of {steps.length}</span>
        {!last ? (
          <button
            type="button"
            onClick={() => { sfx.pop(); setI((n) => n + 1) }}
            className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffcf4a] px-6 toon-btn font-display text-xl text-[#1b1740]"
          >
            Next <ArrowRight size={22} aria-hidden="true" />
          </button>
        ) : (
          <Link to="/kids/quiz" className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ff8fb1] px-6 toon-btn font-display text-xl text-[#1b1740]">
            Quiz time <Puzzle size={22} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Steps ───────────────────────────────────────────────────────────

function buildSteps(detail: InvestigationResponse, s: KidStats): Step[] {
  const inv = detail.investigation
  const steps: Step[] = []
  const place = platformWords(s.platform)
  const now = new Date().getFullYear()

  steps.push({
    key: 'meet',
    label: `Meet ${inv.acronym}`,
    say: `This is ${inv.acronym}. ${inv.safety_topics.length ? `Its job: ${inv.safety_topics.map((t) => JOBS[t].title.toLowerCase()).join(', and ')}.` : 'It studies how flames work.'}`,
    body: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#7a5cf0]">NASA’s full name</p>
          <p className="mt-1 font-display text-xl font-bold leading-snug">{inv.name}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(inv.safety_topics.length ? inv.safety_topics : [undefined]).map((t) => {
            const look = jobOf(t)
            const Icon = jobIcon(t)
            return (
              <Fact key={t ?? 'science'} icon={<Icon size={26} />} color={look.color} soft={look.soft} title={look.title}>{look.explain}</Fact>
            )
          })}
          {place && (
            <Fact icon={<Satellite size={26} />} color="#2e8fe6" soft="#dfeefc" title={`Where: ${place.title}`}>{place.explain}</Fact>
          )}
          {s.startYear && (
            <Fact icon={<CalendarDays size={26} />} color="#e8833a" soft="#fdeedd" title={`When: ${s.endYear && s.endYear !== s.startYear ? `${s.startYear} to ${s.endYear}` : `started ${s.startYear}`}`}>
              That’s {now - s.startYear} years ago{now - s.startYear > 9 ? ', maybe before you were born!' : '.'}
            </Fact>
          )}
        </div>
      </div>
    ),
  })

  steps.push({
    key: 'burn',
    label: 'What burned?',
    say: s.topMaterials.length || inv.fuel_types.length
      ? 'Scientists picked what to burn on purpose. Here is what this experiment used the most.'
      : 'NASA’s files for this experiment don’t list what was burned. That’s okay, scientists don’t always write everything in one place!',
    body: (
      <div className="space-y-5">
        {inv.fuel_types.filter((f) => FUELS[f]).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {inv.fuel_types.filter((f) => FUELS[f]).map((f) => {
              const Icon = FUEL_ICONS[f]
              return <Fact key={f} icon={<Icon size={26} />} color="#e8833a" soft="#fdeedd" title={`${FUELS[f].title} fuel`}>{FUELS[f].explain}</Fact>
            })}
          </div>
        )}
        {s.topMaterials.length > 0 ? (
          <div>
            <p className="font-display text-lg font-bold">Burned most often</p>
            <ul className="mt-3 space-y-3">
              {s.topMaterials.map((m, n) => {
                const p = plainMaterial(m.name)
                const width = (m.count / s.topMaterials[0].count) * 100
                return (
                  <li key={m.name}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold">{p.text}</span>
                      <span className="text-[#5b5785]">{m.count} tests</span>
                    </div>
                    <div className="mt-1 h-4 overflow-hidden rounded-full bg-[#f1eefc]">
                      <motion.div className="h-full rounded-full" style={{ background: ['#ff8a3d', '#ffcf4a', '#ff8fb1'][n] }} initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.8, delay: n * 0.1 }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : inv.materials.length > 0 ? (
          <div>
            <p className="font-display text-lg font-bold">Things on NASA’s list</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {inv.materials.slice(0, 6).map((m) => <li key={m} className="rounded-full bg-[#fdeedd] px-3 py-1 font-bold text-[#b45a17]">{plainMaterial(m).text}</li>)}
            </ul>
          </div>
        ) : (
          <Missing>NASA’s files don’t list the materials for this one.</Missing>
        )}
      </div>
    ),
  })

  steps.push({
    key: 'air',
    label: 'The air they used',
    say: s.oxygen
      ? 'Fire needs oxygen, a gas in the air. Scientists changed how much oxygen there was, to find out when a fire can and can’t burn.'
      : 'Fire needs oxygen from the air. NASA’s tables for this experiment don’t list the oxygen numbers.',
    body: s.oxygen || s.pressure ? (
      <div className="space-y-6">
        {s.oxygen && <OxygenGrids min={s.oxygen.min} max={s.oxygen.max} />}
        {s.pressure && <PressureBalloons min={s.pressure.min} max={s.pressure.max} />}
      </div>
    ) : <Missing>No oxygen or air-pressure numbers were shared for this experiment.</Missing>,
  })

  steps.push({
    key: 'tests',
    label: 'How many tests?',
    say: s.testCount
      ? `NASA wrote down ${s.testCount} test results for ${inv.acronym}. Scientists repeat tests many times to be sure!`
      : 'The test numbers for this experiment aren’t in NASA’s tables yet.',
    body: s.testCount ? <TestDots count={s.testCount} /> : <Missing>No test numbers to count here, yet.</Missing>,
  })

  if (detail.findings.length) {
    steps.push({
      key: 'noticed',
      label: 'What NASA noticed',
      say: 'Here is something the scientists wrote about what they saw. It uses grown-up words, so you can ask someone to read it with you.',
      body: (
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1 text-sm font-bold text-[#4b3bb5]">
            <FlaskConical size={16} aria-hidden="true" /> In NASA’s own words
          </p>
          {detail.findings.slice(0, 2).map((f) => (
            <blockquote key={f.id} className="border-l-4 border-[#7a5cf0] pl-4 text-lg leading-relaxed">{f.text}</blockquote>
          ))}
        </div>
      ),
    })
  }

  if (detail.earth?.themes.length) {
    steps.push({
      key: 'earth',
      label: 'How it helps Earth',
      say: 'Science from space can help people here on Earth too. NASA says this experiment could help with these things.',
      body: (
        <ul className="space-y-3">
          {detail.earth.themes.map((t) => (
            <li key={t.id} className="rounded-3xl bg-[#e3f8ec] p-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold"><Earth size={22} className="text-[#2fbf7f]" aria-hidden="true" /> {EARTH_THEMES[t.id]?.title ?? t.label}</p>
              <p className="mt-1 leading-snug text-[#3e3a66]">{EARTH_THEMES[t.id]?.explain}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-bold text-[#2a8a5c]">Read NASA’s words</summary>
                <p className="mt-2 text-sm italic leading-relaxed text-[#3e3a66]">“{t.quote}”</p>
              </details>
            </li>
          ))}
        </ul>
      ),
    })
  }

  steps.push({
    key: 'done',
    label: 'Discovered!',
    say: `Great job, explorer! You finished the story of ${inv.acronym}. You earned 3 stars!`,
    body: (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="flex gap-2">
          {[0, 1, 2].map((n) => <Star key={n} size={52} className="fill-[#ffcf4a] text-[#e0a800]" aria-hidden="true" />)}
        </motion.div>
        <p className="font-display text-2xl font-bold">{inv.acronym} discovered!</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/kids/explore" className="toon-btn inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#7a5cf0] px-5 font-display text-lg text-white">
            <Telescope size={20} aria-hidden="true" /> Find another
          </Link>
          <Link to={`/investigations/${encodeURIComponent(inv.id)}`} className="toon-btn inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#f1eefc] px-5 font-display text-lg text-[#4b3bb5]">
            <UserRound size={20} aria-hidden="true" /> Grown-up page
          </Link>
        </div>
      </div>
    ),
  })

  return steps
}

// ── Visual pieces ───────────────────────────────────────────────────

function Fact({ icon, color, soft, title, children }: { icon: ReactNode; color: string; soft: string; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-3xl p-4" style={{ background: soft }}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-[3px] border-[#0d0a26] text-white" style={{ background: color }} aria-hidden="true">{icon}</span>
      <div>
        <p className="font-display font-bold leading-snug">{title}</p>
        {children && <p className="mt-1 leading-snug text-[#3e3a66]">{children}</p>}
      </div>
    </div>
  )
}

function Missing({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl border-2 border-dashed border-[#c9c3ee] p-6 text-center text-lg font-semibold text-[#5b5785]">{children}</p>
}

/** 100 "bits of air"; the coloured ones are oxygen. */
function AirGrid({ pct, label, highlight }: { pct: number; label: string; highlight?: boolean }) {
  const filled = Math.round(pct)
  return (
    <figure className={cn('rounded-3xl p-3', highlight ? 'bg-[#dfeefc]' : 'bg-[#f6f4ff]')}>
      <div className="grid grid-cols-10 gap-[3px]" role="img" aria-label={`${kidNumber(pct)} out of 100 bits of air are oxygen`}>
        {Array.from({ length: 100 }, (_, n) => (
          <motion.span
            key={n}
            className="aspect-square rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: n * 0.004 }}
            style={{ background: n < filled ? (highlight ? '#2e8fe6' : '#ff8a3d') : '#d9d5ee' }}
          />
        ))}
      </div>
      <figcaption className="mt-2 text-center">
        <span className="block font-display text-2xl font-bold">{kidNumber(pct)}</span>
        <span className="text-sm font-semibold text-[#5b5785]">{label}</span>
      </figcaption>
    </figure>
  )
}

function OxygenGrids({ min, max }: { min: number; max: number }) {
  const same = Math.round(min * 10) === Math.round(max * 10)
  const verdict = max < EARTH_OXYGEN_PCT
    ? 'Every test had less oxygen than the air you breathe.'
    : min > EARTH_OXYGEN_PCT
      ? 'Every test had more oxygen than the air you breathe.'
      : 'They tried air with less oxygen and air with more oxygen than ours.'
  return (
    <div>
      <p className="font-display text-lg font-bold">Oxygen: out of 100 bits of air</p>
      <div className={cn('mt-3 grid gap-3', same ? 'grid-cols-2' : 'grid-cols-3')}>
        <AirGrid pct={EARTH_OXYGEN_PCT} label="Earth’s air" highlight />
        {same ? <AirGrid pct={min} label="In the tests" /> : (
          <>
            <AirGrid pct={min} label="Least they tried" />
            <AirGrid pct={max} label="Most they tried" />
          </>
        )}
      </div>
      <p className="mt-3 text-lg font-semibold">{verdict}</p>
    </div>
  )
}

/** Balloons sized by air pressure compared with Earth's air at the seaside. */
function PressureBalloons({ min, max }: { min: number; max: number }) {
  const items = [
    { label: 'Earth’s air', kpa: EARTH_PRESSURE_KPA, color: '#2e8fe6' },
    { label: 'Least squeezed', kpa: min, color: '#ff8fb1' },
    { label: 'Most squeezed', kpa: max, color: '#8a5cf0' },
  ]
  const biggest = Math.max(...items.map((b) => b.kpa))
  return (
    <div>
      <p className="font-display text-lg font-bold">Air squeeze (pressure)</p>
      <p className="mt-1 text-[#3e3a66]">Pressure is how hard the air is squeezed together. More squeeze means more air packed in.</p>
      <div className="mt-4 flex items-end justify-around gap-2">
        {items.map((b) => {
          const size = 36 + 84 * Math.sqrt(b.kpa / biggest)
          const times = b.kpa / EARTH_PRESSURE_KPA
          return (
            <figure key={b.label} className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 160, damping: 12 }}
                className="rounded-full"
                style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, #ffffffaa, ${b.color} 60%)` }}
                aria-hidden="true"
              />
              <span className="mt-1 h-6 w-px bg-[#9b97c4]" aria-hidden="true" />
              <figcaption>
                <span className="block font-display font-bold">{b.label === 'Earth’s air' ? '1×' : `${kidNumber(times)}×`}</span>
                <span className="text-sm text-[#5b5785]">{b.label}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-[#5b5785]">From {kidNumber(min)} to {kidNumber(max)} kilopascals. Earth’s air is about 101.</p>
    </div>
  )
}

function TestDots({ count }: { count: number }) {
  const per = count > 300 ? Math.ceil(count / 300) : 1
  const dots = Math.ceil(count / per)
  return (
    <div>
      <p className="font-display text-5xl font-bold text-[#7a5cf0]">{count}</p>
      <p className="font-semibold text-[#3e3a66]">test results written down by NASA</p>
      <div className="mt-4 flex flex-wrap gap-1.5" role="img" aria-label={`${count} dots, one for each test result`}>
        {Array.from({ length: dots }, (_, n) => (
          <motion.span
            key={n}
            className="h-3 w-3 rounded-full"
            style={{ background: ['#ff8a3d', '#ffcf4a', '#ff8fb1', '#8a5cf0', '#2e8fe6'][n % 5] }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(n * 0.006, 1.6) }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-[#5b5785]">{per === 1 ? 'Each dot is one test result.' : `Each dot is ${per} test results.`}</p>
    </div>
  )
}
