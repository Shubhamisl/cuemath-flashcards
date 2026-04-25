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
}: {
  cards: SprintCard[]
  subject?: subjectFamily
  deckId: string
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
  const shownAt = useRef<number>(Date.now())
  const startedAt = useRef<string>(new Date().toISOString())
  const finalized = useRef(false)

  const current = cards[index]
  const timedOut = Date.now() - new Date(startedAt.current).getTime() >= SPRINT_MS_CAP
  const done = index >= cards.length || timedOut

  useEffect(() => {
    shownAt.current = Date.now()
    setFlipped(false)
  }, [index])

  useEffect(() => {
    if (!done || finalized.current || cards.length === 0) return
    finalized.current = true
    const ratings = events.map((e) => ({ rating: e.rating, elapsedMs: e.elapsedMs }))
    void finalizeSession({
      startedAt: startedAt.current,
      endedAt: new Date().toISOString(),
      ratings,
      breakPromptedAt,
    })
  }, [done, events, cards.length, breakPromptedAt])

  function rate(rating: FsrsRating) {
    if (!current || pending || showBreak) return
    const elapsedMs = Date.now() - shownAt.current
    startTransition(async () => {
      const res = await submitRating({ cardId: current.id, rating, elapsedMs })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      const nextEvents = [...events, { rating, elapsedMs, timestamp: Date.now() }]
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
          setEasyNote(`Here's an easy one — keep your rhythm.`)
          setTimeout(() => setEasyNote(null), 2500)
        }
        setIndex((i) => i + 1)
        return
      }

      if (decision.action === 'prompt_break') {
        setFlags((f) => ({ ...f, promptedBreak: true }))
        setBreakPromptedAt(new Date().toISOString())
        setShowBreak(true)
        setIndex((i) => i + 1)
        return
      }

      setIndex((i) => i + 1)
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
      else if (e.key === 'Escape') setIndex(cards.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, done, showBreak, cards.length, pending]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) {
    return (
      <CueCard className="text-center space-y-3">
        <h2 className="font-display text-xl font-bold">Nothing due right now</h2>
        <p className="text-sm opacity-70">Come back later or add more cards.</p>
        <CueButton onClick={() => router.push(`/deck/${deckId}`)}>Back to deck</CueButton>
      </CueCard>
    )
  }

  if (done) {
    const got = events.filter((e) => e.rating >= 3).length
    return (
      <CueCard className="text-center space-y-4" style={{ background: 'var(--mint-green)' }}>
        <h2 className="font-display text-2xl font-bold">Nice sprint.</h2>
        <p className="text-base">{got} remembered out of {events.length}.</p>
        {timedOut && <p className="text-xs opacity-70">Timed out at 15 min — good focus.</p>}
        <div className="flex gap-2 justify-center">
          <CueButton onClick={() => router.refresh()}>Another sprint</CueButton>
          <CueButton variant="ghost" onClick={() => router.push(`/deck/${deckId}`)}>
            Done for today
          </CueButton>
        </div>
      </CueCard>
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
        </>
      )}

      {easyNote && (
        <p className="text-sm text-center" style={{ color: 'var(--ink-black)' }}>
          ✨ {easyNote}
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-center opacity-50">Esc to end early</p>
    </div>
  )
}
