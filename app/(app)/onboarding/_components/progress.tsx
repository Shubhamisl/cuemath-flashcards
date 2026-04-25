import { CuePill } from '@/lib/brand/primitives/pill'

export function OnboardingProgress({ step, total = 3 }: { step: number; total?: number }) {
  const pct = Math.max(0, Math.min(100, (step / total) * 100))
  return (
    <div className="space-y-3">
      <CuePill className="bg-soft-cream text-ink-black/70 text-xs">
        Step {step} of {total}
      </CuePill>
      <div className="h-2 w-full rounded-full bg-ink-black/10">
        <div
          className="h-full rounded-full bg-cue-yellow transition-all duration-progress"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
