import { createContext, useContext } from 'react'
import type { Citation } from '@/api/types'

export type CitationIndex = Map<string, { n: number; citation: Citation }>

export const CitationCtx = createContext<CitationIndex>(new Map())
export const useCitations = () => useContext(CitationCtx)

/** Number citations in first-seen order (stable footnote numbering). */
export function indexCitations(citations: Citation[]): CitationIndex {
  return new Map(citations.map((c, i) => [c.id, { n: i + 1, citation: c }]))
}

export const isSynthetic = (c?: Citation) => c?.source_type === 'fixture'

/** Prefix for source-list anchors, so several answers on one page don't collide. */
export const AnchorCtx = createContext('cite-')
