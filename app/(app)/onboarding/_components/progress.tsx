const LABELS = ['Subject', 'Level', 'Goal']

export function OnboardingProgress({ step, total = 3 }: { step: number; total?: number }) {
  const labels = total === 3 ? LABELS : Array.from({ length: total }, (_, i) => `Step ${i + 1}`)

  return (
    <nav
      aria-label="Onboarding progress"
      className="motion-premium-reveal flex items-center gap-2"
      data-motion-stage="onboarding-progress"
    >
      {labels.map((label, i) => {
        const idx = i + 1
        const status: 'past' | 'current' | 'future' =
          idx < step ? 'past' : idx === step ? 'current' : 'future'

        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={[
                'motion-premium-choice flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-1.5',
                status === 'past' && 'bg-cue-yellow text-ink-black',
                status === 'current' && 'border-2 border-ink-black bg-paper-white text-ink-black',
                status === 'future' && 'bg-ink-black/5 text-ink-black/40',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={[
                  'inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-display font-extrabold',
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
              <span className="truncate text-xs font-display font-bold uppercase tracking-[0.06em]">
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
