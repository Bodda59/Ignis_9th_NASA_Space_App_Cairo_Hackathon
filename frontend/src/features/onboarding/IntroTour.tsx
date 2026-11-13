import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Compass, X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { scrollToEl } from '@/lib/scroll'

export const TOUR_STORAGE_KEY = 'flame-in-freefall:tour:v2'

// study ids from the bundled mock data
const study = 'bass-ii'
const otherStudy = 'flex'
const question = encodeURIComponent('What materials did BASS-II test?')
const homeChapters = ['#journey-title', '#journey-hardware h3', '#journey-flame h3']

const steps = [
  { key: 'home', path: '/', title: 'Watch the flame in freefall',
    detail: 'Scroll down through the 3D chamber, from the outside to the flame close-up. You can continue once you reach the close-up.' },
  { key: 'audience', path: '/', title: 'Choose your research lens',
    detail: 'Open the research lens in the top navigation and pick the role that fits you. It changes the level of detail and the teaching or study materials available to you.' },
  { key: 'explore', path: '/explore?q=BASS-II', title: 'Explore the investigation catalog',
    detail: 'Use the search box to submit BASS-II or try another keyword. You can narrow results with the catalog filters.' },
  { key: 'study', path: `/investigations/${study}`, title: 'Open an investigation',
    detail: 'Read the objective and findings, then scroll to Data for modeling. In this offline sample, only the synthetic DEMO study has an experiment table to preview or export.' },
  { key: 'compare', path: `/compare?ids=${study},${otherStudy}`, title: 'Compare BASS-II and FLEX',
    detail: 'Review the two studies side by side. Toggle Differences only to see where their materials, conditions, and measurements differ.' },
  { key: 'rank', path: '/rank?mode=scenario&ids=fixture-demo&example=demo', title: 'Rank a scenario',
    detail: 'Select Rank investigations. When the Evidence Map appears, select View source to see a test behind the match. Question mode ranks evidence from a question alone.' },
  { key: 'habitat', path: '/rank?mode=habitat', title: 'Find research for a crew environment',
    detail: 'Choose a habitat, such as a lunar base or a space station, then select Rank investigations. Look for the reasons each study matched.' },
  { key: 'ask', path: `/ask?ids=${study}&q=${question}`, title: 'Ask a question with sources',
    detail: 'Send the prefilled question for a cited explanation. You can also select Find evidence to see ranked sources.' },
]

