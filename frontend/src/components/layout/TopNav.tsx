import '@fontsource-variable/fredoka'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { AudiencePicker } from '@/features/audience/AudiencePicker'

// Research tools sit in the bar; the story pages share one "Learn" menu; Kids Lab gets its own button.
const LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/compare', label: 'Compare' },
  { to: '/rank', label: 'Rank' },
  { to: '/ask', label: 'Ask' },
]

const LEARN = [
  { to: '/article', label: 'Article', note: 'The long read on fire in microgravity' },
  { to: '/earth', label: 'Earth', note: 'What the studies mean back on the ground' },
  { to: '/gravity', label: 'Gravity', note: 'How flames change from orbit to Mars' },
  { to: '/moonwalk', label: 'Moon', note: 'Fire safety on a lunar mission' },
]

const linkClass = (isActive: boolean) =>
  `relative shrink-0 px-1 py-2 font-mono min-[360px]:px-1.5 sm:px-3 text-[10px] uppercase tracking-[0.035em] transition-colors min-[360px]:text-[11px] min-[360px]:tracking-[0.12em] ${
    isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]'
  }`

function ActiveDot() {
  return <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-flame)]" />
}


export function TopNav({ tourOpen }: { tourOpen: boolean }) {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 200)
    setSolid(y > 40)
  })

  return (
    <motion.header
      className={`fixed left-0 top-0 z-50 w-screen transition-colors duration-500 ${
        solid ? 'border-b border-[var(--color-line)] bg-[var(--color-void)]/70 backdrop-blur-xl' : ''
      }`}
      animate={{ y: hidden && !tourOpen ? '-100%' : '0%' }}
      transition={{ duration: tourOpen ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-2 min-[360px]:px-3 sm:px-6 lg:px-10" aria-label="Main">
        <Link to="/" aria-label="Flame in Freefall home" className="group flex shrink-0 items-center gap-3">
          <Logo />
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] sm:inline">
            Flame<span className="text-[var(--color-ink-faint)]">/</span>Freefall
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-0 min-[360px]:gap-1 sm:gap-2">
          {/* On phones the links scroll sideways so the row never overflows the screen. */}
          <div className="flex min-w-0 items-center gap-0 overflow-x-auto py-1 [scrollbar-width:none] min-[360px]:gap-1 sm:gap-2 [&::-webkit-scrollbar]:hidden">
          {[...LINKS, { to: '/mission', label: 'Mission' }].map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => linkClass(isActive)}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <ActiveDot />}
                </>
              )}
            </NavLink>
          ))}
          </div>
          {/* Outside the scrolling row so its menu is not clipped */}
          <LearnMenu />
          <KidsButton />
          <AudiencePicker />
        </div>
      </nav>
    </motion.header>
  )
}

function LearnMenu() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const active = LEARN.some((l) => pathname.startsWith(l.to))

  // Close on clicks outside the menu (picking a page closes it via onClick below).
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
        className={`${linkClass(active || open)} flex items-center gap-1`}>
        Learn
        <ChevronDown aria-hidden="true" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        {active && <ActiveDot />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id={id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-11 w-[min(17rem,85vw)] rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-2 shadow-2xl sm:left-0 sm:right-auto">
            {LEARN.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
                className={({ isActive }) => `block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 ${isActive ? 'bg-white/5' : ''}`}>
                <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink)]">{l.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--color-ink-faint)]">{l.note}</span>
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KidsButton() {
  return (
    <Link to="/kids" aria-label="Kids Lab"
      className="ml-1 flex h-8 shrink-0 items-center gap-1 rounded-full bg-gradient-to-br from-[#ffcf4a] to-[#ff8a3d] px-2 text-[13px] font-semibold text-[#1b1740] shadow-[0_2px_0_#0d0a26] transition-transform hover:-translate-y-0.5 min-[360px]:px-3"
      style={{ fontFamily: '"Fredoka Variable", "Segoe UI", sans-serif' }}>
      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Kids</span>
    </Link>
  )
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="transition-transform duration-700 group-hover:rotate-180">
      <circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <circle cx="11" cy="11" r="5.5" fill="none" stroke="var(--color-flame)" strokeWidth="1.5" />
      <circle cx="11" cy="1" r="1.6" fill="var(--color-ink)" />
    </svg>
  )
}
