'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CueButton } from '@/lib/brand/primitives/button'
import { markDeckReady } from './actions'

export function ReviewReadyButton({
  deckId,
  disabled,
}: {
  deckId: string
  disabled: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await markDeckReady(deckId)
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
      <CueButton onClick={submit} disabled={disabled || pending} className="w-full max-w-[480px]">
        {pending ? 'Preparing deck...' : 'Mark deck ready'}
      </CueButton>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
