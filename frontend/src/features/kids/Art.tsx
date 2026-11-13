/**
 * Hand-drawn cartoon art for the Kids Lab, in Orbi's style:
 * bold ink outlines, flat colours, small loops of motion.
 */
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

const INK = '#0d0a26'

/** Orbi in a detective hat, peering through a magnifying glass. */
export function DetectiveArt({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 200 160" className={cn('h-full w-auto overflow-visible', className)} aria-hidden="true"
      animate={{ rotate: [0, -2, 0, 2, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
      {/* body */}
      <ellipse cx="92" cy="150" rx="46" ry="8" fill={INK} opacity="0.2" />
      <rect x="10" y="74" width="16" height="28" rx="8" fill="#8a6cff" stroke={INK} strokeWidth="4" />
      <rect x="146" y="74" width="16" height="28" rx="8" fill="#8a6cff" stroke={INK} strokeWidth="4" />
      <circle cx="86" cy="92" r="58" fill="#f4f6ff" stroke={INK} strokeWidth="5" />
      <rect x="44" y="70" width="84" height="54" rx="27" fill="#16163a" stroke={INK} strokeWidth="4" />
      {/* eyes: one squinting, one big behind the lens */}
      <path d="M58 98 q8 -8 16 0" stroke="#6ee7ff" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <circle cx="104" cy="96" r="7" fill="#6ee7ff" />
      <path d="M78 112 q8 5 16 0" stroke="#6ee7ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* hat */}
      <path d="M24 46 q62 -22 124 0 l-8 12 q-54 -16 -108 0z" fill="#7a5a3a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M44 44 q4 -34 42 -36 q38 2 42 36 q-42 -10 -84 0z" fill="#9b7650" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M46 38 q40 -9 80 0" stroke="#ff6b8b" strokeWidth="7" fill="none" />
      {/* magnifying glass */}
      <motion.g animate={{ x: [0, 6, 0], y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
        <line x1="148" y1="128" x2="178" y2="156" stroke={INK} strokeWidth="13" strokeLinecap="round" />
        <line x1="148" y1="128" x2="178" y2="156" stroke="#ffcf4a" strokeWidth="6" strokeLinecap="round" />
        <circle cx="128" cy="104" r="28" fill="#bff3ff" fillOpacity="0.55" stroke={INK} strokeWidth="6" />
        <path d="M112 94 a18 18 0 0 1 14 -10" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  )
}

/** Orbi in a firefighter helmet, spraying mist at a glowing round space flame. */
export function PatrolArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" className={cn('h-full w-auto overflow-visible', className)} aria-hidden="true">
      <ellipse cx="78" cy="150" rx="44" ry="7" fill={INK} opacity="0.2" />

      {/* Orbi body */}
      <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
        <rect x="24" y="78" width="14" height="26" rx="7" fill="#8a6cff" stroke={INK} strokeWidth="4" />
        <circle cx="72" cy="94" r="44" fill="#f4f6ff" stroke={INK} strokeWidth="5" />
        <rect x="40" y="76" width="64" height="42" rx="21" fill="#16163a" stroke={INK} strokeWidth="4" />
        <path d="M52 98 q7 -9 14 0" stroke="#6ee7ff" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M78 98 q7 -9 14 0" stroke="#6ee7ff" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M64 108 q8 6 16 0" stroke="#6ee7ff" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="122" r="5" fill="#ff8fb1" opacity="0.85" />
        {/* firefighter helmet */}
        <path d="M22 62 q50 -16 100 0 l-4 10 q-46 -12 -92 0z" fill="#ffcf4a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M34 60 q4 -40 38 -42 q34 2 38 42 q-38 -9 -76 0z" fill="#ff5470" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M72 20 v36" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <rect x="60" y="34" width="24" height="16" rx="5" fill="#ffcf4a" stroke={INK} strokeWidth="4" />

        {/* extinguisher held in front */}
        <rect x="92" y="104" width="30" height="44" rx="12" fill="#ff5470" stroke={INK} strokeWidth="5" />
        <rect x="98" y="110" width="6" height="30" rx="3" fill="#ffffff" opacity="0.4" />
        <rect x="99" y="94" width="16" height="12" rx="4" fill="#c9d3ff" stroke={INK} strokeWidth="4" />
        <path d="M114 100 q18 -2 22 -14" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="96" cy="128" r="9" fill="#f4f6ff" stroke={INK} strokeWidth="4" />
      </motion.g>

      {/* mist cone */}
      <path d="M136 86 L196 58 Q206 82 196 108 Z" fill="#ffffff" opacity="0.35" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.circle
          key={i}
          r={4 + (i % 3)}
          fill="#ffffff"
          stroke={INK}
          strokeWidth="2.5"
          initial={{ cx: 138, cy: 86 }}
          animate={{ cx: [138, 190], cy: [86, 64 + (i % 4) * 14], opacity: [1, 0.2] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeOut' }}
        />
      ))}

      {/* round space flame: glowing layers, flickering and shrinking */}
      <motion.g style={{ originX: '206px', originY: '84px' }} animate={{ scale: [1, 0.82, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
        <circle cx="206" cy="84" r="34" fill="#4aa8ff" opacity="0.3" />
        <motion.circle cx="206" cy="84" r="26" fill="#3b7dff" stroke={INK} strokeWidth="4" animate={{ r: [26, 27.5, 26] }} transition={{ duration: 0.35, repeat: Infinity }} />
        <circle cx="206" cy="86" r="18" fill="#7fd0ff" />
        <circle cx="206" cy="88" r="10" fill="#ffffff" />
        <circle cx="198" cy="80" r="3.2" fill={INK} />
        <circle cx="214" cy="80" r="3.2" fill={INK} />
        <ellipse cx="206" cy="92" rx="4" ry="5" fill={INK} />
      </motion.g>
      {/* sparkles */}
      {[[230, 56], [184, 122], [236, 110]].map(([x, y], i) => (
        <motion.path key={i} d={`M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2}Z`}
          fill="#ffffff" stroke={INK} strokeWidth="1.5" animate={{ scale: [0.6, 1.1, 0.6], opacity: [0.5, 1, 0.5] }}
          style={{ originX: `${x}px`, originY: `${y}px` }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.4 }} />
      ))}
    </svg>
  )
}

/** Cartoon medal used for badges and ranks instead of emoji. */
export function Medal3D({ icon: Icon, color, size = 64, locked = false, className }: { icon: LucideIcon; color: string; size?: number; locked?: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full overflow-visible">
        {!locked && (
          <>
            <path d="M20 44 l-6 18 l9 -4 l5 7 l5 -17z" fill="#ff6b8b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M44 44 l6 18 l-9 -4 l-5 7 l-5 -17z" fill="#6ee7ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          </>
        )}
        <circle cx="32" cy="30" r="26" fill={locked ? '#3a3f78' : color} stroke={locked ? '#5a5f9e' : INK} strokeWidth="4" strokeDasharray={locked ? '5 4' : undefined} />
        {!locked && <circle cx="32" cy="30" r="19" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" />}
        {!locked && <path d="M16 22 a18 18 0 0 1 10 -9" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" />}
      </svg>
      <Icon size={size * 0.36} strokeWidth={2.75} className="relative -mt-[8%]" style={{ color: locked ? '#8d92c9' : INK }} />
    </span>
  )
}
