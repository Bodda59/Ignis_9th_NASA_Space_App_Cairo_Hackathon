import { useEffect, useState } from 'react'

/** Matches the backend `LearningRequest` limits (`backend/dashboard/learning.py`). */
export const NOTES_LIMIT = 2000
export const TOPIC_LIMIT = 500
const QUOTE_LIMIT = 400

export type NoteColor = 'sun' | 'rose' | 'mint' | 'sky'
const COLORS: NoteColor[] = ['sun', 'rose', 'mint', 'sky']

/** A sticky note: the reader's own text, optionally pinned to a quote from the page. */
export type Note = { id: string; text: string; quote?: string; section?: string; color: NoteColor }
type Book = { notes: Note[]; topic: string }

const storageKey = (id: string) => `flame:notebook:${id}`

function isNote(v: unknown): v is Note {
  const n = v as Note
  return !!n && typeof n.id === 'string' && typeof n.text === 'string' && COLORS.includes(n.color)
}

function load(id: string): Book {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey(id)) ?? 'null') as Partial<Book> | null
    if (v && Array.isArray(v.notes)) {
      return { notes: v.notes.filter(isNote), topic: typeof v.topic === 'string' ? v.topic.slice(0, TOPIC_LIMIT) : '' }
    }
  } catch { /* Unreadable or blocked storage: start with an empty notebook. */ }
  return { notes: [], topic: '' }
}

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/** One paragraph per note; the PDF export splits paragraphs on blank lines. */
export function serializeNotes(notes: Note[]) {
  return notes
    .map((n) => {
      const quote = n.quote ? `“${n.quote}”${n.section ? ` (${n.section})` : ''}` : ''
      return [quote, n.text.trim()].filter(Boolean).join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

/** A study's notebook, kept in this browser per investigation. */
export function useNotebook(id: string) {
  const [book, setBook] = useState<Book>(() => load(id))

  useEffect(() => {
    try { localStorage.setItem(storageKey(id), JSON.stringify(book)) } catch { /* Notes still work for this visit. */ }
  }, [id, book])

  return {
    notes: book.notes,
    topic: book.topic,
    setTopic: (topic: string) => setBook((b) => ({ ...b, topic: topic.slice(0, TOPIC_LIMIT) })),
    add: (note: { text?: string; quote?: string; section?: string }) =>
      setBook((b) => ({
        ...b,
        notes: [
          ...b.notes,
          {
            id: newId(),
            text: note.text?.trim() ?? '',
            quote: note.quote ? clip(note.quote, QUOTE_LIMIT) : undefined,
            section: note.section ? clip(note.section, 60) : undefined,
            color: COLORS[b.notes.length % COLORS.length],
          },
        ],
      })),
    update: (noteId: string, text: string) =>
      setBook((b) => ({ ...b, notes: b.notes.map((n) => (n.id === noteId ? { ...n, text } : n)) })),
    remove: (noteId: string) => setBook((b) => ({ ...b, notes: b.notes.filter((n) => n.id !== noteId) })),
  }
}
