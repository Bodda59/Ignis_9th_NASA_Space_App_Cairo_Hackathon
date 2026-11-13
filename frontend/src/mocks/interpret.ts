/**
 * Mock grounded "AI" for POST /api/interpret. NOT an LLM: a small rule set that
 * answers only from challenge-brief passages and returns insufficient_evidence
 * otherwise — so the UI can be built for both outcomes. Interpretations are
 * cautious by design and always paired with gaps.
 */
import type { Citation, InterpretItem, InterpretRequest, InterpretResponse } from '@/api/types'
import { findStudy } from './details'

const BRIEF = { source_id: 'src-brief', title: 'NASA Space Apps 2026 — “Flame in Freefall” challenge brief', url: 'https://www.spaceappschallenge.org/', source_type: 'challenge_brief' }
const CIT: Record<string, Citation> = {
  'c-bg': { id: 'c-bg', ...BRIEF, location: 'Background' },
  'c-other': { id: 'c-other', ...BRIEF, location: 'Potential considerations › Other investigations in PSI' },
  'c-o2': { id: 'c-o2', ...BRIEF, location: 'Potential considerations › Spacesuits and oxygen concentration' },
  'c-pg': { id: 'c-pg', ...BRIEF, location: 'Potential considerations › Partial-gravity data' },
}

type Topic = {
  match: RegExp
  studies: string[]
  findings: (InterpretItem & { study: string })[]
  /** `needs` = only valid when that study's finding is in scope */
  interpretations: (InterpretItem & { needs?: string })[]
  gaps: (string | { text: string; needs: string })[]
}

const TOPICS: Topic[] = [
  {
    match: /suppress|extinguish|co2|carbon dioxide|helium|dilut|put out/i,
    studies: ['flex'],
    findings: [{ study: 'flex', text: 'FLEX diluted the chamber atmosphere with carbon dioxide and with helium; both suppressed fire in burning-droplet tests.', citation_ids: ['c-bg'] }],
    interpretations: [{ safety_topic: 'suppression', text: 'Atmosphere dilution is a documented suppression approach in microgravity, so dilution agents are a reasonable candidate to evaluate for sealed-cabin suppression systems.', citation_ids: ['c-bg'] }],
    gaps: ['Agent concentrations and extinguishment thresholds are not in this collection.', 'Droplet flames in a test chamber are not cabin-scale fires or burning solid materials.', 'Results are from microgravity; lunar or Martian gravity is not represented.'],
  },
  {
    match: /smoke|detect|aerosol|alarm|sensor|dust/i,
    studies: ['same', 'same-r', 'daft'],
    findings: [
      { study: 'same', text: 'Fire detection was tested in microgravity through the SAME and SAME-R smoke and aerosol measurement studies.', citation_ids: ['c-bg'] },
      { study: 'daft', text: 'One instrument used for smoke detection in SAME / SAME-R was reused in DAFT to detect dust.', citation_ids: ['c-other'] },
    ],
    interpretations: [
      { safety_topic: 'detection', text: 'These studies are the most direct evidence base for spacecraft smoke-detector development in this collection.', citation_ids: ['c-bg'] },
      { needs: 'daft', safety_topic: 'detection', text: 'Because a smoke instrument also responded to dust, surface habitats with dust may need detection approaches that distinguish the two — a question worth testing, not a conclusion.', citation_ids: ['c-other'] },
    ],
    gaps: ['No detector performance numbers (sensitivity, false-alarm rate) are in this collection.', { needs: 'daft', text: 'Whether dust interferes with smoke detection in practice is not established here.' }],
  },
  {
    match: /oxygen|o2|flammab|fabric|plastic|material|moon base|30 ?%|enrich/i,
    studies: ['acme-cfi-g', 'bass', 'bass-ii', 'saffire'],
    findings: [
      { study: 'acme-cfi-g', text: 'CFI-G used oxygen-nitrogen flows of up to 85% oxygen — the highest oxygen levels among PSI microgravity tests.', citation_ids: ['c-o2'] },
      { study: 'saffire', text: 'Flammability studies of solid materials such as fabrics and plastics were conducted in BASS, BASS-II and Saffire.', citation_ids: ['c-bg'] },
    ],
    interpretations: [
      { safety_topic: 'prevention', text: 'Planned lunar habitats at 30% oxygen or more are a material-selection concern; studies of solid-material flammability are the place to look first for evidence.', citation_ids: ['c-bg', 'c-o2'] },
      { needs: 'acme-cfi-g', safety_topic: 'prevention', text: 'CFI-G’s high-oxygen tests used gaseous fuels, so they may help bound oxygen effects on flames but do not describe how cabin fabrics or plastics behave.', citation_ids: ['c-o2'] },
    ],
    gaps: ['No material flammability limits at 30% oxygen are recorded in this collection.', 'A lower oxygen level being “safer” for any specific material cannot be concluded from this evidence.', 'Microgravity data does not establish behaviour in lunar gravity.'],
  },
  {
    match: /partial|lunar|moon|mars|martian|e-?field|electric|(?<!micro)gravity/i, // 'microgravity' alone is not a gravity-gap question
    studies: ['acme-e-field'],
    findings: [{ study: 'acme-e-field', text: 'E-FIELD Flames mimicked partial gravity by applying an electric field to the ions naturally present in flames.', citation_ids: ['c-pg'] }],
    interpretations: [{ text: 'Until partial-gravity data is added, microgravity and normal-gravity results can be used to bound — not predict — what happens at lunar or Martian gravity.', citation_ids: ['c-pg'] }],
    gaps: ['The challenge brief states there is currently no partial-gravity combustion data in PSI.', 'An electric-field effect is an analogue, not real partial gravity.'],
  },
]

