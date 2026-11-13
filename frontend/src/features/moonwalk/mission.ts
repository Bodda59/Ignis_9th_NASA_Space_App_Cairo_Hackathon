/**
 * Moonwalk mission — rules and numbers.
 *
 * Every figure marked "brief" comes from the challenge text ("Spacesuits and
 * oxygen concentration"). Partial pressures are plain arithmetic on those
 * figures (total pressure × gas fraction). The nitrogen wash-out curve and the
 * safe line are a simplified teaching model, not medical or operational guidance.
 */

export const EARTH_PSI = 14.7 // brief
export const SUIT_PSI = 4.3 // brief
export const MOON_BASE_PSI = 10.2 // brief: "10.2 psi or less"
export const MOON_BASE_O2 = 0.3 // brief: "30% or greater"
export const EARTH_O2 = 0.21
export const CFI_G_MAX_O2 = 0.85 // brief: highest-oxygen microgravity tests

export type CabinId = 'earth_like' | 'exploration'
export type MaterialsId = 'earth_qualified' | 'oxygen_qualified'
export type SuitId = 'oxygen_low' | 'air_low' | 'oxygen_high'
export type StepId = 'cabin' | 'materials' | 'prebreathe' | 'suit' | 'debrief'

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'cabin', label: 'Cabin air' },
  { id: 'materials', label: 'Materials' },
  { id: 'prebreathe', label: 'Pre-breathe' },
  { id: 'suit', label: 'Suit' },
  { id: 'debrief', label: 'Debrief' },
]

export type Atmosphere = { psi: number; o2: number }

export type Option<T extends string> = {
  id: T
  title: string
  spec: string
  /** Shown before choosing: what this option is. */
  blurb: string
  /** Shown after choosing: why it matters. */
  why: string
}

export const CABINS: (Option<CabinId> & Atmosphere)[] = [
  {
    id: 'earth_like',
    title: 'Earth-like air',
    spec: '14.7 psi · 21% oxygen',
    psi: EARTH_PSI,
    o2: EARTH_O2,
    blurb: 'The same air as sea level on Earth.',
    why: 'Familiar and no more flammable than home, but the crew’s bodies hold a lot of nitrogen, so getting ready for a spacewalk takes a long pre-breathe.',
  },
  {
    id: 'exploration',
    title: 'Exploration atmosphere',
    spec: '10.2 psi · 30% oxygen',
    psi: MOON_BASE_PSI,
    o2: MOON_BASE_O2,
    blurb: 'Between a spacesuit and Earth’s air — what the Moon Base and rovers are expected to use.',
    why: 'Less nitrogen in the body means a shorter pre-breathe and easier excursions. The cost: over 40% more oxygen than Earth’s air makes materials much more flammable.',
  },
]

export const MATERIALS: Option<MaterialsId>[] = [
  {
    id: 'earth_qualified',
    title: 'Checked in Earth air only',
    spec: 'Flammability known at 21% oxygen',
    blurb: 'Fabrics and plastics picked from how they burn in normal air.',
    why: 'Flammability depends strongly on oxygen concentration. A material that is acceptable at 21% oxygen can behave very differently at 30%.',
  },
  {
    id: 'oxygen_qualified',
    title: 'Chosen for the cabin’s oxygen level',
    spec: 'Flammability limits known at cabin conditions',
    blurb: 'Materials selected using flammability limits measured at the oxygen level the crew will live in.',
    why: 'Prevention works through material selection, and that depends on understanding flammability limits — the data BASS, BASS-II and Saffire were flown to collect.',
  },
]

export const SUITS: (Option<SuitId> & Atmosphere)[] = [
  {
    id: 'oxygen_low',
    title: 'Pure oxygen, low pressure',
    spec: '4.3 psi · 100% oxygen',
    psi: SUIT_PSI,
    o2: 1,
    blurb: 'How spacesuits are actually filled.',
    why: 'Low pressure keeps the suit flexible, and filling it with pure oxygen still gives the astronaut more oxygen than sea-level air.',
  },
  {
    id: 'air_low',
    title: 'Normal air, low pressure',
    spec: '4.3 psi · 21% oxygen',
    psi: SUIT_PSI,
    o2: EARTH_O2,
    blurb: 'Keep the suit flexible but fill it with ordinary air.',
    why: 'At 4.3 psi, air carries under a third of the oxygen it does at sea level. That is why the low-pressure suit has to be 100% oxygen.',
  },
  {
    id: 'oxygen_high',
    title: 'Pure oxygen, full pressure',
    spec: '14.7 psi · 100% oxygen',
    psi: EARTH_PSI,
    o2: 1,
    blurb: 'Skip the pressure drop: keep the suit at Earth’s sea-level pressure.',
    why: 'No pressure drop means no bends, but a suit inflated this hard is stiff like a balloon. Suits run at 4.3 psi to enable flexibility.',
  },
]

export const byId = <T extends { id: string }>(list: T[], id: string | undefined) => list.find((x) => x.id === id)

/** Partial pressure of oxygen / nitrogen in psi (total pressure × fraction). */
export const oxygenPsi = (a: Atmosphere) => a.psi * a.o2
export const nitrogenPsi = (a: Atmosphere) => a.psi * (1 - a.o2)

/* ── Simplified pre-breathe model ───────────────────────────────────────── */

/** Mission clock length in ticks; pre-breathing spends it, the rest is surface time. */
export const CLOCK_TICKS = 100
/** Nitrogen left in the body falls by this factor per tick while breathing pure oxygen. */
const WASHOUT_PER_TICK = 0.985
/** Illustrative safe line: body nitrogen ÷ suit pressure must be at or below this. */
export const SAFE_RATIO = 1.3

