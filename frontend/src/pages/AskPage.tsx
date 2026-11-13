import { LayoutGroup, motion } from 'framer-motion'
import { FileText, RotateCw, SquarePen, Sparkles, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '@/api/client'
import { useAudience, type Audience } from '@/features/audience/audience'
import type { ScenarioCondition } from '@/api/types'
import { ScenarioControls } from '@/features/interpret/ScenarioControls'
import type { HabitatId, InterpretResponse } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { AssistantMessage, type FollowUp } from '@/features/interpret/AssistantMessage'
import { Composer, type ScopeItem } from '@/features/interpret/Composer'
import { AssistantAvatar, ThinkingState } from '@/features/interpret/ThinkingState'
import { Astronaut3D } from '@/features/interpret/Astronaut3D'
import { ChatBackdrop } from '@/features/interpret/ChatBackdrop'
import { HABITAT_LABEL } from '@/lib/labels'
import { scrollToEl } from '@/lib/scroll'

type Turn = {
  id: number
  question: string
  scope: ScopeItem[]
  habitat?: HabitatId
  audience: Audience
  conditions?: ScenarioCondition[]
  evidenceOnly?: boolean
  state: 'pending' | 'done' | 'error'
  res?: InterpretResponse
  error?: ApiError
}

const SUGGESTIONS = [
  'What suppresses a fire in microgravity?',
  'Which studies inform spacecraft smoke detectors?',
  'What does higher oxygen mean for materials in a Moon base?',
  'Can microgravity results tell us how fire behaves on Mars?',
]

function initialScope(value: string): ScopeItem[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 5)
    .map((id) => ({ id, acronym: id }))
}

/** Chat-style, retrieval-grounded Q&A (F03). */
export function AskPage() {
  const [params] = useSearchParams()
  return <AskConversation key={params.toString()} params={params} />
}

