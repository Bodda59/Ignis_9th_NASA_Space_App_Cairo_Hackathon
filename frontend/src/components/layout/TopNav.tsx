import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { AudiencePicker } from '@/features/audience/AudiencePicker'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/compare', label: 'Compare' },
  { to: '/rank', label: 'Rank' },
  { to: '/ask', label: 'Ask' },
  { to: '/article', label: 'Article' },
  { to: '/earth', label: 'Earth' },
  { to: '/mission', label: 'Mission' },
]


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
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `relative shrink-0 px-1 py-2 font-mono min-[360px]:px-1.5 sm:px-3 text-[10px] uppercase tracking-[0.035em] transition-colors min-[360px]:text-[11px] min-[360px]:tracking-[0.12em] ${l.to === '/' ? 'hidden sm:block' : ''} ${
                  isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-flame)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          </div>
          <AudiencePicker />
        </div>
      </nav>
    </motion.header>
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
