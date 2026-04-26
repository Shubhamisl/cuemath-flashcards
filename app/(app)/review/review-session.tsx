'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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
import type { FsrsRating } from '@/lib/srs/schedule'
import type { subjectFamily } from '@/lib/brand/tokens'
import { labelForMode, type ReviewMode } from '@/lib/review/mode'
import type { SessionPreview } from '@/lib/review/session-preview'

const SPRINT_MS_CAP = 15 * 60 * 1000
type SessionEvent = ReviewEvent & { hintUsed: boolean }
type SessionPhase = 'main' | 'weak' | 'done'

export function ReviewSession({
  cards: initialCards,
  subject,
  deckId,
  startedAt,
  mode,
}: {
  cards: SprintCard[]
  subject?: subjectFamily
  deckId: string
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
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [weakCards, setWeakCards] = useState<SprintCard[]>([])
  const [preview, setPreview] = useState<SessionPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showBreak, setShowBreak] = useState(false)
  const [easyNote, setEasyNote] = useState<string | null>(null)
  const [flags, setFlags] = useState({ injectedEasy: false, promptedBreak: false })
  const [breakPromptedAt, setBreakPromptedAt] = useState<string | null>(null)
  const [lastInterval, setLastInterval] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [endedAt, setEndedAt] = useState<string | null>(null)
  const shownAt = useRef<number | null>(null)
  const finalized = useRef(false)

  const current = cards[index]
  const completedPass = index >= cards.length
  const showWeakLoopPrompt = !timedOut && phase === 'main' && completedPass && weakCards.length > 0
  const done = timedOut || phase === 'done'
  const replayMode: ReviewMode =
    preview && preview.suggestedMode === mode
      ? mode === 'quick'
        ? 'standard'
        : 'quick'
      : mode

  useEffect(() => {
    shownAt.current = Date.now()
    const timer = window.setTimeout(() => {
      setEndedAt(new Date().toISOString())
      setTimedOut(true)
    }, SPRINT_MS_CAP)
    return () => window.clearTimeout(timer)
  }, [])

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
    if (!done || preview) return
    let cancelled = false

    void getSessionPreview(deckId).then((result) => {
      if (cancelled || 'error' in result) return
      setPreview(result)
    })

    return () => {
      cancelled = true
    }
  }, [done, preview, deckId])

  function moveToIndex(nextIndex: number) {
    shownAt.current = Date.now()
    setFlipped(false)
    setHintShown(false)
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
    const params = new URLSearchParams({ deck: deckId })
    if (nextMode === 'quick') {
      params.set('mode', 'quick')
    }
    if (fresh) {
      params.set('run', String(Date.now()))
    }
    return `/review?${params.toString()}`
  }

  function rate(rating: FsrsRating) {
    if (!current || pending || showBreak) return
    const now = Date.now()
    const elapsedMs = now - (shownAt.current ?? now)

    startTransition(async () => {
      const res = await submitRating({ cardId: current.id, rating, elapsedMs, hintUsed: hintShown })
      if ('error' in res) {
        setError(res.error)
        return
      }

      setError(null)
      setLastInterval(res.intervalDays)
      window.setTimeout(() => setLastInterval(null), 2000)

      const nextWeakCards =
        phase === 'main' && rating <= 2 && !weakCards.some((card) => card.id === current.id)
          ? [...weakCards, current]
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
        const excludeIds = cards.map((c) => c.id)
        const extras = await fetchEasyCards({ deckId, excludeIds, n: 2 })
        if (extras.length > 0) {
          setCards((prev) => {
            const copy = [...prev]
            copy.splice(index + 1, 0, ...extras)
            return copy
          })
          setEasyNote("Here's an easy one - keep your rhythm.")
          window.setTimeout(() => setEasyNote(null), 2500)
        }
        moveToIndex(index + 1)
        return
      }

      if (decision.action === 'prompt_break') {
        setFlags((f) => ({ ...f, promptedBreak: true }))
        setBreakPromptedAt(new Date().toISOString())
        setShowBreak(true)
        moveToIndex(index + 1)
        return
      }

      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        if (phase === 'main') {
          moveToIndex(nextIndex)
          if (nextWeakCards.length === 0) {
            finishSession()
          }
          return
        }
        setCompletedWeakLoop(true)
        finishSession()
        moveToIndex(nextIndex)
        return
      }

      moveToIndex(nextIndex)
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return
      if (e.key === 'Escape') {
        e.preventDefault()
        finishSession()
        return
      }
      if (showWeakLoopPrompt) return
      if (showBreak) return
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
  }, [flipped, done, showBreak, cards.length, pending, current?.hint]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) {
    return (
      <CueCard className="text-center space-y-3 shadow-card-rest">
        <h2 className="font-display text-xl font-bold">Nothing due right now</h2>
        <p className="text-sm opacity-70">Come back later or add more cards.</p>
        <CueButton onClick={() => router.push(`/deck/${deckId}`)}>Back to deck</CueButton>
      </CueCard>
    )
  }

  if (showWeakLoopPrompt) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
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
      <div className="flex flex-col items-center gap-6 py-8">
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
          <CueCard tone="blue" className="w-full max-w-[440px] shadow-card-rest space-y-4">
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
            onClick={() => router.push(`/deck/${deckId}`)}
            className="text-ink-black hover:underline font-display font-semibold"
          >
            Done for today
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className="flex items-center justify-center gap-1.5 flex-wrap"
        aria-label={`Card ${Math.min(index + 1, cards.length)} of ${cards.length}`}
      >
        {cards.map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all ${
              i < index
                ? 'bg-cue-yellow'
                : i === index
                  ? 'bg-cue-yellow/60'
                  : 'bg-ink-black/15'
            }`}
            style={{
              width: i === index ? 10 : 6,
              height: i === index ? 10 : 6,
            }}
          />
        ))}
      </div>

      {showBreak ? (
        <BreakPrompt onDismiss={() => setShowBreak(false)} />
      ) : (
        <>
          {current.fsrs_state === null && (
            <div className="flex justify-center">
              <span className="text-xs font-display font-semibold uppercase tracking-[0.08em] bg-cue-yellow/30 text-ink-black px-3 py-1 rounded-full">
                New
              </span>
            </div>
          )}

          <ReviewCard
            front={current.front.text}
            back={current.back.text}
            flipped={flipped}
            subject={subject}
          />
          {!flipped && (
            <div className="space-y-3">
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
                    <CueCard tone="blue" className="shadow-card-rest px-5 py-4 space-y-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                        Hint
                      </p>
                      <p className="text-sm text-ink-black/75">{current.hint}</p>
                    </CueCard>
                  )}
                </>
              )}
              <CueButton className="w-full" onClick={() => setFlipped(true)}>
                Show answer (Space)
              </CueButton>
            </div>
          )}
          {flipped && <RatingBar disabled={pending} onRate={rate} />}

          {lastInterval !== null && (
            <p className="text-xs text-center text-ink-black/50">
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
        <p className="text-sm text-center" style={{ color: 'var(--ink-black)' }}>
          {easyNote}
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-center opacity-50">
        {current?.hint ? 'H for hint, Space for answer, Esc to end early' : 'Space for answer, Esc to end early'}
      </p>
    </div>
  )
}
