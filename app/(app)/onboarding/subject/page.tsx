'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'

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
    startTransition(async () => {
      await patchProfile({ subject_family: family })
      router.push('/onboarding/level')
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">What are you studying?</h1>
      <p className="text-sm opacity-80">We&apos;ll tune colors and defaults to fit.</p>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((o) => (
          <CueCard key={o.id} subject={o.id} className="cursor-pointer">
            <CueButton variant="ghost" className="w-full" disabled={pending} onClick={() => pick(o.id)}>
              {o.label}
            </CueButton>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
