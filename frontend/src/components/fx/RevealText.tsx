import { motion } from 'framer-motion'

type Props = {
  lines: string[]
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
  className?: string
  lineClassName?: string
  /** optional per-line extra classes */
  lineClassNames?: (string | undefined)[]
  delay?: number
  stagger?: number
}

/** Editorial mask reveal: each line slides up from behind a clipping edge. */
export function RevealText({ lines, as: Tag = 'h1', className, lineClassName, lineClassNames, delay = 0, stagger = 0.09 }: Props) {
  return (
    <Tag className={className}>
      <span className="sr-only">{lines.join(' ')}</span>
      {lines.map((line, i) => (
        <span key={line + i} aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className={`block ${lineClassName ?? ''} ${lineClassNames?.[i] ?? ''}`}
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: delay + i * stagger }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
