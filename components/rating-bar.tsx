'use client'

import { CueButton } from '@/lib/brand/primitives/button'
import { cn } from '@/lib/utils'
import type { FsrsRating } from '@/lib/srs/schedule'

const BUTTONS: {
  rating: FsrsRating
  label: string
  key: string
  variant: 'primary' | 'ghost'
  sublabel: string
}[] = [
  { rating: 1, label: 'Forgot', key: '1', variant: 'ghost', sublabel: 'Blanked completely' },
  { rating: 2, label: 'Tough', key: '2', variant: 'ghost', sublabel: 'Got there slowly' },
  { rating: 3, label: 'Got it', key: '3', variant: 'primary', sublabel: 'Solid recall' },
  { rating: 4, label: 'Easy', key: '4', variant: 'ghost', sublabel: 'Instant and clean' },
]

export function RatingBar({
  disabled,
  onRate,
}: {
  disabled: boolean
  onRate: (r: FsrsRating) => void
}) {
  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase text-ink-black/60">Recall check</p>
        <h2 className="text-sm font-bold text-ink-black">How did that feel?</h2>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BUTTONS.map((b) => (
          <CueButton
            key={b.rating}
            variant={b.variant}
            disabled={disabled}
            onClick={() => onRate(b.rating)}
            className={cn(
              'motion-premium-choice flex min-h-[92px] flex-col items-start justify-between gap-2 px-4 py-3 text-left text-sm hover:-translate-y-0.5',
              b.rating === 3 && 'scale-[1.01] shadow-sm ring-2 ring-ink-black/10',
            )}
            aria-label={`${b.label} (press ${b.key})`}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span className="block text-base leading-tight">{b.label}</span>
              <span className="block rounded-full border border-current/15 px-2 py-0.5 text-[10px] leading-none opacity-70">
                {b.key}
              </span>
            </span>
            <span className="block text-[11px] leading-tight opacity-75">{b.sublabel}</span>
          </CueButton>
        ))}
      </div>
    </div>
  )
}
