'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'

const OPTIONS: Array<{ id: subjectFamily; label: string; sub: string }> = [
  { id: 'math', label: 'Math', sub: 'Algebra, calculus, statistics — anything with numbers' },
  { id: 'science', label: 'Science', sub: 'Biology, chemistry, physics, lab notes' },
  { id: 'language', label: 'Language', sub: 'A new language, vocabulary, grammar' },
  { id: 'humanities', label: 'History / Humanities', sub: 'History, philosophy, literature' },
  { id: 'other', label: 'Something else', sub: "We'll keep things flexible" },
]

export default function SubjectPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [picked, setPicked] = useState<subjectFamily | null>(null)

  function pick(family: subjectFamily) {
    if (pending) return
    setPicked(family)
    startTransition(async () => {
      await patchProfile({ subject_family: family })
      router.push('/onboarding/level')
    })
  }

  return (
    <div className="motion-premium-reveal space-y-8">
      <OnboardingProgress step={1} />
      <div className="space-y-2">
        <h1 className="font-display font-extrabold text-[36px] md:text-[44px] tracking-tight text-ink-black leading-[1.05]">
          What are you studying?
        </h1>
        <p className="font-body text-ink-black/70">
          We&apos;ll tune the colors and defaults to fit.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((o) => {
          const active = picked === o.id
          return (
            <CueCard
              key={o.id}
              subject={o.id}
              role="button"
              tabIndex={0}
              aria-disabled={pending}
              aria-pressed={active}
              onClick={() => pick(o.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  pick(o.id)
                }
              }}
              className={`motion-premium-list-item cursor-pointer shadow-card-rest border-2 will-change-transform ${
                active
                  ? 'border-ink-black scale-[1.01]'
                  : 'border-transparent hover:border-ink-black hover:-translate-y-0.5'
              }`}
            >
              <div className="font-display font-bold text-[22px] text-ink-black leading-tight">
                {o.label}
              </div>
              <div className="font-body text-sm text-ink-black/65 mt-1">{o.sub}</div>
            </CueCard>
          )
        })}
      </div>
    </div>
  )
}
