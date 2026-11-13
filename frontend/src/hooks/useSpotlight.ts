import { useCallback, useRef, type PointerEvent } from 'react'

/** Sets --x/--y CSS vars on the element for a cursor-following spotlight. */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const onPointerMove = useCallback((e: PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${e.clientX - r.left}px`)
    el.style.setProperty('--y', `${e.clientY - r.top}px`)
  }, [])
  return { ref, onPointerMove }
}
