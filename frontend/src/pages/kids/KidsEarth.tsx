import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Earth } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { EarthThemeId, Spinoff } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { EARTH_THEMES } from '@/features/kids/kidsCopy'
import { KidError, KidLoading } from '@/features/kids/KidState'
import { Guide } from '@/features/kids/Mascot'
import { reward } from '@/features/kids/progress'
import { sfx } from '@/features/kids/sfx'

/** NASA Spinoff photos already used by the grown-up Article page. */
const SPINOFF_PHOTOS: [RegExp, string, string][] = [
  [/air tank/i, '/articles/air-tanks.webp', 'Archival photograph of a firefighter wearing a breathing apparatus'],
  [/smoke detector/i, '/articles/fire-detector.webp', 'The fire detector components shown in NASA’s original Spinoff article'],
  [/clothing/i, '/articles/fire-attire.webp', 'Archival photograph from NASA’s Project FIRES coverage'],
]
const photoFor = (s: Spinoff) => SPINOFF_PHOTOS.find(([re]) => re.test(s.title))

/** Cartoon picture for spinoffs without a NASA photo: a little extinguisher spraying fine mist. */
function SpinoffArt() {
  return (
    <div aria-hidden="true" className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden border-b-[3px] border-[#0d0a26] bg-[radial-gradient(circle_at_30%_30%,#9ef0ff,#3a8bd6)]">
      <svg viewBox="0 0 200 112" className="h-full w-full">
        <rect x="70" y="40" width="36" height="58" rx="10" fill="#ff6b8b" stroke="#0d0a26" strokeWidth="4" />
        <rect x="80" y="28" width="16" height="14" rx="3" fill="#c9d3ff" stroke="#0d0a26" strokeWidth="4" />
        <path d="M96 32 h22 l6 -6" stroke="#0d0a26" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="76" y="58" width="24" height="12" rx="3" fill="#fff" stroke="#0d0a26" strokeWidth="3" />
      </svg>
      {Array.from({ length: 9 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute h-3 w-3 rounded-full border-2 border-[#0d0a26] bg-white"
          style={{ left: '62%', top: '24%' }}
          animate={{ x: [0, 40 + (i % 3) * 25], y: [0, -18 + (i % 4) * 12], opacity: [1, 0], scale: [0.6, 1.2] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

const THEME_COLORS =['#ffcf4a', '#6ee7ff', '#ff8fb1', '#7ee2a8', '#b79bff', '#ffab6b']

export function KidsEarth() {
  const earth = useAsync((signal) => api.earth(signal), 'kids-earth')
  const [open, setOpen] = useState<Set<EarthThemeId>>(new Set())

  if (earth.status === 'error' && !earth.data) return <KidError onRetry={earth.retry} />
  if (!earth.data) return <KidLoading />
  const { themes, spinoffs } = earth.data

  const toggle = (id: EarthThemeId) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
    sfx.pop()
    if (themes.every((t) => next.has(t.id))) reward({ badges: ['earth-hero'] })
  }

  return (
    <div className="space-y-10">
      <div className="grid items-end gap-6 lg:grid-cols-2">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Space helps <span className="text-[#7ee2a8]">Earth</span></h1>
        <Guide say="Fire science from space can help people at home too! Tap each planet card to see how. These are ways NASA says the research could help, not promises." size={64} />
      </div>

      <section aria-labelledby="themes-title">
        <h2 id="themes-title" className="font-display text-2xl font-bold">How the experiments could help</h2>
        <p className="mt-1 text-[#c9cdf5]">Opened {open.size} of {themes.length}</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {themes.map((t, i) => {
            const isOpen = open.has(t.id)
            const kid = EARTH_THEMES[t.id]
            const color = THEME_COLORS[i % THEME_COLORS.length]
            return (
              <li key={t.id} className="toon toon-lift rounded-[2rem] bg-white text-[#1b1740]">
                <button type="button" onClick={() => toggle(t.id)} aria-expanded={isOpen} className="flex w-full items-center gap-4 p-5 text-left">
                  <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-[#0d0a26]" style={{ background: color }}>
                    <Earth size={30} className="text-[#1b1740]" aria-hidden="true" />
                    {isOpen && <Check size={18} className="absolute -right-1 -top-1 rounded-full bg-[#2fbf7f] p-0.5 text-white" aria-hidden="true" />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg font-bold">{kid?.title ?? t.label}</span>
                    <span className="text-sm font-semibold text-[#5b5785]">{t.studies.length} experiment{t.studies.length === 1 ? '' : 's'}</span>
                  </span>
                  <ChevronDown size={24} className={cn('shrink-0 transition', isOpen && 'rotate-180')} aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-3 px-5 pb-5">
                        <p className="text-[17px] leading-snug">{kid?.explain ?? t.description}</p>
                        <p className="text-sm font-bold uppercase tracking-wide text-[#7a5cf0]">Experiments that could help</p>
                        <ul className="flex flex-wrap gap-2">
                          {t.studies.map((s) => (
                            <li key={s.id}>
                              <Link to={s.acronym && s.acronym !== s.id ? `/kids/experiments/${encodeURIComponent(s.id)}` : `/investigations/${encodeURIComponent(s.id)}`}
                                className="inline-flex min-h-10 items-center rounded-full bg-[#f1eefc] px-3 font-bold text-[#4b3bb5] hover:bg-[#e2dcfb]">
                                {s.acronym || s.id}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </section>

      {spinoffs.length > 0 && (
        <section aria-labelledby="spinoffs-title">
          <h2 id="spinoffs-title" className="font-display text-2xl font-bold">Space inventions you can find on Earth</h2>
          <p className="mt-1 text-[#c9cdf5]">NASA calls these “spinoffs”: ideas made for space that people now use at home and at work.</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {spinoffs.map((s, i) => {
              const photo = photoFor(s)
              return (
                <motion.li key={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="overflow-hidden toon rounded-[2rem] bg-[#1b2260]">
                  {photo
                    ? <img src={photo[1]} alt={photo[2]} loading="lazy" className="aspect-[16/9] w-full border-b-[3px] border-[#0d0a26] object-cover" />
                    : /extinguish/i.test(s.title)
                      ? <SpinoffArt />
                      : <div aria-hidden="true" className="grid aspect-[16/9] w-full place-items-center border-b-[3px] border-[#0d0a26] bg-[#6ee7ff]"><Earth size={72} strokeWidth={2.25} className="text-[#0d0a26]" /></div>}
                  <div className="p-5">
                    <span className="rounded-full border-2 border-[#0d0a26] bg-[#ffcf4a] px-3 py-1 text-sm font-bold text-[#1b1740]">
                      {/^\d{4}s$/.test(s.era) ? s.era : s.era === 'ISS' ? 'Space Station era' : s.era}
                    </span>
                    <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
                    <p className="mt-2 leading-snug text-[#dfe3ff]">{s.text}</p>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
