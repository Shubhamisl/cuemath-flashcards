'use client'

import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { createDeckFromUpload } from '@/app/(app)/library/actions'

const SUBJECTS = [
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'language', label: 'Language' },
  { id: 'humanities', label: 'Humanities' },
  { id: 'other', label: 'Other' },
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
    return <CueButton onClick={() => setOpen(true)} className="w-full">Upload PDF</CueButton>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setOpen(false)}>
      <CueCard className="w-full max-w-md space-y-4 shadow-card-rest" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold">New deck</h2>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="block border-2 border-dashed border-ink-black rounded-card p-6 text-center cursor-pointer"
        >
          <input type="file" accept="application/pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <span className="text-sm">{file ? file.name : 'Drop a PDF or click to choose'}</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-input border-2 border-ink-black px-4 py-2" />
        </label>

        <div>
          <span className="text-sm font-medium">Subject</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSubject(s.id)}
                className={`rounded-input border-2 border-ink-black px-3 py-2 text-sm ${subject === s.id ? 'bg-cue-yellow' : 'bg-transparent'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex gap-2">
          <CueButton variant="ghost" onClick={() => setOpen(false)} disabled={pending} className="flex-1">Cancel</CueButton>
          <CueButton onClick={submit} disabled={pending || !file} className="flex-1">
            {pending ? 'Uploading…' : 'Create deck'}
          </CueButton>
        </div>
      </CueCard>
    </div>
  )
}
