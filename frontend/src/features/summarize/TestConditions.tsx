import { motion } from 'framer-motion'
import { Database } from 'lucide-react'
import type { Test } from '@/api/types'
import { CitationChip } from '@/components/ui/CitationChip'
import { NotReported } from '@/components/ui/Evidence'
import { useCitations } from '@/components/ui/citations'
import { GRAVITY_LABEL } from '@/lib/labels'

type NumKey = 'oxygen_pct' | 'pressure_kpa' | 'airflow_m_s'
const NUM: { key: NumKey; label: string; unit: string }[] = [
  { key: 'oxygen_pct', label: 'Oxygen', unit: '%' },
  { key: 'pressure_kpa', label: 'Total pressure', unit: 'kPa' },
  { key: 'airflow_m_s', label: 'Airflow', unit: 'm/s' },
]
const TEXT: { key: 'material' | 'sample_shape' | 'sample_dimensions' | 'gravity_regime'; label: string }[] = [
  { key: 'material', label: 'Material' },
  { key: 'sample_shape', label: 'Sample shape' },
  { key: 'sample_dimensions', label: 'Sample size' },
  { key: 'gravity_regime', label: 'Gravity' },
]

/**
 * Per-test conditions (F01). Each test keeps its own row — values are never
 * merged or averaged across tests into an invented scenario.
 */
export function TestConditions({ tests, unavailableReason }: { tests: Test[]; unavailableReason: string | null }) {
  if (!tests.length) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-dashed border-[var(--color-line-strong)] p-6">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-ink-faint)]" />
        <div>
          <p className="text-sm text-[var(--color-ink)]">No test records in this collection yet</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
            {unavailableReason ?? 'Study-wide information is shown above; individual test conditions have not been imported.'}
          </p>
        </div>
      </div>
    )
  }

  // Which fields varied between tests vs. stayed the same (unknowns reported separately)
  const allFields = [...NUM.map((n) => ({ key: n.key, label: n.label })), ...TEXT]
  const varied: string[] = []
  const constant: string[] = []
  const partly: string[] = []
  allFields.forEach(({ key, label }) => {
    const vals = tests.map((t) => t[key])
    const known = vals.filter((v) => v !== null && v !== undefined && v !== 'unknown')
    if (known.length < vals.length) partly.push(label)
    if (new Set(known.map(String)).size > 1) varied.push(label)
    else if (known.length === vals.length) constant.push(label)
  })

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Bucket title="Varied between tests" items={varied} color="var(--color-flame)" />
        <Bucket title="Held constant" items={constant} color="var(--color-prevention)" />
        <Bucket title="Not reported for some tests" items={partly} color="var(--color-ember)" />
      </div>

      {/* per-variable scales for numeric conditions that varied */}
      {NUM.filter((n) => varied.includes(n.label)).map((n) => (
        <Scale key={n.key} label={n.label} unit={n.unit} points={tests.map((t) => ({ id: t.id, v: t[n.key] }))} />
      ))}

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-line)]" data-lenis-prevent>
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">Conditions for each test</caption>
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-white/[0.02]">
              <th scope="col" className="label px-4 py-3 font-normal">Test</th>
              {TEXT.slice(0, 3).map((c) => <th key={c.key} scope="col" className="label px-4 py-3 font-normal">{c.label}</th>)}
              {NUM.map((c) => <th key={c.key} scope="col" className="label px-4 py-3 text-right font-normal">{c.label} <span className="normal-case">({c.unit})</span></th>)}
              <th scope="col" className="label px-4 py-3 font-normal">Gravity</th>
              <th scope="col" className="label px-4 py-3 font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t, i) => (
              <motion.tr
                key={t.record_id ?? t.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 8) * 0.045 }}
                className="border-b border-[var(--color-line)] last:border-0 hover:bg-white/[0.02]"
              >
                <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-normal text-[var(--color-ink)]">{t.id}</th>
                {TEXT.slice(0, 3).map((c) => (
                  <td key={c.key} className="px-4 py-3.5 text-[var(--color-ink-dim)]">
                    {t[c.key] ?? <NotReported reason={t.missing_reasons[c.key]} />}
                  </td>
                ))}
                {NUM.map((c) => (
                  <td key={c.key} className="px-4 py-3.5 text-right font-mono tabular-nums">
                    {t[c.key] !== null ? t[c.key] : <NotReported reason={t.missing_reasons[c.key]} />}
                  </td>
                ))}
                <td className="px-4 py-3.5 text-[var(--color-ink-dim)]">
                  {GRAVITY_LABEL[t.gravity_regime]}
                  <span className="ml-1.5 font-mono text-[11px] text-[var(--color-ink-faint)]">
                    {t.gravity_g !== null ? `${t.gravity_g} g` : <NotReported compact reason={t.missing_reasons.gravity_g} />}
                  </span>
                </td>
                <td className="px-4 py-3.5"><SourceRef sourceId={t.source_id} location={t.source_location} /></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SourceRef({ sourceId, location }: { sourceId: string; location: string }) {
  const idx = useCitations()
  const match = [...idx.values()].find((e) => e.citation.source_id === sourceId)
  return (
    <span className="inline-flex items-center font-mono text-[11px] text-[var(--color-ink-faint)]">
      {location}
      {match && <CitationChip id={match.citation.id} />}
    </span>
  )
}

function Bucket({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] p-4">
      <p className="label mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {title}
      </p>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it} className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-[var(--color-ink)]">{it}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-ink-faint)]">None</p>
      )}
    </div>
  )
}

/** Shows where each test sits on one condition's axis. Unknown tests are listed, not plotted. */
function Scale({ label, unit, points }: { label: string; unit: string; points: { id: string; v: number | null }[] }) {
  const known = points.filter((p): p is { id: string; v: number } => p.v !== null)
  const lo = Math.min(...known.map((p) => p.v))
  const hi = Math.max(...known.map((p) => p.v))
  const pad = (hi - lo) * 0.25 || 1
  const min = Math.max(0, lo - pad)
  const max = hi + pad
  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const unknown = points.filter((p) => p.v === null)

  return (
    <div className="rounded-xl border border-[var(--color-line)] px-5 pb-5 pt-4">
      <div className="mb-8 flex items-baseline justify-between">
        <p className="text-sm">{label} <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">({unit})</span></p>
        {unknown.length > 0 && <p className="text-[11px] text-[var(--color-ink-faint)]">Not reported: {unknown.map((u) => u.id).join(', ')}</p>}
      </div>
      <div className="relative mx-3 h-px bg-[var(--color-line-strong)]">
        {known.map((p, i) => (
          <motion.div
            key={p.id}
            className="absolute top-0 -translate-x-1/2 -translate-y-1/2"
            initial={{ left: '0%', opacity: 0 }}
            whileInView={{ left: `${pct(p.v)}%`, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="block h-3 w-3 rounded-full border-2 border-[var(--color-void)] bg-[var(--color-flame)] shadow-[0_0_12px_var(--color-flame)]" />
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-[var(--color-ink-dim)]">
              {p.id} · {p.v}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex justify-between font-mono text-[11px] text-[var(--color-ink-faint)]">
        <span>{+min.toFixed(2)}</span>
        <span>{+max.toFixed(2)}</span>
      </div>
    </div>
  )
}
