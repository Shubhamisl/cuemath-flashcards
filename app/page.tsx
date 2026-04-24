import Link from 'next/link'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { TrustChip } from '@/lib/brand/primitives/trust-chip'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <CueCard className="w-full max-w-lg space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-display text-4xl font-bold">Cuemath Flashcards</h1>
          <p className="text-base opacity-80">
            Drop a PDF. Get atomic flashcards tuned for how memory actually works.
          </p>
        </div>

        <Link href="/login" className="inline-block w-full">
          <CueButton className="w-full">Get Started</CueButton>
        </Link>

        <div className="flex flex-wrap justify-center gap-2 pt-4">
          <TrustChip label="Cognitive-science tuned" />
          <TrustChip label="Your PDFs stay private" />
        </div>
      </CueCard>
    </main>
  )
}
