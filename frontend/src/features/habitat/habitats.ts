/**
 * Habitat context choices (enum values match HABITAT_IDS in the API contract types).
 * Gravity is a physical constant for display only — selecting a habitat never
 * injects atmospheric conditions into a search.
 */
export type HabitatId = 'spacecraft' | 'space_station' | 'lunar_base' | 'mars_base' | 'pressurized_rover'

export type Habitat = {
  id: HabitatId
  name: string
  short: string
  blurb: string
  gravityG: number
  gravityLabel: string
  /** true when the challenge brief says no PSI combustion data exists at this gravity */
  partialGravity: boolean
  orb: string
}

export const HABITATS: Habitat[] = [
  {
    id: 'spacecraft',
    name: 'Spacecraft',
    short: 'Craft',
    blurb: 'Crew vehicles in transit — small sealed volumes where ventilation drives airflow.',
    gravityG: 0,
    gravityLabel: 'Microgravity',
    partialGravity: false,
    orb: 'radial-gradient(circle at 35% 30%, #6d7cff 0%, #2a2f86 35%, #0b0d2a 70%)',
  },
  {
    id: 'space_station',
    name: 'Space station',
    short: 'Station',
    blurb: 'Long-duration orbital habitats such as the ISS, where most PSI combustion experiments flew.',
    gravityG: 0,
    gravityLabel: 'Microgravity',
    partialGravity: false,
    orb: 'radial-gradient(circle at 40% 25%, #9fe0ff 0%, #2f7fd6 30%, #0e2a63 60%, #050b1f 80%)',
  },
  {
    id: 'lunar_base',
    name: 'Lunar base',
    short: 'Moon',
    blurb: 'Surface habitats planned with oxygen-enriched, reduced-pressure air to ease spacesuit use.',
    gravityG: 0.166,
    gravityLabel: 'Partial gravity',
    partialGravity: true,
    orb: 'radial-gradient(circle at 35% 25%, #e9e9ee 0%, #9a9aa6 30%, #4a4a55 60%, #141418 82%)',
  },
  {
    id: 'mars_base',
    name: 'Mars base',
    short: 'Mars',
    blurb: 'Future surface outposts — far from resupply, where fire safety must be self-reliant.',
    gravityG: 0.38,
    gravityLabel: 'Partial gravity',
    partialGravity: true,
    orb: 'radial-gradient(circle at 35% 25%, #ffb38a 0%, #c1532c 32%, #5a1d12 62%, #160806 82%)',
  },
  {
    id: 'pressurized_rover',
    name: 'Pressurized rover',
    short: 'Rover',
    blurb: 'Compact mobile cabins for long surface excursions, with crew living in a shirt-sleeve environment.',
    gravityG: 0.166,
    gravityLabel: 'Partial gravity (lunar)',
    partialGravity: true,
    orb: 'radial-gradient(circle at 35% 25%, #f1dcc0 0%, #a48d72 30%, #4d4033 60%, #15110d 82%)',
  },
]
