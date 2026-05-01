'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'

const OPTIONS: Array<{ id: subjectFamily; label: string; badge: string; sub: string }> = [
  { id: 'math', label: 'Math', badge: 'Problem solving', sub: 'Formula-heavy practice, proofs, and number work' },
  { id: 'science', label: 'Science', badge: 'Lab ready', sub: 'Biology, chemistry, physics, and lab notes' },
  { id: 'language', label: 'Language', badge: 'Reading-heavy', sub: 'Vocabulary, grammar, and recall drills' },
  { id: 'humanities', label: 'History / Humanities', badge: 'Story mode', sub: 'Dates, arguments, literature, and ideas' },
  { id: 'other', label: 'Something else', badge: 'Flexible', sub: 'Keep the setup broad and adapt later' },
]

export default function SubjectPage() {
  const router = useRouter()
  const [picked, setPicked] = useState<subjectFamily | null>(null)

  useEffect(() => {
    router.prefetch('/onboarding/level')
  }, [router])

  function pick(family: subjectFamily) {
    if (picked) return
    setPicked(family)
    void patchProfile({ subject_family: family })
    router.push(`/onboarding/level?s=${family}`)
  }

  return (
    <div className="motion-premium-reveal space-y-8">
      <OnboardingProgress step={1} />
      <div className="max-w-3xl space-y-3">
        <span className="font-display inline-flex rounded-card border-2 border-ink-black bg-cue-yellow px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] shadow-[2px_2px_0_#000]">
          Start with your strongest subject signal
        </span>
        <h1 className="font-display text-[40px] font-extrabold leading-[1.02] tracking-tight text-ink-black md:text-[56px]">
          What are we turning into flashcards first?
        </h1>
        <p className="font-body max-w-2xl text-base text-ink-black/70">
          Your choice sets the first color tint and defaults. You can still upload any kind of PDF later.
        </p>
      </div>
      <div
        role="list"
        aria-label="Study subject choices"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {OPTIONS.map((o) => {
          const active = picked === o.id
          return (
            <div key={o.id} role="listitem">
              <CueCard
                subject={o.id}
                role="button"
                tabIndex={0}
                aria-label={`${o.label}. ${o.badge}. ${o.sub}`}
                aria-disabled={picked !== null}
                aria-pressed={active}
                onClick={() => pick(o.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick(o.id)
                  }
                }}
                className={`motion-premium-list-item min-h-[154px] cursor-pointer border-2 p-5 shadow-[4px_4px_0_#000] will-change-transform ${
                  active
                    ? 'scale-[1.01] border-ink-black'
                    : 'border-ink-black hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000]'
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-display rounded-card border-2 border-ink-black bg-paper-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em]">
                      {o.badge}
                    </span>
                    <span className="h-4 w-4 rounded-full border-2 border-ink-black bg-cue-yellow shadow-[1px_1px_0_#000]" />
                  </div>
                  <div>
                    <div className="font-display text-[28px] font-extrabold leading-none text-ink-black">
                      {o.label}
                    </div>
                    <div className="font-body mt-2 text-sm leading-snug text-ink-black/70">{o.sub}</div>
                  </div>
                </div>
              </CueCard>
            </div>
          )
        })}
      </div>
    </div>
  )
}
