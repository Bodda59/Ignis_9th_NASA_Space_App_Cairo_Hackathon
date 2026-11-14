/**
 * Kid-friendly words for the Kids Lab (ages 8–12).
 * These maps only re-word labels that come from the real catalog
 * (safety topics, fuel types, materials, Earth themes, platforms).
 * They never add facts about a study: every number and study detail
 * shown in the Kids Lab comes from the research API.
 */
import type { EarthThemeId, SafetyTopic } from '@/api/types'

/** The three fire-safety "jobs" — the catalog's safety topics in kid words. */
export const JOBS: Record<SafetyTopic, { title: string; short: string; explain: string; color: string; soft: string }> = {
  prevention: {
    title: 'Stop fires before they start',
    short: 'Prevent',
    explain: 'Research on ignition and flame spread can help people design safer spacecraft.',
    color: '#2fbf7f',
    soft: '#dff7ea',
  },
  detection: {
    title: 'Spot smoke fast',
    short: 'Spot',
    explain: 'Research on smoke and dust can help people design better alarms for spacecraft.',
    color: '#2e8fe6',
    soft: '#dfeefc',
  },
  suppression: {
    title: 'Put flames out',
    short: 'Stop',
    explain: 'These experiments test what makes a flame go out, which can help researchers design better ways to put fires out.',
    color: '#8a5cf0',
    soft: '#ece5fd',
  },
}

export const NO_JOB = {
  title: 'Space science',
  short: 'Science',
  explain: 'This study helps scientists understand how things behave in space or in the lab.',
  color: '#e8833a',
  soft: '#fdeedd',
}

export const jobOf = (topic?: SafetyTopic) => (topic ? JOBS[topic] : NO_JOB)

/** Fuel types from the catalog. */
export const FUELS: Record<string, { title: string; explain: string }> = {
  solid: { title: 'Solid', explain: 'Things you can hold, like plastic or fabric.' },
  liquid: { title: 'Liquid', explain: 'Fuels that can flow, like the drops used in some experiments.' },
  gas: { title: 'Gas', explain: 'Invisible fuel gas, like the gas in a kitchen stove.' },
}

/**
 * Plain names for science words that appear in the catalog's material lists.
 * Anything not listed is shown as written, with a "science name" tag.
 */
const MATERIAL_WORDS: [RegExp, string][] = [
  [/^pmma$/i, 'clear plastic (acrylic)'],
  [/^sibal$/i, 'cotton and fiberglass cloth'],
  [/^silicone$/i, 'silicone rubber'],
  [/^heptane$/i, 'heptane, a liquid fuel found in petrol'],
  [/^methanol$/i, 'methanol, an alcohol fuel'],
  [/^kapton$/i, 'Kapton, a thin plastic film used on spacecraft'],
  [/^lampwick$/i, 'lamp wick cloth'],
  [/^(c2h4|ethylene)$/i, 'ethylene gas'],
  [/^(ch4|methane)$/i, 'methane gas (like kitchen-stove gas)'],
  [/^(c3h8|propane)$/i, 'propane gas (like camping-stove gas)'],
  [/^butane$/i, 'butane gas (like lighter gas)'],
  [/^(c12h26|dodecane)$/i, 'dodecane, a liquid fuel found in jet fuel'],
]

export function plainMaterial(raw: string): { text: string; plain: boolean } {
  const hit = MATERIAL_WORDS.find(([re]) => re.test(raw.trim()))
  return hit ? { text: hit[1], plain: true } : { text: raw, plain: false }
}

/** Earth benefit themes (ids from /api/v1/earth) in kid words. */
export const EARTH_THEMES: Record<EarthThemeId, { title: string; explain: string }> = {
  confined_spaces: { title: 'Safer closed-in places', explain: 'Submarines, planes and mines are closed in like a spaceship, so some of the same fire safety questions apply.' },
  smoke_detection: { title: 'Smarter smoke alarms', explain: 'Knowing how smoke behaves helps alarms tell real smoke from dust.' },
  suppression: { title: 'Better fire extinguishers', explain: 'Knowing what makes a flame go out helps people design better extinguishers.' },
  fire_modeling: { title: 'Fire on the computer', explain: 'Scientists build computer models of fire. In microgravity, scientists can test what their models predict when hot air hardly rises.' },
  test_methods: { title: 'Fairer fire tests', explain: 'Space results are compared with the tests used on Earth to pick safe materials.' },
  cleaner_combustion: { title: 'Cleaner engines', explain: 'Understanding flames helps make engines and power plants that waste less fuel and make less pollution.' },
}

/** Where the experiment flew — from the PSI "platform" field. */
export function platformWords(platform?: string | null) {
  if (!platform || /^not applicable$|^unknown$/i.test(platform)) return null
  if (/international space station|\bISS\b/i.test(platform)) return { title: 'International Space Station', explain: 'A big science lab that circles Earth about 16 times a day.' }
  if (/cygnus/i.test(platform)) return { title: 'Cygnus cargo spaceship', explain: 'A cargo spaceship. The Saffire experiments ran after it left the space station, with nobody on board.' }
  return { title: platform, explain: '' }
}

/** Earth's air: about 21% oxygen at about 101 kPa at sea level. */
export const EARTH_OXYGEN_PCT = 21
export const EARTH_PRESSURE_KPA = 101.3
