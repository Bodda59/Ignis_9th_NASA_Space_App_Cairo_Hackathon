import { useEffect, useState } from 'react'
import { sfx, useSoundOn } from './sfx'

/** Bright, friendly voices first; the browser decides which ones exist. */
const PREFERRED = [/aria/i, /jenny/i, /zira/i, /samantha/i, /google uk english female/i, /google us english/i, /female/i]

function cartoonVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
  for (const re of PREFERRED) {
    const hit = voices.find((v) => re.test(v.name))
    if (hit) return hit
  }
  return voices[0] ?? null
}

/**
 * Orbi's cartoon voice: the browser's speech voice pitched up and a little
 * faster, after a robot chirp. Silent when the Kids Lab sound is off.
 */
export function useSpeech() {
  const soundOn = useSoundOn()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && soundOn
  const [talking, setSpeaking] = useState(false)
  const speaking = talking && soundOn

  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])

  const speak = (text: string) => {
    if (!supported) return
    window.speechSynthesis.cancel()
    if (speaking) { setSpeaking(false); return }
    sfx.chirp()
    const u = new SpeechSynthesisUtterance(text)
    const voice = cartoonVoice()
    if (voice) u.voice = voice
    u.pitch = 1.9
    u.rate = 1.08
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    setTimeout(() => window.speechSynthesis.speak(u), 180)
  }
  return { supported, speaking, speak }
}
