import { getAudience, type Audience } from '@/features/audience/audience'
import { ApiError } from './errors'
import type { ApiErrorBody } from './types'

/**
 * Same-origin path the Vite dev/preview server proxies to the research backend
 * (see vite.config.ts). The API key is added by the proxy, never by the browser.
 */
const BASE = '/research-gateway'

async function request(path: string, init?: RequestInit, audience: Audience = getAudience()) {
  let response: Response
  try {
    const headers = new Headers(init?.headers)
    headers.set('X-Audience-Type', audience)
    if (init?.body) headers.set('Content-Type', 'application/json')
    response = await fetch(`${BASE}${path}`, { ...init, headers })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError(0)
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as (ApiErrorBody & { message?: string }) | null
    throw new ApiError(response.status, body?.error ?? { message: body?.message })
  }
  return response
}

/** JSON request; unwraps `{ meta, data }` envelopes. */
export async function http<T>(path: string, init?: RequestInit, audience?: Audience): Promise<T> {
  const response = await request(path, init, audience)
  const body = await response.json()
  return body?.meta && Object.hasOwn(body, 'data') ? body.data as T : body as T
}

/** File download; the filename comes from Content-Disposition when present. */
export async function download(path: string, fallback: string, init?: RequestInit) {
  const response = await request(path, init)
  const header = response.headers.get('Content-Disposition') ?? ''
  const name = /filename="?([^";]+)"?/i.exec(header)?.[1] ?? fallback
  return { blob: await response.blob(), filename: name }
}

export function post(body: unknown, signal?: AbortSignal): RequestInit {
  return { method: 'POST', body: JSON.stringify(body), signal }
}
