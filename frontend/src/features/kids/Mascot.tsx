import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useSpeech } from './useSpeech'

const INK = '#0d0a26'

/** Orbi — the Kids Lab guide: a round cartoon robot astronaut with bold outlines. */
export function Orbi({ size = 72, mood = 'happy', className }: { size?: number; mood?: 'happy' | 'wow' | 'think'; className?: string }) {
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
      {/* antenna */}
      <line x1="70" y1="26" x2="70" y2="10" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <motion.circle cx="70" cy="9" r="7" fill="#ff6b8b" stroke={INK} strokeWidth="4" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
      {/* ears */}
      <rect x="10" y="62" width="18" height="30" rx="9" fill="#8a6cff" stroke={INK} strokeWidth="4" />
      <rect x="112" y="62" width="18" height="30" rx="9" fill="#8a6cff" stroke={INK} strokeWidth="4" />
      {/* helmet */}
      <circle cx="70" cy="76" r="48" fill="#f4f6ff" stroke={INK} strokeWidth="5" />
      <path d="M36 52 a44 44 0 0 1 22 -18" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* visor */}
      <rect x="34" y="52" width="72" height="48" rx="24" fill="#16163a" stroke={INK} strokeWidth="4" />
      <rect x="42" y="57" width="20" height="7" rx="3.5" fill="#ffffff" opacity="0.25" />
      {/* eyes (blink) */}
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
      {/* mouth */}
      {mood === 'wow'
        ? <ellipse cx="70" cy="90" rx="6" ry="5" fill="#6ee7ff" />
        : <path d={mood === 'think' ? 'M62 90 h14' : 'M60 87 q10 9 20 0'} stroke="#6ee7ff" strokeWidth="4.5" fill="none" strokeLinecap="round" />}
      {/* cheeks */}
      <circle cx="40" cy="98" r="6" fill="#ff8fb1" opacity="0.85" />
      <circle cx="100" cy="98" r="6" fill="#ff8fb1" opacity="0.85" />
    </motion.svg>
  )
}

/** Orbi with a cartoon speech bubble. `say` is also what "Read to me" reads. */
export function Guide({ say, children, mood, size = 76, className }: { say: string; children?: ReactNode; mood?: 'happy' | 'wow' | 'think'; size?: number; className?: string }) {
  const { supported, speaking, speak } = useSpeech()
  return (
    <div className={cn('flex items-end gap-3', className)}>
      <Orbi size={size} mood={speaking ? 'wow' : mood} />
      <motion.div
        key={say}
        initial={{ opacity: 0, y: 10, scale: 0.9, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="toon relative mb-3 flex-1 rounded-[1.75rem] rounded-bl-md bg-white px-5 py-4 text-[18px] font-semibold leading-snug text-[#1b1740]"
      >
        <span aria-hidden="true" className="absolute -left-[13px] bottom-3 h-5 w-5 rotate-45 border-b-[3px] border-l-[3px] border-[#0d0a26] bg-white" />
        <p aria-live="polite" className="relative">{children ?? say}</p>
        {supported && (
          <button
            type="button"
            onClick={() => speak(say)}
            className="toon-btn relative mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ffcf4a] px-4 text-[15px] font-bold text-[#1b1740]"
            aria-pressed={speaking}
          >
            {speaking ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            {speaking ? 'Shh, stop' : 'Orbi, read it!'}
          </button>
        )}
      </motion.div>
    </div>
  )
}
