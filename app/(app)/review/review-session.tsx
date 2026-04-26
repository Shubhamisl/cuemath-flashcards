'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { ReviewCard } from '@/components/review-card'
import { RatingBar } from '@/components/rating-bar'
import { BreakPrompt } from '@/components/break-prompt'
import { submitRating, finalizeSession } from './actions'
import { fetchEasyCards } from '@/lib/fatigue/easy-cards'
import { observe, type ReviewEvent } from '@/lib/fatigue/observe'
import type { SprintCard } from '@/lib/queue/types'
import type { FsrsRating } from '@/lib/srs/schedule'
import type { subjectFamily } from '@/lib/brand/tokens'

const SPRINT_MS_CAP = 15 * 60 * 1000

export function ReviewSession({
  cards: initialCards,
  subject,
  deckId,
  startedAt,
}: {
  cards: SprintCard[]
  subject?: subjectFamily
  deckId: string
  startedAt: string
}) {
  const router = useRouter()
  const [cards, setCards] = useState<SprintCard[]>(initialCards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [events, setEvents] = useState<ReviewEvent[]>([])
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
  const done = index >= cards.length || timedOut

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
    const ratings = events.map((e) => ({ rating: e.rating, elapsedMs: e.elapsedMs }))
    void finalizeSession({
      startedAt,
      endedAt: endedAt ?? new Date().toISOString(),
      ratings,
      breakPromptedAt,
    })
  }, [done, events, cards.length, breakPromptedAt, endedAt, startedAt])

  function moveToIndex(nextIndex: number) {
    shownAt.current = Date.now()
    setFlipped(false)
    if (nextIndex >= cards.length && endedAt === null) {
      setEndedAt(new Date().toISOString())
    }
    setIndex(nextIndex)
  }

  function rate(rating: FsrsRating) {
    if (!current || pending || showBreak) return
    const now = Date.now()
    const elapsedMs = now - (shownAt.current ?? now)

    startTransition(async () => {
      const res = await submitRating({ cardId: current.id, rating, elapsedMs })
      if ('error' in res) {
        setError(res.error)
        return
      }

      setError(null)
      setLastInterval(res.intervalDays)
      window.setTimeout(() => setLastInterval(null), 2000)

      const nextEvents = [...events, { rating, elapsedMs, timestamp: now }]
      setEvents(nextEvents)

      const decision = observe(nextEvents, flags)

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

      moveToIndex(index + 1)
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || showBreak) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
        return
      }
      if (!flipped) return
      if (e.key === '1') rate(1)
      else if (e.key === '2') rate(2)
      else if (e.key === '3' || e.key === 'Enter') rate(3)
      else if (e.key === '4') rate(4)
      else if (e.key === 'Escape') moveToIndex(cards.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, done, showBreak, cards.length, pending]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) {
    return (
      <CueCard className="text-center space-y-3 shadow-card-rest">
        <h2 className="font-display text-xl font-bold">Nothing due right now</h2>
        <p className="text-sm opacity-70">Come back later or add more cards.</p>
        <CueButton onClick={() => router.push(`/deck/${deckId}`)}>Back to deck</CueButton>
      </CueCard>
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
          {timedOut && (
            <p className="text-xs text-ink-black/60">Timed out at 15 min - good focus.</p>
          )}
        </CueCard>

        <div className="flex flex-col items-center gap-3 w-full max-w-[440px]">
          <CueButton onClick={() => router.refresh()} className="w-full">
            Another sprint
          </CueButton>
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
            <CueButton className="w-full" onClick={() => setFlipped(true)}>
              Show answer (Space)
            </CueButton>
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
      <p className="text-xs text-center opacity-50">Esc to end early</p>
    </div>
  )
}
