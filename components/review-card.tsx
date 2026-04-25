'use client'

import type { subjectFamily } from '@/lib/brand/tokens'

export function ReviewCard({
  front,
  back,
  flipped,
  subject,
}: {
  front: string
  back: string
  flipped: boolean
  subject?: subjectFamily
}) {
  const tint =
    subject === 'math'
      ? 'var(--soft-cream)'
      : subject === 'science'
        ? 'var(--mint-green)'
        : subject === 'language'
          ? 'var(--bubble-pink)'
          : subject === 'humanities'
            ? 'var(--trust-blue)'
            : 'var(--paper-white)'

  return (
    <div
      className="relative w-full min-h-[240px]"
      style={{ perspective: '1000px' }}
      aria-live="polite"
    >
      <div
        className="relative w-full h-full min-h-[240px] transition-transform motion-reduce:transition-none"
        style={{
          transformStyle: 'preserve-3d',
          transitionDuration: '160ms',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <Face tint={tint} label="Question" text={front} />
        <Face tint={tint} label="Answer" text={back} backSide />
      </div>
    </div>
  )
}

function Face({
  tint,
  label,
  text,
  backSide,
}: {
  tint: string
  label: string
  text: string
  backSide?: boolean
}) {
  return (
    <div
      className={`absolute inset-0 rounded-card p-6 border border-ink-black/5 flex items-center justify-center text-center ${backSide ? 'shadow-card-flip' : 'shadow-card-rest'}`}
      style={{
        background: tint,
        backfaceVisibility: 'hidden',
        transform: backSide ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="w-full">
        <div className="text-xs uppercase tracking-wide opacity-60 mb-3">{label}</div>
        <div className="font-display text-xl font-semibold whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  )
}
