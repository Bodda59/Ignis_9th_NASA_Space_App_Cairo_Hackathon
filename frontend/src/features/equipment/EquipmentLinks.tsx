import { motion } from 'framer-motion'
import { Flame, Layers, Radar, TriangleAlert } from 'lucide-react'
import type { EquipmentCategory, EquipmentLink, Finding } from '@/api/types'
import { Cited } from '@/components/ui/CitationChip'
import { EQUIPMENT_LABEL } from '@/lib/labels'

const ICON: Record<EquipmentCategory, typeof Radar> = { smoke_detection: Radar, suppression: Flame, material_controls: Layers }
const COLOR: Record<EquipmentCategory, string> = {
  smoke_detection: 'var(--color-detection)',
  suppression: 'var(--color-suppression)',
  material_controls: 'var(--color-prevention)',
}

/** F08: research → design question. "Could inform", never a certified recommendation. */
export function EquipmentLinks({ links, findings }: { links: EquipmentLink[]; findings: Finding[] }) {
  if (!links.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--color-line-strong)] p-6 text-sm text-[var(--color-ink-dim)]">
        No reviewed links from this study to a safety-equipment or design question yet.
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {links.map((l, i) => {
        const Icon = ICON[l.equipment_category]
        const color = COLOR[l.equipment_category]
        const linked = findings.filter((f) => l.finding_ids.includes(f.id))
        return (
          <motion.article
            key={l.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/50"
          >
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
            <div className="p-6 pl-7">
              <p className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color }}>
                <Icon className="h-3.5 w-3.5" /> {EQUIPMENT_LABEL[l.equipment_category]}
              </p>
              <h3 className="font-display text-xl font-medium leading-snug tracking-[-0.01em]">{l.design_question}</h3>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="label mb-2">How the research could inform it</p>
                  <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">
                    <Cited text={l.explanation} ids={l.citation_ids} />
                  </p>
                  {linked.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {linked.map((f) => (
                        <li key={f.id} className="border-l border-[var(--color-line-strong)] pl-3 text-[13px] text-[var(--color-ink)]">
                          <Cited text={f.text} ids={f.citation_ids} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="label mb-2">Limits of this evidence</p>
                  <ul className="space-y-2">
                    {l.limitations.map((x) => (
                      <li key={x} className="flex gap-2 text-[13px] leading-snug text-[var(--color-ink-dim)]">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ember)]" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.article>
        )
      })}
      <p className="text-[11px] text-[var(--color-ink-faint)]">
        These links show what a design question could draw on. They are not equipment specifications or certified recommendations.
      </p>
    </div>
  )
}
