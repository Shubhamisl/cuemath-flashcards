'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { archiveDeck, restoreDeck } from './actions'

export function ArchiveDeckButton({
  deckId,
  archived,
}: {
  deckId: string
  archived: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = archived ? await restoreDeck(deckId) : await archiveDeck(deckId)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <CueButton variant="ghost" onClick={submit} disabled={pending} className="w-full max-w-[480px]">
        {pending
          ? archived
            ? 'Restoring deck...'
            : 'Archiving deck...'
          : archived
            ? 'Restore to library'
            : 'Archive deck'}
      </CueButton>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
