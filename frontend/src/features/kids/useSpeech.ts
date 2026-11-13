import { useEffect, useRef, useState } from 'react'
import { sfx, useSoundOn } from './sfx'

/**
 * Orbi's voice: a warm, lively cartoon-teacher voice. Natural neural voices
 * (Edge) are tried first; the browser decides which ones exist.
 */
const TEACHER_VOICES = [/ana.*natural/i, /ava.*natural/i, /aria.*natural/i, /jenny.*natural/i, /emma.*natural/i, /michelle.*natural/i,
  /google uk english female/i, /samantha/i, /zira/i, /female/i]
const PITCH = 1.25
const RATE = 1.12

function teacherVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
  for (const re of TEACHER_VOICES) {
    const hit = voices.find((v) => re.test(v.name))
    if (hit) return hit
  }
  return voices.find((v) => /natural/i.test(v.name)) ?? voices[0] ?? null
}

/** Reads text aloud in one go (no gaps between sentences). Silent when the Kids Lab sound is off. */
export function useSpeech() {
  const soundOn = useSoundOn()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && soundOn
  const [talking, setTalking] = useState(false)
  const run = useRef(0)
  const speaking = talking && soundOn

  // Voices load late in some browsers; asking once wakes the list up.
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.getVoices()
    const wake = () => window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', wake)
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', wake)
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = (text: string) => {
    if (!supported) return
    window.speechSynthesis.cancel()
    const id = ++run.current
    if (speaking) { setTalking(false); return }
    sfx.chirp()
    const u = new SpeechSynthesisUtterance(text)
    const voice = teacherVoice()
    if (voice) u.voice = voice
    u.pitch = PITCH
    u.rate = RATE
    u.onend = () => { if (run.current === id) setTalking(false) }
    u.onerror = () => { if (run.current === id) setTalking(false) }
    setTalking(true)
    window.speechSynthesis.speak(u)
  }

  return { supported, speaking, speak }
}
