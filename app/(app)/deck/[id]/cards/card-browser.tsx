'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { approveAllCards, deleteCard, setCardApproved, updateCard } from './actions'
import { summarizeReviewGate } from '@/lib/decks/review-gate'
import type { TextCardFormat } from '@/lib/llm/types'

export type CardRow = {
  id: string
  format: TextCardFormat
  front: { text: string }
  back: { text: string }
  concept_tag: string | null
  suspended: boolean
  approved: boolean
  updated_at: string
}

function formatLabel(format: TextCardFormat): string {
  if (format === 'qa') return 'Q&A'
  if (format === 'cloze') return 'Cloze'
  return 'Worked example'
}

export function CardBrowser({
  deckId,
  deckStatus,
  initialCards,
}: {
  deckId: string
  deckStatus: string
  initialCards: CardRow[]
}) {
  const [cards, setCards] = useState<CardRow[]>(initialCards)
  const [editing, setEditing] = useState<string | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const summary = summarizeReviewGate(cards)

  function startEdit(card: CardRow) {
    setEditing(card.id)
    setEditFront(card.front.text)
    setEditBack(card.back.text)
    setEditError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditError(null)
  }

  function saveEdit(cardId: string) {
    startTransition(async () => {
      const res = await updateCard({ cardId, front: editFront, back: editBack })
      if ('error' in res) {
        setEditError(res.error)
        return
      }
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, front: { text: editFront.trim() }, back: { text: editBack.trim() } }
            : c,
        ),
      )
      setEditing(null)
      setEditError(null)
      router.refresh()
    })
  }

  function handleDelete(cardId: string) {
    if (!confirm('Delete this card? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteCard({ cardId })
      if ('error' in res) {
        alert(res.error)
        return
      }
      setCards((prev) => prev.filter((c) => c.id !== cardId))
      router.refresh()
    })
  }

  function toggleApproved(cardId: string, approved: boolean) {
    startTransition(async () => {
      const res = await setCardApproved({ cardId, approved })
      if ('error' in res) {
        alert(res.error)
        return
      }
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, approved } : card)),
      )
      router.refresh()
    })
  }

  function handleApproveAll() {
    startTransition(async () => {
      const res = await approveAllCards({ deckId })
      if ('error' in res) {
        alert(res.error)
        return
      }
      setCards((prev) =>
        prev.map((card) => (card.suspended ? card : { ...card, approved: true })),
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div
        data-testid="card-browser-toolbar"
        className="rounded-card border-2 border-ink-black bg-cue-yellow/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-card-rest"
      >
        <div className="space-y-1">
          <p className="font-display font-semibold text-sm text-ink-black">
            {summary.approvedCount} approved / {summary.reviewableCount} reviewable
          </p>
          <p className="text-xs text-ink-black/60">
            {summary.pendingCount > 0
              ? `${summary.pendingCount} card(s) still need approval before study starts.`
              : deckStatus === 'draft'
                ? 'All reviewable cards are approved. Mark the deck ready on the deck page.'
                : 'This deck is ready for review.'}
          </p>
        </div>
        {summary.pendingCount > 0 && (
          <CueButton
            size="sm"
            onClick={handleApproveAll}
            disabled={pending}
            aria-label="Approve all pending cards"
            className="w-full sm:w-auto"
          >
            {pending ? 'Working...' : 'Approve all'}
          </CueButton>
        )}
      </div>

      {cards.map((card, index) => (
        <CueCard
          key={card.id}
          data-testid={`card-row-${card.id}`}
          tone={card.approved ? 'mint' : 'cream'}
          className="motion-premium-list-item shadow-card-rest border-2 p-4 sm:p-5 space-y-4 hover:-translate-y-0.5 transition-transform"
        >
          {editing === card.id ? (
            /* Edit mode */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.08em] text-ink-black/50">
                  Front
                </label>
                <textarea
                  autoFocus
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  rows={2}
                  className="w-full rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.08em] text-ink-black/50">
                  Back
                </label>
                <textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  rows={3}
                  className="w-full rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow resize-none"
                />
              </div>
              {editError && <p className="text-sm text-red-700">{editError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
                >
                  Cancel
                </button>
                <CueButton
                  onClick={() => saveEdit(card.id)}
                  disabled={pending || !editFront.trim() || !editBack.trim()}
                  size="sm"
                >
                  {pending ? '...' : 'Save'}
                </CueButton>
              </div>
            </div>
          ) : (
            /* Read mode */
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-black/20 pb-3">
                <span className="rounded-input border border-ink-black bg-paper-white px-3 py-1 text-xs uppercase tracking-[0.08em] text-ink-black/70 font-display font-bold">
                  Card {String(index + 1).padStart(2, '0')}
                </span>
                <div
                  data-testid={`card-meta-${card.id}`}
                  className="flex flex-wrap items-center justify-start sm:justify-end gap-2"
                >
                  {card.concept_tag && (
                    <span className="rounded-full bg-paper-white px-3 py-1 text-xs text-ink-black/70 border border-ink-black/20">
                      {card.concept_tag}
                    </span>
                  )}
                  <span className="rounded-full bg-paper-white px-3 py-1 text-xs text-ink-black/70 border border-ink-black/20">
                    {formatLabel(card.format)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-display font-semibold border ${
                      card.approved
                        ? 'border-green-800/40 bg-mint-green text-green-800'
                        : 'border-amber-800/40 bg-cue-yellow text-amber-900'
                    }`}
                  >
                    {card.approved ? 'approved' : 'draft'}
                  </span>
                  {card.suspended && (
                    <span className="rounded-full border border-alert-coral/40 bg-alert-coral/10 px-3 py-1 text-xs text-alert-coral font-display font-semibold">
                      suspended
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2 rounded-card border border-ink-black/20 bg-paper-white/70 p-3">
                  <div className="text-xs uppercase tracking-[0.08em] text-ink-black/50 font-display font-semibold">
                    Front
                  </div>
                  <div className="text-sm font-body leading-relaxed text-ink-black">{card.front.text}</div>
                </div>
                <div className="space-y-2 rounded-card border border-ink-black/20 bg-paper-white/70 p-3">
                  <div className="text-xs uppercase tracking-[0.08em] text-ink-black/50 font-display font-semibold">
                    Back
                  </div>
                  <div className="text-sm font-body leading-relaxed text-ink-black">{card.back.text}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleApproved(card.id, !card.approved)}
                    disabled={pending || card.suspended}
                    className="min-h-[36px] rounded-input border border-ink-black bg-paper-white px-3 py-1.5 text-xs font-display font-semibold text-ink-black hover:bg-cue-yellow/30 disabled:opacity-50"
                  >
                    {card.approved ? 'Unapprove' : 'Approve'}
                  </button>
                  <button
                    onClick={() => startEdit(card)}
                    className="min-h-[36px] rounded-input border border-ink-black bg-paper-white px-3 py-1.5 text-xs font-display font-semibold text-ink-black hover:bg-soft-cream"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    disabled={pending}
                    className="min-h-[36px] rounded-input border border-alert-coral bg-paper-white px-3 py-1.5 text-xs font-display font-semibold text-alert-coral hover:bg-alert-coral/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </CueCard>
      ))}
    </div>
  )
}
