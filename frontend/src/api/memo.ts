import { getAudience } from '@/features/audience/audience'

/**
 * Recent read-only responses, kept for a minute so that going back, paging
 * back or repeating a filter shows at once instead of loading again.
 */
const KEEP_MS = 60_000
const entries = new Map<string, { at: number; value: unknown }>()
const scoped = (name: string) => `${getAudience()}|${name}`

/** The recent response for `name`, if one is still fresh. */
export function recall<T>(name: string): T | undefined {
  const hit = entries.get(scoped(name))
  return hit && Date.now() - hit.at < KEEP_MS ? (hit.value as T) : undefined
}

/** Returns the recent response for `name`, or loads and keeps it. Failed and aborted loads are not kept. */
export async function remember<T>(name: string, load: () => Promise<T>): Promise<T> {
  const hit = recall<T>(name)
  if (hit !== undefined) return hit
  const key = scoped(name)
  const value = await load()
  if (entries.size >= 100) entries.clear()
  entries.set(key, { at: Date.now(), value })
  return value
}
