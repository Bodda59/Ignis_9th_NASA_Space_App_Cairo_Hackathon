import { BellRing, Box, Cloud, Droplet, Droplets, Flame, ShieldCheck } from 'lucide-react'
import type { SafetyTopic } from '@/api/types'

/** One picture per fire-safety job. */
export const JOB_ICONS: Record<SafetyTopic, typeof ShieldCheck> = { prevention: ShieldCheck, detection: BellRing, suppression: Droplets }
export const jobIcon = (t?: SafetyTopic) => (t ? JOB_ICONS[t] : Flame)

/** One picture per fuel type. */
export const FUEL_ICONS: Record<string, typeof Box> = { solid: Box, liquid: Droplet, gas: Cloud }
