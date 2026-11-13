import { motion } from 'framer-motion'
import { ArrowRight, Earth, Gamepad2, Lock, Puzzle, Telescope, TriangleExclamationPoint } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SAFETY_TOPICS } from '@/api/types'
import { JOB_ICONS } from '@/features/kids/icons'
import { useAsync } from '@/hooks/useAsync'
import { FlameToy } from '@/features/kids/FlameToy'
import { Guide } from '@/features/kids/Mascot'
import { JOBS } from '@/features/kids/kidsCopy'
import { hasMissionName, loadStudies } from '@/features/kids/kidsData'
import { BADGES, useKidsProgress, type BadgeId } from '@/features/kids/progress'
import { Medal3D } from '@/features/kids/Art'
import { BADGE_ART } from '@/features/kids/badgeArt'


export function KidsHome() {
  const studies = useAsync(loadStudies, 'kids-studies')
  const named = studies.data?.items.filter(hasMissionName) ?? []
  const { badges, discovered } = useKidsProgress()

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl"
          >
            Why do flames act <span className="text-[#ffcf4a]">weird</span> in space?
          </motion.h1>
          <Guide
            className="mt-6"
            say="Hi, space cadet! I'm Orbi. NASA lit real, tiny fires in space to learn how to keep astronauts safe. Move the slider to see a space flame!"
          />
        </div>
        <FlameToy />
      </section>

      <aside className="toon flex items-start gap-4 rounded-3xl bg-[#ffcf4a] p-5 text-[#2a1650]">
        <TriangleExclamationPoint size={30} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[17px] font-semibold leading-snug">
          Fire is not a toy! NASA scientists only light flames inside special sealed boxes, with lots of safety rules. Never try this at home.
        </p>
      </aside>

      <section aria-labelledby="jobs-title">
        <h2 id="jobs-title" className="font-display text-3xl font-bold">3 fire-safety jobs</h2>
        <p className="mt-2 text-[#c9cdf5]">Most experiments help with one or more of these jobs. Tap a job to meet its experiments.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {SAFETY_TOPICS.map((t, i) => {
            const Icon = JOB_ICONS[t]
            const count = named.filter((s) => s.safety_topics.includes(t)).length
            return (
              <motion.div key={t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Link
                  to={`/kids/explore?job=${t}`}
                  className="toon toon-lift group flex h-full flex-col rounded-[2rem] p-6 text-[#1b1740]"
                  style={{ background: JOBS[t].soft }}
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border-[3px] border-[#0d0a26] text-white" style={{ background: JOBS[t].color }}>
                    <Icon size={30} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold">{JOBS[t].title}</h3>
                  <p className="mt-2 flex-1 leading-snug text-[#3e3a66]">{JOBS[t].explain}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-bold" style={{ color: JOBS[t].color }}>
                    {studies.status === 'loading' && !studies.data ? 'Counting…' : `${count} experiment${count === 1 ? '' : 's'}`}
                    <ArrowRight size={18} className="transition group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="missions-title">
        <h2 id="missions-title" className="font-display text-3xl font-bold">Pick a mission</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Mission to="/kids/explore" icon={Telescope} color="#6ee7ff" title="Explore experiments"
            text={named.length ? `Meet ${named.length} real NASA fire experiments.` : 'Meet real NASA fire experiments.'} />
          <Mission to="/kids/game" icon={Gamepad2} color="#ff8a3d" title="Game zone" text="Be an Experiment Detective, or join the Fire Patrol!" />
          <Mission to="/kids/quiz" icon={Puzzle} color="#ff8fb1" title="Take the quiz" text="Answer questions about real experiments and win stars." />
          <Mission to="/kids/earth" icon={Earth} color="#7ee2a8" title="Space helps Earth" text="See how space fire science helps people at home." />
        </div>
      </section>

      <section aria-labelledby="badges-title" className="toon rounded-[2rem] bg-[#1b2260] p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="badges-title" className="font-display text-2xl font-bold">My badges</h2>
          <p className="text-[#c9cdf5]">{discovered.length} experiment{discovered.length === 1 ? '' : 's'} discovered</p>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(BADGES) as BadgeId[]).map((b) => {
            const has = badges.includes(b)
            return (
              <li key={b} className={`flex flex-col items-center rounded-3xl p-4 text-center ${has ? 'bg-white text-[#1b1740]' : 'bg-white/5 text-[#aab0e0] border-2 border-dashed border-white/20'}`}>
                <Medal3D icon={has ? BADGE_ART[b].icon : Lock} color={BADGE_ART[b].color} size={60} locked={!has} />
                <span className="mt-1 font-display text-sm font-bold">{BADGES[b].title}</span>
                <span className="mt-1 text-xs leading-snug">{has ? 'Earned!' : BADGES[b].how}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Mission({ to, icon: Icon, color, title, text }: { to: string; icon: typeof Telescope; color: string; title: string; text: string }) {
  return (
    <Link to={to} className="toon toon-lift group flex items-center gap-4 rounded-[2rem] bg-[#1b2260] p-5">
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-[3px] border-[#0d0a26]" style={{ background: color }}>
        <Icon size={32} className="text-[#0b0d2b]" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block font-display text-lg font-bold">{title}</span>
        <span className="mt-1 block leading-snug text-[#c9cdf5]">{text}</span>
      </span>
      <ArrowRight size={24} className="shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  )
}
