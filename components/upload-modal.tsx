'use client'

import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { createDeckFromUpload } from '@/app/(app)/library/actions'
import { cn } from '@/lib/utils'

const SUBJECTS = [
  { id: 'math', label: 'Math', selectedClass: 'bg-soft-cream' },
  { id: 'language', label: 'Language', selectedClass: 'bg-bubble-pink' },
  { id: 'science', label: 'Science', selectedClass: 'bg-mint-green' },
  { id: 'humanities', label: 'Humanities', selectedClass: 'bg-trust-blue' },
  { id: 'other', label: 'Other', selectedClass: 'bg-paper-white' },
] as const

export function UploadModal() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]['id']>('other')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function pick(f: File) {
    if (f.type !== 'application/pdf') { setError('PDF only'); return }
    if (f.size > 20 * 1024 * 1024) { setError('Max 20MB'); return }
    setFile(f)
    setTitle(f.name.replace(/\.pdf$/i, ''))
    setError(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) pick(f)
  }

  function close() {
    if (pending) return
    setOpen(false)
  }

  function submit() {
    if (!file) { setError('Choose a PDF first'); return }
    const fd = new FormData()
    fd.set('file', file)
    fd.set('title', title)
    fd.set('subject_family', subject)
    startTransition(async () => {
      const res = await createDeckFromUpload(fd)
      if ('error' in res) { setError(res.error); return }
      setOpen(false); setFile(null); setTitle(''); setSubject('other'); setError(null)
    })
  }

  if (!open) {
    return (
      <CueButton size="lg" onClick={() => setOpen(true)}>
        Upload PDF
      </CueButton>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-black/40 backdrop-blur-[2px] p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Upload a PDF"
    >
      <CueCard
        tone="paper"
        className="w-full max-w-[520px] rounded-panel p-8 space-y-6"
        style={{ boxShadow: 'var(--shadow-card-flip)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display font-extrabold text-2xl">Upload a PDF</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-ink-black/60 hover:text-ink-black size-8 inline-flex items-center justify-center rounded-full"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-black/20 rounded-card bg-soft-cream/40 px-6 py-10 text-center cursor-pointer hover:border-ink-black/40 transition-colors"
        >
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
          />
          <div
            aria-hidden="true"
            className="size-12 rounded-full bg-paper-white flex items-center justify-center text-2xl"
          >
            ↑
          </div>
          <span className="font-display font-semibold text-base text-ink-black">
            {file ? file.name : 'Drop a PDF here or click to choose'}
          </span>
          <span className="text-xs text-ink-black/60">Up to 20MB</span>
        </label>

        {file && (
          <label className="block space-y-2">
            <span className="text-sm font-display font-semibold">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-body focus:outline-none focus:ring-2 focus:ring-cue-yellow"
            />
          </label>
        )}

        <div className="space-y-3">
          <span className="block text-sm font-display font-semibold">What is this about?</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const selected = subject === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSubject(s.id)}
                  className={cn(
                    'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all',
                    'border-2',
                    selected
                      ? `${s.selectedClass} border-ink-black`
                      : 'bg-paper-white border-ink-black/20 text-ink-black/70 hover:border-ink-black/40',
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="px-5 py-3 font-display font-semibold text-ink-black/70 hover:text-ink-black disabled:opacity-50"
          >
            Cancel
          </button>
          <CueButton onClick={submit} disabled={pending || !file}>
            {pending ? 'Uploading…' : 'Upload'}
          </CueButton>
        </div>
      </CueCard>
    </div>
  )
}
