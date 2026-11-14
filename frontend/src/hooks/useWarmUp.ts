import { useEffect, useState } from 'react'

/**
 * Turns true shortly after the page has opened (when the browser is idle, or after
 * `maxWaitMs` at the latest). Heavy sections use it to build their 3D scenes ahead of time,
 * so nothing pops in while the visitor scrolls down.
 */
export function useWarmUp(maxWaitMs = 1200) {
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    const done = () => setWarm(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(done, { timeout: maxWaitMs })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(done, Math.min(maxWaitMs, 400))
    return () => clearTimeout(id)
  }, [maxWaitMs])
  return warm
}
