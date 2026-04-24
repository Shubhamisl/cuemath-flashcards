'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import { patchProfile } from '../actions'

const LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: "I'm just starting out." },
  { id: 'intermediate', label: 'Intermediate', hint: 'I know the basics.' },
  { id: 'advanced', label: 'Advanced', hint: 'I want to go deep.' },
]

export default function LevelPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(level: string) {
    startTransition(async () => {
      await patchProfile({ level })
      router.push('/onboarding/goal')
    })
  }

  return (
    <div className="space-y-6" style={{ ['--onboarding-progress' as string]: '50%' } as React.CSSProperties}>
      <h1 className="font-display text-3xl font-bold">What&apos;s your level?</h1>
      <div className="grid grid-cols-1 gap-3">
        {LEVELS.map((l) => (
          <CueCard key={l.id}>
            <button
              disabled={pending}
              onClick={() => pick(l.id)}
              className="w-full text-left"
            >
              <div className="font-bold text-lg">{l.label}</div>
              <div className="text-sm opacity-70">{l.hint}</div>
            </button>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
