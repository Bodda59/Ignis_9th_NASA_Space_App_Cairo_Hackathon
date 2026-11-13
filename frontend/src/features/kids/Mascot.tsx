import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useSpeech } from './useSpeech'

const INK = '#0d0a26'
type Mood = 'happy' | 'wow' | 'think'
type AvatarProps = { size?: number; mood?: Mood; talking?: boolean; className?: string }

/** Mouth that flaps open and shut while the guide is talking. */
function TalkingMouth({ cx, cy, color, talking, idle }: { cx: number; cy: number; color: string; talking: boolean; idle: ReactNode }) {
  if (!talking) return <>{idle}</>
  return (
    <motion.ellipse cx={cx} cy={cy} rx={7} fill={color} stroke={INK} strokeWidth="2.5"
      animate={{ ry: [2, 6.5, 3, 7, 2.5] }} transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }} />
  )
}

/** Orbi — a round cartoon robot astronaut with bold outlines. */
export function Orbi({ size = 72, mood = 'happy', talking = false, className }: AvatarProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible', className)}
      animate={{ y: [0, -6, 0], rotate: [0, -2, 0, 2, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* waving arm */}
      <motion.g style={{ originX: '112px', originY: '92px' }} animate={{ rotate: mood === 'wow' ? [0, -35, 0, -35, 0] : [0, -18, 0] }} transition={{ duration: mood === 'wow' ? 1 : 2.4, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M110 92 q20 -6 22 -26" stroke={INK} strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d="M110 92 q20 -6 22 -26" stroke="#c9d3ff" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="132" cy="64" r="8" fill="#ffcf4a" stroke={INK} strokeWidth="4" />
      </motion.g>
      <line x1="70" y1="26" x2="70" y2="10" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <motion.circle cx="70" cy="9" r="7" fill="#ff6b8b" stroke={INK} strokeWidth="4" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
      <rect x="10" y="62" width="18" height="30" rx="9" fill="#8a6cff" stroke={INK} strokeWidth="4" />
      <rect x="112" y="62" width="18" height="30" rx="9" fill="#8a6cff" stroke={INK} strokeWidth="4" />
      <circle cx="70" cy="76" r="48" fill="#f4f6ff" stroke={INK} strokeWidth="5" />
      <path d="M36 52 a44 44 0 0 1 22 -18" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="34" y="52" width="72" height="48" rx="24" fill="#16163a" stroke={INK} strokeWidth="4" />
      <rect x="42" y="57" width="20" height="7" rx="3.5" fill="#ffffff" opacity="0.25" />
      <motion.g style={{ originY: '74px' }} animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}>
        {mood === 'wow' ? (
          <>
            <circle cx="56" cy="74" r="8" fill="#6ee7ff" />
            <circle cx="84" cy="74" r="8" fill="#6ee7ff" />
            <circle cx="59" cy="71" r="2.5" fill="#fff" />
            <circle cx="87" cy="71" r="2.5" fill="#fff" />
          </>
        ) : mood === 'think' ? (
          <>
            <rect x="48" y="72" width="16" height="5" rx="2.5" fill="#6ee7ff" />
            <circle cx="84" cy="74" r="7" fill="#6ee7ff" />
          </>
        ) : (
          <>
            <path d="M48 77 q8 -11 16 0" stroke="#6ee7ff" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <path d="M76 77 q8 -11 16 0" stroke="#6ee7ff" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          </>
        )}
      </motion.g>
      <TalkingMouth cx={70} cy={90} color="#6ee7ff" talking={talking}
        idle={mood === 'wow'
          ? <ellipse cx="70" cy="90" rx="6" ry="5" fill="#6ee7ff" />
          : <path d={mood === 'think' ? 'M62 90 h14' : 'M60 87 q10 9 20 0'} stroke="#6ee7ff" strokeWidth="4.5" fill="none" strokeLinecap="round" />} />
      <circle cx="40" cy="98" r="6" fill="#ff8fb1" opacity="0.85" />
      <circle cx="100" cy="98" r="6" fill="#ff8fb1" opacity="0.85" />
    </motion.svg>
  )
}

/** The Kids Lab guide (Orbi). */
export function GuideAvatar(props: AvatarProps) {
  return <Orbi {...props} />
}

/** The guide with a cartoon speech bubble. `say` is also what the read-aloud button reads. */
export function Guide({ say, children, mood, size = 76, className }: { say: string; children?: ReactNode; mood?: Mood; size?: number; className?: string }) {
  const { supported, speaking, speak } = useSpeech()
  const name = 'Orbi'
  return (
    <div className={cn('flex items-end gap-3', className)}>
      <GuideAvatar size={size} mood={speaking ? 'wow' : mood} talking={speaking} />
      <motion.div
        key={say}
        initial={{ opacity: 0, y: 10, scale: 0.9, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="toon relative mb-3 flex-1 rounded-[1.75rem] rounded-bl-md bg-white px-5 py-4 text-[18px] font-semibold leading-snug text-[#1b1740]"
      >
        <span aria-hidden="true" className="absolute -left-[13px] bottom-3 h-5 w-5 rotate-45 border-b-[3px] border-l-[3px] border-[#0d0a26] bg-white" />
        <p className="relative mb-1 text-sm font-bold uppercase tracking-wide text-[#7a5cf0]">{name}</p>
        <p aria-live="polite" className="relative">{children ?? say}</p>
        {supported && (
          <button
            type="button"
            onClick={() => speak(say)}
            className="toon-btn relative mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ffcf4a] px-4 text-[15px] font-bold text-[#1b1740]"
            aria-pressed={speaking}
          >
            {speaking ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            {speaking ? 'Shh, stop' : `${name}, read it!`}
          </button>
        )}
      </motion.div>
    </div>
  )
}
