import { motion } from 'framer-motion'
import { Earth, Orbit } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { reward } from './progress'

/** Teardrop flame whose point shrinks as gravity goes to zero (g: 1 = Earth, 0 = space). */
function flamePath(g: number, cx = 100, cy = 150, r = 46) {
  const tip = 1.9 * r * g
  const top = cy - r - tip
  const k = 0.552 * r
  const c1x = cx + k * (1 - 0.75 * g)
  const c1y = top + tip * 0.55
  return [
    `M ${cx} ${top}`,
    `C ${c1x} ${c1y} ${cx + r} ${cy - k} ${cx + r} ${cy}`,
    `C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}`,
    `C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}`,
    `C ${cx - r} ${cy - k} ${2 * cx - c1x} ${c1y} ${cx} ${top}`,
    'Z',
  ].join(' ')
}

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`

const SAY = {
  earth: 'On Earth, hot gases rise and stretch a candle flame upward. Tiny soot particles make it glow yellow.',
  middle: 'With less buoyancy, rising hot gases stretch the candle flame less. It can become shorter and rounder.',
  space: 'In microgravity and still air, a candle flame can become round, dim and blue. Air from a fan can change its shape.',
}

export function FlameToy({ className }: { className?: string }) {
  const [g, setG] = useState(1)
  const visited = useRef({ earth: true, space: false })
  const id = useId()
  const outer = mix([255, 140, 50], [70, 150, 255], 1 - g)
  const inner = mix([255, 226, 110], [190, 232, 255], 1 - g)
  const say = g > 0.7 ? SAY.earth : g < 0.2 ? SAY.space : SAY.middle

  useEffect(() => {
    if (g >= 0.95) visited.current.earth = true
    if (g <= 0.05) visited.current.space = true
    if (visited.current.earth && visited.current.space) reward({ badges: ['flame-scientist'] })
  }, [g])

  return (
    <div className={cn('toon rounded-[2rem] bg-[#1b2260] p-5 sm:p-6', className)}>
      <div className="grid items-center gap-5 sm:grid-cols-[220px_1fr]">
        <div className="relative mx-auto h-[240px] w-[200px]">
          {/* candle wick */}
          <svg viewBox="0 0 200 240" className="absolute inset-0 h-full w-full" role="img" aria-label={g > 0.5 ? 'A tall, pointy yellow flame' : 'A round, blue flame'}>
            <defs>
              <radialGradient id={`${id}-glow`}>
                <stop offset="0%" stopColor={outer} stopOpacity="0.55" />
                <stop offset="100%" stopColor={outer} stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${id}-core`} cx="50%" cy="65%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor={inner} />
                <stop offset="100%" stopColor={outer} />
              </radialGradient>
            </defs>
            <circle cx="100" cy={140 - 40 * g} r="95" fill={`url(#${id}-glow)`} />
            <motion.path
              d={flamePath(g)}
              fill={`url(#${id}-core)`}
              animate={{ scaleX: [1, 1.03, 1], scaleY: [1, 0.98 + 0.06 * g, 1] }}
              style={{ originX: '100px', originY: '196px' }}
              transition={{ duration: 0.9 + (1 - g) * 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <rect x="96" y="186" width="8" height="26" rx="3" fill="#2a2a3a" />
            <rect x="70" y="208" width="60" height="26" rx="8" fill="#e9e4ff" />
          </svg>
          {/* rising-air arrows, only with gravity */}
          {g > 0.3 && [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute text-xl text-white/50"
              style={{ left: 22 + i * 70, bottom: 40 }}
              animate={{ y: [0, -150], opacity: [0, g, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
            >
              ↑
            </motion.span>
          ))}
        </div>

        <div>
          <h3 className="font-display text-2xl font-bold">A candle flame in microgravity</h3>
          <p className="mt-3 min-h-[5.5rem] text-[17px] leading-relaxed text-[#dfe3ff]" aria-live="polite">{say}</p>

          <label htmlFor={`${id}-g`} className="mt-4 block font-bold">Gravity</label>
          <div className="mt-2 flex items-center gap-3">
            <Orbit size={26} className="text-[#6ee7ff]" aria-hidden="true" />
            <input
              id={`${id}-g`}
              type="range"
              min={0}
              max={100}
              value={Math.round(g * 100)}
              onChange={(e) => setG(Number(e.target.value) / 100)}
              aria-valuetext={g > 0.7 ? 'Earth gravity' : g < 0.2 ? 'Low effective gravity, like on the space station' : 'A little gravity'}
              className="h-3 flex-1 cursor-pointer"
            />
            <Earth size={26} className="text-[#7ee2a8]" aria-hidden="true" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => setG(0)} className={cn('toon-btn min-h-12 rounded-2xl px-5 font-display text-lg', g < 0.2 ? 'bg-[#6ee7ff] text-[#0b0d2b]' : 'bg-white text-[#1b1740]')}>
              Space station
            </button>
            <button type="button" onClick={() => setG(1)} className={cn('toon-btn min-h-12 rounded-2xl px-5 font-display text-lg', g > 0.7 ? 'bg-[#ffcf4a] text-[#0b0d2b]' : 'bg-white text-[#1b1740]')}>
              Earth
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
