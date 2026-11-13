import { motion } from 'framer-motion'
import { EASE_OUT } from '@/lib/cn'
import { EARTH_PSI, nitrogenPsi, oxygenPsi, type Atmosphere } from './mission'

export type AirColumn = { label: string; air?: Atmosphere; active?: boolean }

const BAR_PX = 132

/**
 * "What is in the air": one stacked bar per place. Bar height is total pressure,
 * split into oxygen (blue) and nitrogen (grey). Numbers are printed, so the
 * picture never depends on color alone.
 */
export function AirBars({ columns }: { columns: AirColumn[] }) {
  return (
    <figure className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-5">
      <figcaption className="label !text-[var(--color-ink-dim)]">What is in the air</figcaption>
      <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map(({ label, air, active }) => {
          const o2 = air ? oxygenPsi(air) : 0
          const n2 = air ? nitrogenPsi(air) : 0
          return (
            <div key={label} className="min-w-0 text-center">
              <div className="flex items-end justify-center" style={{ height: BAR_PX }}>
                {air ? (
                  <div className={`flex w-12 flex-col overflow-hidden rounded-lg border ${active ? 'border-[var(--color-ink)]' : 'border-[var(--color-line-strong)]'}`}>
                    <motion.div
                      className="bg-white/15"
                      initial={false}
                      animate={{ height: (n2 / EARTH_PSI) * BAR_PX }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                    />
                    <motion.div
                      className="bg-[var(--color-flame)]"
                      initial={false}
                      animate={{ height: (o2 / EARTH_PSI) * BAR_PX }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                    />
                  </div>
                ) : (
                  <div className="grid h-full w-12 place-items-center rounded-lg border border-dashed border-[var(--color-line-strong)] text-[var(--color-ink-faint)]" aria-hidden="true">?</div>
                )}
              </div>
              <p className={`mt-2 text-[13px] ${active ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'}`}>{label}</p>
              {air ? (
                <p className="mt-1 font-mono text-[11px] leading-relaxed tabular-nums text-[var(--color-ink-faint)]">
                  {air.psi} psi total<br />
                  <span className="text-[var(--color-flame)]">{o2.toFixed(1)} psi O₂</span><br />
                  {n2.toFixed(1)} psi N₂
                </p>
              ) : (
                <p className="mt-1 font-mono text-[11px] text-[var(--color-ink-faint)]">Not chosen</p>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-ink-faint)]">
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[var(--color-flame)]" aria-hidden="true" />Oxygen</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-white/15" aria-hidden="true" />Nitrogen</span>
        <span>Bar height is total pressure.</span>
      </p>
    </figure>
  )
}
