import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { COMPARE_MAX, CompareCtx, type CompareItem } from './compareStore'
const KEY = 'fif.compare'

function load(): CompareItem[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.slice(0, COMPARE_MAX) : []
  } catch {
    return []
  }
}

/** Compare selection shared across pages (kept for the browser session). */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>(load)

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable — selection still works in memory */
    }
  }, [items])

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items])
  const toggle = useCallback(
    (item: CompareItem) =>
      setItems((cur) =>
        cur.some((i) => i.id === item.id) ? cur.filter((i) => i.id !== item.id) : cur.length >= COMPARE_MAX ? cur : [...cur, item],
      ),
    [],
  )
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])
  const replace = useCallback((next: CompareItem[]) => setItems(next.slice(0, COMPARE_MAX)), [])

  const value = useMemo(
    () => ({ items, has, toggle, remove, clear, replace, full: items.length >= COMPARE_MAX }),
    [items, has, toggle, remove, clear, replace],
  )
  return <CompareCtx.Provider value={value}>{children}</CompareCtx.Provider>
}
