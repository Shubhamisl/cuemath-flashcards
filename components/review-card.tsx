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
      className="relative w-full"
      style={{ perspective: '1000px' }}
      aria-live="polite"
    >
      {/*
        Both faces share grid-area 1/1 and stack on top of each other. The
        cell auto-sizes to whichever face has more content, so neither side
        ever overflows the card box. preserve-3d keeps the rotateY flip
        working through the wrapper.
      */}
      <div
        className="relative w-full transition-transform motion-reduce:transition-none grid"
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
      className={`rounded-card p-6 border border-ink-black/5 flex items-center justify-center text-center ${backSide ? 'shadow-card-flip' : 'shadow-card-rest'}`}
      style={{
        gridArea: '1 / 1',
        minHeight: 240,
        background: tint,
        backfaceVisibility: 'hidden',
        transform: backSide ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="w-full">
        <div className="text-xs uppercase tracking-wide opacity-60 mb-3">{label}</div>
        <div className="font-display text-xl font-semibold whitespace-pre-wrap break-words">
          {text}
        </div>
      </div>
    </div>
  )
}
