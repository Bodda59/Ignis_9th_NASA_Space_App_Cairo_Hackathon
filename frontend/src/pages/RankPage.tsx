import { motion } from 'framer-motion'
import { ArrowUpRight, ListOrdered, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/api/client'
import type { ScenarioCondition } from '@/api/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useAudience } from '@/features/audience/audience'
import { StudyPicker } from '@/features/compare/StudyPicker'
import { ContextBar } from '@/features/habitat/ContextBar'
import { ScenarioEvidenceMap } from '@/features/interpret/ScenarioEvidenceMap'
import { ScenarioControls } from '@/features/interpret/ScenarioControls'
import { RankResults, type Ranking } from '@/features/rank/RankResults'
import { useSearchState } from '@/features/search/useSearchState'
import { useAsync } from '@/hooks/useAsync'

const MODES = { question: 'Question', scenario: 'Scenario', habitat: 'Crew environment' } as const
type Mode = keyof typeof MODES
const MAX_QUESTION = 2000
const SOURCE_TYPES = ['Reports', 'Science Documents', 'Engineering Documents', 'Presentations',
  'Experimental table', 'Analyzed Data', 'Reference Data', 'Calibration', 'Raw Data',
  'Investigation Metadata Files', 'Other Sources']

export function RankPage() {
  const search = useSearchState()
  const audience = useAudience()
  const modeParam = search.params.get('mode')
  const mode: Mode = modeParam === 'scenario' || modeParam === 'habitat' ? modeParam : 'question'
  const [question, setQuestion] = useState(search.query)
  const [sourceType, setSourceType] = useState('')
  const [scope, setScope] = useState(() => [...new Set((search.params.get('ids') ?? '').split(',')
    .map((id) => id.trim()).filter(Boolean))].slice(0, 5).map((id) => ({ id, acronym: id })))
  const bassExample = mode === 'scenario' && search.params.get('ids') === 'PSI-25' &&
    search.params.get('example') === 'bass-ii'
  const [conditions, setConditions] = useState<ScenarioCondition[]>(() =>
    bassExample ? [{ key: 'material', value: '0.5" black rod' }] : [])
  const [submission, setSubmission] = useState<{ key: string; attempt: number }>()
  const ids = scope.map(({ id }) => id)
  const text = question.trim()
  const inputKey = JSON.stringify(mode === 'habitat' ? [mode, search.context] : [mode, text, ids, mode === 'scenario' ? conditions : sourceType])
  const submitted = submission?.key === inputKey
  const result = useAsync<Ranking | null>(async (signal) => {
    if (!submitted) return null
    if (mode === 'scenario') return { mode, data: await api.rankScenario(text, ids, conditions, audience, signal) }
    if (mode === 'habitat') return { mode, data: await api.search({ query: '', filters: {}, context: search.context, page: 1, page_size: 100 }, signal) }
    return { mode, data: await api.rankQuestion(text, ids, audience, signal, sourceType) }
  }, submitted ? JSON.stringify(submission) : '')
  const pending = submitted && result.status === 'loading'
  const ready = mode === 'habitat' ? !!search.context.habitat : question.length <= MAX_QUESTION &&
    (mode === 'scenario' ? conditions.length > 0 : !!text)

  function submit() {
    if (!ready || pending) return
    setSubmission((previous) => ({ key: inputKey, attempt: (previous?.attempt ?? 0) + 1 }))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto min-h-[80svh] w-full px-4 pb-24 pt-28 sm:px-8 xl:px-12">
      <header className="mb-7">
        <div className="mb-3 flex items-center gap-2 text-[var(--color-flame)]">
          <ListOrdered className="size-5" aria-hidden="true" /> <span className="label">Rank only</span>
        </div>
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">Rank research evidence</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--color-ink-dim)]">See which investigations rank highest and review the source material behind each match.</p>
      </header>

      {bassExample && <p className="mb-5 rounded-xl border border-[var(--color-flame)]/25 bg-[var(--color-flame)]/5 p-3 text-sm text-[var(--color-ink-dim)]">
        The BASS-II example is prefilled. Select <strong className="text-[var(--color-ink)]">Rank investigations</strong>, then look for the Evidence Map and open a source.
      </p>}
      <>
        <div className="max-w-5xl space-y-4" role="group" aria-label="Rank research">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ranking input">
            {Object.entries(MODES).map(([value, label]) => <Chip key={value} selected={mode === value} onToggle={() => {
              if (mode === value) return
              setSubmission(undefined)
              search.update({ mode: value === 'question' ? null : value, example: null })
            }}>{label}</Chip>)}
          </div>
          {mode === 'habitat' ? <ContextBar s={search} /> : (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-line-input)] bg-[var(--color-panel)]/90">
              <div className="p-4">
                <label htmlFor="rank-question" className="label mb-2 block">{mode === 'scenario' ? 'Question (optional)' : 'Question'}</label>
                <textarea id="rank-question" rows={2} maxLength={MAX_QUESTION} value={question}
                  placeholder="Which experiments studied flame spread in microgravity?"
                  onChange={(event) => setQuestion(event.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-void)] px-4 py-3 text-sm outline-none focus:border-[var(--color-flame)]" />
              </div>
              {mode === 'question' && <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
                <label htmlFor="rank-source-type" className="label">Source type</label>
                <select id="rank-source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value)}
                  className="rounded-lg border border-[var(--color-line)] bg-[var(--color-void)] px-2 py-1 text-xs">
                  <option value="">All indexed source types</option>
                  {SOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>}
              {mode === 'scenario' && <ScenarioControls ids={ids} conditions={conditions} onChange={setConditions} allowSeparate />}
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="label">Scope</span>
                {!scope.length && <span className="text-xs text-[var(--color-ink-dim)]">All investigations</span>}
                {scope.map((study) => <button type="button" key={study.id} aria-label={'Remove ' + study.acronym}
                  className="flex items-center gap-1 rounded-full border border-[var(--color-flame)]/40 px-2.5 py-1 text-xs"
                  onClick={() => { setScope(scope.filter(({ id }) => id !== study.id)); setConditions([]) }}>
                  {study.acronym} <X className="size-3" />
                </button>)}
                <StudyPicker variant="chip" disabled={scope.length >= 5} exclude={ids}
                  onPick={({ id, acronym }) => { setScope([...scope, { id, acronym }]); setConditions([]) }} />
              </div>
            </div>
          )}
          <Button data-guide-action={mode === 'habitat' ? 'habitat' : undefined} data-guide-highlight={mode === 'scenario' ? 'rank' : undefined} onClick={submit} variant="accent" disabled={!ready || pending}
            iconLeft={pending ? <Loader2 className="size-4 animate-spin" /> : <ListOrdered className="size-4" />}>
            {pending ? 'Ranking…' : 'Rank investigations'}
          </Button>
          {mode === 'habitat' && !ready && <span className="ml-3 text-xs text-[var(--color-ink-dim)]">Choose a habitat to start.</span>}
          {mode === 'scenario' && !ready && <span className="ml-3 text-xs text-[var(--color-ink-dim)]">Add a reported test condition to start.</span>}
        </div>
        {pending && <p role="status" className="mt-6 text-sm text-[var(--color-ink-dim)]">Finding matching investigations and sources…</p>}
        {submitted && result.status === 'error' && <p role="alert" className="mt-6 text-sm text-[var(--color-ember)]">
          {result.error.message} <button type="button" onClick={result.retry} className="underline">Retry</button>
        </p>}
        {submitted && result.status === 'success' && result.data && <>
          {result.data.mode === 'scenario' && result.data.data.evidence_map &&
            <ScenarioEvidenceMap evidence={result.data.data.evidence_map} />}
          <RankResults result={result.data} />
        </>}
        <ButtonLink to="/ask" size="sm" variant="ghost" className="mt-8" icon={<ArrowUpRight className="size-3.5" />}>Ask for an interpretation</ButtonLink>
      </>
    </motion.div>
  )
}
