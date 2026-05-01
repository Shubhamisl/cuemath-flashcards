const LABELS = ['Subject', 'Level', 'Goal']

export function OnboardingProgress({ step, total = 3 }: { step: number; total?: number }) {
  const labels = total === 3 ? LABELS : Array.from({ length: total }, (_, i) => `Step ${i + 1}`)

  return (
    <div className="motion-premium-reveal space-y-3" data-motion-stage="onboarding-progress">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xs font-extrabold uppercase tracking-[0.06em] text-ink-black">
          Step {step} of {total}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {labels.map((label, i) => {
            const idx = i + 1
            const status = idx < step ? 'complete' : idx === step ? 'current' : 'up-next'

            return (
              <span
                key={label}
                className={[
                  'cue-progress-cell motion-premium-progress',
                  status === 'complete' && 'cue-progress-complete',
                  status === 'current' && 'cue-progress-current',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )
          })}
        </div>
      </div>
      <nav aria-label="Onboarding progress" className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {labels.map((label, i) => {
          const idx = i + 1
          const status: 'complete' | 'current' | 'up-next' =
            idx < step ? 'complete' : idx === step ? 'current' : 'up-next'

          return (
            <div
              key={label}
              data-state={status}
              aria-current={status === 'current' ? 'step' : undefined}
              className={[
                'motion-premium-choice flex min-w-[118px] flex-1 items-center gap-2 rounded-card border-2 px-3 py-2 shadow-[2px_2px_0_#000]',
                status === 'complete' && 'border-ink-black bg-cue-yellow text-ink-black',
                status === 'current' && 'border-ink-black bg-paper-white text-ink-black',
                status === 'up-next' && 'border-ink-black/25 bg-paper-white text-ink-black/45 shadow-none',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={[
                  'font-display inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold',
                  status === 'complete' && 'bg-ink-black text-cue-yellow',
                  status === 'current' && 'bg-ink-black text-cue-yellow',
                  status === 'up-next' && 'bg-ink-black/10 text-ink-black/50',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
              >
                {status === 'complete' ? 'OK' : idx}
              </span>
              <span className="font-display truncate text-xs font-extrabold uppercase tracking-[0.06em]">
                {label}
              </span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
