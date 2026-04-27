'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { patchProfile } from '../actions'
import { OnboardingProgress } from '../_components/progress'

const GOALS = [10, 20, 40]

export default function GoalPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<number | null>(null)

  function submit() {
    if (selected == null || pending) return
    startTransition(async () => {
      await patchProfile({
        daily_goal_cards: selected,
        daily_new_cards_limit: Math.min(selected, 10),
        onboarded_at: new Date().toISOString(),
      })
      router.push('/library')
    })
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress step={3} />
      <div className="space-y-2">
        <h1 className="font-display font-extrabold text-[36px] tracking-tight text-ink-black">
          How many cards per day?
        </h1>
        <p className="font-body text-ink-black/70">You can change this anytime.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {GOALS.map((g) => {
          const active = selected === g
          return (
            <CueCard
              key={g}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => setSelected(g)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected(g)
                }
              }}
              className={`cursor-pointer bg-cue-yellow text-ink-black shadow-card-rest transition ${
                active ? 'ring-2 ring-ink-black' : 'hover:ring-2 hover:ring-ink-black/40'
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
      <div className="flex justify-center pt-2">
        <CueButton
          variant="ghost"
          onClick={submit}
          disabled={selected == null || pending}
          className="border-0 hover:bg-transparent hover:underline px-0"
        >
          {pending ? 'Saving…' : 'Continue'}
        </CueButton>
      </div>
    </div>
  )
}
