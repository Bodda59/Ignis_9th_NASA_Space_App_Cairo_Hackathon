import { useCallback, useState } from 'react'
import type { Toast } from './ui'

let nextId = 1

/** Short-lived HUD messages (each disappears after a few seconds). */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = nextId++
    setToasts((t) => [...t, { id, text, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])
  const clear = useCallback(() => setToasts([]), [])
  return { toasts, push, clear }
}
