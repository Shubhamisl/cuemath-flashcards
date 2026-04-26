import { describe, expect, it } from 'vitest'
import {
  canMarkDeckReady,
  getReviewBlockReason,
  shouldDeckReturnToDraft,
  summarizeReviewGate,
} from './review-gate'

describe('decks/review-gate', () => {
  it('counts pending approvals only on unsuspended cards', () => {
    const summary = summarizeReviewGate([
      { approved: true, suspended: false },
      { approved: false, suspended: false },
      { approved: false, suspended: true },
    ])

    expect(summary).toEqual({
      totalCount: 3,
      reviewableCount: 2,
      approvedCount: 1,
      pendingCount: 1,
    })
  })

  it('allows marking a draft deck ready only when every reviewable card is approved', () => {
    expect(
      canMarkDeckReady(
        'draft',
        summarizeReviewGate([
          { approved: true, suspended: false },
          { approved: true, suspended: false },
        ]),
      ),
    ).toBe(true)

    expect(
      canMarkDeckReady(
        'draft',
        summarizeReviewGate([
          { approved: true, suspended: false },
          { approved: false, suspended: false },
        ]),
      ),
    ).toBe(false)
  })

  it('rejects non-draft decks and empty reviewable decks', () => {
    expect(
      canMarkDeckReady(
        'ready',
        summarizeReviewGate([{ approved: true, suspended: false }]),
      ),
    ).toBe(false)

    expect(
      canMarkDeckReady(
        'draft',
        summarizeReviewGate([{ approved: false, suspended: true }]),
      ),
    ).toBe(false)
  })

  it('returns ready decks to draft when the gate no longer passes', () => {
    expect(
      shouldDeckReturnToDraft(
        'ready',
        summarizeReviewGate([
          { approved: true, suspended: false },
          { approved: false, suspended: false },
        ]),
      ),
    ).toBe(true)

    expect(
      shouldDeckReturnToDraft(
        'ready',
        summarizeReviewGate([
          { approved: true, suspended: false },
          { approved: true, suspended: false },
        ]),
      ),
    ).toBe(false)
  })

  it('explains why a card cannot be reviewed yet', () => {
    expect(getReviewBlockReason({ deckStatus: 'draft', approved: true })).toBe(
      'Finish deck review before starting a sprint.',
    )
    expect(getReviewBlockReason({ deckStatus: 'ready', approved: false })).toBe(
      'Approve this card before reviewing it.',
    )
    expect(getReviewBlockReason({ deckStatus: 'ready', approved: true })).toBeNull()
  })
})
