/**
 * Cartoon sound effects, synthesised with Web Audio (no sound files).
 * One mute switch for the whole Kids Lab, remembered in this browser.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'flame-kids-sound'
const CHANGE = 'flame-kids-sound-changed'
let muted: boolean | null = null
let ctx: AudioContext | null = null

function readMuted() {
  if (muted !== null) return muted
  try { muted = localStorage.getItem(KEY) === 'off' } catch { muted = false }
  return muted
}

export function setSound(on: boolean) {
  muted = !on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* Applies to this visit only. */ }
  if (!on && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  window.dispatchEvent(new Event(CHANGE))
}

export const soundOn = () => !readMuted()

export function useSoundOn() {
  return useSyncExternalStore(
    (l) => { window.addEventListener(CHANGE, l); return () => window.removeEventListener(CHANGE, l) },
    soundOn,
    () => false,
  )
}

function audio() {
  if (!soundOn()) return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx ??= new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

type Note = { f: number; to?: number; t: number; d: number; type?: OscillatorType; v?: number }

function play(notes: Note[]) {
  const a = audio()
  if (!a) return
  const now = a.currentTime
  for (const n of notes) {
    const osc = a.createOscillator()
    const gain = a.createGain()
    osc.type = n.type ?? 'triangle'
    osc.frequency.setValueAtTime(n.f, now + n.t)
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, now + n.t + n.d)
    const v = n.v ?? 0.18
    gain.gain.setValueAtTime(0.0001, now + n.t)
    gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    osc.connect(gain).connect(a.destination)
    osc.start(now + n.t)
    osc.stop(now + n.t + n.d + 0.02)
  }
}

export const sfx = {
  /** Soft bubble pop for taps. */
  pop: () => play([{ f: 420, to: 880, t: 0, d: 0.09, type: 'sine', v: 0.14 }]),
  /** Two happy notes. */
  correct: () => play([{ f: 660, t: 0, d: 0.12 }, { f: 990, t: 0.1, d: 0.22 }]),
  /** Gentle "boing" — never harsh. */
  wrong: () => play([{ f: 300, to: 160, t: 0, d: 0.28, type: 'sine', v: 0.16 }]),
  /** Coin-like sparkle for stars. */
  star: () => play([{ f: 1320, t: 0, d: 0.07, type: 'square', v: 0.06 }, { f: 1760, t: 0.06, d: 0.16, type: 'square', v: 0.06 }]),
  /** Rising fanfare. */
  levelUp: () => play([523, 659, 784, 1047].map((f, i) => ({ f, t: i * 0.11, d: 0.22, v: 0.15 }))),
  /** Robot chirp before Orbi talks. */
  chirp: () => play([{ f: 700, to: 1200, t: 0, d: 0.07, type: 'square', v: 0.05 }, { f: 1100, to: 800, t: 0.08, d: 0.08, type: 'square', v: 0.05 }]),
  /** Whoosh of the extinguisher. */
  spray: () => play([{ f: 900, to: 200, t: 0, d: 0.18, type: 'sawtooth', v: 0.05 }]),
  /** Little alarm when a flame grows too big. */
  alarm: () => play([{ f: 880, t: 0, d: 0.1, type: 'square', v: 0.06 }, { f: 660, t: 0.12, d: 0.1, type: 'square', v: 0.06 }]),
}
