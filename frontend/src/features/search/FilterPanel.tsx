import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Info, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { ConditionKey, FiltersResponse, SafetyTopic } from '@/api/types'
import { Chip } from '@/components/ui/Chip'
import { NumberField } from '@/components/ui/NumberField'
import { Skeleton } from '@/components/ui/Skeleton'
import { CONDITION_LABEL, TOPIC } from '@/lib/labels'
import type { useSearchState } from './useSearchState'

type S = ReturnType<typeof useSearchState>

const COND_KEYS: { key: ConditionKey; min: string; max: string }[] = [
  { key: 'oxygen_pct', min: 'o2_min', max: 'o2_max' },
  { key: 'pressure_kpa', min: 'p_min', max: 'p_max' },
  { key: 'airflow_m_s', min: 'af_min', max: 'af_max' },
]

// contract bounds: oxygen 0–100, pressure > 0, airflow ≥ 0
const VALIDATE: Record<ConditionKey, (v: number) => string | null> = {
  oxygen_pct: (v) => (v < 0 || v > 100 ? '0–100 %' : null),
  pressure_kpa: (v) => (v <= 0 ? 'Must be > 0' : null),
  airflow_m_s: (v) => (v < 0 ? 'Must be ≥ 0' : null),
}

/** Hard filters. Options come ONLY from GET /api/filters (supported values). */
export function FilterPanel({ meta, s }: { meta?: FiltersResponse; s: S }) {
  const f = s.filters
  if (!meta) return <FilterSkeleton />

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-3">
        <p className="label">
          Filters{s.activeFilterCount > 0 && <span className="ml-2 text-[var(--color-flame)]">{s.activeFilterCount}</span>}
        </p>
        <button
          onClick={s.resetFilters}
          disabled={s.activeFilterCount === 0}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-30"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <Group title="Safety topic" defaultOpen>
        {meta.safety_topics.map((o) => {
          const t = TOPIC[o.value as SafetyTopic]
          const Icon = t?.icon
          return (
            <Chip
              key={o.value}
              selected={!!f.safety_topics?.includes(o.value)}
              onToggle={() => s.toggleIn('topic', o.value)}
              color={t?.color}
              count={o.count}
              icon={Icon && <Icon className="h-3 w-3" style={{ color: t.color }} />}
            >
              {o.label}
            </Chip>
          )
        })}
      </Group>

      <Group title="Equipment / control" defaultOpen>
        {meta.equipment_categories.map((o) => (
          <Chip key={o.value} selected={!!f.equipment_categories?.includes(o.value)} onToggle={() => s.toggleIn('equipment', o.value)} count={o.count}>
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group title="Fuel type">
        {meta.fuel_types.map((o) => (
          <Chip key={o.value} selected={!!f.fuel_types?.includes(o.value)} onToggle={() => s.toggleIn('fuel', o.value)} count={o.count}>
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group title="Material">
        {meta.materials.map((o) => (
          <Chip key={o.value} selected={!!f.materials?.includes(o.value)} onToggle={() => s.toggleIn('material', o.value)} count={o.count}>
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group title="Gravity regime">
        {meta.gravity_regimes.map((o) => (
          <Chip key={o.value} selected={!!f.gravity_regimes?.includes(o.value)} onToggle={() => s.toggleIn('gravity', o.value)} count={o.count}>
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group title="Test conditions" defaultOpen={!!(f.oxygen_pct || f.pressure_kpa || f.airflow_m_s)} stack>
        <p className="flex gap-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          All ranges must match within the same test. Studies that don’t report a value are excluded.
        </p>
        {COND_KEYS.map(({ key, min, max }) => {
          const m = meta.conditions[key]
          const cur = f[key]
          if (!m?.supported) {
            return (
              <div key={key} className="rounded-lg border border-dashed border-[var(--color-line)] px-3 py-2.5">
                <p className="text-xs text-[var(--color-ink-dim)]">
                  {CONDITION_LABEL[key]} <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">({m?.unit})</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--color-ink-faint)]">Not indexed in this collection</p>
              </div>
            )
          }
          return (
            <fieldset key={key}>
              <legend className="mb-2 flex w-full items-baseline justify-between text-xs text-[var(--color-ink-dim)]">
                {CONDITION_LABEL[key]}
                {m.coverage_count !== undefined && (
                  <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">
                    reported by {m.coverage_count} {m.coverage_count === 1 ? 'study' : 'studies'}
                  </span>
                )}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label={`${CONDITION_LABEL[key]} minimum`}
                  hideLabel
                  placeholder="min"
                  unit={m.unit}
                  value={cur?.min}
                  validate={(v) => VALIDATE[key](v) ?? (cur?.max !== undefined && v > cur.max ? 'Min ≤ max' : null)}
                  onCommit={(v) => s.update({ [min]: v ?? null })}
                />
                <NumberField
                  label={`${CONDITION_LABEL[key]} maximum`}
                  hideLabel
                  placeholder="max"
                  unit={m.unit}
                  value={cur?.max}
                  validate={(v) => VALIDATE[key](v) ?? (cur?.min !== undefined && v < cur.min ? 'Max ≥ min' : null)}
                  onCommit={(v) => s.update({ [max]: v ?? null })}
                />
              </div>
            </fieldset>
          )
        })}
      </Group>
    </div>
  )
}

function Group({ title, children, defaultOpen = false, stack }: { title: string; children: ReactNode; defaultOpen?: boolean; stack?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-[var(--color-line)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-1 py-3.5 text-left text-sm text-[var(--color-ink)] transition-colors hover:text-[var(--color-flame)]"
      >
        {title}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="h-4 w-4 text-[var(--color-ink-faint)]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={stack ? 'space-y-4 px-1 pb-5' : 'flex flex-wrap gap-2 px-1 pb-5'}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterSkeleton() {
  return (
    <div className="space-y-5 px-1">
      <Skeleton className="h-3 w-20" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-3 border-t border-[var(--color-line)] pt-4">
          <Skeleton className="h-3 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
