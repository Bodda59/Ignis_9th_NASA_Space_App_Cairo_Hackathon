import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Orbit, X } from 'lucide-react'
import { useState } from 'react'
import { HABITAT_IDS, SAFETY_TOPICS, type HabitatId, type SafetyTopic } from '@/api/types'
import { Chip } from '@/components/ui/Chip'
import { NumberField } from '@/components/ui/NumberField'
import { HABITAT_LABEL, TOPIC } from '@/lib/labels'
import type { useSearchState } from '@/features/search/useSearchState'
import { HABITATS } from './habitats'

type S = ReturnType<typeof useSearchState>

/**
 * Soft crew-environment context (F06). Shapes ranking + gap explanations only.
 * Values are sent exactly as entered; blank stays absent; habitats add nothing hidden.
 */
export function ContextBar({ s }: { s: S }) {
  const c = s.context
  const hasContext = Object.keys(c).length > 0
  const [open, setOpen] = useState(hasContext)
  const [prevHas, setPrevHas] = useState(hasContext)
  if (prevHas !== hasContext) {
    setPrevHas(hasContext)
    if (hasContext) setOpen(true)
  }

  const hab = c.habitat ? HABITATS.find((h) => h.id === c.habitat) : undefined
  const summary = [
    c.habitat && HABITAT_LABEL[c.habitat],
    c.safety_concern && TOPIC[c.safety_concern].label,
    c.material,
    c.oxygen_pct !== undefined && `${c.oxygen_pct}% O₂`,
    c.pressure_kpa !== undefined && `${c.pressure_kpa} kPa`,
    c.airflow_m_s !== undefined && `${c.airflow_m_s} m/s`,
  ].filter(Boolean)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/60">
      {/* subtle animated orbit glow when context is active */}
      <AnimatePresence>
        {hasContext && (
          <motion.div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(123,92,255,0.18),transparent_65%)]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-line-strong)]">
          <Orbit className="h-4 w-4 text-[var(--color-nebula)]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-[var(--color-ink)]">Crew-environment context</span>
          <span className="block truncate text-xs text-[var(--color-ink-faint)]">
            {summary.length ? summary.join(' · ') : 'Optional — tell us the habitat and concern to sharpen relevance'}
          </span>
        </span>
        <span className="hidden rounded-full border border-[var(--color-line)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] sm:inline">
          Soft · not a filter
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4 text-[var(--color-ink-faint)]" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden"
          >
            <div className="grid gap-6 border-t border-[var(--color-line)] px-5 py-5 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <p className="label mb-2.5">Habitat</p>
                  <div className="flex flex-wrap gap-2">
                    {HABITAT_IDS.map((h) => (
                      <Chip
                        key={h}
                        selected={c.habitat === h}
                        color="var(--color-nebula)"
                        onToggle={() => s.update({ habitat: c.habitat === h ? null : (h as HabitatId) })}
                      >
                        {HABITAT_LABEL[h]}
                      </Chip>
                    ))}
                  </div>
                  <AnimatePresence>
                    {hab && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]"
                      >
                        {hab.gravityLabel} · {hab.gravityG} g.{' '}
                        {hab.partialGravity
                          ? 'Microgravity experiments offer comparison evidence. Look for tests at the selected gravity.'
                          : 'Same gravity regime as most PSI combustion tests.'}{' '}
                        No atmospheric values are assumed — add them below if known.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <p className="label mb-2.5">Safety concern</p>
                  <div className="flex flex-wrap gap-2">
                    {SAFETY_TOPICS.map((t) => {
                      const Icon = TOPIC[t].icon
                      return (
                        <Chip
                          key={t}
                          selected={c.safety_concern === t}
                          color={TOPIC[t].color}
                          icon={<Icon className="h-3 w-3" style={{ color: TOPIC[t].color }} />}
                          onToggle={() => s.update({ concern: c.safety_concern === t ? null : (t as SafetyTopic) })}
                        >
                          {TOPIC[t].label}
                        </Chip>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div>
                <p className="label mb-2.5">Known conditions <span className="normal-case tracking-normal">(optional)</span></p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <NumberField
                    label="Oxygen"
                    unit="%"
                    value={c.oxygen_pct}
                    validate={(v) => (v < 0 || v > 100 ? '0–100 %' : null)}
                    onCommit={(v) => s.update({ ctx_o2: v ?? null })}
                  />
                  <NumberField
                    label="Total pressure"
                    unit="kPa"
                    value={c.pressure_kpa}
                    validate={(v) => (v <= 0 ? 'Must be > 0' : null)}
                    onCommit={(v) => s.update({ ctx_p: v ?? null })}
                  />
                  <NumberField
                    label="Airflow"
                    unit="m/s"
                    value={c.airflow_m_s}
                    validate={(v) => (v < 0 ? 'Must be ≥ 0' : null)}
                    onCommit={(v) => s.update({ ctx_af: v ?? null })}
                  />
                </div>
                <MaterialField value={c.material} onCommit={(v) => s.update({ ctx_material: v ?? null })} />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                    Context changes ranking and explanations — it never hides studies or proves applicability.
                  </p>
                  {hasContext && (
                    <button
                      onClick={s.resetContext}
                      className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MaterialField({ value, onCommit }: { value?: string; onCommit: (v: string | undefined) => void }) {
  const [raw, setRaw] = useState(value ?? '')
  const [prevValue, setPrevValue] = useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    setRaw(value ?? '')
  }
  const commit = () => {
    const v = raw.trim()
    if (v !== (value ?? '')) onCommit(v || undefined)
  }
  return (
    <div className="mt-3">
      <label htmlFor="ctx-material" className="label mb-1.5 block">Material</label>
      <input
        id="ctx-material"
        value={raw}
        maxLength={120}
        placeholder="e.g. fabric"
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="w-full rounded-lg border border-[var(--color-line-input)] bg-[var(--color-void)] px-3 py-2 text-sm outline-none transition-colors placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-flame)] focus:ring-2 focus:ring-[var(--color-flame)]/25"
      />
    </div>
  )
}
