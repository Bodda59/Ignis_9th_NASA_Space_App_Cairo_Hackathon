import { createContext, useContext } from 'react'

export const COMPARE_MAX = 3 // contract: compare takes 2–3 distinct IDs
export const COMPARE_MIN = 2

export type CompareItem = { id: string; acronym: string; name: string }

export type CompareCtxValue = {
  items: CompareItem[]
  has: (id: string) => boolean
  toggle: (item: CompareItem) => void
  remove: (id: string) => void
  clear: () => void
  replace: (items: CompareItem[]) => void
  full: boolean
}

export const CompareCtx = createContext<CompareCtxValue | null>(null)

export function useCompare() {
  const c = useContext(CompareCtx)
  if (!c) throw new Error('useCompare must be used inside <CompareProvider>')
  return c
}
