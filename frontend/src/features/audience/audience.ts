import { useSyncExternalStore } from 'react'

export const AUDIENCES = ['undergraduate', 'graduate', 'professor', 'researcher', 'engineer'] as const
export type Audience = (typeof AUDIENCES)[number]
const KEY = 'flame-freefall-audience'
const CHANGE = 'flame-audience-changed'
let selected: Audience | undefined

export function getAudience(): Audience {
  if (selected) return selected
  try {
    const stored = localStorage.getItem(KEY)
    if (AUDIENCES.includes(stored as Audience)) return stored as Audience
  } catch { /* Storage may be unavailable in private sessions. */ }
  return 'graduate'
}

export function setAudience(value: Audience) {
  selected = value
  try { localStorage.setItem(KEY, value) } catch { /* The selection still applies to this session. */ }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

export function useAudience(): Audience {
  return useSyncExternalStore<Audience>(subscribe, getAudience, () => 'graduate')
}
