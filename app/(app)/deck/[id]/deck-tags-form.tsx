'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CuePill } from '@/lib/brand/primitives/pill'
import { normalizeDeckTags, tagsToInputValue } from '@/lib/decks/tags'
import { updateDeckTags } from './actions'

export function DeckTagsForm({
  deckId,
  initialTags,
}: {
  deckId: string
  initialTags: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tagsToInputValue(initialTags))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const previewTags = useMemo(() => normalizeDeckTags(draft), [draft])

  function save() {
    startTransition(async () => {
      const res = await updateDeckTags(deckId, previewTags)
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
    setDraft(tagsToInputValue(initialTags))
    setError(null)
    setEditing(false)
  }

  return (
    <div className="space-y-3 max-w-[520px]">
      <div className="flex items-center gap-3">
        <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
          Tags
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="algebra, formulas, finals"
            className="w-full rounded-input border-2 border-ink-black/20 bg-paper-white px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow"
          />
          <p className="text-xs text-ink-black/60">
            Separate tags with commas. Up to 6 tags, 23 characters each.
          </p>
          <div className="flex flex-wrap gap-2 min-h-8">
            {previewTags.length > 0 ? (
              previewTags.map((tag) => (
                <CuePill key={tag} tone="neutral">
                  {tag}
                </CuePill>
              ))
            ) : (
              <span className="text-sm text-ink-black/50">No tags yet.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="px-4 py-3 rounded-full bg-cue-yellow font-display font-semibold text-sm disabled:opacity-50"
            >
              {pending ? 'Saving...' : 'Save tags'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="text-ink-black/60 hover:text-ink-black font-display font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 min-h-8">
          {initialTags.length > 0 ? (
            initialTags.map((tag) => (
              <CuePill key={tag} tone="neutral">
                {tag}
              </CuePill>
            ))
          ) : (
            <span className="text-sm text-ink-black/50">No tags yet.</span>
          )}
        </div>
      )}
    </div>
  )
}
