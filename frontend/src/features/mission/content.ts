/**
 * Mission content. Every science statement is either from the 2026 "Flame in
 * Freefall" challenge brief (the same facts the rest of the site cites) or
 * long-standing, well-documented NASA practice. Game rules that simplify the
 * science are labelled `simplification` and shown to players as such.
 *
 * Study ids are research-catalog ids (backend/data_pipeline/sources/investigations.json).
 */

export type LevelId = 'prevention' | 'detection' | 'suppression'

export type Study = { id: string; acronym: string; name: string; fact: string }

export const STUDIES = {
  bass: { id: 'PSI-25', acronym: 'BASS-II', name: 'Burning and Suppression of Solids II', fact: 'Burned solid materials in microgravity inside a fan-driven flow duct to see how airflow changes flame spread.' },
  saffire: { id: 'PSI-98', acronym: 'Saffire-I', name: 'Spacecraft Fire Safety Experiment I', fact: 'Lit large fabric and plastic samples inside uncrewed cargo spacecraft after they left the station, to study fire growth at real scale.' },
  cfig: { id: 'PSI-159', acronym: 'CFI-G', name: 'ACME · Cool Flames Investigation with Gases', fact: 'Ran oxygen-nitrogen flows of up to 85% oxygen, the highest oxygen levels in PSI microgravity tests.' },
  same: { id: 'PSI-102', acronym: 'SAME', name: 'Smoke and Aerosol Measurement Experiment', fact: 'Measured smoke particles from overheated spacecraft materials in microgravity to improve smoke detectors.' },
  daft: { id: 'PSI-47', acronym: 'DAFT', name: 'Dust and Aerosol Measurement Feasibility Test', fact: 'Reused a SAME smoke instrument to measure dust, because dust and smoke can look alike to a detector.' },
  flex: { id: 'PSI-69', acronym: 'FLEX', name: 'Flame Extinguishment Experiment', fact: 'Burned fuel droplets in microgravity and found that diluting the air with carbon dioxide or helium put the flames out.' },
} satisfies Record<string, Study>

export type Level = {
  id: LevelId
  n: number
  title: string
  topic: string
  color: string
  briefing: string
  goal: string
  studies: Study[]
}

export const LEVELS: Level[] = [
  {
    id: 'prevention', n: 1, title: 'Set up a safe cabin', topic: 'Prevention', color: 'var(--color-prevention)',
    briefing: 'Your crew is heading for a lunar base. Moon habitat designs use lower cabin pressure so astronauts can step into their spacesuits faster, and they raise the oxygen percentage so the crew can still breathe. But more oxygen makes things burn more easily.',
    goal: 'Tune the cabin air so the crew can breathe and suit up quickly, then pick materials that resist fire.',
    studies: [STUDIES.bass, STUDIES.saffire, STUDIES.cfig],
  },
  {
    id: 'detection', n: 2, title: 'Catch the smoke', topic: 'Detection', color: 'var(--color-detection)',
    briefing: 'Something is overheating behind a rack panel. In orbit there is no "up": warm smoke does not rise to the ceiling. It drifts wherever the ventilation fans push the air.',
    goal: 'Place three smoke detectors where the smoke will actually go, then run the ventilation and see what you catch.',
    studies: [STUDIES.same, STUDIES.daft],
  },
  {
    id: 'suppression', n: 3, title: 'Put out the fire', topic: 'Suppression', color: 'var(--color-suppression)',
    briefing: 'A small fire has started in an equipment rack. In microgravity it burns as a blue ball, and it lives off the fresh oxygen that the airflow carries to it.',
    goal: 'Choose the right actions in the right order before the fire grows.',
    studies: [STUDIES.flex, STUDIES.bass],
  },
]

// ── Level 1: cabin atmosphere ───────────────────────────────────────
export const ATMOSPHERE = {
  earth: { o2: 21, psi: 14.7 },
  lunarCabin: { o2: 30, psi: 10.2 }, // challenge brief example
  suit: { o2: 100, psi: 4.3 }, // challenge brief example
  /** simplification: "breathable" band for oxygen partial pressure, around Earth's 3.1 psi */
  breathe: { min: 2.8, max: 3.6 },
  /** simplification: at or below this cabin pressure, suiting up needs little oxygen pre-breathing */
  evaReady: 10.5,
  /** simplification: above this oxygen percentage, common materials get much easier to ignite */
  fireRisk: 32,
}

export const partialPressure = (o2: number, psi: number) => (o2 / 100) * psi

export type MaterialChoice = { label: string; safe: boolean; why: string }
export type CabinItem = { id: string; name: string; choices: [MaterialChoice, MaterialChoice] }

