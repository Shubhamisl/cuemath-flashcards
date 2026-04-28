const LABELS = ['Subject', 'Level', 'Goal']

export function OnboardingProgress({ step, total = 3 }: { step: number; total?: number }) {
  const labels = total === 3 ? LABELS : Array.from({ length: total }, (_, i) => `Step ${i + 1}`)

  return (
    <nav aria-label="Onboarding progress" className="flex items-center gap-2">
      {labels.map((label, i) => {
        const idx = i + 1
        const status: 'past' | 'current' | 'future' =
          idx < step ? 'past' : idx === step ? 'current' : 'future'

        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={[
                'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors flex-1 min-w-0',
                status === 'past' && 'bg-cue-yellow text-ink-black',
                status === 'current' && 'border-2 border-ink-black bg-paper-white text-ink-black',
                status === 'future' && 'bg-ink-black/5 text-ink-black/40',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={[
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-display font-extrabold flex-shrink-0',
                  status === 'past' && 'bg-ink-black text-cue-yellow',
                  status === 'current' && 'bg-ink-black text-cue-yellow',
                  status === 'future' && 'bg-ink-black/15 text-ink-black/50',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
              >
                {status === 'past' ? '✓' : idx}
              </span>
              <span
                className={`text-xs font-display font-bold uppercase tracking-[0.06em] truncate ${
                  status === 'current' ? '' : status === 'future' ? '' : ''
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