const ACR: Record<string, string> = { flex: 'FLEX', same: 'SAME', 'same-r': 'SAME-R', daft: 'DAFT', 'acme-cfi-g': 'CFI-G', bass: 'BASS', 'bass-ii': 'BASS-II', saffire: 'Saffire', 'acme-e-field': 'E-FIELD' }

export function interpret(req: InterpretRequest): InterpretResponse {
  const scope = req.investigation_ids?.length ? new Set(req.investigation_ids) : null
  // no topic words but a study scope (e.g. a follow-up about one study) → answer from that study's passages
  const matched = TOPICS.filter((t) => t.match.test(req.question))
  const hits = matched.length ? matched : scope ? TOPICS : []

  const findings: InterpretItem[] = []
  const interpretations: InterpretItem[] = []
  const gaps: string[] = []
  const related = new Set<string>()

  for (const t of hits) {
    const fs = t.findings.filter((f) => !scope || scope.has(f.study) || (f.study === 'same' && scope.has('same-r')) || (f.study === 'saffire' && (scope.has('bass') || scope.has('bass-ii'))))
    if (!fs.length) continue
    const inScope = new Set(fs.map((f) => f.study))
    fs.forEach(({ study: _s, ...f }) => findings.push(f))
    // interpretations/gaps tied to a study are dropped when that study's evidence is out of scope
    t.interpretations.filter((x) => !x.needs || inScope.has(x.needs)).forEach(({ needs: _n, ...x }) => interpretations.push(x))
    t.gaps.filter((g) => typeof g === 'string' || inScope.has(g.needs)).forEach((g) => gaps.push(typeof g === 'string' ? g : g.text))
    t.studies.filter((s) => (!scope || scope.has(s)) && (inScope.has(s) || !scope)).forEach((s) => related.add(s))
  }

  if (!findings.length) {
    return {
      status: 'insufficient_evidence',
      findings: [],
      interpretations: [],
      gaps: [
        { text: scope ? 'The selected studies contain no passages that address this question.' : 'No passages in the collection address this question.' },
        { text: 'Rather than guess, no interpretation is given. Try broader wording, a different scope, or Explore.' },
      ],
      related_investigation_ids: [],
      related_investigations: [],
      citations: [],
    }
  }

  const used = new Set([...findings, ...interpretations].flatMap((x) => x.citation_ids))
  const ids = [...related]
  return {
    status: 'answered',
    findings,
    interpretations,
    gaps: gaps.map((text) => ({ text })),
    related_investigation_ids: ids,
    related_investigations: ids.map((id) => ({ id, acronym: ACR[id] ?? id, name: findStudy(id)?.name ?? id })),
    citations: Object.values(CIT).filter((c) => used.has(c.id)),
  }
}
