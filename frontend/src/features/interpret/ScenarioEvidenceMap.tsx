import { ArrowUpRight, FileText, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { citation } from '@/api/citation'
import type { ScenarioCondition, ScenarioEvidence } from '@/api/types'

const labels = {
  tested_together: 'Tested together',
  tested_separately: 'Tested separately',
  no_matching_record: 'No matching record',
}

const tone = {
  tested_together: 'text-[var(--color-prevention)]',
  tested_separately: 'text-[var(--color-ember)]',
  no_matching_record: 'text-[var(--color-ink-dim)]',
}

function requested(condition: ScenarioCondition) {
  if ('value' in condition) return condition.value
  const { minimum, maximum, unit } = condition
  return `${minimum === maximum ? minimum : `${minimum}–${maximum}`} ${unit}`
}

function recordCount(count: number) {
  return `${count} reported test ${count === 1 ? 'record' : 'records'}`
}

export function ScenarioEvidenceMap({ evidence }: { evidence: ScenarioEvidence }) {
  const titleId = useId()
  const drawerId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [active, setActive] = useState<ScenarioEvidence['conditions'][number]>()
  const example = active?.example
  const source = example && citation(example)

  return (
    <section aria-labelledby={titleId}>
      {/* framed and titled by its evidence-trail step */}
      <h4 id={titleId} className="sr-only">Evidence map</h4>
      <p className="text-[14px] text-[var(--color-ink-dim)]">
        {evidence.joint_records > 0
          ? `${recordCount(evidence.joint_records)} match${evidence.joint_records === 1 ? 'es' : ''} every selected condition.`
          : 'No reported test record matches every selected condition.'}
        {' '}Coverage is based on the indexed experiment records in your selected scope.
      </p>
      <ul className="mt-3 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {evidence.conditions.map((item) => (
          <li key={item.condition.key} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3">
            <div className="min-w-0 grow">
              <p className="break-words text-sm font-medium">{item.label}</p>
              <p className="break-words text-xs text-[var(--color-ink-dim)]">{requested(item.condition)}</p>
            </div>
            <div className="text-xs">
              <p className={tone[item.status]}>{labels[item.status]}</p>
              <p className="mt-0.5 text-[var(--color-ink-dim)]">{recordCount(item.matching_records)}</p>
            </div>
            {item.example && (
              <button
                type="button"
                data-guide-action="rank"
                aria-haspopup="dialog"
                aria-label={`View source for ${item.label}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line-strong)] px-3 py-2 text-xs text-[var(--color-flame)] hover:border-[var(--color-flame)]"
                onClick={() => { setActive(item); dialog.current?.showModal() }}
              >
                <FileText className="size-3.5" aria-hidden="true" /> View source
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-dim)]">
        A condition is counted when its reported value or entire reported range falls within your selection.
        Separate matches come from records that do not confirm the full combination.
      </p>

      <dialog
        ref={dialog}
        aria-labelledby={drawerId}
        onClose={() => setActive(undefined)}
        data-lenis-prevent
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto overscroll-contain border-l border-[var(--color-line-strong)] bg-[var(--color-panel)] p-5 text-[var(--color-ink)] backdrop:bg-black/65 sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={drawerId} className="font-display text-lg">Experiment source</h2>
          <form method="dialog">
            <button type="submit" aria-label="Close source" className="rounded-lg border border-[var(--color-line-strong)] p-2 hover:border-[var(--color-flame)]">
              <X className="size-5" aria-hidden="true" />
            </button>
          </form>
        </div>
        {active && example && source && (
          <>
            <p className="mt-5 text-sm text-[var(--color-ink-dim)]">{active.label} · {requested(active.condition)}</p>
            <Link onClick={() => dialog.current?.close()} to={`/investigations/${encodeURIComponent(example.investigation_id)}`} className="mt-2 inline-block text-sm text-[var(--color-nebula)] hover:underline">
              {example.investigation_name}
            </Link>
            <p className="mt-4 break-words text-sm font-medium">Test {example.test_id} · {source.title}</p>
            <p className="mt-1 break-words text-xs text-[var(--color-ink-dim)]">{source.location}</p>
            <blockquote className="mt-4 whitespace-pre-wrap break-words border-l border-[var(--color-line-strong)] pl-4 text-sm leading-relaxed">
              {example.text}
            </blockquote>
            {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm text-[var(--color-flame)] hover:underline">
              Open original source <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>}
          </>
        )}
      </dialog>
    </section>
  )
}
