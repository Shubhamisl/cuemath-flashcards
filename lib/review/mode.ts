export type ReviewMode = 'standard' | 'quick'

export function parseReviewMode(raw: string | undefined): ReviewMode {
  return raw === 'quick' ? 'quick' : 'standard'
}

export function sprintSizeForMode(mode: ReviewMode): number {
  return mode === 'quick' ? 5 : 20
}

export function labelForMode(mode: ReviewMode): string {
  return mode === 'quick' ? 'Quick 5' : 'Sprint'
}
