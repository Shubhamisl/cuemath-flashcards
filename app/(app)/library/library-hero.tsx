import Link from 'next/link'
import { UploadModal } from '@/components/upload-modal'
import { CueButton } from '@/lib/brand/primitives/button'

type LibraryHeroProps = {
  name: string
  doneToday: number
  dailyGoal: number
  progressPct: number
  globalDueNowCount: number
}

export function LibraryHero({
  name,
  doneToday,
  dailyGoal,
  progressPct,
  globalDueNowCount,
}: LibraryHeroProps) {
  const progressBlocks = Array.from({ length: 10 }, (_, i) => i < Math.round(progressPct / 10))

  return (
    <header className="motion-premium-reveal cue-grid-hero grid overflow-hidden bg-paper-white lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="p-6 sm:p-8">
        <div className="inline-flex border border-ink-black bg-cue-yellow px-2 py-1 text-xs font-display font-bold">
          Goal: {dailyGoal} cards today
        </div>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-black leading-[1.02] sm:text-[48px]">
          Hi, {name}
        </h1>
        <p className="mt-3 max-w-[520px] text-sm text-ink-black/68 sm:text-base">
          Pick up where your memory curve wants attention. Keep the sprint tight, visible, and done.
        </p>

        <div
          className="mt-6 flex flex-wrap gap-1.5"
          aria-label={`${progressPct}% of today's goal complete`}
        >
          {progressBlocks.map((filled, index) => (
            <span
              key={index}
              className={`cue-progress-cell ${filled ? 'cue-progress-current' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-ink-black bg-soft-cream lg:border-l lg:border-t-0">
        <div className="grid grid-cols-3 border-b border-ink-black">
          <StatBlock label="Completed" value={doneToday} tone="bg-bubble-pink" />
          <StatBlock label="Due Today" value={globalDueNowCount} tone="bg-mint-green" />
          <StatBlock label="Goal" value={dailyGoal} tone="bg-trust-blue" />
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-display font-bold uppercase tracking-[0.08em] text-ink-black/60">
              Study now
            </p>
            <p className="text-sm text-ink-black/70">
              Sprint through what is due, or upload the next PDF.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {globalDueNowCount > 0 ? (
              <>
                <Link href="/review" className="w-full sm:w-auto">
                  <CueButton size="lg" className="w-full sm:w-auto">Review all due</CueButton>
                </Link>
                <Link href="/review?mode=quick" className="w-full sm:w-auto">
                  <CueButton variant="ghost" size="lg" className="w-full sm:w-auto">
                    Quick 5
                  </CueButton>
                </Link>
              </>
            ) : null}
            <UploadModal />
          </div>
        </div>
      </div>
    </header>
  )
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`${tone} border-r border-ink-black px-3 py-4 last:border-r-0`}>
      <p className="text-[11px] font-display font-bold uppercase tracking-[0.06em] text-ink-black/60">
        {label}
      </p>
      <p className="mt-2 text-2xl font-display font-extrabold leading-none text-ink-black">
        {value}
      </p>
    </div>
  )
}
