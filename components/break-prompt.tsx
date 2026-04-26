'use client'

import { CueButton } from '@/lib/brand/primitives/button'

export function BreakPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="rounded-card p-4 space-y-3 text-center"
      style={{ background: 'var(--mint-green)' }}
      role="status"
    >
      <p className="font-display text-base font-semibold">You&apos;ve been going hard.</p>
      <p className="text-sm opacity-80">Stretch for 60 seconds?</p>
      <CueButton variant="ghost" onClick={onDismiss} className="w-full">
        I&apos;m good, keep going
      </CueButton>
    </div>
  )
}
