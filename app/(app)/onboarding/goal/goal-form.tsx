'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'
import { SubjectChip } from '../_components/subject-chip'

const GOALS = [
  { value: 10, label: 'Warm up', note: 'A light daily streak' },
  { value: 20, label: 'Steady', note: 'Balanced practice' },
  { value: 40, label: 'Sprint', note: 'Exam-mode reps' },
] as const
type Goal = (typeof GOALS)[number]['value']

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
  const [savingGoal, setSavingGoal] = useState<Goal | null>(null)
  const [saved, setSaved] = useState<Goal | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    router.prefetch('/library')
  }, [router])

  function pick(goal: Goal) {
    if (pending || saved !== null || savingGoal !== null) return
    setPicked(goal)
    setSavingGoal(goal)
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
        setSavingGoal(null)
        return
      }
      setSaved(goal)
      setSavingGoal(null)
    })
  }

  if (saved !== null) {
    return <SuccessState subject={subject} level={level} goal={saved} onContinue={() => router.push('/library')} />
  }

  return (
    <div className="motion-premium-reveal space-y-8">
      <OnboardingProgress step={3} />
      <div className="max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {subject && <SubjectChip subject={subject} />}
          <span className="font-display rounded-card border-2 border-ink-black bg-mint-green px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em]">
            Final setup
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-[38px] font-extrabold leading-[1.02] tracking-tight text-ink-black md:text-[52px]">
            Set today&apos;s card rhythm.
          </h1>
          <p className="font-body max-w-2xl text-base text-ink-black/70">
            Choose a daily target. We will keep new cards capped so reviews never swallow the day.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GOALS.map((g) => {
          const active = picked === g.value
          const saving = savingGoal === g.value

          return (
            <CueCard
              key={g.value}
              role="button"
              tabIndex={0}
              aria-label={saving ? `Saving ${g.value} cards` : `${g.value} cards per day. ${g.label}. ${g.note}`}
              aria-pressed={active}
              aria-disabled={pending || savingGoal !== null}
              onClick={() => pick(g.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  pick(g.value)
                }
              }}
              className={`motion-premium-choice min-h-[160px] cursor-pointer border-2 text-ink-black shadow-[4px_4px_0_#000] will-change-transform ${
                active
                  ? 'scale-[1.02] border-ink-black bg-cue-yellow'
                  : 'border-ink-black bg-paper-white hover:-translate-y-0.5 hover:bg-cue-yellow'
              } ${savingGoal !== null && !active ? 'opacity-55' : ''}`}
            >
              <div className="flex h-full flex-col justify-between gap-5 text-center">
                <div className="font-display mx-auto rounded-card border-2 border-ink-black bg-paper-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em]">
                  {saving ? `Saving ${g.value} cards` : g.label}
                </div>
                <div>
                  <div className="font-display text-[56px] font-extrabold leading-none">
                    {g.value}
                  </div>
                  <div className="font-body mt-2 text-sm font-bold text-ink-black/75">
                    cards per day
                  </div>
                </div>
                <p className="font-body text-xs text-ink-black/65">{g.note}</p>
              </div>
            </CueCard>
          )
        })}
      </div>
      {savingGoal !== null && (
        <p className="font-display rounded-card border-2 border-ink-black bg-soft-cream px-4 py-3 text-center text-sm font-extrabold text-ink-black shadow-[3px_3px_0_#000]">
          Locking in your {savingGoal}-card rhythm
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-center text-sm text-alert-coral">
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
    <div className="motion-premium-reveal space-y-8">
      <OnboardingProgress step={3} />
      <CueCard tone="cream" className="space-y-6 border-2 border-ink-black p-8 text-center shadow-[6px_6px_0_#000] md:p-10">
        <div
          className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-card border-2 border-ink-black bg-cue-yellow text-ink-black shadow-[3px_3px_0_#000]"
          aria-hidden="true"
        >
          OK
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-ink-black md:text-[40px]">
            You&apos;re all set.
          </h2>
          <p className="font-body text-ink-black/70">
            Drop a PDF whenever you&apos;re ready. Your study habit starts now.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {subject && <SubjectChip subject={subject} />}
          {levelLabel && (
            <span className="font-display inline-flex items-center rounded-full bg-trust-blue px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] text-ink-black">
              {levelLabel}
            </span>
          )}
          <span className="font-display inline-flex items-center rounded-full bg-mint-green px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] text-ink-black">
            {goal} a day
          </span>
        </div>
        <div className="pt-4">
          <button
            type="button"
            onClick={onContinue}
            className="font-display inline-flex min-h-[52px] items-center justify-center rounded-input bg-ink-black px-8 text-base font-bold text-cue-yellow transition-transform duration-tap hover:bg-ink-black/90 active:scale-[0.98]"
          >
            Open my library
          </button>
        </div>
      </CueCard>
    </div>
  )
}
