/**
 * Tiny synthesized sound effects (Web Audio): no audio files to download.
 * Audio starts only after a user gesture, and the mute choice is remembered.
 */
const KEY = 'flame-in-freefall:mission:muted'

let ctx: AudioContext | null = null
let muted = (() => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
})()
let alarmTimer: number | undefined

function audio() {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, { type = 'sine' as OscillatorType, gain = 0.08, slide = 0, delay = 0 } = {}) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, { gain = 0.06, low = 600, high = 6000 } = {}) {
  const a = audio()
  if (!a) return
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = a.createBufferSource()
  src.buffer = buf
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = Math.sqrt(low * high)
  bp.Q.value = 0.6
  const g = a.createGain()
  g.gain.value = gain
  src.connect(bp).connect(g).connect(a.destination)
  src.start()
}

export const sfx = {
  click: () => tone(880, 0.06, { type: 'triangle', gain: 0.05 }),
  place: () => { tone(520, 0.08, { type: 'square', gain: 0.04 }); tone(780, 0.1, { type: 'square', gain: 0.04, delay: 0.07 }) },
  good: () => { tone(660, 0.12, { gain: 0.07 }); tone(990, 0.18, { gain: 0.07, delay: 0.1 }) },
  bad: () => tone(180, 0.28, { type: 'sawtooth', gain: 0.05, slide: -60 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.07, delay: i * 0.11 })),
  hiss: () => noise(0.9, { gain: 0.09, low: 1500, high: 9000 }),
  whoosh: () => noise(0.5, { gain: 0.07, low: 300, high: 2000 }),
  ignite: () => noise(0.7, { gain: 0.08, low: 200, high: 1500 }),
  alarmStart() {
    if (alarmTimer !== undefined) return
    const beep = () => { tone(960, 0.18, { type: 'square', gain: 0.035 }); tone(720, 0.18, { type: 'square', gain: 0.035, delay: 0.22 }) }
    beep()
    alarmTimer = window.setInterval(beep, 900)
  },
  alarmStop() {
    if (alarmTimer !== undefined) window.clearInterval(alarmTimer)
    alarmTimer = undefined
  },
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v
    if (v) this.alarmStop()
    try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* not saved */ }
  },
}
