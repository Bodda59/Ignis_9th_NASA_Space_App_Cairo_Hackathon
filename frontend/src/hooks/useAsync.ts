import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { useAudience } from '@/features/audience/audience'

export type AsyncState<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: ApiError }

type Settled<T> = { key: string; data?: T; error?: ApiError }

/**
 * Runs `fn` whenever `key` changes, aborting the previous request.
 * "Loading" is derived (settled key ≠ requested key), and the last good data
 * is kept while reloading so content never flashes empty.
 * `ready` is a response already in hand for this key; it is shown at once,
 * with no loading state, while `fn` settles.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, key: string, ready?: T) {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({ key: '' })
  const [lastData, setLastData] = useState<T>()
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  const audience = useAudience()
  const requestKey = `${key}#${nonce}#${audience}`

  useEffect(() => {
    const ctrl = new AbortController()
    fnRef
      .current(ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return
        setSettled({ key: requestKey, data })
        setLastData(data)
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e as Error)?.name === 'AbortError') return
        const err = e instanceof ApiError ? e : new ApiError(0, { message: (e as Error)?.message })
        setSettled({ key: requestKey, error: err })
      })
    return () => ctrl.abort()
  }, [requestKey])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  let state: AsyncState<T>
  if (settled.key !== requestKey) state = ready !== undefined ? { status: 'success', data: ready } : { status: 'loading', data: lastData }
  else if (settled.error) state = { status: 'error', data: lastData, error: settled.error }
  else state = { status: 'success', data: settled.data as T }

  return { ...state, retry }
}
