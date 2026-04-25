export type StatCard = {
  fsrs_state: { due?: string; stability?: number } | null
  suspended: boolean
}

export type Tier = 'Curious' | 'Practicing' | 'Confident' | 'SharpMind'

export type DeckStats = {
  tier: Tier
  masteryPct: number
  dueCount: number
  activeCount: number
}

const MASTERY_STABILITY_DAYS = 30

function tierFor(meanStability: number): Tier {
  if (meanStability < 7) return 'Curious'
  if (meanStability < 21) return 'Practicing'
  if (meanStability < 60) return 'Confident'
  return 'SharpMind'
}

export function computeDeckStats(cards: StatCard[], now: Date): DeckStats {
  const active = cards.filter((c) => !c.suspended)
  if (active.length === 0) {
    return { tier: 'Curious', masteryPct: 0, dueCount: 0, activeCount: 0 }
  }

  const nowMs = now.getTime()
  const dueCount = active.filter((c) => {
    if (!c.fsrs_state?.due) return true
    return new Date(c.fsrs_state.due).getTime() <= nowMs
  }).length

  // Continuous mastery: each card contributes min(stability, 30) / 30.
  // A card at stability=30+ is fully "mastered" (1.0); stability=0 contributes 0.
  // Average across active cards → 0–100%, moves on every review.
  const masterySum = active.reduce((sum, c) => {
    const s = Math.min(c.fsrs_state?.stability ?? 0, MASTERY_STABILITY_DAYS)
    return sum + s / MASTERY_STABILITY_DAYS
  }, 0)
  const masteryPct = Math.round((masterySum / active.length) * 100)

  const stabilities = active
    .map((c) => c.fsrs_state?.stability ?? 0)
    .filter((s) => s > 0)
  const meanStability =
    stabilities.length > 0 ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0

  return {
    tier: tierFor(meanStability),
    masteryPct,
    dueCount,
    activeCount: active.length,
  }
}
