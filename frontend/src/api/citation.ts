import type { Citation, Source } from './types'

export function citation(source: Source & { investigation_id?: string }): Citation {
  const id = source.id ?? source.passage_id ?? source.document_id ?? source.title
  return {
    id, source_id: source.document_id ?? id, title: source.title, investigation_id: source.investigation_id,
    url: source.source_url && /^https?:\/\//i.test(source.source_url) ? source.source_url : null,
    location: Object.entries(source.location ?? {}).map(([key, value]) => `${key.replaceAll('_', ' ')} ${value}`).join(' · ') || 'Source document',
  }
}
