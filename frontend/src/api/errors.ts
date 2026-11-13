import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  status: number
  code: string
  field?: string
  retryable: boolean

  constructor(status: number, body?: Partial<ApiErrorBody['error']>) {
    super(body?.message ?? friendly(status))
    this.status = status
    this.code = body?.code ?? `HTTP_${status}`
    this.field = body?.field
    this.retryable = body?.retryable ?? [429, 503, 504].includes(status)
  }
}

function friendly(status: number) {
  if (status === 0) return 'Can’t reach the research service. Check your connection.'
  if (status === 404) return 'Not found.'
  if (status === 429) return 'Too many requests. Please wait a moment and retry.'
  if (status >= 500) return 'The research service is temporarily unavailable.'
  return 'Something went wrong with that request.'
}
