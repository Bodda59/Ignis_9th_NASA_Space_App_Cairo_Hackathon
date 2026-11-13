import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Check, Flame, RotateCcw, Star, Telescope, Trophy, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { Burst } from '@/features/kids/Burst'
import { hasMissionName, loadStudies } from '@/features/kids/kidsData'
import { KidError, KidLoading } from '@/features/kids/KidState'
import { Guide } from '@/features/kids/Mascot'
import { reward, useKidsProgress } from '@/features/kids/progress'
import { buildQuiz, factsFromDetail, factsFromSearch, type Question, type StudyFacts } from '@/features/kids/quizBuilder'
import { sfx } from '@/features/kids/sfx'

const ROUND = 6
/** Most recent discovered stories used per quiz (each is one detail request). */
const MAX_STORIES = 6

export function KidsQuiz() {
  const { discovered } = useKidsProgress()
  const recent = discovered.slice(-MAX_STORIES)
  const data = useAsync(async (signal) => {
    const studies = await loadStudies(signal)
    const named = studies.items.filter(hasMissionName)
    const details = await Promise.all(recent.map((id) => api.investigation(id, signal).catch(() => null)))
    const stories = details.filter((d) => d !== null).map(factsFromDetail)
    const storyIds = new Set(stories.map((s) => s.id))
    return { stories, cards: named.filter((s) => !storyIds.has(s.id)).map(factsFromSearch) }
  }, `kids-quiz-${recent.join(',')}`)
  const [round, setRound] = useState(0)

  if (data.status === 'error' && !data.data) return <KidError onRetry={data.retry} />
  if (!data.data || data.status === 'loading') return <KidLoading text="Orbi is writing your quiz…" />
  return <Round key={round} stories={data.data.stories} cards={data.data.cards} onAgain={() => setRound((r) => r + 1)} />
}

