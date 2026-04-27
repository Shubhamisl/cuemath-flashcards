# Review Arena Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the active review flow so it feels energetic, gameful, and rewarding without changing FSRS semantics, trust gating, or session behavior.

**Architecture:** Keep all review logic in the existing `ReviewSession` state machine, but split the visual lift across three seams: a more expressive `ReviewCard`, a clearer `RatingBar`, and a recomposed session layout that treats active review, weak-card retry, and done-state screens as one coherent arena. Favor extracting small presentational helpers only where they reduce `review-session.tsx` density without changing behavior.

**Tech Stack:** Next.js App Router, React 19 client components, Tailwind CSS, existing Cue brand primitives, Vitest + Testing Library

---

## File Structure

### New files

- `components/review-card.test.tsx` - focused tests for the upgraded card stage states and labels
- `components/rating-bar.test.tsx` - focused tests for rating emphasis and keyboard-label treatment

### Modified files

- `app/(app)/review/review-session.tsx` - recompose the active session arena, action zone, weak-loop interstitial, and done screen
- `app/(app)/review/review-session.test.tsx` - extend coverage for the reshaped review flow and CTAs
- `app/(app)/review/loading.tsx` - keep the review loading surface aligned with the arena framing
- `components/review-card.tsx` - upgrade the card stage framing and pre/post-answer distinction
- `components/rating-bar.tsx` - refine rating hierarchy and card-like button treatment
- `docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md` - check off Slice B progress and add the shipping note

### Existing files to read before editing

- `AGENTS.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
- `app/(app)/review/page.tsx`
- `app/(app)/review/review-session.tsx`
- `app/(app)/review/review-session.test.tsx`
- `components/review-card.tsx`
- `components/rating-bar.tsx`
- `lib/brand/primitives/button.tsx`

---

### Task 1: Upgrade the card stage and rating controls

**Files:**
- Create: `components/review-card.test.tsx`
- Create: `components/rating-bar.test.tsx`
- Modify: `components/review-card.tsx`
- Modify: `components/rating-bar.tsx`

- [ ] **Step 1: Write the failing card-stage test**

```tsx
// components/review-card.test.tsx
'use client'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReviewCard } from './review-card'

