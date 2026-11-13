import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

const COLORS = ['#ffcf4a', '#ff8fb1', '#6ee7ff', '#7ee2a8', '#b79bff', '#ff8a3d']

/** Stars and confetti flying out from the middle of the parent. Changes of `fire` replay it. */
export function Burst({ fire, count = 18 }: { fire: number; count?: number }) {
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
      const dist = 70 + Math.random() * 90
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, star: i % 3 === 0, color: COLORS[i % COLORS.length], spin: (Math.random() - 0.5) * 540 }
    }),
    // A new pattern each time it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fire, count],
  )
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-visible">
      <AnimatePresence>
        {fire > 0 && bits.map((b, i) => (
          <motion.span
            key={`${fire}-${i}`}
            className="absolute"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: b.x, y: b.y, scale: [0, 1.2, 1], opacity: [1, 1, 0], rotate: b.spin }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {b.star ? (
              <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" fill={b.color} stroke="#0d0a26" strokeWidth="2" strokeLinejoin="round" /></svg>
            ) : (
              <span className="block h-3 w-2 rounded-sm" style={{ background: b.color }} />
            )}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
