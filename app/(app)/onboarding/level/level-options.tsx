'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'
import { SubjectChip } from '../_components/subject-chip'

const LEVELS = [
  { id: 'beginner', label: 'Beginner', badge: 'Start here', hint: 'Build the first hooks and keep wins close.' },
  { id: 'intermediate', label: 'Intermediate', badge: 'Core idea', hint: 'Turn familiar topics into quick recall.' },
  { id: 'advanced', label: 'Advanced', badge: 'Fast fluency', hint: 'Push depth, proofs, and edge cases.' },
]

export function LevelOptions({ subject }: { subject: subjectFamily | null }) {
  const router = useRouter()
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    router.prefetch('/onboarding/goal')
  }, [router])

  function pick(level: string) {
    if (picked) return
    setPicked(level)
    void patchProfile({ level })
    const params = new URLSearchParams()
    if (subject) params.set('s', subject)
    params.set('l', level)
    router.push(`/onboarding/goal?${params.toString()}`)
  }

  return (
    <div className="motion-premium-reveal space-y-8">
      <OnboardingProgress step={2} />
      <div className="max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {subject && <SubjectChip subject={subject} />}
          <span className="font-display rounded-card border-2 border-ink-black bg-cue-yellow px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em]">
            Choose your pace
          </span>
        </div>
        <h1 className="font-display text-[38px] font-extrabold leading-[1.02] tracking-tight text-ink-black md:text-[52px]">
          How hard should the first deck push?
        </h1>
        <p className="font-body max-w-2xl text-base text-ink-black/70">
          Pick the lane that feels true today. The app will keep the next sessions tuned from here.
        </p>
      </div>
      <div
        role="list"
        aria-label="Learning level choices"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {LEVELS.map((l) => {
          const active = picked === l.id

          return (
            <div key={l.id} role="listitem">
              <CueCard
                role="button"
                aria-label={`${l.label}. ${l.badge}. ${l.hint}`}
                data-state={active ? 'selected' : 'idle'}
                tabIndex={0}
                aria-disabled={picked !== null}
                aria-pressed={active}
                onClick={() => pick(l.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick(l.id)
                  }
                }}
                className={`motion-premium-list-item relative min-h-[168px] cursor-pointer overflow-hidden border-2 p-5 shadow-[4px_4px_0_#000] will-change-transform ${
                  active
                    ? 'scale-[1.01] border-ink-black bg-cue-yellow'
                    : 'border-ink-black bg-paper-white hover:-translate-y-0.5 hover:bg-soft-cream'
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink-black/65">
                      {l.badge}
                    </span>
                    <span className="h-4 w-4 rounded-full border-2 border-ink-black bg-cue-yellow shadow-[1px_1px_0_#000]" />
                  </div>
                  <div>
                    <div className="font-display text-[26px] font-extrabold leading-none text-ink-black">
                      {l.label}
                    </div>
                    <p className="font-body mt-2 text-sm leading-snug text-ink-black/70">{l.hint}</p>
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
