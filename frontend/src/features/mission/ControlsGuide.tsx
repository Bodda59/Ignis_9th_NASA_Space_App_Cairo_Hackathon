import '@fontsource/press-start-2p/400.css'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

const PIXEL = { fontFamily: '"Press Start 2P", ui-monospace, monospace' }
const SKIP_KEY = 'flame-mission-controls-skip'
/** One accent for every level: the site's flame blue. */
const ACCENT = '#6cc8ff'

/** Keys the zero-g rig understands (see three/ZeroGRig.tsx), by the key name the browser reports. */
const ROWS: { keys: string[][]; label: string; detail: string }[] = [
  { keys: [['w', 'a', 's', 'd'], ['arrowup', 'arrowleft', 'arrowdown', 'arrowright']], label: 'Float', detail: 'Drift forward, back and sideways. You keep gliding after you let go, just like in zero-g.' },
  { keys: [['e', ' '], ['q', 'shift']], label: 'Up / down', detail: 'E or Space floats up. Q or Shift floats down.' },
  { keys: [['r']], label: 'Reset', detail: 'Lost? Snap back to where the level started.' },
]

const CAPS: Record<string, string> = { ' ': 'SPACE', shift: 'SHIFT' }
const ARROWS: Record<string, LucideIcon | undefined> = { arrowup: ArrowUp, arrowdown: ArrowDown, arrowleft: ArrowLeft, arrowright: ArrowRight }
const ARROW_NAMES: Record<string, string> = { arrowup: 'Up arrow', arrowdown: 'Down arrow', arrowleft: 'Left arrow', arrowright: 'Right arrow' }

function readSkip() {
  try { return localStorage.getItem(SKIP_KEY) === '1' } catch { return false }
}

/**
 * Retro "how to play" screen shown before a mission level. Keys light up as the
 * player presses them, so they can practise before starting. While it is open,
 * key presses are kept away from the 3D rig so the camera does not move.
 */
