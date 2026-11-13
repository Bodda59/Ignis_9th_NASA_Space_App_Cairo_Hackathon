import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { Orbi } from './Mascot'

export function KidLoading({ text = 'Orbi is fetching NASA’s files…' }: { text?: string }) {
  return (
    <div role="status" className="grid place-items-center gap-4 py-16 text-center">
      <div className="relative grid h-32 w-32 place-items-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="absolute inset-0">
          <span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-[#ffcf4a]" />
          <span className="absolute inset-2 rounded-full border-2 border-dashed border-white/25" />
        </motion.div>
        <Orbi size={64} mood="think" />
      </div>
      <p className="font-display text-lg font-bold">{text}</p>
    </div>
  )
}

export function KidError({ onRetry, text }: { onRetry: () => void; text?: string }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 toon rounded-[2rem] bg-white p-8 text-center text-[#1b1740]">
      <Orbi size={80} mood="think" />
      <p className="font-display text-xl font-bold">Uh-oh! Orbi can’t reach NASA’s library.</p>
      <p className="text-[#4b4870]">{text ?? 'Ask a grown-up to check the internet, then try again.'}</p>
      <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#7a5cf0] px-6 font-display font-bold text-white toon-btn">
        <RotateCcw size={20} aria-hidden="true" /> Try again
      </button>
    </div>
  )
}
