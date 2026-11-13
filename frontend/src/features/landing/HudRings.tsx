import { motion } from 'framer-motion'

/** Instrument-style rings with tick marks around the flame (AstroKit-inspired). */
export function HudRings({ microgravity }: { microgravity: boolean }) {
  const ticks = Array.from({ length: 120 }, (_, i) => i)
  const accent = microgravity ? 'var(--color-flame)' : 'var(--color-ember)'

  return (
    <svg viewBox="-260 -260 520 520" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {/* outer tick ring */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
      >
        {ticks.map((i) => {
          const long = i % 10 === 0
          return (
            <line
              key={i}
              x1={0}
              y1={-238}
              x2={0}
              y2={long ? -224 : -231}
              stroke="white"
              strokeOpacity={long ? 0.35 : 0.12}
              strokeWidth={long ? 1 : 0.75}
              transform={`rotate(${i * 3})`}
            />
          )
        })}
      </motion.g>

      {/* thin full circle */}
      <circle r={210} fill="none" stroke="white" strokeOpacity={0.08} />

      {/* accent arc segments, counter-rotating */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <motion.circle
          r={196}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="120 1111"
          animate={{ stroke: accent }}
          transition={{ duration: 1.2 }}
        />
        <motion.circle
          r={196}
          fill="none"
          stroke={accent}
          strokeOpacity={0.4}
          strokeWidth={1.5}
          strokeDasharray="30 1201"
          strokeDashoffset={-600}
          animate={{ stroke: accent }}
          transition={{ duration: 1.2 }}
        />
        <circle cx={0} cy={-196} r={3} fill="var(--color-void)" stroke="white" strokeOpacity={0.6} />
      </motion.g>

      {/* inner dashed ring */}
      <motion.circle
        r={150}
        fill="none"
        stroke="white"
        strokeOpacity={0.1}
        strokeDasharray="2 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />

      {/* crosshair */}
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1={0} y1={-252} x2={0} y2={-244} stroke="white" strokeOpacity={0.5} transform={`rotate(${a})`} />
      ))}
    </svg>
  )
}
