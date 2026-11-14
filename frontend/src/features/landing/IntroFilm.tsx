import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { diveTo, isDiving } from '@/lib/scroll'
import { readSeen, writeSeen } from './introSeen'

const DURATION = 36
const AUTO_SCROLL_DELAY_MS = 900
/** The 'enter the site' dive: how long the programmatic zoom-through takes. */
const DIVE_SECONDS = 2.4
const diveEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type Mode = 'playing' | 'ended'

const stamp = (s: number) => `00:${String(Math.min(DURATION, Math.floor(s))).padStart(2, '0')}`

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Full-bleed opening sequence. It is part of the page rather than an embedded player:
 * no native controls, the video melts into the page background, and the only chrome is
 * the same HUD language used elsewhere on the site.
 *
 * - Tries to play with sound and falls back to muted playback if the browser blocks it.
 * - "Skip" (or any scroll) leaves it at once, and when it finishes the page scrolls on by itself.
 * - Once seen in a session it rests on its end card instead of replaying.
 * - Once it has been watched (or skipped) and scrolled past, `onPassed` fires so the page can
 *   remove it: scrolling back up then stops at the hero instead of returning to the film.
 */
export function IntroFilm({ onPassed }: { onPassed?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const autoScroll = useRef<number>(0)
  const [mode, setMode] = useState<Mode>(() => (readSeen() || prefersReducedMotion() ? 'ended' : 'playing'))
  const [filmMounted, setFilmMounted] = useState(() => mode === 'playing')
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [clock, setClock] = useState(0)
  const autoplayAllowed = mode === 'playing'

  const reduceMotion = useReducedMotion()
  // 0 → 1 while the pinned opening is scrolled through; drives the dive into the site.
  const { scrollYProgress: dive } = useScroll({ target: wrap, offset: ['start start', 'end end'] })
  const scale = useTransform(dive, (v) => (reduceMotion ? 1 : 1 + 13 * Math.pow(v, 2.3)))
  const layerOpacity = useTransform(dive, [0.38, 0.9], [1, 0])
  const flash = useTransform(dive, [0.25, 0.62, 0.95], [0, 0.6, 0])
  const [gone, setGone] = useState(false)
  const passed = useRef(false)
  const ended = useRef(mode === 'ended')
  useEffect(() => { ended.current = mode === 'ended' }, [mode])
  const { scrollY } = useScroll()
  // Fully past the film (its next section reaches the top) and no dive animation still running.
  const checkPassed = useCallback(() => {
    const after = wrap.current?.nextElementSibling
    if (passed.current || !ended.current || isDiving() || !after || after.getBoundingClientRect().top > 1) return
    passed.current = true
    onPassed?.()
  }, [onPassed])
  useMotionValueEvent(scrollY, 'change', checkPassed)
  const next = () => wrap.current?.nextElementSibling ?? null
  const goOn = useCallback(() => {
    window.clearTimeout(autoScroll.current)
    diveTo(next(), DIVE_SECONDS, diveEase, checkPassed)
  }, [checkPassed])

  const finish = useCallback(() => {
    writeSeen()
    window.clearTimeout(autoScroll.current)
    video.current?.pause()
    setMode('ended')
  }, [])

  const skip = useCallback(() => {
    finish()
    goOn()
  }, [finish, goOn])

  const replay = useCallback(() => {
    window.clearTimeout(autoScroll.current)
    setBlocked(false)
    setClock(0)
    setFilmMounted(true)
    setMode('playing')
    const v = video.current
    if (v) { v.currentTime = 0; void v.play().catch(() => setBlocked(true)) }
  }, [])

  // Once the dive is nearly complete the film is behind us: settle it on its end card.
  useMotionValueEvent(dive, 'change', (v) => {
    setGone(v > 0.6)
    if (v > 0.9 && mode === 'playing') finish()
  })
  // Smooth progress hairline without re-rendering React every frame.
  useEffect(() => {
    if (mode !== 'playing') return
    let raf = 0
    let lastSecond = -1
    const tick = () => {
      const v = video.current
      if (v && bar.current) {
        bar.current.style.transform = `scaleX(${Math.min(1, v.currentTime / (v.duration || DURATION))})`
        const sec = Math.floor(v.currentTime)
        if (sec !== lastSecond) { lastSecond = sec; setClock(v.currentTime) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, filmMounted])

  // Pause while off-screen or while a modal (the first-visit guide) is open.
  useEffect(() => {
    const el = section.current
    if (!el) return
    let visible = false
    let observing = true
    const canPlay = () => observing && visible && !document.querySelector('dialog[open]')
    const sync = () => {
      const v = video.current
      if (!v || !autoplayAllowed || v.ended) return
      if (!canPlay()) {
        v.pause()
        return
      }
      if (!v.paused) return
      void v.play().catch((error: DOMException) => {
        if (!canPlay() || error.name === 'AbortError') return
        if (error.name === 'NotAllowedError' && !v.muted) {
          v.muted = true
          void v.play().catch((retryError: DOMException) => {
            if (canPlay() && retryError.name !== 'AbortError') setBlocked(true)
          })
        } else {
          setBlocked(true)
        }
      })
    }
    const io = new IntersectionObserver(([entry]) => { visible = entry.intersectionRatio > 0.35; sync() }, { threshold: [0, 0.35, 0.6] })
    io.observe(el)
    const mo = new MutationObserver(sync)
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    return () => { observing = false; io.disconnect(); mo.disconnect() }
  }, [autoplayAllowed, filmMounted])

  useEffect(() => () => window.clearTimeout(autoScroll.current), [])

  const onEnded = () => {
    finish()
    autoScroll.current = window.setTimeout(() => {
      const stillHere = window.scrollY < window.innerHeight * 0.5
      if (stillHere && !document.querySelector('dialog[open]')) goOn()
    }, AUTO_SCROLL_DELAY_MS)
  }

  const toggleSound = () => {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted && v.paused) void v.play().catch(() => setBlocked(true))
  }

  const playing = mode === 'playing'

  return (
    <div ref={wrap} className="relative z-10 h-[185svh]">
    <section
      ref={section}
      aria-label="Ignis opening film"
      className="sticky top-0 isolate h-[100svh] min-h-[320px] w-full overflow-hidden"
      style={{ pointerEvents: gone ? 'none' : undefined }}
    >
      <motion.div
        className="grain absolute inset-0 bg-[var(--color-void)] will-change-transform"
        style={{ scale, opacity: layerOpacity, transformOrigin: '50% 44%' }}
      >
      {/* end card still: shown once the film has finished or was skipped */}
      <img
        src="/video/ignis-intro-end.jpg"
        alt=""
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          mode === 'ended' ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
      />

      {filmMounted && (
        <video
          ref={video}
          // Whole 16:9 frame, as large as fits: the captions are burned into the lower part of the
          // film, so cropping it (object-cover) cut them off in wide or short windows. Soft edges blend it in.
          className={`absolute left-1/2 top-1/2 aspect-video w-[min(100%,calc(max(100svh,320px)*16/9))] -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-[900ms] [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent),linear-gradient(transparent,#000_3%,#000_97%,transparent)] [mask-composite:intersect] ${
            playing ? 'opacity-100' : 'opacity-0'
          }`}
          // first frame (captions included) shows at once instead of a black screen while the film loads
          poster="/video/ignis-intro-poster.jpg"
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload noplaybackrate noremoteplayback"
          aria-hidden
          tabIndex={-1}
          onContextMenu={(e) => e.preventDefault()}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onPlaying={() => setBlocked(false)}
          onEnded={onEnded}
          onError={(e) => { if (e.currentTarget.error) finish() }}
        >
          <source src="/video/ignis-intro-720.mp4" type="video/mp4" media="(max-width: 900px)" />
          <source src="/video/ignis-intro-1080.mp4" type="video/mp4" />
        </video>
      )}

      {/* blend into the page */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(8,9,14,0.65)_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--color-void)]/80 to-transparent" />
      {/* only after the film: while it plays this would darken the captions */}
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-void)] to-transparent transition-opacity duration-700 ${playing ? 'opacity-0' : 'opacity-100'}`} />

      {/* HUD frame */}
      <div aria-hidden className="pointer-events-none absolute inset-4 sm:inset-6 lg:inset-8">
        {['left-0 top-0 border-l border-t', 'right-0 top-0 border-r border-t', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
          <span key={c} className={`absolute h-4 w-4 border-[var(--color-line-strong)] ${c}`} />
        ))}
      </div>

      {/* bottom bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-7 sm:px-10 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] items-end justify-between gap-4">
          <p className="label hidden items-center gap-3 sm:flex">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${playing ? 'animate-pulse bg-[var(--color-ember)]' : 'bg-[var(--color-ink-faint)]'}`} />
            Opening sequence
            <span className="text-[var(--color-ink-dim)]">{playing ? `${stamp(clock)} / ${stamp(DURATION)}` : 'End'}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            {playing && (
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={!muted}
                aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                className={`label inline-flex h-9 items-center gap-2 rounded-full border bg-[var(--color-void)]/50 px-4 backdrop-blur transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)] ${
                  muted ? 'border-[var(--color-flame)]/50 text-[var(--color-ink)]' : 'border-[var(--color-line-strong)]'
                }`}
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {muted ? 'Sound on' : 'Sound off'}
              </button>
            )}
            {playing && (
              <button
                type="button"
                onClick={skip}
                className="label inline-flex h-9 items-center gap-2 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-void)]/50 px-4 backdrop-blur transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
              >
                Skip intro
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* progress hairline */}
      {playing && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-px bg-[var(--color-line)]">
          <div ref={bar} className="h-full origin-left bg-[var(--color-flame)]" style={{ transform: 'scaleX(0)' }} />
        </div>
      )}

      {/* blocked autoplay (battery saver etc.) */}
      <AnimatePresence>
        {playing && blocked && (
          <motion.button
            type="button"
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-flame)]/60 bg-[var(--color-void)]/60 px-6 py-3 text-sm backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={replay}
          >
            Play the opening
          </motion.button>
        )}
      </AnimatePresence>

      {/* end card actions — sits in the empty band under the title card */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            className="absolute inset-x-0 bottom-[16%] z-20 flex flex-col items-center gap-4 sm:bottom-[14%]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={goOn}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[var(--color-ink)] px-6 py-3.5 text-sm font-medium text-[var(--color-void)]"
            >
              <span className="relative z-10">Explore the research</span>
              <ArrowDown className="relative z-10 h-4 w-4 transition-transform duration-500 group-hover:translate-y-0.5" />
              <span className="absolute inset-0 -translate-x-full bg-[var(--color-flame)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0" />
            </button>
            <button
              type="button"
              onClick={replay}
              className="label inline-flex items-center gap-2 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-flame)]"
            >
              <RotateCcw className="h-3 w-3" />
              Replay opening
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
      {/* light that builds as you pass through, then clears */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          opacity: flash,
          background:
            'radial-gradient(circle at 50% 44%, rgba(160,220,255,.85) 0%, rgba(108,200,255,.35) 22%, rgba(8,9,14,0) 62%)',
        }}
      />
    </section>
    </div>
  )
}
