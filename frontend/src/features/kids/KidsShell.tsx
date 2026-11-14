import '@fontsource-variable/fredoka'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Earth, Gamepad2, House, Puzzle, Rocket, Star, Telescope, UserRound, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useForceDarkTheme } from '@/lib/theme'
import { Medal3D } from './Art'
import { BADGE_ART, RANK_ART } from './badgeArt'
import { Burst } from './Burst'
import { GuideAvatar } from './Mascot'
import { BADGE_EVENT, BADGES, LEVEL_EVENT, RANKS, rankOf, useKidsProgress, type BadgeId } from './progress'
import { setSound, sfx, useSoundOn } from './sfx'

const TABS = [
  { to: '/kids', label: 'Home', icon: House, color: '#ffcf4a' },
  { to: '/kids/explore', label: 'Explore', icon: Telescope, color: '#6ee7ff' },
  { to: '/kids/game', label: 'Game', icon: Gamepad2, color: '#ff8a3d' },
  { to: '/kids/quiz', label: 'Quiz', icon: Puzzle, color: '#ff8fb1' },
  { to: '/kids/earth', label: 'Earth', icon: Earth, color: '#7ee2a8' },
]

export function KidsShell() {
  const { pathname } = useLocation()
  const { stars } = useKidsProgress()
  const rank = rankOf(stars)
  const soundOn = useSoundOn()
  const [popped, setPopped] = useState<BadgeId[]>([])
  const [levelUp, setLevelUp] = useState<number | null>(null)

  useForceDarkTheme()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  useEffect(() => {
    const onBadge = (e: Event) => { sfx.star(); setPopped((p) => [...p, ...(e as CustomEvent<BadgeId[]>).detail]) }
    const onLevel = (e: Event) => { sfx.levelUp(); setLevelUp((e as CustomEvent<number>).detail) }
    window.addEventListener(BADGE_EVENT, onBadge)
    window.addEventListener(LEVEL_EVENT, onLevel)
    return () => { window.removeEventListener(BADGE_EVENT, onBadge); window.removeEventListener(LEVEL_EVENT, onLevel) }
  }, [])

  useEffect(() => {
    if (!popped.length) return
    const t = setTimeout(() => setPopped((p) => p.slice(1)), 3600)
    return () => clearTimeout(t)
  }, [popped])

  return (
    <MotionConfig reducedMotion="user">
      <div className="kids relative min-h-screen overflow-x-clip bg-[#0b0d2b] pb-28 text-white sm:pb-12" style={{ fontSize: 18 }}>
        <SpaceBackdrop />
        <a href="#kids-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-[#1b1740]">
          Skip to content
        </a>

        <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
          <Link to="/kids" className="wiggle-hover flex shrink-0 items-center gap-3 rounded-full" aria-label="Kids Lab home">
            <span className="toon grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#ffcf4a] to-[#ff8a3d] text-[#1b1740]">
              <Rocket size={26} aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap font-display text-2xl leading-none">Kids Lab</span>
          </Link>

          {/* Rank + stars */}
          <div className="toon mx-auto hidden min-w-0 max-w-xs flex-1 items-center gap-3 rounded-full bg-[#1b2260] py-1.5 pl-2 pr-4 md:flex" title={rank.next ? `${rank.toNext} more stars to ${rank.next.title}` : 'Top rank!'}>
            <Medal3D icon={RANK_ART[rank.level - 1].icon} color={RANK_ART[rank.level - 1].color} size={40} className="-my-1" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">Lv {rank.level} · {rank.title}</p>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Progress to next rank" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rank.progress * 100)}>
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[#ffcf4a] to-[#ff8a3d]" animate={{ width: `${rank.progress * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="toon flex min-h-11 items-center gap-1.5 rounded-full bg-[#ffcf4a] px-3 font-display text-lg text-[#1b1740]" aria-label={`${stars} stars, level ${rank.level}`}>
              <Star size={20} className="fill-white text-[#1b1740]" aria-hidden="true" />
              <motion.span key={stars} initial={{ scale: 1.8, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>{stars}</motion.span>
              <span className="ml-1 rounded-full bg-[#1b1740] px-2 text-xs text-white md:hidden">Lv {rank.level}</span>
            </div>
            <button
              type="button"
              onClick={() => { setSound(!soundOn); if (!soundOn) setTimeout(sfx.pop, 30) }}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
              className="toon-btn grid h-11 w-11 place-items-center rounded-full bg-white text-[#1b1740]"
            >
              {soundOn ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
            </button>
            <Link to="/" className="toon-btn flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 text-sm font-bold text-[#1b1740] sm:px-4">
              <UserRound size={18} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Grown-ups</span>
            </Link>
          </div>
        </header>

        {/* Desktop tabs */}
        <nav aria-label="Kids Lab" className="relative z-20 mx-auto mt-5 hidden max-w-6xl gap-3 px-6 sm:flex">
          {TABS.map((t) => <Tab key={t.to} {...t} />)}
        </nav>

        <main id="kids-main" className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Outlet />
        </main>

        {/* Phone tabs: always within thumb reach */}
        <nav aria-label="Kids Lab" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1.5 border-t-[3px] border-[#0d0a26] bg-[#141a4a] px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 sm:hidden">
          {TABS.map((t) => <Tab key={t.to} {...t} compact />)}
        </nav>

        <AnimatePresence>
          {popped[0] && (
            <motion.div
              key={popped[0]}
              role="status"
              initial={{ opacity: 0, y: 60, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="toon fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-sm items-center gap-4 rounded-3xl bg-white p-4 text-[#1b1740] sm:bottom-8"
            >
              <span className="relative grid h-16 w-16 shrink-0 place-items-center">
                <Medal3D icon={BADGE_ART[popped[0]].icon} color={BADGE_ART[popped[0]].color} size={64} />
                <Burst fire={1} count={12} />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#7a5cf0]">New badge!</p>
                <p className="font-display text-xl">{BADGES[popped[0]].title}</p>
                <p className="text-sm text-[#4b4870]">{BADGES[popped[0]].how}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {levelUp !== null && (
            <motion.div
              className="fixed inset-0 z-[70] grid place-items-center bg-[#0b0d2b]/80 p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLevelUp(null)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="levelup-title"
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="toon relative w-full max-w-sm rounded-[2rem] bg-white p-7 text-center text-[#1b1740]"
                onClick={(e) => e.stopPropagation()}
              >
                <Burst fire={1} count={28} />
                <div className="mx-auto flex w-fit items-end gap-2"><GuideAvatar size={110} mood="wow" /><Medal3D icon={RANK_ART[levelUp].icon} color={RANK_ART[levelUp].color} size={72} /></div>
                <p className="mt-2 text-sm font-bold uppercase tracking-widest text-[#7a5cf0]">Level up!</p>
                <h2 id="levelup-title" className="font-display text-3xl">{RANKS[levelUp].title}</h2>
                <p className="mt-2 text-[#4b4870]">You are now level {levelUp + 1}. Keep collecting stars!</p>
                <button type="button" autoFocus onClick={() => setLevelUp(null)} className="toon-btn mt-5 min-h-14 w-full rounded-2xl bg-[#ffcf4a] font-display text-xl">
                  Awesome!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

function Tab({ to, label, icon: Icon, color, compact }: (typeof TABS)[number] & { compact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === '/kids'}
      onClick={() => sfx.pop()}
      className={({ isActive }) =>
        cn(
          'wiggle-hover flex items-center justify-center rounded-2xl font-display',
          compact ? 'min-h-14 flex-col gap-0.5 text-[13px]' : 'toon-btn min-h-14 flex-1 gap-3 text-xl',
          isActive ? 'bg-white text-[#1b1740]' : compact ? 'text-white' : 'bg-[#1b2260] text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={compact ? 24 : 26} strokeWidth={2.5} style={{ color: isActive ? '#1b1740' : color }} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  )
}

/** Deep-space backdrop: soft nebula glow, twinkling stars and two cartoon planets. */
function SpaceBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#2b1f6e_0%,transparent_55%),radial-gradient(ellipse_at_90%_30%,#0f3a6b_0%,transparent_50%),radial-gradient(ellipse_at_50%_110%,#3a1757_0%,transparent_55%)]" />
      <div className="kids-stars absolute inset-0" />
      <div className="kids-stars kids-stars--twinkle absolute inset-0" />
      <motion.div
        className="absolute -right-20 top-[30rem] h-44 w-44 rounded-full border-[4px] border-[#0d0a26] bg-[radial-gradient(circle_at_30%_30%,#ffb36b,#e0603a_55%,#a83a5c)] sm:h-60 sm:w-60"
        animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <span className="absolute left-8 top-10 h-6 w-6 rounded-full bg-[#ffd9a8]/60" />
        <span className="absolute bottom-12 left-16 h-9 w-9 rounded-full bg-[#a83a5c]/50" />
      </motion.div>
      <div className="absolute -right-24 top-[34.5rem] h-5 w-[20rem] -rotate-12 rounded-[50%] border-[3px] border-[#ffd9a8]/50 sm:h-6 sm:w-[24rem]" />
      <motion.div
        className="absolute -left-10 bottom-10 h-28 w-28 rounded-full border-[4px] border-[#0d0a26] bg-[radial-gradient(circle_at_35%_30%,#9ef0ff,#3a8bd6_60%,#1b2f78)]"
        animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
