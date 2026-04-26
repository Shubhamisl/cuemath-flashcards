import type { ReviewMode } from './mode'

type ReviewedCardLike = {
  concept_tag: string | null
  fsrs_state: {
    due?: string
    lapses?: number
  } | null
}

export type SessionPreview = {
  weakTags: string[]
  dueNowCount: number
  hasDueNow: boolean
  dueLaterToday: number
  dueTomorrow: number
  dueThisWeek: number
  hasUpcoming: boolean
  suggestedMode: ReviewMode
  suggestedReason: string
}

export function computeSessionPreview(cards: ReviewedCardLike[], now: Date): SessionPreview {
  const tagLapses: Record<string, number> = {}
  let dueNowCount = 0
  let dueLaterToday = 0
  let dueTomorrow = 0
  let dueThisWeek = 0

  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const tomorrowEnd = new Date(now)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)

  for (const card of cards) {
    const tag = card.concept_tag
    const state = card.fsrs_state
    const lapses = state?.lapses ?? 0
    if (tag && lapses > 0) {
      tagLapses[tag] = (tagLapses[tag] ?? 0) + lapses
    }

    if (!state?.due) {
      dueNowCount++
      continue
    }
    const due = new Date(state.due)
    if (isNaN(due.getTime())) continue
    if (due <= now) {
      dueNowCount++
      continue
    }

    if (due <= todayEnd) {
      dueLaterToday++
    } else if (due <= tomorrowEnd) {
      dueTomorrow++
    } else if (due <= weekEnd) {
      dueThisWeek++
    }
  }

  const weakTags = Object.entries(tagLapses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([tag]) => tag)

  const upcomingTotal = dueLaterToday + dueTomorrow + dueThisWeek
  const suggestedMode: ReviewMode =
    weakTags.length > 0 || upcomingTotal <= 5 ? 'quick' : 'standard'

  const suggestedReason =
    weakTags.length > 0
      ? 'A short cleanup pass is the fastest way to revisit weak concepts.'
      : upcomingTotal <= 5
        ? 'A light queue is a good fit for Quick 5.'
        : 'There is enough volume coming up to justify a full sprint.'

  return {
    weakTags,
    dueNowCount,
    hasDueNow: dueNowCount > 0,
    dueLaterToday,
    dueTomorrow,
    dueThisWeek,
    hasUpcoming: upcomingTotal > 0,
    suggestedMode,
    suggestedReason,
  }
}
