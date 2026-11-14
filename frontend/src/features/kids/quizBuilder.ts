/**
 * Quiz questions built only from what the Kids Lab shows about each study:
 * the experiment story (job, fuel, materials, oxygen, tests, where, Earth help)
 * or, for studies not yet discovered, the facts printed on its Explore card (job, fuel).
 */
import type { EarthThemeId, InvestigationResponse, SafetyTopic, SearchItem } from '@/api/types'
import { EARTH_THEMES, FUELS, JOBS, platformWords } from './kidsCopy'
import { kidStats, oxygenAmount, oxygenVerdict, type KidStats } from './kidsData'

export type StudyFacts = {
  id: string
  acronym: string
  jobs: SafetyTopic[]
  fuels: string[]
  /** Only for studies whose story the child has opened. */
  stats: KidStats | null
  earth: EarthThemeId[]
}

export type Question = {
  prompt: string
  options: string[]
  answer: number
  explain: string
  studyId: string
  acronym: string
  /** Where the child saw this fact. */
  from: 'story' | 'card'
  step: string
}

export const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export const factsFromSearch = (s: SearchItem): StudyFacts => ({
  id: s.id, acronym: s.acronym, jobs: s.safety_topics, fuels: (s.fuel_types ?? []).filter((f) => FUELS[f]), stats: null, earth: [],
})

export const factsFromDetail = (d: InvestigationResponse): StudyFacts => ({
  id: d.investigation.id,
  acronym: d.investigation.acronym,
  jobs: d.investigation.safety_topics,
  fuels: d.investigation.fuel_types.filter((f) => FUELS[f]),
  stats: kidStats(d),
  earth: (d.earth?.themes ?? []).map((t) => t.id),
})

function ask(f: StudyFacts, from: Question['from'], step: string, prompt: string, right: string, wrong: string[], explain: string): Question | null {
  const uniqueWrong = [...new Set(wrong)].filter((w) => w !== right).slice(0, 2)
  if (uniqueWrong.length < 1) return null
  const options = shuffle([right, ...uniqueWrong])
  return { prompt, options, answer: options.indexOf(right), explain, studyId: f.id, acronym: f.acronym, from, step }
}

/** Every question a study can support, given the other studies for wrong answers. */
export function questionsFor(f: StudyFacts, pool: StudyFacts[]): Question[] {
  const from = f.stats ? 'story' : 'card'
  const others = pool.filter((p) => p.id !== f.id)
  const qs: (Question | null)[] = []

  if (f.jobs.length === 1) {
    const t = f.jobs[0]
    qs.push(ask(f, from, from === 'story' ? 'Meet' : 'Explore card', `What job does ${f.acronym} do?`, JOBS[t].title,
      Object.values(JOBS).map((j) => j.title), `${f.acronym}’s job is to “${JOBS[t].title.toLowerCase()}”.`))
  }
  if (f.fuels.length === 1) {
    const fu = f.fuels[0]
    qs.push(ask(f, from, from === 'story' ? 'What burned?' : 'Explore card', `What kind of fuel is listed for ${f.acronym}?`, FUELS[fu].title,
      Object.values(FUELS).map((x) => x.title), `The catalog lists ${FUELS[fu].title.toLowerCase()} fuel for ${f.acronym}. ${FUELS[fu].explain}`))
  }

  const s = f.stats
  if (s) {
    const top = s.topMaterials[0]
    if (top && top.count > (s.topMaterials[1]?.count ?? 0)) {
      const wrong = shuffle(s.topMaterials.slice(1)).map((m) => m.name)
      qs.push(ask(f, 'story', 'Materials and fuels', `Which material is listed most often in ${f.acronym}’s test records?`, top.name, wrong,
        `${top.name} is listed in ${top.count} test records.`))
    }
    if (s.oxygen) {
      const right = oxygenVerdict(s.oxygen.min, s.oxygen.max)
      qs.push(ask(f, 'story', 'The air they used', `How do the listed oxygen numbers for ${f.acronym} compare with Earth air?`, right,
        shuffle(['Less oxygen than Earth air', 'More oxygen than Earth air', 'About the same as Earth air',
          'Less oxygen or about the same', 'About the same or more oxygen', 'Both less and more than Earth air']),
        `The listed values are ${oxygenAmount(s.oxygen.min, s.oxygen.max)} parts oxygen out of 100. Earth air has about 21.`))
    }
    if (s.testCount > 0) {
      const counts = shuffle([...new Set(others.map((o) => o.stats?.testCount ?? 0).filter((c) => c > 0 && c !== s.testCount))])
      if (counts.length) {
        qs.push(ask(f, 'story', 'How many tests?', `How many individual test entries does the catalog list for ${f.acronym}?`, String(s.testCount), counts.map(String),
          `The catalog lists ${s.testCount} individual test entries. Entries can include tests that did not ignite.`))
      }
    }
    const place = platformWords(s.platform)
    if (place) {
      const wrong = [...new Set(others.map((o) => platformWords(o.stats?.platform)?.title).filter((p): p is string => !!p && p !== place.title))]
      qs.push(ask(f, 'story', 'Meet', `Where did the ${f.acronym} study take place?`, place.title, wrong, `Study location: ${place.title}. ${place.explain}`))
    }
  }

  if (f.earth.length) {
    const id = shuffle(f.earth)[0]
    const wrong = shuffle((Object.keys(EARTH_THEMES) as EarthThemeId[]).filter((t) => !f.earth.includes(t))).map((t) => EARTH_THEMES[t].title)
    qs.push(ask(f, 'story', 'How it helps Earth', `NASA says ${f.acronym} could help people on Earth. With what?`, EARTH_THEMES[id].title, wrong,
      `${EARTH_THEMES[id].title}: ${EARTH_THEMES[id].explain}`))
  }
  return qs.filter((q): q is Question => q !== null)
}

/**
 * A round of `size` questions: mostly from discovered stories (at most 2 per study),
 * topped up with Explore-card facts about other studies.
 */
export function buildQuiz(discovered: StudyFacts[], cards: StudyFacts[], size = 6): Question[] {
  const pool = [...discovered, ...cards]
  const fromStories = shuffle(discovered).flatMap((f) => shuffle(questionsFor(f, pool)).slice(0, 2))
  const picked = shuffle(fromStories).slice(0, size)
  if (picked.length < size) {
    const used = new Set(picked.map((q) => q.studyId))
    const extra = shuffle(cards.filter((c) => !used.has(c.id))).flatMap((c) => shuffle(questionsFor(c, pool)).slice(0, 1))
    picked.push(...extra.slice(0, size - picked.length))
  }
  return shuffle(picked)
}
