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
  return (
    <header className="motion-premium-reveal grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
      <div className="motion-premium-list-item px-2 py-4 sm:px-4">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-black leading-[1.05] sm:text-[44px]">
          Hi, {name}
        </h1>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="h-2 w-full max-w-56 overflow-hidden rounded-full bg-ink-black/10">
            <div
              className="motion-premium-progress h-full rounded-full bg-cue-yellow"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-ink-black/70">
            {doneToday} / {dailyGoal} today
          </p>
        </div>
      </div>

      <div className="motion-premium-list-item rounded-[22px] border border-ink-black/10 bg-mint-green/55 px-4 py-5 shadow-card-rest sm:rounded-[28px] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
              Study now
            </p>
            <p className="mt-1 text-sm text-ink-black/70">
              Pick up where your memory curve wants attention.
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
