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
      className="motion-premium-card-face cue-hard-card flex overflow-hidden p-0 text-center"
      style={{
        gridArea: '1 / 1',
        minHeight: 240,
        background: tint,
        backfaceVisibility: 'hidden',
        transform: backSide ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="flex w-full flex-col">
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-ink-black bg-paper-white px-4 text-[11px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/70">
          <span>{label}</span>
          {modeLabel ? <span>{modeLabel}</span> : null}
          {stepLabel ? <span>{stepLabel}</span> : null}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 sm:px-10">
          <div className="max-w-[30ch] text-sm leading-5 text-ink-black/65">{helperCopy}</div>
          <div className="font-display text-2xl font-extrabold leading-tight break-words whitespace-pre-wrap sm:text-[32px]">
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}