export function ControlsGuide({ levelTitle }: { levelTitle: string }) {
  const color = ACCENT
  const [open, setOpen] = useState(() => !readSkip())
  const [skip, setSkip] = useState(readSkip)
  const [down, setDown] = useState<Set<string>>(new Set())
  const [tried, setTried] = useState<Set<string>>(new Set())
  const touch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

  const close = () => {
    setOpen(false)
    setDown(new Set())
    try { localStorage.setItem(SKIP_KEY, skip ? '1' : '0') } catch { /* Shown again next time. */ }
  }

  useEffect(() => {
    if (!open) return
    // Capture phase on window runs before the rig's listeners, so it can swallow the keys.
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'enter' || k === 'escape') { e.preventDefault(); close(); return }
      if (k === 'tab') return
      e.preventDefault()
      e.stopImmediatePropagation()
      setDown((d) => new Set(d).add(k))
      setTried((t) => new Set(t).add(k))
    }
    const ku = (e: KeyboardEvent) => {
      e.stopImmediatePropagation()
      const k = e.key.toLowerCase()
      setDown((d) => { const n = new Set(d); n.delete(k); return n })
    }
    window.addEventListener('keydown', kd, { capture: true })
    window.addEventListener('keyup', ku, { capture: true })
    return () => {
      window.removeEventListener('keydown', kd, { capture: true })
      window.removeEventListener('keyup', ku, { capture: true })
    }
    // `close` only reads `skip`, which is part of the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skip])

  const practised = ROWS.filter((r) => r.keys.flat().some((k) => tried.has(k))).length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-panel)]/90 px-4 text-sm backdrop-blur hover:border-[var(--color-ink-dim)]"
      >
        <Gamepad2 className="size-4" aria-hidden="true" /> Controls
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-[#04050a]/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="controls-title"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-[20px] border-4 bg-[#0b0f24] p-5 shadow-[0_0_0_4px_#04050a,0_0_60px_-10px_var(--glow)] sm:p-8"
              style={{ borderColor: color, ['--glow' as string]: color }}
              data-lenis-prevent
            >
              {/* CRT scanlines */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[16px] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.035)_0_2px,transparent_2px_4px)]" />

              <p className="text-[10px] uppercase tracking-widest" style={{ ...PIXEL, color }}>Mission · {levelTitle}</p>
              <h2 id="controls-title" className="mt-3 text-xl leading-relaxed text-white sm:text-2xl" style={PIXEL}>
                HOW TO FLOAT
              </h2>
              <p className="mt-3 text-sm text-[#b8c0e0]">
                {touch
                  ? 'Drag on the view to look around, and tap the glowing objects. On a keyboard you can also float with the keys below.'
                  : 'You are weightless inside the station. Try the keys now. They light up when you press them.'}
              </p>

              <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto]">
                <ul className="space-y-5">
                  {ROWS.map((row) => (
                    <li key={row.label} className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {row.keys.map((group, gi) => (
                          <div key={gi} className="flex items-center gap-3">
                            {gi > 0 && <span className="text-[10px] text-[#6b7399]" style={PIXEL}>OR</span>}
                            {group.length === 4 ? <KeyCluster keys={group} down={down} color={color} /> : (
                              <div className="flex gap-1.5">{group.map((k) => <KeyCap key={k} k={k} down={down.has(k)} color={color} />)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-[12rem] flex-1">
                        <p className="text-xs text-white" style={PIXEL}>{row.label.toUpperCase()}</p>
                        <p className="mt-1.5 text-sm leading-snug text-[#b8c0e0]">{row.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
                  <MouseHint mode="drag" color={color} title="LOOK" text="Drag to look around" />
                  <MouseHint mode="click" color={color} title="ACT" text="Click glowing objects" />
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-[#2a3160] pt-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#b8c0e0]">
                  <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="size-4 accent-current" style={{ color }} />
                  Don’t show this before every level
                </label>
                <div className="flex items-center gap-4">
                  <span className="hidden text-[10px] text-[#6b7399] sm:inline" style={PIXEL}>{practised}/{ROWS.length} TRIED</span>
                  <button
                    type="button"
                    autoFocus
                    onClick={close}
                    className="rounded-lg border-b-4 px-5 py-3 text-xs text-[#04050a] transition active:translate-y-0.5 active:border-b-2"
                    style={{ ...PIXEL, background: color, borderColor: 'rgba(0,0,0,0.45)' }}
                  >
                    <motion.span animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.1, repeat: Infinity }}>
                      PRESS ENTER TO START
                    </motion.span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** A chunky retro keycap that sinks when pressed. */
function KeyCap({ k, down, color, wide }: { k: string; down: boolean; color: string; wide?: boolean }) {
  const Arrow = ARROWS[k]
  const cap = CAPS[k] ?? (Arrow ? '' : k.toUpperCase())
  const long = cap.length > 1
  return (
    <motion.kbd
      animate={{ y: down ? 4 : 0 }}
      transition={{ type: 'spring', stiffness: 700, damping: 28 }}
      aria-label={k === ' ' ? 'Space' : ARROW_NAMES[k] ?? cap}
      className={cn(
        'grid h-11 place-items-center rounded-md border-2 border-[#04050a] text-[11px] transition-colors',
        long || wide ? 'min-w-[4.75rem] px-2' : 'w-11',
        down ? 'text-[#04050a]' : 'bg-[#e9ecf8] text-[#1a1f3d]',
      )}
      style={{
        ...PIXEL,
        background: down ? color : undefined,
        boxShadow: down ? `0 0 0 #000, 0 0 18px ${color}` : '0 4px 0 #6b7399, 0 4px 0 2px #04050a',
      }}
    >
      {Arrow ? <Arrow className='size-5' strokeWidth={3} aria-hidden='true' /> : cap}
    </motion.kbd>
  )
}

/** Inverted-T cluster: up on top, left / down / right below. */
function KeyCluster({ keys, down, color }: { keys: string[]; down: Set<string>; color: string }) {
  const [up, left, dn, right] = keys
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <span />
      <KeyCap k={up} down={down.has(up)} color={color} />
      <span />
      <KeyCap k={left} down={down.has(left)} color={color} />
      <KeyCap k={dn} down={down.has(dn)} color={color} />
      <KeyCap k={right} down={down.has(right)} color={color} />
    </div>
  )
}

/** Pixel-style mouse with a looping demo of dragging or clicking. */
function MouseHint({ mode, color, title, text }: { mode: 'drag' | 'click'; color: string; title: string; text: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-[#2a3160] bg-[#0f1430] p-3">
      <motion.svg
        viewBox="0 0 40 56" className="h-14 w-10 shrink-0" aria-hidden="true"
        animate={mode === 'drag' ? { x: [-6, 6, -6] } : { scale: [1, 0.92, 1] }}
        transition={{ duration: mode === 'drag' ? 1.8 : 0.9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="3" y="3" width="34" height="50" rx="16" fill="#e9ecf8" stroke="#04050a" strokeWidth="3" />
        <path d="M20 3 v20 M3 23 h34" stroke="#04050a" strokeWidth="3" />
        <motion.path
          d="M5 21 V18 a15 15 0 0 1 13 -13 h0 V21 Z"
          fill={color}
          animate={{ opacity: mode === 'click' ? [1, 0.2, 1] : 1 }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
        <rect x="18" y="9" width="4" height="8" rx="2" fill="#6b7399" />
      </motion.svg>
      <div>
        <p className="text-[10px] text-white" style={PIXEL}>{title}</p>
        <p className="mt-1.5 text-sm leading-snug text-[#b8c0e0]">{text}</p>
      </div>
    </div>
  )
}