describe('ReviewCard', () => {
  it('shows a stronger phase label and helper copy before reveal', () => {
    render(
      <ReviewCard
        front="What is the derivative of x^2?"
        back="2x"
        flipped={false}
        subject="math"
        stepLabel="Card 2 of 5"
        modeLabel="Quick 5"
      />,
    )

    expect(screen.getByText('Quick 5')).toBeInTheDocument()
    expect(screen.getByText('Card 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Think it through before you flip.')).toBeInTheDocument()
  })

  it('switches the helper copy after reveal', () => {
    render(
      <ReviewCard
        front="What is the derivative of x^2?"
        back="2x"
        flipped
        subject="math"
        stepLabel="Card 2 of 5"
        modeLabel="Quick 5"
      />,
    )

    expect(screen.getByText('Answer')).toBeInTheDocument()
    expect(screen.getByText('Now rate how easily it came back.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write the failing rating-bar test**

```tsx
// components/rating-bar.test.tsx
'use client'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RatingBar } from './rating-bar'

describe('RatingBar', () => {
  it('renders an emphasized primary recall option and forwards ratings', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()

    render(<RatingBar disabled={false} onRate={onRate} />)

    expect(screen.getByText('How did that feel?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Got it (press 3)' })).toHaveClass('ring-2')

    await user.click(screen.getByRole('button', { name: 'Easy (press 4)' }))

    expect(onRate).toHaveBeenCalledWith(4)
  })
})
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `npx vitest run "components/review-card.test.tsx" "components/rating-bar.test.tsx"`

Expected: FAIL because `ReviewCard` does not accept `stepLabel` / `modeLabel`, and `RatingBar` does not render the new heading or emphasized primary state yet.

- [ ] **Step 4: Upgrade `ReviewCard` with arena framing**

```tsx
// components/review-card.tsx
'use client'

import type { subjectFamily } from '@/lib/brand/tokens'

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
    <div className="relative w-full" style={{ perspective: '1000px' }} aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {modeLabel ? (
            <span className="rounded-full bg-cue-yellow/25 px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black">
              {modeLabel}
            </span>
          ) : null}
          {stepLabel ? (
            <span className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
              {stepLabel}
            </span>
          ) : null}
        </div>
        <span className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          {flipped ? 'Rate the recall' : 'Lock in a guess'}
        </span>
      </div>

      <div
        className="relative grid w-full transition-transform motion-reduce:transition-none"
        style={{
          transformStyle: 'preserve-3d',
          transitionDuration: '180ms',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <Face
          tint={tint}
          label="Question"
          text={front}
          helper="Think it through before you flip."
        />
        <Face
          tint={tint}
          label="Answer"
          text={back}
          helper="Now rate how easily it came back."
          backSide
        />
      </div>
    </div>
  )
}

function Face({
  tint,
  label,
  text,
  helper,
  backSide,
}: {
  tint: string
  label: string
  text: string
  helper: string
  backSide?: boolean
}) {
  return (
    <div
      className={[
        'rounded-[28px] border border-ink-black/8 p-7 sm:p-8 text-center',
        'flex min-h-[320px] items-center justify-center shadow-card-rest',
        backSide ? 'shadow-card-flip' : '',
      ].join(' ')}
      style={{
        gridArea: '1 / 1',
        background: tint,
        backfaceVisibility: 'hidden',
        transform: backSide ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
            {label}
          </div>
          <div className="font-display text-2xl font-extrabold leading-tight text-ink-black whitespace-pre-wrap break-words sm:text-[30px]">
            {text}
          </div>
        </div>
        <p className="text-sm text-ink-black/65">{helper}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Upgrade `RatingBar` into a clearer recall decision strip**

```tsx
// components/rating-bar.tsx
'use client'

import { CueButton } from '@/lib/brand/primitives/button'
import type { FsrsRating } from '@/lib/srs/schedule'

const BUTTONS: {
  rating: FsrsRating
  label: string
  sublabel: string
  key: string
  variant: 'primary' | 'ghost'
  emphatic?: boolean
}[] = [
  { rating: 1, label: 'Forgot', sublabel: 'Blanked completely', key: '1', variant: 'ghost' },
  { rating: 2, label: 'Tough', sublabel: 'Got there slowly', key: '2', variant: 'ghost' },
  { rating: 3, label: 'Got it', sublabel: 'Solid recall', key: '3', variant: 'primary', emphatic: true },
  { rating: 4, label: 'Easy', sublabel: 'Instant and clean', key: '4', variant: 'ghost' },
]

export function RatingBar({
  disabled,
  onRate,
}: {
  disabled: boolean
  onRate: (r: FsrsRating) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1 text-center">
        <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          Recall check
        </p>
        <h3 className="font-display text-lg font-extrabold text-ink-black">How did that feel?</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {BUTTONS.map((button) => (
          <CueButton
            key={button.rating}
            variant={button.variant}
            disabled={disabled}
            onClick={() => onRate(button.rating)}
            className={[
              'min-h-[82px] w-full items-start justify-between rounded-[22px] px-4 py-3 text-left',
              button.emphatic ? 'ring-2 ring-cue-yellow/45 ring-offset-2 ring-offset-paper-white' : '',
            ].join(' ')}
            aria-label={`${button.label} (press ${button.key})`}
          >
            <span className="space-y-1">
              <span className="block text-base">{button.label}</span>
              <span className="block text-xs font-medium opacity-70">{button.sublabel}</span>
            </span>
            <span className="rounded-full bg-ink-black/8 px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-[0.08em] opacity-70">
              {button.key}
            </span>
          </CueButton>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run the focused tests to verify they pass**

Run: `npx vitest run "components/review-card.test.tsx" "components/rating-bar.test.tsx"`

Expected: PASS with all assertions green.

- [ ] **Step 7: Commit**

```bash
git add "components/review-card.tsx" "components/review-card.test.tsx" "components/rating-bar.tsx" "components/rating-bar.test.tsx"
git commit -m "Upgrade review card arena and rating controls"
```

---

### Task 2: Recompose the active review session into an arena

**Files:**
- Modify: `app/(app)/review/review-session.tsx`
- Modify: `app/(app)/review/review-session.test.tsx`

- [ ] **Step 1: Extend the review-session test with the new active-layout expectations**

```tsx
// app/(app)/review/review-session.test.tsx
it('renders the arena header and pre-answer action hierarchy', () => {
  pushSpy.mockReset()
  refreshSpy.mockReset()
  observeSpy.mockReset()
  observeSpy.mockReturnValue({ action: 'continue' })
  fetchEasyCardsSpy.mockReset()
  fetchEasyCardsSpy.mockResolvedValue([])
  resetPreviewMock()

  render(
    <ReviewSession
      cards={[card()]}
      deckId="deck-1"
      startedAt="2026-04-26T00:00:00.000Z"
      mode="quick"
    />,
  )

  expect(screen.getByText('Quick 5')).toBeInTheDocument()
  expect(screen.getByText('Card 1 of 1')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'End session' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Show answer (Space)' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try typing it' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reveal hint (H)' })).toBeInTheDocument()
})

it('shows the upgraded rating prompt after reveal', async () => {
  pushSpy.mockReset()
  refreshSpy.mockReset()
  observeSpy.mockReset()
  observeSpy.mockReturnValue({ action: 'continue' })
  fetchEasyCardsSpy.mockReset()
  fetchEasyCardsSpy.mockResolvedValue([])
  resetPreviewMock()
  const user = userEvent.setup()

  render(
    <ReviewSession
      cards={[card()]}
      deckId="deck-1"
      startedAt="2026-04-26T00:00:00.000Z"
      mode="quick"
    />,
  )

  await user.click(screen.getByRole('button', { name: 'Show answer (Space)' }))

  expect(screen.getByText('How did that feel?')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Got it (press 3)' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run "app/(app)/review/review-session.test.tsx"`

Expected: FAIL because the current session does not expose the new arena header, end-session button, or upgraded rating prompt.

- [ ] **Step 3: Recompose the active session header and arena shell**

```tsx
// app/(app)/review/review-session.tsx
const stepLabel = `Card ${Math.min(index + 1, cards.length)} of ${cards.length}`
const progressPct = cards.length > 0 ? Math.min(100, Math.round((index / cards.length) * 100)) : 0

// inside the active-session return branch
return (
  <div className="space-y-6">
    <section className="rounded-[28px] border border-ink-black/10 bg-paper-white px-5 py-5 shadow-card-rest sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cue-yellow/25 px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black">
                {conceptTag && !deckId ? `Focused drill - ${labelForMode(mode)}` : labelForMode(mode)}
              </span>
              {phase === 'weak' ? (
                <span className="rounded-full bg-trust-blue/20 px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black">
                  Weak-card loop
                </span>
              ) : null}
            </div>
            <h2 className="font-display text-2xl font-extrabold leading-tight text-ink-black truncate">
              {current?.front.text ? 'Stay with it - one clean recall at a time.' : 'Review'}
            </h2>
            <p className="text-sm text-ink-black/65">
              {stepLabel}
            </p>
          </div>
          <CueButton variant="ghost" onClick={finishSession} className="shrink-0" aria-label="End session">
            End session
          </CueButton>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
            <span>Progress</span>
            <span>{index} cleared</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-black/10">
            <div
              className="h-full rounded-full bg-cue-yellow transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>

    <section className="space-y-5">
      <ReviewCard
        front={current.front.text}
        back={current.back.text}
        flipped={flipped}
        subject={subject}
        stepLabel={stepLabel}
        modeLabel={labelForMode(mode)}
      />
      {/* existing action zone continues here */}
    </section>
  </div>
)
```

- [ ] **Step 4: Recompose the pre-answer and post-answer action zone**

```tsx
// app/(app)/review/review-session.tsx
{!flipped && (
  <div className="space-y-4">
    <CueCard tone="cream" className="rounded-[24px] shadow-card-rest px-5 py-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          Before you reveal
        </p>
        <p className="text-sm text-ink-black/70">
          Take your best shot first. Use a hint or typing challenge if you want a stronger recall check.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {current.hint ? (
          <CueButton
            variant="ghost"
            className="w-full"
            onClick={() => setHintShown(true)}
            disabled={hintShown}
          >
            {hintShown ? 'Hint revealed' : 'Reveal hint (H)'}
          </CueButton>
        ) : null}
        {typingSupported && !typingOpen ? (
          <CueButton variant="ghost" className="w-full" onClick={() => setTypingOpen(true)}>
            Try typing it
          </CueButton>
        ) : null}
      </div>

      <CueButton className="w-full" size="lg" onClick={() => setFlipped(true)}>
        Show answer (Space)
      </CueButton>
    </CueCard>

    {hintShown && current.hint ? (
      <CueCard tone="blue" className="rounded-[24px] shadow-card-rest px-5 py-4 space-y-2">
        <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          Hint
        </p>
        <p className="text-sm text-ink-black/75">{current.hint}</p>
      </CueCard>
    ) : null}

    {typingSupported && typingOpen ? (
      <CueCard tone="paper" className="rounded-[24px] shadow-card-rest px-5 py-5 space-y-4">
        {/* keep the same typing logic and input handlers */}
      </CueCard>
    ) : null}
  </div>
)}

{flipped && (
  <div className="space-y-4">
    {typedCheck ? (
      <CueCard tone={typedCheck.exact ? 'mint' : typedCheck.close ? 'blue' : 'cream'} className="rounded-[24px] shadow-card-rest px-5 py-4 space-y-2">
        {/* existing typed-answer text stays, only the presentation changes */}
      </CueCard>
    ) : null}
    <RatingBar disabled={pending} onRate={rate} />
  </div>
)}
```

- [ ] **Step 5: Run the focused review-session test to verify it passes**

Run: `npx vitest run "app/(app)/review/review-session.test.tsx"`

Expected: PASS with the new arena-layout assertions green and the existing review behavior still passing.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/review/review-session.tsx" "app/(app)/review/review-session.test.tsx"
git commit -m "Recompose active review session into an arena"
```

---

### Task 3: Redesign the weak-card retry and done-state experience

**Files:**
- Modify: `app/(app)/review/review-session.tsx`
- Modify: `app/(app)/review/review-session.test.tsx`

- [ ] **Step 1: Extend the review-session test for the new consequence-state copy and hierarchy**

```tsx
// app/(app)/review/review-session.test.tsx
it('frames the weak-card pass as a sharpen-up choice', async () => {
  pushSpy.mockReset()
  refreshSpy.mockReset()
  observeSpy.mockReset()
  observeSpy.mockReturnValue({ action: 'continue' })
  fetchEasyCardsSpy.mockReset()
  fetchEasyCardsSpy.mockResolvedValue([])
  resetPreviewMock()
  const user = userEvent.setup()

  render(
    <ReviewSession
      cards={[card()]}
      deckId="deck-1"
      startedAt="2026-04-26T00:00:00.000Z"
      mode="quick"
    />,
  )

  await user.click(screen.getByRole('button', { name: 'Show answer (Space)' }))
  await user.click(screen.getByRole('button', { name: 'Forgot (press 1)' }))

  expect(screen.getByText('Sharpen the shaky ones?')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Take one more pass' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Finish this round' })).toBeInTheDocument()
})

it('shows a more directional done state after ending early', async () => {
  pushSpy.mockReset()
  refreshSpy.mockReset()
  observeSpy.mockReset()
  observeSpy.mockReturnValue({ action: 'continue' })
  fetchEasyCardsSpy.mockReset()
  fetchEasyCardsSpy.mockResolvedValue([])
  resetPreviewMock()
  const user = userEvent.setup()

  render(
    <ReviewSession
      cards={[card()]}
      deckId="deck-1"
      startedAt="2026-04-26T00:00:00.000Z"
      mode="quick"
    />,
  )

  await user.click(screen.getByRole('button', { name: 'End session' }))

  expect(screen.getByText('Good stop.')).toBeInTheDocument()
  expect(screen.getByText('Suggested next: Quick 5')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start Quick 5' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start Sprint' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Done for today' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run "app/(app)/review/review-session.test.tsx"`

Expected: FAIL because the current weak-loop and done-state copy do not match the new arena treatment.

- [ ] **Step 3: Upgrade the weak-card retry interstitial**

```tsx
// app/(app)/review/review-session.tsx
if (showWeakLoopPrompt) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <CueCard
        tone="blue"
        className="w-full max-w-[500px] rounded-[30px] !shadow-none px-8 py-8 text-center space-y-5"
      >
        <div className="space-y-2">
          <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
            Cleanup lap
          </p>
          <h2 className="font-display text-[30px] font-extrabold leading-tight text-ink-black">
            Sharpen the shaky ones?
          </h2>
          <p className="text-sm text-ink-black/70">
            {weakCards.length} card{weakCards.length === 1 ? '' : 's'} felt unsteady. One quick pass can lock them in before you bounce.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CueButton onClick={beginWeakLoop} className="w-full">
            Take one more pass
          </CueButton>
          <CueButton variant="ghost" onClick={finishSession} className="w-full">
            Finish this round
          </CueButton>
        </div>
      </CueCard>
    </div>
  )
}
```

- [ ] **Step 4: Redesign the done screen and CTA stack**

```tsx
// app/(app)/review/review-session.tsx
const endedEarly = events.length < cards.length && !completedWeakLoop

if (done) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <CueCard
        tone="mint"
        className="w-full max-w-[500px] rounded-[30px] !shadow-none px-8 py-9 text-center space-y-6"
      >
        <div className="space-y-2">
          <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
            Session complete
          </p>
          <h2 className="font-display text-[34px] font-extrabold leading-tight text-ink-black">
            {endedEarly ? 'Good stop.' : 'Nice sprint.'}
          </h2>
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span className="text-[72px] font-display font-extrabold leading-none text-cue-yellow">
            {got}
          </span>
          <span className="text-2xl text-ink-black">/ {events.length}</span>
        </div>

        <div className="space-y-2">
          <p className="text-base text-ink-black/70">
            {endedEarly ? 'You banked a useful round.' : 'Remembered cleanly.'}
          </p>
          <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60">
            Time {mins}m {secs.toString().padStart(2, '0')}s
          </p>
          {completedWeakLoop ? (
            <p className="text-xs text-ink-black/60">Weak-card loop completed.</p>
          ) : null}
          {timedOut ? (
            <p className="text-xs text-ink-black/60">Timed out at 15 min - solid focus.</p>
          ) : null}
        </div>
      </CueCard>

      {/* keep preview logic and due-now guardrails, but present it as the second panel */}
      <div className="flex w-full max-w-[500px] flex-col gap-3">
        {preview?.hasDueNow ? (
          <CueButton onClick={() => router.push(reviewHref(preview.suggestedMode, true))} className="w-full" size="lg">
            Start {labelForMode(preview.suggestedMode)}
          </CueButton>
        ) : null}
        {preview?.hasDueNow ? (
          <CueButton
            variant="ghost"
            onClick={() => {
              if (preview && preview.suggestedMode === mode) {
                router.push(reviewHref(replayMode, true))
                return
              }
              router.push(reviewHref(mode, true))
            }}
            className="w-full"
          >
            {preview && preview.suggestedMode === mode
              ? `Start ${labelForMode(replayMode)}`
              : mode === 'quick'
                ? 'Another Quick 5'
                : 'Another sprint'}
          </CueButton>
        ) : null}
        <CueButton variant="ghost" onClick={() => router.push(backHref)} className="w-full">
          Done for today
        </CueButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `npx vitest run "app/(app)/review/review-session.test.tsx"`

Expected: PASS with the new weak-loop and done-state assertions green and the earlier restart-CTA regressions still protected.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/review/review-session.tsx" "app/(app)/review/review-session.test.tsx"
git commit -m "Polish review consequence states"
```

---

### Task 4: Align loading, helper feedback, and delight tracking

**Files:**
- Modify: `app/(app)/review/loading.tsx`
- Modify: `app/(app)/review/review-session.tsx`
- Modify: `docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md`

- [ ] **Step 1: Extend the review-session test for helper feedback copy**

```tsx
// app/(app)/review/review-session.test.tsx
it('keeps the keyboard helper copy aligned with typing support and hints', async () => {
  pushSpy.mockReset()
  refreshSpy.mockReset()
  observeSpy.mockReset()
  observeSpy.mockReturnValue({ action: 'continue' })
  fetchEasyCardsSpy.mockReset()
  fetchEasyCardsSpy.mockResolvedValue([])
  resetPreviewMock()

  render(
    <ReviewSession
      cards={[card()]}
      deckId="deck-1"
      startedAt="2026-04-26T00:00:00.000Z"
      mode="quick"
    />,
  )

  expect(screen.getByText('H for hint, Enter to check typed answer, Space for answer, Esc to end early')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test to verify it still passes before the final polish**

Run: `npx vitest run "app/(app)/review/review-session.test.tsx"`

Expected: PASS, giving us a stable base before the last copy and loading adjustments.

- [ ] **Step 3: Align review loading with the arena framing and tighten helper surfaces**

```tsx
// app/(app)/review/loading.tsx
import { AppPageLoading } from '@/components/app-page-loading'

export default function Loading() {
  return <AppPageLoading title="Loading review arena" message="Warming up your next cards..." />
}
```

```tsx
// app/(app)/review/review-session.tsx
{lastInterval !== null ? (
  <CueCard tone="paper" className="rounded-[20px] shadow-card-rest px-4 py-3 text-center">
    <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
      Next rep
    </p>
    <p className="text-sm text-ink-black/70">
      {lastInterval === 0
        ? 'See you again shortly.'
        : lastInterval === 1
          ? 'Next review: tomorrow.'
          : `Next review: in ${lastInterval} days.`}
    </p>
  </CueCard>
) : null}

{error ? (
  <CueCard tone="cream" className="rounded-[20px] shadow-card-rest px-4 py-3">
    <p className="text-sm text-red-700">{error}</p>
  </CueCard>
) : null}

<p className="text-xs text-center text-ink-black/50">
  {typingSupported
    ? current?.hint
      ? 'H for hint, Enter to check typed answer, Space for answer, Esc to end early'
      : 'Enter to check typed answer, Space for answer, Esc to end early'
    : current?.hint
      ? 'H for hint, Space for answer, Esc to end early'
      : 'Space for answer, Esc to end early'}
</p>
```

- [ ] **Step 4: Update the delight handover tracker for Slice B**

```md
<!-- docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md -->
- [x] Improve front/back card presentation so the review card feels more premium and focused.
- [x] Refine the reveal rhythm for hint -> answer -> rating.
- [x] Improve the visual treatment of typing challenge states: ready, attempted, close, skipped, revealed.
- [x] Make action hierarchy unmistakable: primary next action versus secondary options.
- [x] Polish weak-card retry interstitial so it feels encouraging rather than mechanical.
- [x] Improve done-screen composition so the session ending feels rewarding and smart.

### 2026-04-27
- Arena Flow Slice B shipped across the active review session, weak-card retry, and done-state experience.
```

- [ ] **Step 5: Run the full verification suite**

Run: `corepack pnpm lint`

Expected: PASS

Run: `corepack pnpm test`

Expected: PASS

Run: `corepack pnpm build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/review/loading.tsx" "app/(app)/review/review-session.tsx" "app/(app)/review/review-session.test.tsx" "docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md"
git commit -m "Align review arena feedback and loading states"
```

---

## Self-Review

### Spec coverage

- Card presentation: covered by Task 1 and Task 2
- Interaction rhythm: covered by Task 2 and Task 4
- Weak-card retry and done-state payoff: covered by Task 3
- Moderate-motion / helper-state consistency / handover updates: covered by Task 4
- Guardrails about preserving FSRS semantics, trust gating, and keyboard support: enforced by existing review-session tests extended in Tasks 2-4

No spec requirements are missing from the plan.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- Every code-touching step includes concrete file paths, code, commands, and expected outcomes.

### Type consistency

- `ReviewCard` additions use `stepLabel` and `modeLabel` consistently across the plan.
- `RatingBar` stays on the same `onRate(r: FsrsRating)` contract.
- `ReviewSession` keeps existing session state names (`flipped`, `hintShown`, `typingOpen`, `weakCards`, `preview`) and only recomposes presentation around them.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-review-arena-flow.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
