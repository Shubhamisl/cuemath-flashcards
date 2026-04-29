'use client'

import { subjectTint, type subjectFamily } from '@/lib/brand/tokens'
import type { TextCardFormat } from '@/lib/llm/types'

const CARD_FORMAT_COPY: Record<TextCardFormat, {
  frontLabel: string
  backLabel: string
  frontHelper: string
  backHelper: string
}> = {
  qa: {
    frontLabel: 'Question',
    backLabel: 'Answer',
    frontHelper: 'Think it through before you flip.',
    backHelper: 'Now rate how easily it came back.',
  },
  cloze: {
    frontLabel: 'Fill the blank',
    backLabel: 'Answer',
    frontHelper: 'Recall the missing piece before you flip.',
    backHelper: 'Now rate how easily it came back.',
  },
  worked_example: {
    frontLabel: 'Method',
    backLabel: 'Steps',
    frontHelper: 'Work the step before you flip.',
    backHelper: 'Now rate how clearly the method came back.',
  },
}

export function ReviewCard({
  front,
  back,
  flipped,
  subject,
  stepLabel,
  modeLabel,
  format = 'qa',
}: {
  front: string
  back: string
  flipped: boolean
  subject?: subjectFamily
  stepLabel?: string
  modeLabel?: string
  format?: TextCardFormat
}) {
  const tint = subjectTint(subject ?? 'other')
  const copy = CARD_FORMAT_COPY[format]

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
          label={copy.frontLabel}
          helperCopy={copy.frontHelper}
          text={front}
          modeLabel={modeLabel}
          stepLabel={stepLabel}
        />
        <Face
          active={flipped}
          tint={tint}
          label={copy.backLabel}
          helperCopy={copy.backHelper}
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
      } motion-premium-card-face`}
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
