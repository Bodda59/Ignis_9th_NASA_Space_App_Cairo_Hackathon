import { AnimatePresence, motion } from 'framer-motion'
import { Hand, Heart, Play, RotateCcw, Star, Timer, Trophy, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Burst } from '@/features/kids/Burst'
import { Guide, GuideAvatar } from '@/features/kids/Mascot'
import { reward, useKidsProgress, type BadgeId } from '@/features/kids/progress'
import { sfx } from '@/features/kids/sfx'

const ROUND_MS = 45_000
const SHIELDS = 3

type Flame = { id: number; x: number; y: number; born: number; life: number }
type Puff = { id: number; x: number; y: number; points: number }
type Phase = 'ready' | 'play' | 'over'

/** Fire Patrol: tap the round space flames before they grow too big. */
export function KidsGame() {
  const { best } = useKidsProgress()
  const [phase, setPhase] = useState<Phase>('ready')
  const [flames, setFlames] = useState<Flame[]>([])
  const [puffs, setPuffs] = useState<Puff[]>([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [shields, setShields] = useState(SHIELDS)
  const [now, setNow] = useState(0)
  const [startAt, setStartAt] = useState(0)
  const [result, setResult] = useState<{ stars: number; best: boolean } | null>(null)
  // The loop works on refs; state mirrors them once per frame for rendering.
  const game = useRef({ start: 0, nextSpawn: 0, ids: 0, flames: [] as Flame[], score: 0, combo: 0, shields: SHIELDS, over: true })

  const begin = () => {
    sfx.pop()
    const t = performance.now()
    game.current = { start: t, nextSpawn: t + 600, ids: game.current.ids, flames: [], score: 0, combo: 0, shields: SHIELDS, over: false }
    setFlames([]); setPuffs([]); setScore(0); setCombo(0); setShields(SHIELDS); setResult(null); setNow(t); setStartAt(t)
    setPhase('play')
  }

  const finish = useCallback(() => {
    const g = game.current
    if (g.over) return
    g.over = true
    const final = g.score
    const stars = Math.min(5, Math.floor(final / 5))
    const badges: BadgeId[] = []
    if (final >= 10) badges.push('fire-patrol')
    if (final >= 25) badges.push('fire-chief')
    setResult({ stars, best: final > best && final > 0 })
    reward({ stars, badges, best: final })
    setPhase('over')
  }, [best])

  // Game loop
  useEffect(() => {
    if (phase !== 'play') return
    let raf = 0
    const tick = (t: number) => {
      const g = game.current
      if (g.over) return
      const elapsed = t - g.start
      if (elapsed >= ROUND_MS) { setNow(t); finish(); return }
      // Spawn faster as time goes on.
      if (t >= g.nextSpawn) {
        const speed = elapsed / ROUND_MS
        g.flames = [...g.flames, { id: ++g.ids, x: 8 + Math.random() * 84, y: 14 + Math.random() * 70, born: t, life: 4200 - speed * 1900 }]
        g.nextSpawn = t + 1150 - speed * 650
      }
      // Flames that grew too big set off the alarm and cost a heart.
      const burnt = g.flames.filter((fl) => t - fl.born >= fl.life).length
      if (burnt) {
        sfx.alarm()
        g.flames = g.flames.filter((fl) => t - fl.born < fl.life)
        g.combo = 0
        g.shields = Math.max(0, g.shields - burnt)
        setCombo(0)
        setShields(g.shields)
        if (g.shields === 0) { setFlames(g.flames); finish(); return }
      }
      setFlames(g.flames)
      setNow(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, finish])

  const douse = (fl: Flame) => {
    const g = game.current
    if (g.over || !g.flames.some((x) => x.id === fl.id)) return
    sfx.spray()
    const grown = (performance.now() - fl.born) / fl.life
    const points = 1 + (grown < 0.35 ? 1 : 0) + (g.combo >= 4 ? 1 : 0)
    g.score += points
    g.combo += 1
    g.flames = g.flames.filter((x) => x.id !== fl.id)
    if (g.combo % 5 === 0) sfx.star()
    setScore(g.score); setCombo(g.combo); setFlames(g.flames)
    const pid = ++g.ids
    setPuffs((p) => [...p, { id: pid, x: fl.x, y: fl.y, points }])
    setTimeout(() => setPuffs((p) => p.filter((x) => x.id !== pid)), 700)
  }

  useEffect(() => () => { game.current.over = true }, [])

  const timeLeft = phase === 'play' ? Math.max(0, Math.ceil((ROUND_MS - (now - startAt)) / 1000)) : 45

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-6 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl">Fire Patrol</h1>
          <p className="mt-2 text-lg text-[#c9cdf5]">Keep the space station safe!</p>
        </div>
        <Guide
          size={70}
          say={phase === 'over'
            ? 'Great patrol! Real astronauts train for fires too. Experiments like FLEX tested how to put flames out in space.'
            : 'In this game, tap the round flames before they grow too big. Small flames give bonus points!'}
        />
      </div>

      {/* HUD */}
      <div className="flex flex-wrap items-center gap-3">
        <Hud icon={<Trophy size={20} aria-hidden="true" />} color="#ffcf4a" label="Score">{score}</Hud>
        <Hud icon={<Timer size={20} aria-hidden="true" />} color="#6ee7ff" label="Time">{timeLeft}s</Hud>
        <div className="toon flex min-h-12 items-center gap-1 rounded-2xl bg-white px-3" aria-label={`${shields} shields left`}>
          {Array.from({ length: SHIELDS }, (_, i) => (
            <motion.span key={i} animate={i >= shields ? { scale: [1, 1.4, 0.8], opacity: 0.25 } : { scale: 1, opacity: 1 }}>
              <Heart size={24} className="fill-[#ff6b8b] text-[#0d0a26]" aria-hidden="true" />
            </motion.span>
          ))}
        </div>
        <AnimatePresence>
          {combo >= 3 && phase === 'play' && (
            <motion.span key={combo} initial={{ scale: 1.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ opacity: 0 }}
              className="toon inline-flex min-h-12 items-center gap-1 rounded-2xl bg-[#ff8a3d] px-4 font-display text-xl text-[#1b1740]">
              <Zap size={20} className="fill-[#ffcf4a]" aria-hidden="true" /> Combo ×{combo}
            </motion.span>
          )}
        </AnimatePresence>
        {best > 0 && <span className="ml-auto font-bold text-[#c9cdf5]">Best: {best}</span>}
      </div>

      {/* Arena: a station module with windows */}
      <div className="toon relative h-[min(64vh,520px)] select-none overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_40%,#22306e,#121845_70%)] touch-manipulation">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 flex justify-around px-6 pt-3">
          {[0, 1, 2, 3].map((i) => <span key={i} className="h-10 w-10 rounded-full border-[3px] border-[#0d0a26] bg-[radial-gradient(circle_at_35%_30%,#9ef0ff,#1b2f78)] sm:h-12 sm:w-12" />)}
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-8 border-t-[3px] border-[#0d0a26] bg-[repeating-linear-gradient(90deg,#2b3a85_0_40px,#22306e_40px_80px)]" />

        {flames.map((fl) => {
          const g = Math.min(1, (now - fl.born) / fl.life)
          const size = 34 + g * 86
          const hot = g > 0.7
          return (
            <motion.button
              key={fl.id}
              type="button"
              aria-label="Flame. Tap to put it out"
              onPointerDown={(e) => { e.preventDefault(); douse(fl) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); douse(fl) } }}
              initial={{ scale: 0 }}
              animate={{ scale: 1, y: [0, -6, 0] }}
              transition={{ y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-offset-4"
              style={{ left: `${fl.x}%`, top: `${fl.y}%`, width: size, height: size }}
            >
              <span className={cn('absolute inset-0 rounded-full border-[3px] border-[#0d0a26]', hot && 'animate-pulse')}
                style={{ background: `radial-gradient(circle at 50% 55%, #ffffff 0%, #bfe6ff 22%, ${hot ? '#7a7cff' : '#4aa8ff'} 55%, ${hot ? '#ff6b8b' : '#2f6bff'} 100%)`, boxShadow: `0 0 ${12 + g * 30}px ${hot ? '#ff6b8b' : '#4aa8ff'}` }} />
              <span aria-hidden="true" className="absolute left-[26%] top-[38%] h-[12%] w-[12%] rounded-full bg-[#0d0a26]" />
              <span aria-hidden="true" className="absolute right-[26%] top-[38%] h-[12%] w-[12%] rounded-full bg-[#0d0a26]" />
              <span aria-hidden="true" className="absolute left-1/2 top-[60%] h-[8%] w-[22%] -translate-x-1/2 rounded-b-full bg-[#0d0a26]" />
            </motion.button>
          )
        })}

        <AnimatePresence>
          {puffs.map((p) => (
            <motion.span key={p.id} aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}
              initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1.8, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              <span className="block h-20 w-20 rounded-full bg-[radial-gradient(circle,#ffffff,#d9f3ff_60%,transparent_70%)]" />
              <span className="absolute inset-0 grid place-items-center font-display text-2xl text-[#1b1740]">+{p.points}</span>
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Start / end cards */}
        <AnimatePresence>
          {phase !== 'play' && (
            <motion.div className="absolute inset-0 grid place-items-center bg-[#0b0d2b]/60 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div initial={{ scale: 0.6, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 15 }}
                className="toon relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center text-[#1b1740]">
                {phase === 'over' && result && <Burst fire={1} count={result.stars ? 24 : 0} />}
                <div className="mx-auto w-fit"><GuideAvatar size={90} mood={phase === 'over' ? 'wow' : 'happy'} /></div>
                {phase === 'ready' ? (
                  <>
                    <h2 className="mt-2 font-display text-3xl">Ready, patroller?</h2>
                    <ul className="mt-3 space-y-1 text-left text-[17px]">
                      <li className="flex items-center gap-2"><Hand size={20} className="shrink-0 text-[#2e8fe6]" aria-hidden="true" /> Tap a flame to spray it</li>
                      <li className="flex items-center gap-2"><Zap size={20} className="shrink-0 fill-[#ffcf4a] text-[#0d0a26]" aria-hidden="true" /> Small flames = bonus points</li>
                      <li className="flex items-center gap-2"><Heart size={20} className="shrink-0 fill-[#ff6b8b] text-[#0d0a26]" aria-hidden="true" /> A flame that grows too big costs a heart</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 font-display text-3xl">{score} point{score === 1 ? '' : 's'}!</h2>
                    {result?.best && <p className="font-bold text-[#e8833a]">New best score!</p>}
                    <p className="mt-2 flex items-center justify-center gap-1 text-lg font-bold">
                      {result?.stars ? <>+{result.stars} <Star size={20} className="fill-[#ffcf4a] text-[#0d0a26]" aria-hidden="true" /></> : 'Score 5 or more to win stars!'}
                    </p>
                  </>
                )}
                <button type="button" autoFocus onClick={begin} className="toon-btn mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffcf4a] font-display text-2xl">
                  {phase === 'ready' ? <><Play size={24} className="fill-[#1b1740]" aria-hidden="true" /> Start!</> : <><RotateCcw size={24} aria-hidden="true" /> Play again</>}
                </button>
                {phase === 'over' && (
                  <Link to="/kids/explore?job=suppression" className="mt-3 inline-block font-bold text-[#7a5cf0] underline underline-offset-4">
                    Meet the real “put flames out” experiments
                  </Link>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Hud({ icon, color, label, children }: { icon: ReactNode; color: string; label: string; children: ReactNode }) {
  return (
    <div className="toon flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-[#1b1740]">
      <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-[#0d0a26]" style={{ background: color }}>{icon}</span>
      <span className="text-sm font-bold text-[#5b5785]">{label}</span>
      <span className="font-display text-2xl tabular-nums">{children}</span>
    </div>
  )
}
