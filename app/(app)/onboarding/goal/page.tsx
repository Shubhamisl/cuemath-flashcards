'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { patchProfile } from '../actions'

const GOALS = [10, 20, 40]

export default function GoalPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(goal: number) {
    startTransition(async () => {
      await patchProfile({ daily_goal_cards: goal, onboarded_at: new Date().toISOString() })
      router.push('/library')
    })
  }

  return (
    <div className="space-y-6" style={{ ['--onboarding-progress' as string]: '100%' } as React.CSSProperties}>
      <h1 className="font-display text-3xl font-bold">How many cards per day?</h1>
      <p className="text-sm opacity-80">You can change this anytime.</p>
      <div className="grid grid-cols-3 gap-3">
        {GOALS.map((g) => (
          <CueCard key={g}>
            <CueButton variant="ghost" className="w-full" disabled={pending} onClick={() => pick(g)}>
              {g}
            </CueButton>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
