const SEEN_KEY = 'ignis:opening:seen'

/** Whether the opening film was already watched or skipped in this browser session. */
export function readSeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
export function writeSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* private mode: the opening simply replays next visit */ }
}
