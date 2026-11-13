import Lenis from 'lenis'
import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { CompareProvider } from '@/features/compare/CompareContext'
import { CompareTray } from '@/features/compare/CompareTray'
import { setLenis } from '@/lib/scroll'
import { IntroTour, TOUR_STORAGE_KEY } from '@/features/onboarding/IntroTour'
import { TopNav } from './TopNav'
import { Footer } from './Footer'

export function AppShell() {
  const { pathname } = useLocation()
  const [tourOpen, setTourOpen] = useState(() => {
    try { return !localStorage.getItem(TOUR_STORAGE_KEY) }
    catch { return true }
  })

  useEffect(() => {
    if (!tourOpen) return
    try { localStorage.setItem(TOUR_STORAGE_KEY, 'seen') }
    catch { /* This browser does not allow the guide preference to be saved. */ }
  }, [tourOpen])

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
        <TopNav tourOpen={tourOpen} />
        <main id="main">
          <Outlet />
        </main>
        {pathname !== '/ask' && <Footer />}
        <CompareTray />
        {tourOpen && <IntroTour onDismiss={() => setTourOpen(false)} />}
      </div>
    </CompareProvider>
    </MotionConfig>
  )
}
