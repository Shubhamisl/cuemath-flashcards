'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { ReviewCard } from '@/components/review-card'
import { RatingBar } from '@/components/rating-bar'
import { BreakPrompt } from '@/components/break-prompt'
import { submitRating, finalizeSession, getSessionPreview } from './actions'
import { fetchEasyCards } from '@/lib/fatigue/easy-cards'
import { observe, type ReviewEvent } from '@/lib/fatigue/observe'
import type { SprintCard } from '@/lib/queue/types'
import { initialState, schedule, type FsrsCardState, type FsrsRating } from '@/lib/srs/schedule'
import type { subjectFamily } from '@/lib/brand/tokens'
import { labelForMode, type ReviewMode } from '@/lib/review/mode'
import type { SessionPreview } from '@/lib/review/session-preview'
import { checkTypedAnswer, supportsTypingChallenge, type TypedAnswerCheck } from '@/lib/review/typing'

const SPRINT_MS_CAP = 15 * 60 * 1000
type SessionEvent = ReviewEvent & { hintUsed: boolean }
type SessionPhase = 'main' | 'weak' | 'done'

export function ReviewSession({
  cards: initialCards,
  subject,
  deckId,
  conceptTag,
  previewScope,
  backHref = '/library',
  startedAt,
  mode,
}: {
  cards: SprintCard[]
  subject?: subjectFamily
  deckId?: string
  conceptTag?: string
  previewScope?: {
    deckId?: string
    conceptTag?: string
  }
  backHref?: string
  startedAt: string
  mode: ReviewMode
}) {
  const router = useRouter()
  const [cards, setCards] = useState<SprintCard[]>(initialCards)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<SessionPhase>('main')
  const [completedWeakLoop, setCompletedWeakLoop] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [typingOpen, setTypingOpen] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [typedCheck, setTypedCheck] = useState<TypedAnswerCheck | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [weakCards, setWeakCards] = useState<SprintCard[]>([])
  const [preview, setPreview] = useState<SessionPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedCount, setFailedCount] = useState(0)
  const [showBreak, setShowBreak] = useState(false)
  const [easyNote, setEasyNote] = useState<string | null>(null)
  const [flags, setFlags] = useState({ injectedEasy: false, promptedBreak: false })
  const [breakPromptedAt, setBreakPromptedAt] = useState<string | null>(null)
  const [lastInterval, setLastInterval] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [endedAt, setEndedAt] = useState<string | null>(null)
  const shownAt = useRef<number | null>(null)
  const finalized = useRef(false)
  const advancingRef = useRef(false)
  const indexRef = useRef(0)

  const current = cards[index]
  const typingSupported = supportsTypingChallenge(current?.back.text ?? '')
  const completedPass = index >= cards.length
  const visibleCardNumber = Math.min(index + 1, cards.length)
  const sprintProgressPercent = cards.length > 0
    ? Math.round((visibleCardNumber / cards.length) * 100)
    : 0
  const cardsRemaining = Math.max(cards.length - visibleCardNumber, 0)
  const phaseLabel = phase === 'weak' ? 'Weak-card loop' : 'Main sprint'
  const showWeakLoopPrompt = !timedOut && phase === 'main' && completedPass && weakCards.length > 0
  const done = timedOut || phase === 'done'
  const replayMode: ReviewMode =
    preview && preview.suggestedMode === mode
      ? mode === 'quick'
        ? 'standard'
        : 'quick'
      : mode
  const backLabel =
    backHref === '/progress'
      ? 'Back to progress'
      : backHref === '/library'
        ? 'Back to library'
        : 'Back to deck'
  const resolvedPreviewScope = useMemo(() => (
    previewScope ??
    (deckId || conceptTag || backHref === '/library' || backHref === '/progress'
      ? { deckId, conceptTag }
      : undefined)
  ), [previewScope, deckId, conceptTag, backHref])

  useEffect(() => {
    shownAt.current = Date.now()
    const timer = window.setTimeout(() => {
      setEndedAt(new Date().toISOString())
      setTimedOut(true)
    }, SPRINT_MS_CAP)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    if (!done || finalized.current || cards.length === 0) return
    finalized.current = true
    const ratings = events.map((e) => ({
      rating: e.rating,
      elapsedMs: e.elapsedMs,
      hintUsed: e.hintUsed,
    }))
    void finalizeSession({
      startedAt,
      endedAt: endedAt ?? new Date().toISOString(),
      ratings,
      breakPromptedAt,
      mode,
    })
  }, [done, events, cards.length, breakPromptedAt, endedAt, startedAt, mode])

  useEffect(() => {
    if (!done || preview || !resolvedPreviewScope) return
    let cancelled = false

    void getSessionPreview(resolvedPreviewScope).then((result) => {
      if (cancelled || 'error' in result) return
      setPreview(result)
    })

    return () => {
      cancelled = true
    }
  }, [done, preview, resolvedPreviewScope])

  function moveToIndex(nextIndex: number) {
    shownAt.current = Date.now()
    setFlipped(false)
    setHintShown(false)
    setTypingOpen(false)
    setTypedAnswer('')
    setTypedCheck(null)
    setIndex(nextIndex)
  }

  function finishSession() {
    if (endedAt === null) {
      setEndedAt(new Date().toISOString())
    }
    setPhase('done')
  }

  function beginWeakLoop() {
    shownAt.current = Date.now()
    setCards(weakCards)
    setIndex(0)
    setPhase('weak')
    setCompletedWeakLoop(false)
    setFlipped(false)
    setHintShown(false)
    setShowBreak(false)
    setLastInterval(null)
  }

  function reviewHref(nextMode: ReviewMode, fresh = false): string {
    const params = new URLSearchParams()
    if (deckId) {
      params.set('deck', deckId)
    }
    if (conceptTag) {
      params.set('concept', conceptTag)
    }
    if (nextMode === 'quick') {
      params.set('mode', 'quick')
    }
    if (fresh) {
      params.set('run', String(Date.now()))
    }
    return `/review?${params.toString()}`
  }

  function submitTypedChallenge() {
    if (!current || flipped) return
    setTypedCheck(checkTypedAnswer(current.back.text, typedAnswer))
    setTypingOpen(false)
    setFlipped(true)
  }

  function rate(rating: FsrsRating) {
    if (!current || showBreak || advancingRef.current) return
    advancingRef.current = true

    const now = Date.now()
    const elapsedMs = now - (shownAt.current ?? now)
    const ratedCard = current
    const cardId = ratedCard.id

    // Compute the FSRS interval client-side using the same algorithm the
    // server runs. Cards already carry `fsrs_state`, so the optimistic
    // interval matches what the server will compute. This lets us advance
    // the UI in the same frame as the click, instead of after a roundtrip.
    try {
      const before: FsrsCardState =
        (ratedCard.fsrs_state as FsrsCardState | null) ?? initialState()
      const result = schedule(before, rating, new Date())
      setLastInterval(result.intervalDays)
      window.setTimeout(() => setLastInterval(null), 2000)
    } catch {
      // Optimistic compute failed; silently skip the hint, server still saves.
    }

    setError(null)

    const nextWeakCards =
      phase === 'main' && rating <= 2 && !weakCards.some((c) => c.id === ratedCard.id)
        ? [...weakCards, ratedCard]
        : weakCards
    if (nextWeakCards !== weakCards) {
      setWeakCards(nextWeakCards)
    }

    const nextEvents = [...events, { rating, elapsedMs, timestamp: now, hintUsed: hintShown }]
    setEvents(nextEvents)

    const decision =
      phase === 'main' ? observe(nextEvents, flags) : { action: 'continue' as const }

    if (decision.action === 'inject_easy') {
      setFlags((f) => ({ ...f, injectedEasy: true }))
      if (deckId) {
        const excludeIds = cards.map((c) => c.id)
        // Fire-and-forget: fetch easy cards, splice them in just after the
        // user's current position when they arrive. indexRef is kept current
        // by an effect, so the splice lands at the right place even though
        // index may have advanced since rate() was called.
        void fetchEasyCards({ deckId, excludeIds, n: 2 }).then((extras) => {
          if (extras.length === 0) return
          setCards((prev) => {
            const copy = [...prev]
            const inject = Math.min(indexRef.current + 1, copy.length)
            copy.splice(inject, 0, ...extras)
            return copy
          })
          setEasyNote("Here's an easy one - keep your rhythm.")
          window.setTimeout(() => setEasyNote(null), 2500)
        })
      }
      moveToIndex(index + 1)
    } else if (decision.action === 'prompt_break') {
      setFlags((f) => ({ ...f, promptedBreak: true }))
      setBreakPromptedAt(new Date().toISOString())
      setShowBreak(true)
      moveToIndex(index + 1)
    } else {
      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        if (phase === 'main') {
          moveToIndex(nextIndex)
          if (nextWeakCards.length === 0) {
            finishSession()
          }
        } else {
          setCompletedWeakLoop(true)
          finishSession()
          moveToIndex(nextIndex)
        }
      } else {
        moveToIndex(nextIndex)
      }
    }

    // Background server write. Failures bump a counter that the UI surfaces
    // as a sticky banner; the rating itself stays advanced because rolling
    // back mid-sprint would be more disruptive than a "refresh to retry".
    void submitRating({ cardId, rating, elapsedMs, hintUsed: hintShown })
      .then((res) => {
        if (res && 'error' in res) {
          setFailedCount((c) => c + 1)
        }
      })
      .catch(() => {
        setFailedCount((c) => c + 1)
      })

    // Tiny cooldown so a rapid double-tap on the rating bar can't fire twice
    // before React has rendered the next card.
    window.setTimeout(() => {
      advancingRef.current = false
    }, 60)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return
      const target = e.target
      const typingFieldFocused =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (e.key === 'Escape') {
        e.preventDefault()
        finishSession()
        return
      }
      if (showWeakLoopPrompt) return
      if (showBreak) return
      if (!flipped && typingOpen && e.key === 'Enter') {
        e.preventDefault()
        submitTypedChallenge()
        return
      }
      if (typingFieldFocused) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
        return
      }
      if (!flipped && current?.hint && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        setHintShown(true)
        return
      }
      if (!flipped) return
      if (e.key === '1') rate(1)
      else if (e.key === '2') rate(2)
      else if (e.key === '3' || e.key === 'Enter') rate(3)
      else if (e.key === '4') rate(4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, done, showBreak, cards.length, current?.hint, typingOpen, typedAnswer]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) {
    return (
      <CueCard className="text-center space-y-3 shadow-card-rest">
        <h2 className="font-display text-xl font-bold">Nothing due right now</h2>
        <p className="text-sm opacity-70">Come back later or add more cards.</p>
        <CueButton onClick={() => router.push(backHref)}>
          {backLabel}
        </CueButton>
      </CueCard>
    )
  }

  if (showWeakLoopPrompt) {
    return (
      <div
        className="motion-premium-reveal flex flex-col items-center gap-6 py-8"
        data-motion-stage="weak-loop"
      >
        <CueCard
          tone="cream"
          className="rounded-panel !shadow-none p-8 w-full max-w-[440px] text-center space-y-4"
        >
          <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
            One more pass
          </p>
          <h2 className="font-display font-extrabold text-[28px] leading-tight">
            Revisit the tricky ones?
          </h2>
          <p className="text-sm text-ink-black/70">
            {weakCards.length} card{weakCards.length === 1 ? '' : 's'} felt shaky. A short cleanup pass can help lock them in.
          </p>
        </CueCard>

        <div className="flex flex-col items-center gap-3 w-full max-w-[440px]">
          <CueButton onClick={beginWeakLoop} className="w-full">
            Retry weak cards
          </CueButton>
          <CueButton variant="ghost" onClick={finishSession} className="w-full">
            Skip and finish
          </CueButton>
        </div>
      </div>
    )
  }

  if (done) {
    const got = events.filter((e) => e.rating >= 3).length
    const startMs = new Date(startedAt).getTime()
    const endMs = endedAt ? new Date(endedAt).getTime() : startMs
    const totalMs = Math.max(0, endMs - startMs)
    const mins = Math.floor(totalMs / 60000)
    const secs = Math.floor((totalMs % 60000) / 1000)

    return (
      <div
        className="motion-premium-reveal flex flex-col items-center gap-6 py-8"
        data-motion-stage="session-complete"
      >
        <CueCard
          tone="mint"
          className="rounded-panel !shadow-none p-10 w-full max-w-[440px] text-center space-y-6"
        >
          <div className="text-4xl" aria-hidden="true">Done</div>
          <h2 className="font-display font-extrabold text-[32px] leading-tight">Nice sprint.</h2>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[64px] font-display font-extrabold text-cue-yellow leading-none">
              {got}
            </span>
            <span className="text-2xl text-ink-black">/ {events.length}</span>
          </div>
          <p className="text-base text-ink-black/70 -mt-3">remembered</p>
          <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60 pt-2">
            Time {mins}m {secs.toString().padStart(2, '0')}s
          </div>
          {completedWeakLoop && (
            <p className="text-xs text-ink-black/60">
              Weak-card loop completed.
            </p>
          )}
          {timedOut && (
            <p className="text-xs text-ink-black/60">Timed out at 15 min - good focus.</p>
          )}
        </CueCard>

        {preview && (
          <CueCard tone="blue" className="motion-premium-list-item w-full max-w-[440px] shadow-card-rest space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Next session
              </p>
              <p className="font-display text-lg font-bold text-ink-black">
                Suggested next: {labelForMode(preview.suggestedMode)}
              </p>
              <p className="text-sm text-ink-black/70">{preview.suggestedReason}</p>
            </div>

            {preview.weakTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                  Focus areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {preview.weakTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-cue-yellow/30 px-3 py-1 text-xs font-display font-semibold text-ink-black"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preview.hasUpcoming && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                  Upcoming
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-ink-black/70">
                  {preview.dueLaterToday > 0 && (
                    <span>
                      <span className="font-display font-bold text-ink-black">{preview.dueLaterToday}</span> later today
                    </span>
                  )}
                  {preview.dueTomorrow > 0 && (
                    <span>
                      <span className="font-display font-bold text-ink-black">{preview.dueTomorrow}</span> tomorrow
                    </span>
                  )}
                  {preview.dueThisWeek > 0 && (
                    <span>
                      <span className="font-display font-bold text-ink-black">{preview.dueThisWeek}</span> this week
                    </span>
                  )}
                </div>
              </div>
            )}

            {!preview.hasDueNow && (
              <p className="text-sm text-ink-black/70">
                Nothing else is due right now. Come back when the next cards unlock.
              </p>
            )}
          </CueCard>
        )}

        <div className="flex flex-col items-center gap-3 w-full max-w-[440px]">
          {preview?.hasDueNow && (
            <CueButton
              onClick={() => router.push(reviewHref(preview.suggestedMode, true))}
              className="w-full"
            >
              Start {labelForMode(preview.suggestedMode)}
            </CueButton>
          )}
          {preview?.hasDueNow && (
            <CueButton
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
          )}
          <button
            onClick={() => router.push(backHref)}
            className="text-ink-black hover:underline font-display font-semibold"
          >
            Done for today
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="motion-premium-reveal space-y-6">
      <div className="cue-hard-panel overflow-hidden bg-paper-white shadow-card-rest">
        <div
          data-testid="review-sprint-status"
          className="grid grid-cols-3 divide-x divide-ink-black border-b border-ink-black text-center"
          aria-live="polite"
        >
          <div className="bg-cue-yellow px-2 py-3">
            <p className="text-[10px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/60">
              Card
            </p>
            <p className="font-display text-base font-extrabold">
              Card {visibleCardNumber} / {cards.length}
            </p>
          </div>
          <div className="bg-soft-cream px-2 py-3">
            <p className="text-[10px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/60">
              Sprint
            </p>
            <p className="font-display text-base font-extrabold">{sprintProgressPercent}%</p>
          </div>
          <div className="bg-trust-blue px-2 py-3">
            <p className="text-[10px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/60">
              Phase
            </p>
            <p className="font-display text-sm font-extrabold leading-tight">{phaseLabel}</p>
          </div>
        </div>
        <div className="space-y-3 px-3 py-3">
          <div
            data-testid="review-progress-cells"
            className="flex items-center justify-center gap-1.5 flex-wrap"
            aria-label={`Card ${visibleCardNumber} of ${cards.length}`}
          >
            {cards.map((_, i) => (
              <span
                key={i}
                className={`cue-progress-cell transition-all ${
                  i < index
                    ? 'cue-progress-complete'
                    : i === index
                      ? 'cue-progress-current'
                      : ''
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs font-display font-semibold text-ink-black/55">
            {cardsRemaining === 0
              ? 'Last card in this pass'
              : `${cardsRemaining} card${cardsRemaining === 1 ? '' : 's'} left in this pass`}
          </p>
        </div>
      </div>

      {showBreak ? (
        <BreakPrompt onDismiss={() => setShowBreak(false)} />
      ) : (
        <>
          {current.fsrs_state === null && (
            <div className="flex justify-center">
              <span className="motion-premium-reveal border border-ink-black bg-cue-yellow px-3 py-1 text-xs font-display font-bold uppercase tracking-[0.08em] text-ink-black">
                New
              </span>
            </div>
          )}

          <ReviewCard
            front={current.front.text}
            back={current.back.text}
            flipped={flipped}
            subject={subject}
            format={current.format}
          />
          {!flipped && (
            <div className="cue-hard-panel bg-paper-white p-3 shadow-card-rest space-y-3 sm:p-4">
              {current.hint && (
                <>
                  <CueButton
                    variant="ghost"
                    className="w-full"
                    onClick={() => setHintShown(true)}
                    disabled={hintShown}
                  >
                    {hintShown ? 'Hint revealed' : 'Reveal hint (H)'}
                  </CueButton>
                  {hintShown && (
                    <CueCard tone="blue" className="motion-premium-reveal shadow-card-rest px-5 py-4 space-y-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                        Hint
                      </p>
                      <p className="text-sm text-ink-black/75">{current.hint}</p>
                    </CueCard>
                  )}
                </>
              )}
              {typingSupported && typingOpen && (
                <CueCard tone="cream" className="motion-premium-reveal shadow-card-rest px-5 py-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                      Typing challenge
                    </p>
                    <p className="text-sm text-ink-black/70">
                      Try recalling the answer before you peek.
                    </p>
                  </div>
                  <input
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type your answer"
                    autoFocus
                    className="w-full rounded-card border border-ink-black/15 bg-white/80 px-4 py-3 text-sm text-ink-black outline-none focus:border-cue-yellow focus:ring-2 focus:ring-cue-yellow/30"
                  />
                  <div data-testid="typing-challenge-actions" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <CueButton
                      onClick={submitTypedChallenge}
                      disabled={typedAnswer.trim().length === 0}
                      className="w-full"
                    >
                      Check answer (Enter)
                    </CueButton>
                    <CueButton
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setTypingOpen(false)
                        setTypedAnswer('')
                        setTypedCheck(null)
                      }}
                    >
                      Skip typing
                    </CueButton>
                  </div>
                </CueCard>
              )}
              {typingSupported && !typingOpen && (
                <CueButton
                  variant="ghost"
                  className="w-full"
                  onClick={() => setTypingOpen(true)}
                >
                  Try typing it
                </CueButton>
              )}
              <CueButton className="w-full" onClick={() => setFlipped(true)}>
                Show answer (Space)
              </CueButton>
            </div>
          )}
          {flipped && (
            <div className="space-y-3">
              {typedCheck && (
                <CueCard tone={typedCheck.exact ? 'mint' : typedCheck.close ? 'blue' : 'cream'} className="motion-premium-reveal shadow-card-rest px-5 py-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                    Your attempt
                  </p>
                  <p className="text-sm text-ink-black/75">
                    {typedAnswer.trim() || 'No answer entered'}
                  </p>
                  <p className="text-sm text-ink-black/70">
                    {typedCheck.exact
                      ? 'Nice - that matches. Now rate how well it came back.'
                      : typedCheck.close
                        ? 'Close enough to count as a solid recall attempt. Check the answer, then rate it honestly.'
                        : typedCheck.empty
                          ? 'No attempt recorded. Check the answer, then rate it honestly.'
                          : 'Not an exact match. Check the answer, then rate it honestly.'}
                  </p>
                </CueCard>
              )}
              <div className="cue-hard-panel bg-paper-white p-3 shadow-card-rest sm:p-4">
                <RatingBar disabled={false} onRate={rate} />
              </div>
            </div>
          )}

          {lastInterval !== null && (
            <p className="motion-premium-reveal text-xs text-center text-ink-black/50">
              {lastInterval === 0
                ? 'See you again shortly'
                : lastInterval === 1
                  ? 'Next review: tomorrow'
                  : `Next review: in ${lastInterval} days`}
            </p>
          )}
        </>
      )}

      {easyNote && (
        <p className="motion-premium-reveal text-sm text-center" style={{ color: 'var(--ink-black)' }}>
          {easyNote}
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {failedCount > 0 && (
        <div
          role="alert"
          className="sticky bottom-4 mx-auto w-full max-w-[440px] rounded-card bg-alert-coral/90 text-ink-black px-4 py-3 text-sm font-display font-semibold shadow-card-flip flex items-center justify-between gap-3"
        >
          <span>
            {failedCount} rating{failedCount === 1 ? '' : 's'} didn&apos;t save. Refresh to retry.
          </span>
          <button
            type="button"
            onClick={() => setFailedCount(0)}
            className="text-xs uppercase tracking-[0.06em] underline opacity-80 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}
      <p className="text-xs text-center opacity-50">
        {typingSupported
          ? current?.hint
            ? 'H for hint, Enter to check typed answer, Space for answer, Esc to end early'
            : 'Enter to check typed answer, Space for answer, Esc to end early'
          : current?.hint
            ? 'H for hint, Space for answer, Esc to end early'
            : 'Space for answer, Esc to end early'}
      </p>
    </div>
  )
}