/** Spacecraft materials are flammability-tested before flight (NASA-STD-6001). */
export const CABIN_ITEMS: CabinItem[] = [
  {
    id: 'clothing', name: 'Crew clothing',
    choices: [
      { label: 'Cotton T-shirt', safe: false, why: 'Cotton ignites easily, and even more easily in oxygen-rich air.' },
      { label: 'Flame-resistant aramid fabric', safe: true, why: 'Aramid fibers (like Nomex) are hard to ignite and stop burning when the flame is removed.' },
    ],
  },
  {
    id: 'stowage', name: 'Stowage bag cover',
    choices: [
      { label: 'Fiberglass "Beta cloth"', safe: true, why: 'Beta cloth is woven glass fiber. NASA adopted it after the Apollo 1 fire because it does not burn.' },
      { label: 'Thin plastic film', safe: false, why: 'Thin plastic films catch fire and spread flame quickly.' },
    ],
  },
  {
    id: 'wiring', name: 'Cable insulation',
    choices: [
      { label: 'PTFE (Teflon) insulation', safe: true, why: 'PTFE resists burning and gives off little gas, so it is widely used for spacecraft wiring.' },
      { label: 'PVC insulation', safe: false, why: 'PVC burns and releases toxic, corrosive smoke, a big problem in a sealed cabin.' },
    ],
  },
]

// ── Level 2: detector slots ─────────────────────────────────────────
/** Air flows from the fan (x = -6) to the return vent (x = +6) along the module. */
export type Slot = { id: string; label: string; x: number; y: number; z: number; kind: 'ceiling' | 'wall' | 'vent' }

export const SLOTS: Slot[] = [
  { id: 'ceiling-a', label: 'Ceiling, forward', x: -3, y: 1.55, z: 0, kind: 'ceiling' },
  { id: 'ceiling-b', label: 'Ceiling, aft', x: 3, y: 1.55, z: 0, kind: 'ceiling' },
  { id: 'wall-a', label: 'Wall, forward', x: -2.2, y: 0, z: -1.6, kind: 'wall' },
  { id: 'wall-b', label: 'Wall, middle', x: 1, y: 0, z: -1.6, kind: 'wall' },
  { id: 'wall-c', label: 'Wall, aft', x: 3.8, y: 0, z: -1.6, kind: 'wall' },
  { id: 'vent', label: 'Return-air vent', x: 5.6, y: 0, z: 0, kind: 'vent' },
]

/** Rack centres on the port wall (matches ModuleInterior); one of them hides the overheating part. */
export const RACK_X = [-3.45, -1.15, 1.15, 3.45]

/**
 * A crew member shakes out a dusty bag mid-run. Dust drifts with the air like
 * smoke and sets off the next detector downstream: a false alarm (the DAFT lesson).
 */
export const DUST = { x: -0.4, start: 2.5, hits: 'wall-b' }
export const dustTime = () => DUST.start + (SLOTS.find((s) => s.id === DUST.hits)!.x - DUST.x) / AIR_SPEED

/**
 * simplification: smoke moves downstream with the air at constant speed and
 * spreads sideways as it goes; it never rises on its own.
 */
export const AIR_SPEED = 0.9 // units per second
export const reachTime = (sourceX: number, slot: Slot) => {
  if (slot.x < sourceX - 0.1) return null // upstream: the flow never carries smoke there
  const dx = slot.x - sourceX
  if (slot.kind === 'vent') return dx / AIR_SPEED // all cabin air returns through the vent
  const lateral = slot.kind === 'ceiling' ? 1.55 : 0.2 // distance from the smoke plume near the rack wall
  const spread = 0.35 + dx * 0.32 // plume widens downstream
  return lateral <= spread ? dx / AIR_SPEED : null
}

// ── Level 3: suppression actions ────────────────────────────────────
export type ActionId = 'power' | 'fans' | 'co2' | 'water' | 'blow' | 'wait'
export type Action = { id: ActionId; label: string; detail: string }

export const ACTIONS: Action[] = [
  { id: 'power', label: 'Cut power to the rack', detail: 'Removes the heat source that started the fire.' },
  { id: 'fans', label: 'Stop the ventilation fans', detail: 'Stops fresh oxygen flowing to the flame.' },
  { id: 'co2', label: 'Use the CO₂ extinguisher', detail: 'Floods the rack with carbon dioxide.' },
  { id: 'water', label: 'Squirt drinking water', detail: 'Water from the galley.' },
  { id: 'blow', label: 'Blow on it / fan it', detail: 'Like blowing out a candle.' },
  { id: 'wait', label: 'Wait and watch', detail: 'Maybe it burns itself out.' },
]

export const ACTION_FEEDBACK: Record<ActionId, string> = {
  power: 'Good. With power off, the overheated part stops feeding heat to the fire.',
  fans: 'Good. Without airflow, the flame only gets oxygen by slow diffusion, so it weakens.',
  co2: 'CO₂ dilutes the oxygen around the flame. FLEX showed dilution with CO₂ or helium puts microgravity flames out.',
  water: 'Loose water forms floating blobs around live electronics. Never use it on an electrical fire in a rack.',
  blow: 'In microgravity, blowing brings the flame fresh oxygen, so it burns stronger instead of going out.',
  wait: 'The fire keeps growing while you wait. Every second counts in a sealed cabin.',
}

// ── progress ────────────────────────────────────────────────────────
export type Progress = Partial<Record<LevelId, number>> // stars 1–3

const KEY = 'flame-in-freefall:mission:v1'

export function loadProgress(): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function saveStars(level: LevelId, stars: number): Progress {
  const next = { ...loadProgress() }
  next[level] = Math.max(next[level] ?? 0, stars)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: progress lasts for this visit */
  }
  return next
}
