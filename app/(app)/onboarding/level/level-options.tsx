'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'
import { SubjectChip } from '../_components/subject-chip'

const LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: "I'm just starting out." },
  { id: 'intermediate', label: 'Intermediate', hint: 'I know the basics.' },
  { id: 'advanced', label: 'Advanced', hint: 'I want to go deep.' },
]

export function LevelOptions({ subject }: { subject: subjectFamily | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [picked, setPicked] = useState<string | null>(null)

  function pick(level: string) {
    if (pending) return
    setPicked(level)
    startTransition(async () => {
      await patchProfile({ level })
      router.push('/onboarding/goal')
    })
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress step={2} />
      <div className="space-y-3">
        {subject && <SubjectChip subject={subject} />}
        <h1 className="font-display font-extrabold text-[36px] md:text-[44px] tracking-tight text-ink-black leading-[1.05]">
          What&apos;s your level?
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {LEVELS.map((l) => {
          const active = picked === l.id
          return (
            <CueCard
              key={l.id}
              role="button"
              tabIndex={0}
              aria-disabled={pending}
              aria-pressed={active}
              onClick={() => pick(l.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  pick(l.id)
                }
              }}
              className={`cursor-pointer shadow-card-rest border-2 transition-all duration-tap will-change-transform relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-cue-yellow before:transition-opacity ${
                active
                  ? 'border-ink-black scale-[1.01] before:opacity-100'
                  : 'border-ink-black/10 hover:border-ink-black hover:-translate-y-0.5 before:opacity-0 hover:before:opacity-100'
              }`}
            >
              <div className="font-display font-bold text-[22px] text-ink-black leading-tight">
                {l.label}
              </div>
              <p className="font-body text-sm text-ink-black/65 mt-1">{l.hint}</p>
            </CueCard>
          )
        })}
      </div>
    </div>
  )
}
