'use client'

import { CueButton } from '@/lib/brand/primitives/button'
import type { FsrsRating } from '@/lib/srs/schedule'

const BUTTONS: { rating: FsrsRating; label: string; key: string; variant: 'primary' | 'ghost' }[] = [
  { rating: 1, label: 'Forgot', key: '1', variant: 'ghost' },
  { rating: 2, label: 'Tough', key: '2', variant: 'ghost' },
  { rating: 3, label: 'Got it', key: '3', variant: 'primary' },
  { rating: 4, label: 'Easy', key: '4', variant: 'ghost' },
]

export function RatingBar({
  disabled,
  onRate,
}: {
  disabled: boolean
  onRate: (r: FsrsRating) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {BUTTONS.map((b) => (
        <CueButton
          key={b.rating}
          variant={b.variant}
          disabled={disabled}
          onClick={() => onRate(b.rating)}
          className="min-h-[48px] text-sm"
          aria-label={`${b.label} (press ${b.key})`}
        >
          <span className="block">{b.label}</span>
          <span className="block text-[10px] opacity-60">{b.key}</span>
        </CueButton>
      ))}
    </div>
  )
}
