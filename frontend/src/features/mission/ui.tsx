import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, FlaskConical, RotateCcw, Star, Volume2, VolumeX } from 'lucide-react'
import { Component, Suspense, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Level } from './content'
import { sfx } from './sfx'

/** Frame for a lazy 3D scene. A WebGL failure leaves the game playable through the panel controls. */
export function SceneFrame({ children, className, label, bare = false, overlay }: {
  children: ReactNode; className?: string; label: string; bare?: boolean; overlay?: ReactNode
}) {
  return (
    <div role="group" aria-label={label}
      className={cn('relative overflow-hidden bg-[#0b0e16]', !bare && 'rounded-2xl border border-[var(--color-line)]', className)}>
      <SceneBoundary>
        <Suspense fallback={<SceneLoading />}>{children}</Suspense>
      </SceneBoundary>
      {overlay}
    </div>
  )
}

export type Toast = { id: number; text: string; tone: 'good' | 'bad' | 'info' }

/** Game HUD drawn over the 3D view: objective, status, crosshair, controls hint and event toasts. */
export function Hud({ objective, status, toasts = [], crosshair = true, hint = 'Drag to look · WASD to float · Q/E down/up · R reset · click glowing objects' }: {
  objective: ReactNode; status?: ReactNode; toasts?: Toast[]; crosshair?: boolean; hint?: string
}) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute left-3 top-3 max-w-[70%] rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-flame)]">Objective</p>
        <p className="mt-0.5 text-[13px] leading-snug text-white">{objective}</p>
      </div>
      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
        {status && <div className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 font-mono text-xs tabular-nums text-white backdrop-blur-md">{status}</div>}
        <MuteButton />
      </div>
      {crosshair && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
          <div className="size-5 rounded-full border border-white/50" />
          <div className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      )}
      <div className="absolute inset-x-0 top-16 flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.slice(-3).map((t) => (
            <motion.p key={t.id} initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
              className={cn('max-w-md rounded-full border px-4 py-1.5 text-center text-xs backdrop-blur-md',
                t.tone === 'good' ? 'border-[var(--color-prevention)]/50 bg-[#0d2a1d]/80 text-[var(--color-prevention)]'
                  : t.tone === 'bad' ? 'border-[var(--color-ember)]/50 bg-[#2e1a0a]/80 text-[var(--color-ember)]'
                    : 'border-white/15 bg-black/60 text-white')}>
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
      <p className="absolute inset-x-0 bottom-2 hidden text-center font-mono text-[10px] uppercase tracking-[0.12em] text-white/55 sm:block">{hint}</p>
    </div>
  )
}

function MuteButton() {
  const [muted, setMuted] = useState(sfx.isMuted)
  return (
    <button type="button" onClick={() => { sfx.setMuted(!muted); setMuted(!muted) }} aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="grid size-9 place-items-center rounded-lg border border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-black/65">
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  )
}

function SceneLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p role="status" className="label animate-pulse">Loading 3D module…</p>
    </div>
  )
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <p className="max-w-xs text-sm text-[var(--color-ink-dim)]">
            3D view unavailable on this device. You can still play using the controls.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export function Stars({ value, max = 3, size = 'md' }: { value: number; max?: number; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 'size-8' : size === 'sm' ? 'size-3.5' : 'size-5'
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of ${max} stars`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} aria-hidden="true" className={cn(px, i < value ? 'fill-[#f5c84a] text-[#f5c84a]' : 'text-[var(--color-line-strong)]')} />
      ))}
    </span>
  )
}

export function LevelHeader({ level, step, onExit }: { level: Level; step?: string; onExit: () => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label mb-2" style={{ color: level.color }}>Level {level.n} · {level.topic}{step ? ` · ${step}` : ''}</p>
        <h1 className="font-display text-[clamp(1.6rem,3.6vw,2.4rem)] uppercase leading-none tracking-[-0.02em]">{level.title}</h1>
      </div>
      <Button size="sm" variant="ghost" onClick={onExit}>Mission map</Button>
    </div>
  )
}

/** Rule-of-thumb notice shown wherever the game simplifies the science. */
export function Simplified({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex gap-2 text-xs text-[var(--color-ink-faint)]">
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span><span className="font-medium text-[var(--color-ink-dim)]">Game simplification:</span> {children}</span>
    </p>
  )
}

export function Debrief({ level, stars, title, learned, onRetry, onNext, onHub }: {
  level: Level; stars: number; title: string; learned: string[]
  onRetry: () => void; onNext?: () => void; onHub: () => void
}) {
  return (
    <section aria-labelledby="debrief-title" className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <Stars value={stars} size="lg" />
        <h2 id="debrief-title" className="font-display text-xl uppercase">{title}</h2>
      </div>
      <div>
        <p className="label mb-2">What you learned</p>
        <ul className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {learned.map((l) => <li key={l} className="flex gap-2"><span aria-hidden="true" style={{ color: level.color }}>›</span><span>{l}</span></li>)}
        </ul>
      </div>
      <div>
        <p className="label mb-2">The real NASA experiments</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {level.studies.map((s) => (
            <li key={s.id}>
              <Link to={`/investigations/${s.id}`}
                className="group block h-full rounded-xl border border-[var(--color-line)] bg-[var(--color-void)]/60 p-3 transition-colors hover:border-[var(--color-flame)]">
                <span className="flex items-center justify-between gap-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-flame)]">
                  {s.acronym} <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-[var(--color-ink-dim)]">{s.fact}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to={`/explore?topic=${level.id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--color-flame)] hover:underline">
          Explore all {level.topic.toLowerCase()} research <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {onNext && <Button variant="accent" onClick={onNext} icon={<ArrowRight className="size-4" />}>Next level</Button>}
        <Button variant="outline" onClick={onRetry} iconLeft={<RotateCcw className="size-4" />}>Try again</Button>
        <Button variant="ghost" onClick={onHub}>Mission map</Button>
      </div>
    </section>
  )
}
