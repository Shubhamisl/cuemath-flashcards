'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'

const OPTIONS: Array<{ id: subjectFamily; label: string }> = [
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'language', label: 'Language' },
  { id: 'humanities', label: 'History / Humanities' },
  { id: 'other', label: 'Something else' },
]

export default function SubjectPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(family: subjectFamily) {
    if (pending) return
    startTransition(async () => {
      await patchProfile({ subject_family: family })
      router.push('/onboarding/level')
    })
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress step={1} />
      <div className="space-y-2">
        <h1 className="font-display font-extrabold text-[36px] tracking-tight text-ink-black">
          What are you studying?
        </h1>
        <p className="font-body text-ink-black/70">
          We&apos;ll tune colors and defaults to fit.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((o) => (
          <CueCard
            key={o.id}
            subject={o.id}
            role="button"
            tabIndex={0}
            aria-disabled={pending}
            onClick={() => pick(o.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                pick(o.id)
              }
            }}
            className="cursor-pointer shadow-card-rest border border-transparent hover:border-2 hover:border-ink-black transition"
          >
            <span className="font-display font-semibold text-[22px] text-ink-black">
              {o.label}
            </span>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
