import { useState } from 'react'
import { BookOpen, Download, Presentation } from 'lucide-react'
import { api, saveBlob } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { useAudience } from '@/features/audience/audience'

export function LearningPanel({ id }: { id: string }) {
  const audience = useAudience()
  if (audience !== 'professor' && audience !== 'graduate' && audience !== 'undergraduate') return null
  return <Materials key={`${id}:${audience}`} id={id} audience={audience} />
}

function Materials({ id, audience }: { id: string; audience: 'professor' | 'graduate' | 'undergraduate' }) {
  const [notes, setNotes] = useState('')
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const professor = audience === 'professor'
  const Icon = professor ? Presentation : BookOpen
  async function getFile(format: 'pdf' | 'pptx' | 'docx') {
    setBusy(true); setMessage('')
    try {
      const file = await api.learning(id, audience, format, notes, topic)
      saveBlob(file.blob, file.filename)
      setMessage(`${format.toUpperCase()} ready to download.`)
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  const input = 'w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-void)] px-3 py-2 text-sm'
  return <section aria-label="Learning materials" className="my-8 space-y-4 rounded-2xl border border-[var(--color-nebula)]/30 bg-[var(--color-panel)]/60 p-5">
    <div className="flex gap-3"><Icon className="size-5 text-[var(--color-nebula)]" />
      <div><h2 className="font-display text-lg">{professor ? 'Lecture materials' : 'Study materials'}</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">{professor ? 'Download editable slides with cited excerpts and discussion prompts.' :
          'Download cited study notes with the reported methods and evidence.'}</p></div></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Topic focus (optional)<input className={input} value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)} placeholder="For example, sample materials" /></label>
      <label className="space-y-1 text-sm">Personal notes for PDF<textarea className={input} rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes to your copy" /></label>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy} iconLeft={<Download className="size-4" />} onClick={() => void getFile(professor ? 'pptx' : 'docx')}>
        {professor ? 'PowerPoint slides' : 'Word study notes'}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} iconLeft={<Download className="size-4" />} onClick={() => void getFile('pdf')}>PDF with notes</Button>
    </div>
    <p role="status" className="text-sm text-[var(--color-ink-dim)]">{busy ? 'Preparing your download…' : message}</p>
  </section>
}
