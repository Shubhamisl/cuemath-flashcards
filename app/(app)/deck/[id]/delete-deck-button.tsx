'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { deleteDeck } from './actions'

export function DeleteDeckButton({ deckId, deckTitle }: { deckId: string; deckTitle: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function confirm() {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const res = await deleteDeck(deckId)
      // On success the action redirects; we only get here on error.
      if (res && 'error' in res && res.error) {
        setError(res.error === 'unauthorized' ? 'Please sign in again.' : 'Could not delete deck.')
      }
    })
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] items-center rounded-input border-2 border-alert-coral bg-paper-white px-5 font-display font-bold text-sm text-alert-coral hover:bg-alert-coral/10 transition"
        >
          Delete deck
        </button>
      ) : (
        <CueCard
          ref={dialogRef}
          tone="paper"
          role="alertdialog"
          aria-modal="false"
          className="shadow-card-flip max-w-[480px] space-y-4 border-l-4 border-alert-coral"
        >
          <div className="space-y-1">
            <div className="font-display font-semibold text-lg text-ink-black">
              Delete deck?
            </div>
            <p className="font-body text-sm text-ink-black/70">
              <span className="font-semibold text-ink-black">{deckTitle}</span> — this wipes all
              cards and review history. No undo.
            </p>
          </div>
          {error && (
            <p role="alert" className="font-body text-sm text-alert-coral">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <CueButton
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </CueButton>
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="inline-flex min-h-[40px] items-center rounded-input bg-alert-coral px-4 font-display font-bold text-sm text-ink-black hover:brightness-95 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </CueCard>
      )}
    </div>
  )
}