function AskConversation({ params }: { params: URLSearchParams }) {
  const audience = useAudience()
  const [mode, setMode] = useState<'general' | 'scenario'>(params.get('mode') === 'scenario' ? 'scenario' : 'general')
  const [conditions, setConditions] = useState<ScenarioCondition[]>([])
  const [question, setQuestion] = useState(params.get('q') ?? '')
  const idsParam = params.get('ids') ?? ''
  const [scope, setScope] = useState<ScopeItem[]>(() => initialScope(idsParam))
  const [habitat, setHabitat] = useState<HabitatId | undefined>(() => {
    const value = params.get('habitat')
    return value && Object.hasOwn(HABITAT_LABEL, value) ? value as HabitatId : undefined
  })
  const [turns, setTurns] = useState<Turn[]>([])
  const ctrl = useRef<AbortController | null>(null)
  const nextId = useRef(1)
  const pending = turns.some((t) => t.state === 'pending')
  const empty = turns.length === 0

  // Prefill scope from ?ids= (acronyms resolved through the search API)
  useEffect(() => {
    const ids = initialScope(idsParam).map((item) => item.id)
    if (!ids.length) return
    const c = new AbortController()
    api
      .search({ query: '', filters: {}, context: {}, page: 1, page_size: 50 }, c.signal)
      .then((r) => setScope(ids.map((id) => ({ id, acronym: r.items.find((i) => i.id === id)?.acronym ?? id }))))
      .catch(() => { if (!c.signal.aborted) setScope(initialScope(idsParam)) })
    return () => c.abort()
  }, [idsParam])

  useEffect(() => () => ctrl.current?.abort(), [])

  const run = useCallback((turn: Turn) => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    api
      .interpret(
        {
          question: turn.question,
          ...(turn.scope.length && { investigation_ids: turn.scope.map((s) => s.id) }),
          ...(turn.habitat && { context: { habitat: turn.habitat } }),
        },
        c.signal,
        { audience: turn.audience, conditions: turn.conditions, evidenceOnly: turn.evidenceOnly },
      )
      .then((res) => setTurns((ts) => ts.map((t) => (t.id === turn.id ? { ...t, state: 'done', res } : t))))
      .catch((e: unknown) => {
        if ((e as Error)?.name === 'AbortError') return
        const error = e instanceof ApiError ? e : new ApiError(0)
        setTurns((ts) => ts.map((t) => (t.id === turn.id ? { ...t, state: 'error', error } : t)))
      })
  }, [])

  const ask = (q: string, scopeOverride?: ScopeItem[], evidenceOnly = false) => {
    if (pending || !q.trim() || (mode === 'scenario' && !conditions.length)) return // duplicate-submit guard
    const turn: Turn = { id: nextId.current++, question: q.trim(), scope: scopeOverride ?? scope, habitat, audience, conditions: mode === 'scenario' && !scopeOverride ? conditions : undefined, evidenceOnly, state: 'pending' }
    setTurns((ts) => [...ts, turn])
    setQuestion('')
    run(turn)
    // bring the new question to the top of the view, like modern chat apps
    setTimeout(() => scrollToEl(document.getElementById(`turn-${turn.id}`), -96), 60)
  }

  const followUp = (f: FollowUp) =>
    ask(f.q, f.ids ? f.ids.map((id) => ({ id, acronym: f.label ?? id })) : undefined)

  const retry = (t: Turn) => {
    const again = { ...t, state: 'pending' as const, error: undefined }
    setTurns((ts) => ts.map((x) => (x.id === t.id ? again : x)))
    run(again)
  }

  const newChat = () => {
    ctrl.current?.abort()
    setTurns([])
    window.scrollTo({ top: 0 })
  }

  const composer = (
    <motion.div layoutId="ask-composer" transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
      <Composer
        value={question}
        onChange={setQuestion}
        onSubmit={() => ask(question)}
        pending={pending}
        disabled={mode === 'scenario' && !conditions.length}
        modePicker={<>
          <div className="flex gap-2 border-b border-[var(--color-line)] px-4 py-2.5" aria-label="Question type">
            {(['general', 'scenario'] as const).map((value) => <button type="button" key={value}
              aria-pressed={mode === value} disabled={pending} onClick={() => setMode(value)}
              className={`rounded-full px-3 py-1.5 text-xs ${mode === value ? 'bg-[var(--color-nebula)]/20 text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)] hover:bg-white/5'}`}>
              {value === 'general' ? 'General question' : 'Scenario question'}
            </button>)}
            <button type="button" disabled={pending || !question.trim() || (mode === 'scenario' && !conditions.length)}
              className="ml-auto rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs hover:border-[var(--color-flame)] disabled:opacity-40"
              data-guide-action="ask" onClick={() => ask(question, undefined, true)}>Find evidence</button>
          </div>
          {mode === 'scenario' && <ScenarioControls ids={scope.map((item) => item.id)} conditions={conditions} onChange={setConditions} />}
        </>}
        scope={scope}
        onScope={(value) => { setScope(value); setConditions([]) }}
        habitat={habitat}
        onHabitat={setHabitat}
      />
    </motion.div>
  )

  return (
    <LayoutGroup>
      <ChatBackdrop habitat={habitat} raised={!empty} />

      {empty ? (
        /* ── empty state: centered, like a chat home ─────────────────── */
        <div className="mx-auto flex min-h-[100svh] max-w-3xl flex-col justify-center px-6 pb-16 pt-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 text-center">
            <div className="relative mb-2 flex items-center justify-center gap-2">
              <Astronaut3D className="h-[250px] w-[220px]" />
              <motion.p
                initial={{ opacity: 0, scale: 0.9, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
                className="mb-24 max-w-[220px] rounded-2xl rounded-bl-md border border-[var(--color-line-strong)] bg-[var(--color-panel)]/85 px-4 py-3 text-left text-[13px] leading-snug text-[var(--color-ink)] backdrop-blur-md"
              >
                Hi! I’m your research co-pilot. Ask me what NASA learned about fire in microgravity.
              </motion.p>
            </div>
            <h1 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-tight tracking-[-0.02em]">
              What do you want to know about fire in space?
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--color-ink-dim)]">
              Answers are built only from NASA research passages — with sources, and with what the evidence can’t tell you.
            </p>
          </motion.div>

          {composer}

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 grid gap-2 sm:grid-cols-2"
            aria-label="Suggested questions"
          >
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  onClick={() => ask(s)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/85 px-4 py-3 text-left text-[13.5px] backdrop-blur-md leading-snug text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)] hover:bg-white/[0.03] hover:text-[var(--color-ink)]"
                >
                  {s}
                </button>
              </li>
            ))}
          </motion.ul>

          <ul className="mx-auto mt-8 flex w-fit flex-wrap justify-center gap-x-6 gap-y-2 rounded-full bg-[var(--color-void)]/75 px-5 py-2 text-[12px] text-[var(--color-ink-dim)] backdrop-blur-md" aria-label="How answers are labeled">
            <li className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-[var(--color-flame)]" /> Cited sources</li>
            <li className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-prevention)]" /> From the research</li>
            <li className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[var(--color-nebula)]" /> AI interpretation</li>
            <li className="inline-flex items-center gap-1.5"><TriangleAlert className="h-3.5 w-3.5 text-[var(--color-ember)]" /> Limits</li>
          </ul>
        </div>
      ) : (
        /* ── conversation ────────────────────────────────────────────── */
        <>
          <div className="mx-auto max-w-5xl px-6 pb-56 pt-24 lg:px-10">
            <div className="mb-8 flex items-center justify-between">
              <h1 className="label">Ask the research</h1>
              <Button size="sm" variant="ghost" onClick={newChat} disabled={pending} iconLeft={<SquarePen className="h-3.5 w-3.5" />}>
                New chat
              </Button>
            </div>

            <div className="space-y-20">
              {turns.map((t, i) => (
                <section
                  key={t.id}
                  id={`turn-${t.id}`}
                  data-guide-result="ask"
                  aria-label={`Question: ${t.question}`}
                  // the latest turn reserves a screen of space so it can scroll to the top (chat-app behaviour)
                  className={`scroll-mt-24 space-y-8 ${i === turns.length - 1 ? 'min-h-[calc(100svh-16rem)]' : ''}`}
                >
                  {/* user message */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-1.5">
                    <p className="max-w-[60%] rounded-3xl rounded-br-lg bg-white/[0.07] px-6 py-4 text-[16px] leading-relaxed text-[var(--color-ink)] backdrop-blur-md">
                      {t.question}
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-faint)]">
                      {t.scope.length ? `Scope: ${t.scope.map((s) => s.acronym).join(', ')}` : 'All studies'}
                      {t.habitat && ` · ${HABITAT_LABEL[t.habitat]}`}
                      {t.conditions?.length ? ` · ${t.conditions.length} scenario conditions` : ''}
                    </p>
                  </motion.div>

                  {/* assistant message */}
                  {t.state === 'pending' && <ThinkingState />}
                  {t.state === 'done' && t.res && <AssistantMessage res={t.res} turnId={t.id} onFollowUp={followUp} disabled={pending} />}
                  {t.state === 'error' && t.error && (
                    <div role="alert" className="flex gap-4">
                      <AssistantAvatar />
                      <div className="flex-1 rounded-xl border border-[var(--color-ember)]/30 bg-[var(--color-ember)]/[0.05] p-4">
                        <p className="flex items-center gap-2 text-[14px] text-[var(--color-ink)]">
                          <TriangleAlert className="h-4 w-4 text-[var(--color-ember)]" /> {t.error.message}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-ink-dim)]">This is a service problem, not missing evidence. Your question is kept.</p>
                        {t.error.retryable && (
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => retry(t)} disabled={pending} iconLeft={<RotateCw className="h-3.5 w-3.5" />}>
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>

          {/* composer docked at the bottom */}
          <div className="fixed inset-x-0 bottom-0 z-30 pt-10">
            <div className="mx-auto max-w-4xl px-6 pb-4">
              {composer}
              <p className="mt-2 text-center text-[11px] text-[var(--color-ink-faint)]">
                Research aid only — not emergency guidance or a safety certification. Check the sources.
              </p>
            </div>
          </div>
        </>
      )}
    </LayoutGroup>
  )
}
