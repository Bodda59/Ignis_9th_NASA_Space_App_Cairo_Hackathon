import { motion } from 'framer-motion'
import { ArrowRight, Flame, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DetectiveArt, PatrolArt } from '@/features/kids/Art'
import { Guide } from '@/features/kids/Mascot'
import { useKidsProgress } from '@/features/kids/progress'
import { sfx } from '@/features/kids/sfx'

const GAMES = [
  {
    to: '/kids/game/detective',
    title: 'Experiment Detective',
    text: 'Read clues from real NASA experiments and guess which one it is. Fewer clues, more stars!',
    tag: 'Learning game',
    icon: Search,
    color: '#6ee7ff',
    art: <DetectiveArt />,
  },
  {
    to: '/kids/game/patrol',
    title: 'Fire Patrol',
    text: 'Tap the game’s round flames before they grow too big!',
    tag: 'Action game',
    icon: Flame,
    color: '#ff8a3d',
    art: <PatrolArt />,
  },
]

export function KidsGames() {
  const { best } = useKidsProgress()
  return (
    <div className="space-y-8">
      <div className="grid items-end gap-6 lg:grid-cols-2">
        <h1 className="font-display text-5xl">Game zone</h1>
        <Guide size={70} say="Pick a game! Experiment Detective tests what you learned about the real experiments. Fire Patrol is for quick fingers." />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {GAMES.map((g, i) => (
          <motion.div key={g.to} initial={{ opacity: 0, y: 24, rotate: i ? 1.5 : -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 16 }}>
            <Link to={g.to} onClick={() => sfx.pop()} className="toon toon-lift group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white text-[#1b1740]">
              <div className="relative grid h-44 place-items-center border-b-[3px] border-[#0d0a26]" style={{ background: g.color }}>
                <motion.span className="block h-36 pt-2" aria-hidden="true" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>{g.art}</motion.span>
                <span className="absolute left-4 top-4 rounded-full border-2 border-[#0d0a26] bg-white px-3 py-0.5 text-sm font-bold">{g.tag}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-display text-3xl">{g.title}</h2>
                <p className="mt-2 flex-1 text-lg leading-snug text-[#3e3a66]">{g.text}</p>
                {g.to.endsWith('patrol') && best > 0 && <p className="mt-2 font-bold text-[#e8833a]">Your best: {best}</p>}
                <span className="mt-4 inline-flex items-center gap-2 font-display text-xl text-[#7a5cf0]">
                  Play <ArrowRight size={22} className="transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
