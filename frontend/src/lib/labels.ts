import { Flame, Radar, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { EquipmentCategory, GravityRegime, HabitatId, SafetyTopic } from '@/api/types'

/** One fixed color + icon per safety topic, used everywhere. */
export const TOPIC: Record<SafetyTopic, { label: string; color: string; icon: LucideIcon }> = {
  prevention: { label: 'Prevention', color: 'var(--color-prevention)', icon: ShieldCheck },
  detection: { label: 'Detection', color: 'var(--color-detection)', icon: Radar },
  suppression: { label: 'Suppression', color: 'var(--color-suppression)', icon: Flame },
}

export const HABITAT_LABEL: Record<HabitatId, string> = {
  spacecraft: 'Spacecraft',
  space_station: 'Space station',
  lunar_base: 'Lunar base',
  mars_base: 'Mars base',
  pressurized_rover: 'Pressurized rover',
}

export const GRAVITY_LABEL: Record<GravityRegime, string> = {
  microgravity: 'Microgravity',
  normal_gravity: 'Normal gravity',
  partial_gravity: 'Partial gravity',
  simulated_effect: 'Simulated effect',
  unknown: 'Unknown',
}

export const EQUIPMENT_LABEL: Record<EquipmentCategory, string> = {
  smoke_detection: 'Smoke detection',
  suppression: 'Suppression',
  material_controls: 'Material controls',
}

export const CONDITION_LABEL = {
  oxygen_pct: 'Oxygen',
  pressure_kpa: 'Total pressure',
  airflow_m_s: 'Airflow',
} as const
