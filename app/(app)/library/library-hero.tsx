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
    <header className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
      <div className="rounded-[28px] border border-ink-black/10 bg-paper-white px-6 py-6 shadow-card-rest">
        <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          Study home
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink-black">
          Hi, {name}
        </h1>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 w-44 overflow-hidden rounded-full bg-ink-black/10">
            <div
              className="h-full rounded-full bg-cue-yellow transition-all duration-progress"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-ink-black/70">
            {doneToday} / {dailyGoal} today
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink-black/10 bg-mint-sky/55 px-6 py-6 shadow-card-rest">
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
                <Link href="/review">
                  <CueButton size="lg">Review all due</CueButton>
                </Link>
                <Link href="/review?mode=quick">
                  <CueButton variant="ghost" size="lg">
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
