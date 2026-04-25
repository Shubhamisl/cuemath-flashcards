import Link from 'next/link'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { TrustChip } from '@/lib/brand/primitives/trust-chip'

const STEPS = [
  { title: 'Drop a PDF', body: 'Notes, a chapter, anything you need to remember. Up to 20MB.' },
  { title: 'Get atomic cards', body: 'One idea per card — written the way a great teacher would.' },
  { title: 'Run short sprints', body: 'Modern spaced-repetition keeps your edge without burning you out.' },
]

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <section className="px-6 py-20 max-w-3xl mx-auto w-full space-y-8 text-center">
        <div className="space-y-4">
          <CuePill tone="highlight">SharpMind journey</CuePill>
          <h1 className="font-display font-extrabold tracking-tight" style={{ fontSize: 'clamp(48px, 7vw, 72px)', lineHeight: 1.05 }}>
            PDF in.<br />Memory forever.
          </h1>
          <p className="text-lg opacity-80 max-w-xl mx-auto">
            Cuemath Flashcards turns any document into cognitively-tuned practice. Built on the same science that powers 700M+ reviews a year.
          </p>
        </div>

        <Link href="/login" className="inline-block">
          <CueButton className="px-10">Start my journey</CueButton>
        </Link>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <TrustChip label="Backed by 700M+ reviews" />
          <TrustChip label="Cognitive-science tuned" />
          <TrustChip label="Your PDFs stay private" />
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <CueCard key={s.title} className="space-y-2">
              <div className="text-xs font-semibold opacity-60">0{i + 1}</div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="text-sm opacity-80">{s.body}</p>
            </CueCard>
          ))}
        </div>
      </section>
    </main>
  )
}
