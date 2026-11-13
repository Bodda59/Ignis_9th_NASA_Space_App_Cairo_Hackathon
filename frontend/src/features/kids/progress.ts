/**
 * Kids Lab rewards: stars, space ranks, badges and discovered experiments.
 * Kept in this browser only (a per-child convenience); the page works without it.
 */
import { useSyncExternalStore } from 'react'

export type BadgeId =
  | 'first-discovery' | 'explorer' | 'quiz-star' | 'quiz-perfect' | 'combo'
  | 'earth-hero' | 'flame-scientist' | 'fire-patrol' | 'fire-chief' | 'detective' | 'sharp-eye' | 'star-collector'

export const BADGES: Record<BadgeId, { title: string; how: string; emoji: string }> = {
  'first-discovery': { title: 'First discovery', how: 'Finish the story of one experiment', emoji: '🔭' },
  explorer: { title: 'Space explorer', how: 'Finish 5 experiment stories', emoji: '🚀' },
  'quiz-star': { title: 'Quiz star', how: 'Get 4 answers right in one quiz', emoji: '⭐' },
  'quiz-perfect': { title: 'Perfect mission', how: 'Get every quiz answer right', emoji: '🏆' },
  combo: { title: 'Combo champ', how: 'Get 3 quiz answers right in a row', emoji: '⚡' },
  'earth-hero': { title: 'Earth helper', how: 'Open all the ways space helps Earth', emoji: '🌍' },
  'flame-scientist': { title: 'Flame scientist', how: 'Try the flame in space and on Earth', emoji: '🔥' },
  'fire-patrol': { title: 'Fire patrol', how: 'Score 10 in Fire Patrol', emoji: '🧯' },
  'fire-chief': { title: 'Fire chief', how: 'Score 25 in Fire Patrol', emoji: '👩‍🚀' },
  detective: { title: 'Space detective', how: 'Solve 5 cases in Experiment Detective', emoji: '🕵️' },
  'sharp-eye': { title: 'Sharp eye', how: 'Solve a case with just 1 clue', emoji: '🔍' },
  'star-collector': { title: 'Star collector', how: 'Collect 25 stars in total', emoji: '👑' },
}

/** Space ranks, unlocked by stars. */
export const RANKS = [
  { stars: 0, title: 'Space Cadet', emoji: '🧑‍🚀' },
  { stars: 5, title: 'Rocket Rookie', emoji: '🚀' },
  { stars: 12, title: 'Star Pilot', emoji: '⭐' },
  { stars: 25, title: 'Moon Ranger', emoji: '🌙' },
  { stars: 40, title: 'Comet Commander', emoji: '☄️' },
  { stars: 60, title: 'Galaxy Captain', emoji: '🌌' },
]

export function rankOf(stars: number) {
  let level = 0
  RANKS.forEach((r, i) => { if (stars >= r.stars) level = i })
  const next = RANKS[level + 1]
  const from = RANKS[level].stars
  return {
    level: level + 1,
    ...RANKS[level],
    next,
    progress: next ? (stars - from) / (next.stars - from) : 1,
    toNext: next ? next.stars - stars : 0,
  }
}

type State = { stars: number; badges: BadgeId[]; discovered: string[]; best: number }
const KEY = 'flame-kids-lab'
const CHANGE = 'flame-kids-changed'
/** Fired with the newly earned badge ids so the shell can celebrate them. */
export const BADGE_EVENT = 'flame-kids-badge'
/** Fired with the new rank index (0-based) when the child levels up. */
export const LEVEL_EVENT = 'flame-kids-level'
const EMPTY: State = { stars: 0, badges: [], discovered: [], best: 0 }

let cache: State | null = null

function read(): State {
  if (cache) return cache
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<State> | null
    cache = {
      stars: typeof raw?.stars === 'number' ? raw.stars : 0,
      badges: Array.isArray(raw?.badges) ? raw.badges.filter((b): b is BadgeId => b in BADGES) : [],
      discovered: Array.isArray(raw?.discovered) ? raw.discovered.filter((d) => typeof d === 'string') : [],
      best: typeof raw?.best === 'number' ? raw.best : 0,
    }
  } catch {
    cache = { ...EMPTY }
  }
  return cache
}

function write(next: State) {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Rewards still count for this visit. */ }
  window.dispatchEvent(new Event(CHANGE))
}

/** Adds stars and returns the badges that were newly earned. */
export function reward({ stars = 0, badges = [], discovered, best }: { stars?: number; badges?: BadgeId[]; discovered?: string; best?: number }): BadgeId[] {
  const s = read()
  const found = discovered && !s.discovered.includes(discovered) ? [...s.discovered, discovered] : s.discovered
  const earned = [...badges]
  if (found.length >= 1) earned.push('first-discovery')
  if (found.length >= 5) earned.push('explorer')
  if (s.stars + stars >= 25) earned.push('star-collector')
  const fresh = [...new Set(earned)].filter((b) => !s.badges.includes(b))
  const newBest = Math.max(s.best, best ?? 0)
  if (!stars && !fresh.length && found === s.discovered && newBest === s.best) return []
  const before = rankOf(s.stars).level
  write({ stars: s.stars + stars, badges: [...s.badges, ...fresh], discovered: found, best: newBest })
  if (fresh.length) window.dispatchEvent(new CustomEvent<BadgeId[]>(BADGE_EVENT, { detail: fresh }))
  const after = rankOf(s.stars + stars).level
  if (after > before) window.dispatchEvent(new CustomEvent<number>(LEVEL_EVENT, { detail: after - 1 }))
  return fresh
}

export function resetProgress() {
  write({ ...EMPTY })
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

export function useKidsProgress(): State {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