function Round({ stories, cards, onAgain }: { stories: StudyFacts[]; cards: StudyFacts[]; onAgain: () => void }) {
  const questions = useMemo(() => buildQuiz(stories, cards, ROUND), [stories, cards])
  const [n, setN] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bursts, setBursts] = useState(0)
  const [started, setStarted] = useState(false)

  const q: Question | undefined = questions[n]
  const right = picked !== null && picked === q?.answer
  const fromStories = questions.filter((x) => x.from === 'story').length

  const choose = (i: number) => {
    if (picked !== null || !q) return
    setPicked(i)
    if (i === q.answer) {
      const nextStreak = streak + 1
      setScore((s) => s + 1)
      setStreak(nextStreak)
      setBursts((b) => b + 1)
      sfx.correct()
      // Every 3 in a row gives a bonus star.
      reward({ stars: 1 + (nextStreak % 3 === 0 ? 1 : 0), badges: nextStreak >= 3 ? ['combo'] : [] })
    } else {
      setStreak(0)
      sfx.wrong()
    }
  }

  const next = () => {
    sfx.pop()
    if (n + 1 < questions.length) {
      setN(n + 1)
      setPicked(null)
      return
    }
    setFinished(true)
    const badges: ('quiz-star' | 'quiz-perfect')[] = []
    if (score >= 4) badges.push('quiz-star')
    if (score === questions.length) badges.push('quiz-perfect')
    if (badges.length) reward({ badges })
  }

  // Intro: say where the questions come from.
  if (!started) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-5xl">Space fire quiz</h1>
        <Guide
          say={stories.length
            ? `This quiz is about the experiments you discovered! ${fromStories} of the ${questions.length} questions come from your experiment stories. The rest are about the facts on the Explore cards.`
            : 'You haven’t finished any experiment stories yet, so this quiz uses the facts on the Explore cards: each experiment’s job and fuel. Finish some stories for trickier questions!'}
        />
        <div className="toon rounded-[2rem] bg-white p-5 text-[#1b1740]">
          <p className="font-display text-xl">Questions come from:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...new Map(questions.map((x) => [x.studyId, x])).values()].map((x) => (
              <li key={x.studyId} className={cn('rounded-full border-2 border-[#0d0a26] px-3 py-1 font-bold', x.from === 'story' ? 'bg-[#7ee2a8]' : 'bg-[#ece8ff]')}>
                {x.acronym}{x.from === 'story' && <BookOpen size={16} className="ml-1 inline" aria-label="from a story" />}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1 text-sm text-[#5b5785]"><BookOpen size={14} aria-hidden="true" /> = from a story you finished</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" autoFocus onClick={() => { sfx.pop(); setStarted(true) }} className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffcf4a] px-7 font-display text-2xl text-[#1b1740]">
            Start quiz <ArrowRight size={24} aria-hidden="true" />
          </button>
          <Link to="/kids/explore" className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-white px-6 font-display text-xl text-[#1b1740]">
            <Telescope size={22} aria-hidden="true" /> Discover more first
          </Link>
        </div>
      </div>
    )
  }

  if (finished || !q) {
    const perfect = score === questions.length
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }} className="toon relative mx-auto grid h-32 w-32 place-items-center rounded-full bg-[#ffcf4a] text-[#1b1740]">
          <Trophy size={64} aria-hidden="true" />
          <Burst fire={score ? 1 : 0} count={26} />
        </motion.div>
        <h1 className="font-display text-5xl">{score} out of {questions.length}!</h1>
        <Guide
          mood="wow"
          say={perfect ? 'Wow, a perfect mission! You really know these experiments.' : score >= questions.length / 2 ? 'Great work, space cadet! Every try makes your brain stronger.' : 'Good try! Re-read a story and come back. Scientists try again and again too!'}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onAgain} className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffcf4a] px-6 font-display text-xl text-[#1b1740]">
            <RotateCcw size={22} aria-hidden="true" /> New quiz
          </button>
          <Link to="/kids/explore" className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-white px-6 font-display text-xl text-[#1b1740]">
            <Telescope size={22} aria-hidden="true" /> Discover more
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Space fire quiz</h1>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <motion.span key={streak} initial={{ scale: 1.7, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} className="toon inline-flex items-center gap-1 rounded-full bg-[#ff8a3d] px-3 py-1.5 font-display text-lg text-[#1b1740]" aria-label={`${streak} in a row`}>
              <Flame size={18} className="fill-[#ffcf4a]" aria-hidden="true" /> {streak} in a row
            </motion.span>
          )}
          <span className="toon inline-flex items-center gap-2 rounded-full bg-[#ffcf4a] px-4 py-1.5 font-display text-lg text-[#1b1740]">
            <Star size={18} className="fill-white text-[#1b1740]" aria-hidden="true" /> {score}
          </span>
        </div>
      </div>

      <div className="flex gap-2" aria-label={`Question ${n + 1} of ${questions.length}`}>
        {questions.map((_, k) => (
          <span key={k} className={cn('h-4 flex-1 rounded-full border-2 border-[#0d0a26]', k < n ? 'bg-[#7ee2a8]' : k === n ? 'bg-[#ffcf4a]' : 'bg-white/15')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={n} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
          <div className="toon relative rounded-[2rem] bg-white p-6 text-[#1b1740]">
            <Burst fire={bursts} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold uppercase tracking-wide text-[#7a5cf0]">Question {n + 1} of {questions.length}</p>
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#0d0a26] bg-[#ece8ff] px-3 py-0.5 text-sm font-bold">
                <BookOpen size={14} aria-hidden="true" />
                {q.from === 'story' ? `${q.acronym} story · ${q.step}` : `${q.acronym} · Explore card`}
              </span>
            </div>
            <h2 className="mt-2 font-display text-3xl leading-snug">{q.prompt}</h2>
          </div>

          <div className="grid gap-3">
            {q.options.map((o, i) => {
              const isAnswer = picked !== null && i === q.answer
              const isWrongPick = picked === i && i !== q.answer
              return (
                <motion.button
                  key={o}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={picked !== null}
                  animate={isWrongPick ? { x: [0, -8, 8, -6, 6, 0] } : isAnswer ? { scale: [1, 1.04, 1] } : {}}
                  className={cn(
                    'toon-btn flex min-h-16 items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left font-display text-xl',
                    isAnswer ? 'bg-[#2fbf7f] text-white' : isWrongPick ? 'bg-[#ff6b8b] text-white' : picked !== null ? 'bg-[#1b2260] text-white/50' : 'bg-white text-[#1b1740]',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#0d0a26] bg-[#ece8ff] text-base text-[#1b1740]">{'ABC'[i]}</span>
                    {o}
                  </span>
                  {isAnswer && <Check size={26} aria-hidden="true" />}
                  {isWrongPick && <X size={26} aria-hidden="true" />}
                </motion.button>
              )
            })}
          </div>

          {picked !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Guide mood={right ? 'wow' : 'think'} size={64} say={`${right ? 'Yes! You got it!' : 'Nice try!'} ${q.explain}`} />
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link to={`/kids/experiments/${encodeURIComponent(q.studyId)}`} className="min-h-12 rounded-2xl px-4 py-3 font-bold text-[#b9c0ff] underline underline-offset-4">
                  {q.from === 'story' ? `Read ${q.acronym}’s story again` : `Meet ${q.acronym}`}
                </Link>
                <button type="button" onClick={next} autoFocus className="toon-btn inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffcf4a] px-6 font-display text-xl text-[#1b1740]">
                  {n + 1 < questions.length ? 'Next question' : 'See my score'} <ArrowRight size={22} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
