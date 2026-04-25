'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'

const LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: "I'm just starting out." },
  { id: 'intermediate', label: 'Intermediate', hint: 'I know the basics.' },
  { id: 'advanced', label: 'Advanced', hint: 'I want to go deep.' },
]

export default function LevelPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(level: string) {
    if (pending) return
    startTransition(async () => {
      await patchProfile({ level })
      router.push('/onboarding/goal')
    })
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress step={2} />
      <h1 className="font-display font-extrabold text-[36px] tracking-tight text-ink-black">
        What&apos;s your level?
      </h1>
      <div className="grid grid-cols-1 gap-3">
        {LEVELS.map((l) => (
          <CueCard
            key={l.id}
            role="button"
            tabIndex={0}
            aria-disabled={pending}
            onClick={() => pick(l.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                pick(l.id)
              }
            }}
            className="cursor-pointer shadow-card-rest border border-ink-black/10 transition relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-cue-yellow before:opacity-0 hover:before:opacity-100 before:transition"
          >
            <div className="font-display font-semibold text-[22px] text-ink-black">{l.label}</div>
            <p className="font-body text-sm text-ink-black/70 mt-1">{l.hint}</p>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