export function IntroTour({ onDismiss }: { onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const initialPage = useRef(useLocation())
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const titleId = useId()
  const [index, setIndex] = useState(-1)
  const [chapter, setChapter] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [tried, setTried] = useState<string[]>([])
  const step = steps[index]
  const currentPath = step?.path.split('?')[0]
  const onPage = pathname === currentPath
  const needsPractice = step && step.key !== 'home' && !tried.includes(step.key)
  const needsScroll = step?.key === 'home' && chapter < homeChapters.length

  useLayoutEffect(() => {
    if (index === -1 && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [index])

  useEffect(() => {
    if (!needsScroll || pathname !== '/') return
    const target = document.querySelector(homeChapters[chapter])
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setChapter((seen) => Math.max(seen, chapter + 1))
    }, { rootMargin: '-65px 0px 0px 0px', threshold: 0.6 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [chapter, needsScroll, pathname])

  useEffect(() => {
    if (!step || !onPage) return
    document.documentElement.dataset.guideStep = step.key
    const markTried = () => setTried((previous) => previous.includes(step.key) ? previous : [...previous, step.key])
    const recordPractice = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest(`[data-guide-action="${step.key}"]`)) return
      if (event.type === 'click' && event.target.closest('form[data-guide-action]')) return
      markTried()
    }
    const askObserver = step.key === 'ask' ? new MutationObserver(() => {
      if (document.querySelector('[data-guide-result="ask"]')) markTried()
    }) : undefined
    const main = document.getElementById('main')
    if (askObserver && main) askObserver.observe(main, { childList: true, subtree: true })
    document.addEventListener('click', recordPractice)
    document.addEventListener('submit', recordPractice)
    return () => {
      askObserver?.disconnect()
      delete document.documentElement.dataset.guideStep
      document.removeEventListener('click', recordPractice)
      document.removeEventListener('submit', recordPractice)
    }
  }, [onPage, step])

  useEffect(() => {
    if (step && !collapsed) heading.current?.focus({ preventScroll: true })
  }, [step, collapsed])

  function goTo(next: number) {
    const destination = steps[next]
    if (!destination) {
      onDismiss()
      return
    }
    setCollapsed(false)
    setIndex(next)
    if (next === 0 && pathname === '/') window.scrollTo(0, 0)
    if (next === 0 || destination.path !== step?.path) void navigate(destination.path)
  }

  function cancel() {
    if (step?.key === 'home' && initialPage.current.pathname !== '/') {
      const { pathname: path, search, hash } = initialPage.current
      void navigate(path + search + hash)
    }
    onDismiss()
  }

  if (!step) return (
    <dialog ref={dialog} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); cancel() }}
      className="intro-tour fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-6 text-[var(--color-ink)] shadow-2xl backdrop:bg-black/75">
      <p className="label mb-3 flex items-center gap-2 !text-[var(--color-flame)]"><Compass aria-hidden="true" className="size-4" /> First-visit guide</p>
      <h2 id={titleId} className="font-display text-xl leading-snug">Welcome to Flame in Freefall</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">Start with the animated experiment on the home page, then try the research tools on each page.</p>
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={cancel}>Skip guide</Button>
        <Button size="sm" variant="accent" onClick={() => goTo(0)} icon={<ArrowDown aria-hidden="true" className="size-4" />}>Start at home</Button>
      </div>
    </dialog>
  )

  return (
    <aside aria-labelledby={titleId} data-lenis-prevent
      className={`fixed inset-x-3 top-[4.5rem] z-[55] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-[var(--color-flame)]/45 bg-[var(--color-panel)] p-4 shadow-2xl sm:left-auto sm:right-5 sm:w-[22rem] ${step.key === 'ask' ? '' : 'sm:top-auto sm:bottom-5'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="label !text-[var(--color-flame)]">Guide · {index + 1} of {steps.length}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}
            className="px-1 py-1 text-xs text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            {collapsed ? 'Show instructions' : 'Minimize'}
          </button>
          <button type="button" onClick={cancel} className="inline-flex items-center gap-1 px-1 py-1 text-xs text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            <X aria-hidden="true" className="size-3.5" /> Cancel tour
          </button>
        </div>
      </div>
      {collapsed ? <h2 id={titleId} className="sr-only">{step.title}</h2> : (
        <motion.div key={step.key} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <h2 id={titleId} ref={heading} tabIndex={-1} className="mt-3 font-display text-sm leading-snug outline-none">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">{step.detail}</p>
          {step.key === 'home' && (
            <p role="status" className="mt-2 text-xs text-[var(--color-flame)]">
              {needsScroll ? `Scroll down · ${chapter} of ${homeChapters.length} scenes viewed` : 'Home animation complete'}
            </p>
          )}
          {step.key === 'study' && onPage && (
            <button type="button" data-guide-action="study" onClick={() => scrollToEl(document.getElementById('data'))}
              className="mt-3 text-xs text-[var(--color-flame)] hover:underline">Find the experiment table</button>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {index > 0 && <Button size="sm" variant="ghost" onClick={() => goTo(index - 1)}>Back</Button>}
            {onPage ? (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {needsPractice && <Button size="sm" variant="ghost" onClick={() => goTo(index + 1)}>Skip this step</Button>}
                <Button size="sm" variant="accent" disabled={needsScroll || needsPractice}
                  onClick={() => goTo(index + 1)} icon={<ArrowRight aria-hidden="true" className="size-4" />}>
                  {index === steps.length - 1 ? 'Finish tour' : 'Next step'}
                </Button>
              </div>
            ) : <Button size="sm" variant="accent" onClick={() => void navigate(step.path)}>Return to this step</Button>}
          </div>
        </motion.div>
      )}
    </aside>
  )
}
