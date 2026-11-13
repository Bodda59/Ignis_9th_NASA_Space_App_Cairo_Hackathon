import { Award, Compass, Crown, Earth, Flame, Medal, Moon, Orbit, Rocket, Search, ShieldCheck, Sparkles, Star, Telescope, Trophy, Zap, type LucideIcon } from 'lucide-react'
import type { BadgeId } from './progress'

/** Medal icon and colour for each badge (drawn by Medal3D). */
export const BADGE_ART: Record<BadgeId, { icon: LucideIcon; color: string }> = {
  'first-discovery': { icon: Telescope, color: '#6ee7ff' },
  explorer: { icon: Rocket, color: '#ffcf4a' },
  'quiz-star': { icon: Star, color: '#ffcf4a' },
  'quiz-perfect': { icon: Trophy, color: '#ffb84a' },
  combo: { icon: Zap, color: '#ff8a3d' },
  'earth-hero': { icon: Earth, color: '#7ee2a8' },
  'flame-scientist': { icon: Flame, color: '#ff8fb1' },
  'fire-patrol': { icon: ShieldCheck, color: '#ff6b8b' },
  'fire-chief': { icon: Medal, color: '#b79bff' },
  detective: { icon: Search, color: '#6ee7ff' },
  'sharp-eye': { icon: Sparkles, color: '#ffcf4a' },
  'star-collector': { icon: Crown, color: '#ff8fb1' },
}

/** One icon per space rank (same order as RANKS). */
export const RANK_ART: { icon: LucideIcon; color: string }[] = [
  { icon: Compass, color: '#c9d3ff' },
  { icon: Rocket, color: '#ffcf4a' },
  { icon: Star, color: '#6ee7ff' },
  { icon: Moon, color: '#b79bff' },
  { icon: Orbit, color: '#ff8fb1' },
  { icon: Award, color: '#ffb84a' },
]

