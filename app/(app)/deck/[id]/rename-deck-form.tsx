'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renameDeck } from './actions'

export function RenameDeckForm({
  deckId,
  initialTitle,
}: {
  deckId: string
  initialTitle: string
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    if (!title.trim()) return
    startTransition(async () => {
      const res = await renameDeck(deckId, title)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      setEditing(false)
      router.refresh()
    })
  }

  function cancel() {
    setTitle(initialTitle)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-tight flex items-start gap-3">
        <span>{title}</span>
        <button
          onClick={() => setEditing(true)}
          aria-label="Rename deck"
          className="mt-1 text-2xl leading-none text-ink-black/30 hover:text-ink-black/70 transition-colors"
        >
          ✎
        </button>
      </h1>
    )
  }

  return (
    <div className="space-y-2 max-w-[480px]">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
          className="flex-1 rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-display font-extrabold text-2xl focus:outline-none focus:ring-2 focus:ring-cue-yellow"
        />
        <button
          onClick={save}
          disabled={pending || !title.trim()}
          className="px-4 py-3 rounded-full bg-cue-yellow font-display font-semibold text-sm disabled:opacity-50"
        >
          {pending ? '…' : 'Save'}
        </button>
        <button
          onClick={cancel}
          className="px-3 py-3 text-ink-black/60 hover:text-ink-black font-display font-semibold text-sm"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
