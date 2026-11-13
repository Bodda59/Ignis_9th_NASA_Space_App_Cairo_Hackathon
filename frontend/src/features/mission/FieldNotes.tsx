import { CFI_G_MAX_O2, EARTH_O2, EARTH_PSI, MOON_BASE_O2, MOON_BASE_PSI, SUIT_PSI } from './mission'

const NOTES: { fact: string; why: string }[] = [
  {
    fact: `Spacesuits are filled with 100% oxygen to only ${SUIT_PSI} psi. Earth’s pressure at sea level is ${EARTH_PSI} psi.`,
    why: 'Low pressure keeps the suit flexible enough to work in.',
  },
  {
    fact: 'Before a spacewalk, astronauts pre-breathe 100% oxygen.',
    why: 'It expels nitrogen absorbed in the body, which would otherwise cause the bends (decompression sickness) when pressure drops.',
  },
  {
    fact: 'The Moon Base and pressurized rovers are expected to sit between a spacesuit and Earth’s atmosphere in both pressure and oxygen.',
    why: 'A cabin closer to suit conditions shortens the pre-breathe, which makes lunar excursions easier.',
  },
  {
    fact: `That cabin will likely be ${Math.round(MOON_BASE_O2 * 100)}% oxygen or more, at ${MOON_BASE_PSI} psi or less.`,
    why: `That is over ${Math.floor((MOON_BASE_O2 / EARTH_O2 - 1) * 10) * 10}% more oxygen than Earth’s air, which makes materials much more flammable.`,
  },
  {
    fact: `The microgravity tests with the highest oxygen were in CFI-G, part of ACME: up to ${Math.round(CFI_G_MAX_O2 * 100)}% oxygen.`,
    why: 'An oxygen-nitrogen mix flowed from a spherical burner into a chamber of nitrogen and flammable gas such as propane, creating an inside-out flame.',
  },
]

/** The five facts the game is built on, each with its reason. */
export function FieldNotes() {
  return (
    <section aria-labelledby="field-notes" className="border-t border-[var(--color-line)] py-14">
      <h2 id="field-notes" className="font-display text-2xl uppercase tracking-[-0.02em]">Field notes</h2>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-dim)]">The facts behind the game, from the challenge brief on spacesuits and oxygen concentration.</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {NOTES.map((n, i) => (
          <li key={n.fact} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-5">
            <p className="font-mono text-[11px] text-[var(--color-ink-faint)]">{String(i + 1).padStart(2, '0')}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink)]">{n.fact}</p>
            <p className="label mt-4">Why</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-dim)]">{n.why}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
