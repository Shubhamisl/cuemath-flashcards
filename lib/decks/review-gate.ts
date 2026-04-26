export type ReviewGateCard = {
  approved: boolean
  suspended: boolean
}

export type ReviewGateSummary = {
  totalCount: number
  reviewableCount: number
  approvedCount: number
  pendingCount: number
}

function passesReviewGate(summary: ReviewGateSummary): boolean {
  if (summary.reviewableCount === 0) return false
  return summary.pendingCount === 0
}

export function summarizeReviewGate(cards: ReviewGateCard[]): ReviewGateSummary {
  const reviewable = cards.filter((card) => !card.suspended)
  const approved = reviewable.filter((card) => card.approved)

  return {
    totalCount: cards.length,
    reviewableCount: reviewable.length,
    approvedCount: approved.length,
    pendingCount: reviewable.length - approved.length,
  }
}

export function canMarkDeckReady(status: string, summary: ReviewGateSummary): boolean {
  if (status !== 'draft') return false
  return passesReviewGate(summary)
}

export function shouldDeckReturnToDraft(status: string, summary: ReviewGateSummary): boolean {
  if (status !== 'ready') return false
  return !passesReviewGate(summary)
}

export function getReviewBlockReason(args: {
  deckStatus: string
  approved: boolean
}): string | null {
  if (!args.approved) return 'Approve this card before reviewing it.'
  if (args.deckStatus !== 'ready') return 'Finish deck review before starting a sprint.'
  return null
}
