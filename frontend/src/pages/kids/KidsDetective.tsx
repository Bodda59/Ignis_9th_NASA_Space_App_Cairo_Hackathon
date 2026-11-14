import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, CalendarDays, Earth, FlaskConical, Hash, RotateCcw, Satellite, Search, Star, Wind } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { InvestigationResponse, SearchItem } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { DetectiveArt } from '@/features/kids/Art'
import { Burst } from '@/features/kids/Burst'
import { FUEL_ICONS, jobIcon } from '@/features/kids/icons'
import { EARTH_THEMES, FUELS, JOBS, platformWords } from '@/features/kids/kidsCopy'
import { hasMissionName, kidStats, oxygenAmount, loadStudies } from '@/features/kids/kidsData'
import { KidError, KidLoading } from '@/features/kids/KidState'
import { Guide } from '@/features/kids/Mascot'
import { reward } from '@/features/kids/progress'
import { shuffle } from '@/features/kids/quizBuilder'
import { sfx } from '@/features/kids/sfx'

const CASES = 5
const MAX_CLUES = 5

type Clue = { key: string; icon: ReactNode; color: string; text: string }
type Case = { answer: SearchItem; suspects: SearchItem[]; clues: Clue[] }

/** Clues about one study, hardest first. Every clue is a fact shown in its Kids Lab story. */
function cluesFor(d: InvestigationResponse): Clue[] {
  const inv = d.investigation
  const s = kidStats(d)
  const hard: Clue[] = []
  if (s.flightYear) hard.push({ key: 'when', icon: <CalendarDays size={22} />, color: '#e8833a', text: `Its flight tests took place in ${s.flightYear}.` })
  else if (s.startYear) hard.push({ key: 'when', icon: <CalendarDays size={22} />, color: '#e8833a', text: `It has a listed start year of ${s.startYear}.` })
  if (s.testCount) hard.push({ key: 'tests', icon: <Hash size={22} />, color: '#8a5cf0', text: `The catalog lists ${s.testCount} individual test entries.` })
  if (s.oxygen) hard.push({ key: 'oxygen', icon: <Wind size={22} />, color: '#2e8fe6', text: `Its listed oxygen values are ${oxygenAmount(s.oxygen.min, s.oxygen.max)} parts out of 100.` })
  if (s.topMaterials[0] && s.topMaterials[0].count > (s.topMaterials[1]?.count ?? 0)) hard.push({ key: 'material', icon: <FlaskConical size={22} />, color: '#ff8a3d', text: `Its most common material label is ${s.topMaterials[0].name}.` })
  const theme = d.earth?.themes[0]
  if (theme) hard.push({ key: 'earth', icon: <Earth size={22} />, color: '#2fbf7f', text: `NASA says it could help with: ${EARTH_THEMES[theme.id]?.title ?? theme.label}.` })
  const place = platformWords(s.platform)
  if (place && !/International Space Station/.test(place.title)) hard.push({ key: 'where', icon: <Satellite size={22} />, color: '#2e8fe6', text: `Its study location was ${place.title}.` })

  const easy: Clue[] = []
  const fuel = inv.fuel_types.find((f) => FUELS[f])
  if (fuel) {
    const F = FUEL_ICONS[fuel]
    easy.push({ key: 'fuel', icon: <F size={22} />, color: '#e8833a', text: `It has ${FUELS[fuel].title.toLowerCase()} fuel listed.` })
  }
  if (inv.safety_topics.length) {
    const Icon = jobIcon(inv.safety_topics[0])
    easy.push({ key: 'job', icon: <Icon size={22} />, color: JOBS[inv.safety_topics[0]].color, text: `Its job: ${inv.safety_topics.map((t) => JOBS[t].title.toLowerCase()).join(' and ')}.` })
  }
  return [...shuffle(hard).slice(0, MAX_CLUES - easy.length), ...easy]
}

