import Lenis from 'lenis'
import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { CompareProvider } from '@/features/compare/CompareContext'
import { CompareTray } from '@/features/compare/CompareTray'
import { setLenis } from '@/lib/scroll'
import { TopNav } from './TopNav'
import { Footer } from './Footer'

export function AppShell() {
  const { pathname } = useLocation()

  // Smooth inertial scrolling (skipped for reduced-motion users)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.09 })
    setLenis(lenis)
    let raf = requestAnimationFrame(function tick(t) {
      lenis.raf(t)
      raf = requestAnimationFrame(tick)
    })
    return () => {
      cancelAnimationFrame(raf)
      setLenis(null)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <MotionConfig reducedMotion="user">
    <CompareProvider>
      <div className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-[var(--color-ink)] focus:px-3 focus:py-2 focus:text-[var(--color-void)]">
          Skip to content
        </a>
        <TopNav tourOpen={false} />
        <main id="main">
          <Outlet />
        </main>
        {pathname !== '/ask' && <Footer />}
        <CompareTray />
      </div>
    </CompareProvider>
    </MotionConfig>
  )
}
