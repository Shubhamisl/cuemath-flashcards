'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'
import { SubjectChip } from '../_components/subject-chip'

const GOALS = [10, 20, 40] as const
type Goal = (typeof GOALS)[number]

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function GoalForm({
  subject,
  level,
}: {
  subject: subjectFamily | null
  level: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [picked, setPicked] = useState<Goal | null>(null)
  const [saved, setSaved] = useState<Goal | null>(null)
  const [error, setError] = useState<string | null>(null)

  function pick(goal: Goal) {
    if (pending || saved !== null) return
    setPicked(goal)
    setError(null)
    startTransition(async () => {
      const res = await patchProfile({
        daily_goal_cards: goal,
        daily_new_cards_limit: Math.min(goal, 10),
        onboarded_at: new Date().toISOString(),
      })
      if (res && 'error' in res && res.error) {
        setError(res.error)
        setPicked(null)
        return
      }
      setSaved(goal)
    })
  }

  if (saved !== null) {
    return <SuccessState subject={subject} level={level} goal={saved} onContinue={() => router.push('/library')} />
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress step={3} />
      <div className="space-y-3">
        {subject && <SubjectChip subject={subject} />}
        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-[36px] md:text-[44px] tracking-tight text-ink-black leading-[1.05]">
            How many cards per day?
          </h1>
          <p className="font-body text-ink-black/70">You can change this anytime.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {GOALS.map((g) => {
          const active = picked === g
          return (
            <CueCard
              key={g}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-disabled={pending}
              onClick={() => pick(g)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  pick(g)
                }
              }}
              className={`cursor-pointer bg-cue-yellow text-ink-black shadow-card-rest border-2 transition-all duration-tap will-change-transform ${
                active
                  ? 'border-ink-black scale-[1.02]'
                  : 'border-transparent hover:border-ink-black hover:-translate-y-0.5'
              }`}
            >
              <div className="font-display font-extrabold text-[48px] text-center leading-none">
                {g}
              </div>
              <div className="font-body text-sm text-ink-black/70 text-center mt-2">
                cards / day
              </div>
            </CueCard>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-alert-coral text-center">
          {error}
        </p>
      )}
    </div>
  )
}

function SuccessState({
  subject,
  level,
  goal,
  onContinue,
}: {
  subject: subjectFamily | null
  level: string | null
  goal: number
  onContinue: () => void
}) {
  const levelLabel = level ? (LEVEL_LABEL[level] ?? level) : null
  return (
    <div className="space-y-8">
      <OnboardingProgress step={3} />
      <CueCard tone="cream" className="shadow-card-flip p-8 md:p-10 space-y-6 text-center border-2 border-ink-black">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cue-yellow text-ink-black mx-auto"
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M6 14.5l5 5 11-11"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-[32px] md:text-[40px] tracking-tight leading-[1.05] text-ink-black">
            You&apos;re all set.
          </h2>
          <p className="font-body text-ink-black/70">
            Drop a PDF whenever you&apos;re ready — your study habit starts now.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {subject && <SubjectChip subject={subject} />}
          {levelLabel && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-[0.06em] bg-trust-blue text-ink-black">
              {levelLabel}
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-[0.06em] bg-mint-green text-ink-black">
            {goal} a day
          </span>
        </div>
        <div className="pt-4">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center min-h-[52px] px-8 rounded-input bg-ink-black text-cue-yellow font-display font-bold text-base transition-transform duration-tap active:scale-[0.98] hover:bg-ink-black/90"
          >
            Open my library →
          </button>
        </div>
      </CueCard>
    </div>
  )
}