async function loadCase(named: SearchItem[], signal: AbortSignal): Promise<Case> {
  // Try a few studies until one has enough clues to be a fair case.
  for (const answer of shuffle(named)) {
    const detail = await api.investigation(answer.id, signal)
    const clues = cluesFor(detail)
    if (clues.length >= 3) {
      const others = shuffle(named.filter((s) => s.id !== answer.id)).slice(0, 3)
      return { answer, suspects: shuffle([answer, ...others]), clues }
    }
  }
  throw new Error('No experiment had enough clues.')
}

export function KidsDetective() {
  const studies = useAsync(loadStudies, 'kids-studies')
  const [game, setGame] = useState(0)

  if (studies.status === 'error' && !studies.data) return <KidError onRetry={studies.retry} />
  if (!studies.data) return <KidLoading />
  const named = studies.data.items.filter(hasMissionName)
  return <Game key={game} named={named} onAgain={() => setGame((g) => g + 1)} />
}

function Game({ named, onAgain }: { named: SearchItem[]; onAgain: () => void }) {
  const [caseNo, setCaseNo] = useState(1)
  const [total, setTotal] = useState({ solved: 0, stars: 0 })
  const [done, setDone] = useState(false)
  const current = useAsync((signal) => loadCase(named, signal), `detective-${caseNo}`)

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <div className="toon relative mx-auto grid h-40 w-56 place-items-center rounded-[2rem] bg-[#6ee7ff] p-3">
          <DetectiveArt />
          <Burst fire={1} count={26} />
        </div>
        <h1 className="font-display text-5xl">All {CASES} cases closed!</h1>
        <Guide mood="wow" say={`Amazing detective work! You won ${total.stars} stars. Every clue was a real fact from NASA’s experiments.`} />
        <button type="button" onClick={onAgain} className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffcf4a] px-7 font-display text-2xl text-[#1b1740]">
          <RotateCcw size={24} aria-hidden="true" /> New cases
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Experiment Detective</h1>
          <p className="mt-1 text-lg text-[#c9cdf5]">Read the clues. Which NASA experiment is it?</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="toon rounded-full bg-white px-4 py-1.5 font-display text-lg text-[#1b1740]">Case {caseNo} of {CASES}</span>
          <span className="toon inline-flex items-center gap-1 rounded-full bg-[#ffcf4a] px-4 py-1.5 font-display text-lg text-[#1b1740]">
            <Star size={18} className="fill-white" aria-hidden="true" /> {total.stars}
          </span>
        </div>
      </div>

      {current.status === 'error' && !current.data ? (
        <KidError onRetry={current.retry} />
      ) : current.status === 'loading' || !current.data ? (
        <KidLoading text="is opening a new case file…" />
      ) : (
        <CaseBoard
          key={caseNo}
          c={current.data}
          last={caseNo === CASES}
          onSolved={(stars) => setTotal((t) => ({ solved: t.solved + 1, stars: t.stars + stars }))}
          onNext={() => {
            sfx.pop()
            if (caseNo === CASES) {
              setDone(true)
              reward({ badges: ['detective'] })
            } else setCaseNo((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}

function CaseBoard({ c, last, onSolved, onNext }: { c: Case; last: boolean; onSolved: (stars: number) => void; onNext: () => void }) {
  const [shown, setShown] = useState(1)
  const [wrong, setWrong] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const starsNow = shown === 1 ? 3 : shown === 2 ? 2 : 1
  const canReveal = shown < c.clues.length && !solved

  const reveal = () => { if (canReveal) { sfx.pop(); setShown((s) => s + 1) } }

  const guess = (s: SearchItem) => {
    if (solved || wrong.includes(s.id)) return
    if (s.id === c.answer.id) {
      sfx.correct()
      setSolved(true)
      onSolved(starsNow)
      reward({ stars: starsNow, badges: shown === 1 ? ['sharp-eye'] : [] })
    } else {
      sfx.wrong()
      setWrong((w) => [...w, s.id])
      setShown((n) => Math.min(n + 1, c.clues.length))
    }
  }

  const say = useMemo(() => solved
    ? `Case closed! It was ${c.answer.acronym}. You used ${shown} clue${shown === 1 ? '' : 's'} and won ${starsNow} star${starsNow === 1 ? '' : 's'}!`
    : shown === 1 ? 'Here is your first clue. Guess now for 3 stars, or open another clue.' : 'Fewer clues means more stars. Need another clue?',
  [solved, shown, starsNow, c.answer.acronym])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      {/* Clues */}
      <section aria-labelledby="clues-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="clues-title" className="font-display text-3xl">Clues</h2>
          <span className="flex items-center gap-1 rounded-full bg-[#1b2260] px-3 py-1 font-bold" aria-label={`Worth ${starsNow} stars now`}>
            Worth {[0, 1, 2].map((i) => <Star key={i} size={18} className={i < starsNow ? 'fill-[#ffcf4a] text-[#0d0a26]' : 'text-white/30'} aria-hidden="true" />)}
          </span>
        </div>
        <ol className="space-y-3">
          {c.clues.map((clue, i) => (
            <li key={clue.key}>
              <AnimatePresence mode="wait" initial={false}>
                {i < shown ? (
                  <motion.div key="open" initial={{ rotateX: 90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="toon flex items-center gap-3 rounded-2xl bg-white p-4 text-[#1b1740]">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-[#0d0a26] text-white" style={{ background: clue.color }} aria-hidden="true">{clue.icon}</span>
                    <span className="text-lg font-semibold leading-snug"><span className="sr-only">Clue {i + 1}: </span>{clue.text}</span>
                  </motion.div>
                ) : (
                  <motion.div key="closed" exit={{ rotateX: -90, opacity: 0 }} className="flex min-h-[4.25rem] items-center gap-3 rounded-2xl border-[3px] border-dashed border-white/25 p-4 text-white/50">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 font-display text-2xl" aria-hidden="true">?</span>
                    <span className="font-bold">Secret clue {i + 1}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ol>
        {canReveal && (
          <button type="button" onClick={reveal} className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#6ee7ff] px-6 font-display text-xl text-[#1b1740]">
            <Search size={22} aria-hidden="true" /> Open another clue
          </button>
        )}
      </section>

      {/* Suspects */}
      <section aria-labelledby="suspects-title" className="space-y-4">
        <h2 id="suspects-title" className="font-display text-3xl">Which experiment?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.suspects.map((s) => {
            const out = wrong.includes(s.id)
            const isAnswer = solved && s.id === c.answer.id
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => guess(s)}
                disabled={out || solved}
                animate={out ? { x: [0, -8, 8, -5, 5, 0] } : isAnswer ? { scale: [1, 1.08, 1] } : {}}
                className={cn(
                  'toon-btn relative flex min-h-24 flex-col items-start justify-center rounded-2xl p-4 text-left',
                  isAnswer ? 'bg-[#2fbf7f] text-white' : out ? 'bg-[#1b2260] text-white/40 line-through' : solved ? 'bg-white/70 text-[#1b1740]/60' : 'bg-white text-[#1b1740]',
                )}
              >
                {isAnswer && <Burst fire={1} count={22} />}
                <span className="font-display text-2xl">{s.acronym}</span>
                <span className="mt-1 text-sm leading-snug opacity-80">{s.name}</span>
                {out && <span className="absolute right-3 top-2 text-2xl" aria-hidden="true">❌</span>}
              </motion.button>
            )
          })}
        </div>
        <Guide size={64} mood={solved ? 'wow' : 'think'} say={say} />
        {solved && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link to={`/kids/experiments/${encodeURIComponent(c.answer.id)}`} className="inline-flex min-h-12 items-center gap-2 px-2 font-bold text-[#b9c0ff] underline underline-offset-4">
              <BookOpen size={18} aria-hidden="true" /> Read {c.answer.acronym}’s story
            </Link>
            <button type="button" autoFocus onClick={onNext} className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffcf4a] px-6 font-display text-xl text-[#1b1740]">
              {last ? 'Finish' : 'Next case'} <ArrowRight size={22} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
