'use client'

import { subjectTint, type subjectFamily } from '@/lib/brand/tokens'

export function ReviewCard({
  front,
  back,
  flipped,
  subject,
  stepLabel,
  modeLabel,
}: {
  front: string
  back: string
  flipped: boolean
  subject?: subjectFamily
  stepLabel?: string
  modeLabel?: string
}) {
  const tint = subjectTint(subject ?? 'other')

  return (
    <div className="relative w-full" style={{ perspective: '1000px' }} aria-live="polite">
      {/*
        Both faces share grid-area 1/1 and stack on top of each other. The
        cell auto-sizes to whichever face has more content, so neither side
        ever overflows the card box. preserve-3d keeps the rotateY flip
        working through the wrapper.
      */}
      <div
        className="relative grid w-full transition-transform motion-reduce:transition-none"
        style={{
          transformStyle: 'preserve-3d',
          transitionDuration: '160ms',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <Face
          active={!flipped}
          tint={tint}
          label="Question"
          helperCopy="Think it through before you flip."
          text={front}
          modeLabel={modeLabel}
          stepLabel={stepLabel}
        />
        <Face
          active={flipped}
          tint={tint}
          label="Answer"
          helperCopy="Now rate how easily it came back."
          text={back}
          backSide
        />
      </div>
    </div>
  )
}

function Face({
  active,
  tint,
  label,
  helperCopy,
  text,
  backSide,
  modeLabel,
  stepLabel,
}: {
  active: boolean
  tint: string
  label: string
  helperCopy: string
  text: string
  backSide?: boolean
  modeLabel?: string
  stepLabel?: string
}) {
  return (
    <div
      aria-hidden={!active}
      data-face={backSide ? 'back' : 'front'}
      className={`flex rounded-card border border-ink-black/5 p-6 text-center ${
        backSide ? 'shadow-card-flip' : 'shadow-card-rest'
      }`}
      style={{
        gridArea: '1 / 1',
        minHeight: 240,
        background: tint,
        backfaceVisibility: 'hidden',
        transform: backSide ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="flex w-full flex-col">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-wide opacity-60">
          {modeLabel ? <span>{modeLabel}</span> : null}
          {stepLabel ? <span>{stepLabel}</span> : null}
        </div>
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3">
          <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
          <div className="max-w-[24ch] text-sm leading-5 opacity-75">{helperCopy}</div>
          <div className="font-display text-xl font-semibold break-words whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}