export const washOut = (n2: number, ticks = 1) => n2 * WASHOUT_PER_TICK ** ticks
export const safeNitrogenPsi = (suitPsi: number) => SAFE_RATIO * suitPsi
/** Ticks of pre-breathe needed to reach the safe line from a cabin, for a suit pressure. */
export function ticksNeeded(cabin: Atmosphere, suitPsi = SUIT_PSI) {
  const start = nitrogenPsi(cabin)
  const target = safeNitrogenPsi(suitPsi)
  return start <= target ? 0 : Math.ceil(Math.log(target / start) / Math.log(WASHOUT_PER_TICK))
}

/* ── Outcome ───────────────────────────────────────────────────────────── */

export type MissionState = {
  cabin?: CabinId
  materials?: MaterialsId
  suit?: SuitId
  /** Ticks spent pre-breathing. */
  ticks: number
  /** Nitrogen partial pressure left in the body, psi. */
  n2: number
}

export type Verdict = 'good' | 'warn' | 'bad'
export type Finding = { id: 'body' | 'breathing' | 'mobility' | 'fire' | 'time'; label: string; verdict: Verdict; headline: string; detail: string }

export function debrief(s: MissionState): Finding[] {
  const cabin = byId(CABINS, s.cabin)!
  const suit = byId(SUITS, s.suit)!
  const bends = s.n2 > safeNitrogenPsi(suit.psi) + 1e-9
  const suitO2 = oxygenPsi(suit)
  const earthO2 = oxygenPsi({ psi: EARTH_PSI, o2: EARTH_O2 })
  const surface = Math.max(0, CLOCK_TICKS - s.ticks)
  const enriched = cabin.o2 > EARTH_O2
  const pct = Math.round((cabin.o2 / EARTH_O2 - 1) * 100)

  return [
    {
      id: 'body',
      label: 'Decompression',
      verdict: bends ? 'bad' : 'good',
      headline: bends ? 'The bends' : 'No bubbles',
      detail: bends
        ? `The astronaut stepped into a ${suit.psi} psi suit with ${s.n2.toFixed(1)} psi of nitrogen still dissolved in the body. As pressure dropped, that nitrogen came out as bubbles — decompression sickness. Pre-breathing 100% oxygen is what expels it first.`
        : suit.psi >= cabin.psi
          ? 'The suit was not at a lower pressure than the cabin, so dissolved nitrogen had no reason to form bubbles.'
          : `Pre-breathing 100% oxygen expelled enough nitrogen (down to ${s.n2.toFixed(1)} psi) before the drop to ${suit.psi} psi.`,
    },
    {
      id: 'breathing',
      label: 'Oxygen to breathe',
      verdict: suitO2 >= earthO2 ? 'good' : 'bad',
      headline: suitO2 >= earthO2 ? 'Plenty of oxygen' : 'Not enough oxygen',
      detail: suitO2 >= earthO2
        ? `The suit holds ${suitO2.toFixed(1)} psi of oxygen — at least as much as sea-level air (${earthO2.toFixed(1)} psi).`
        : `Air at ${suit.psi} psi holds only ${suitO2.toFixed(1)} psi of oxygen, against ${earthO2.toFixed(1)} psi at sea level. A low-pressure suit must be filled with 100% oxygen.`,
    },
    {
      id: 'mobility',
      label: 'Suit flexibility',
      verdict: suit.psi > SUIT_PSI ? 'bad' : 'good',
      headline: suit.psi > SUIT_PSI ? 'Too stiff to work' : 'Free to move',
      detail: suit.psi > SUIT_PSI
        ? `In the vacuum outside, a suit at ${suit.psi} psi balloons and resists every bend of an arm or glove. Suits are filled to only ${SUIT_PSI} psi to enable flexibility.`
        : `At ${SUIT_PSI} psi the suit bends with the astronaut, which is the reason for the low pressure.`,
    },
    {
      id: 'fire',
      label: 'Cabin fire safety',
      verdict: !enriched ? 'good' : s.materials === 'oxygen_qualified' ? 'warn' : 'bad',
      headline: !enriched ? 'No added flammability' : s.materials === 'oxygen_qualified' ? 'Higher risk, managed' : 'Higher risk, unmanaged',
      detail: !enriched
        ? 'At 21% oxygen, materials are no more flammable than on Earth, so Earth-air data still applies to the atmosphere. (Low gravity changes flames too — that part is still open.)'
        : s.materials === 'oxygen_qualified'
          ? `At ${Math.round(cabin.o2 * 100)}% oxygen — ${pct}% more than Earth’s air — materials are much more flammable. Choosing them from flammability limits at that oxygen level is the prevention step, but there is no partial-gravity combustion data in PSI yet to confirm it for the Moon.`
          : `At ${Math.round(cabin.o2 * 100)}% oxygen — ${pct}% more than Earth’s air — materials are much more flammable, and these were only checked in normal air. A stray spark has far more to work with.`,
    },
    {
      id: 'time',
      label: 'Time on the surface',
      verdict: surface >= 60 ? 'good' : surface >= 30 ? 'warn' : 'bad',
      headline: `${surface}% of the excursion clock left`,
      detail: s.ticks === 0
        ? 'No time was spent pre-breathing.'
        : `Pre-breathing used ${s.ticks}% of the clock. With “${cabin.title}” in the cabin, the safe line takes about ${ticksNeeded(cabin)}% — which is why a lower-pressure, higher-oxygen cabin makes lunar excursions easier.`,
    },
  ]
}

export const missionPassed = (findings: Finding[]) => findings.every((f) => f.verdict !== 'bad')
