import { computeDeckStats, type StatCard, type Tier } from './deck-stats'
import { computeStreak } from './streak'
import type { subjectFamily } from '@/lib/brand/tokens'

type ProgressCard = StatCard & {
  deck_id: string
  concept_tag: string | null
  approved: boolean
  fsrs_state: {
    due?: string
    stability?: number
    lapses?: number
  } | null
}

type ProgressDeck = {
  id: string
  title: string
  status: string
  subject_family: string
  card_count: number
}

type ProgressSession = {
  id: string
  started_at: string
  cards_reviewed: number | null
  mean_accuracy: number | null
  mean_response_ms: number | null
  mode: string | null
}

export type ProgressSummary = {
  totalCards: number
  activeCards: number
  dueNowCount: number
  masteryPct: number
  retentionPct: number | null
  streak: number
  cardsReviewed7d: number
  sessions7d: number
  avgResponseMs: number | null
}

export type ProgressActivityDay = {
  isoDate: string
  label: string
  cardsReviewed: number
  sessions: number
}

export type ProgressHeatmapDay = {
  isoDate: string
  cardsReviewed: number
  sessions: number
  level: 0 | 1 | 2 | 3 | 4
}

export type WeeklySummary = {
  cardsReviewed: number
  sessions: number
  retentionPct: number | null
  avgResponseMs: number | null
  activeDays: number
  strongestDayLabel: string | null
  cardsDeltaVsPreviousWeek: number | null
}

export type WeakConcept = {
  tag: string
  lapses: number
  dueNowCount: number
}

export type RecentSession = {
  id: string
  startedAt: string
  cardsReviewed: number
  accuracyPct: number | null
  meanResponseMs: number | null
  modeLabel: string
}

export type DeckSnapshot = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: string
  cardCount: number
  tier: Tier
  masteryPct: number
  dueCount: number
}

export type ProgressDashboard = {
  summary: ProgressSummary
  weeklySummary: WeeklySummary
  activity: ProgressActivityDay[]
  heatmap: ProgressHeatmapDay[]
  weakConcepts: WeakConcept[]
  recentSessions: RecentSession[]
  deckSnapshots: DeckSnapshot[]
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isDueNow(card: ProgressCard, now: Date): boolean {
  if (card.suspended || !card.approved) return false
  if (!card.fsrs_state?.due) return true
  return new Date(card.fsrs_state.due).getTime() <= now.getTime()
}

function modeLabel(mode: string | null): string {
  return mode === 'quick' ? 'Quick 5' : 'Sprint'
}

function avgResponseForSessions(sessions: ProgressSession[]): number | null {
  const denominator = sessions.reduce(
    (sum, session) => sum + (session.cards_reviewed ?? 0),
    0,
  )
  if (denominator === 0) return null
  const numerator = sessions.reduce((sum, session) => {
    if (session.mean_response_ms === null || session.cards_reviewed === null) return sum
    return sum + session.mean_response_ms * session.cards_reviewed
  }, 0)
  return Math.round(numerator / denominator)
}

function retentionForSessions(sessions: ProgressSession[]): number | null {
  const denominator = sessions.reduce(
    (sum, session) => sum + (session.cards_reviewed ?? 0),
    0,
  )
  if (denominator === 0) return null
  const numerator = sessions.reduce((sum, session) => {
    if (session.mean_accuracy === null || session.cards_reviewed === null) return sum
    return sum + session.mean_accuracy * session.cards_reviewed
  }, 0)
  return Math.round((numerator / denominator) * 100)
}

export function computeProgressDashboard(args: {
  cards: ProgressCard[]
  decks: ProgressDeck[]
  sessions: ProgressSession[]
  now: Date
}): ProgressDashboard {
  const { cards, decks, sessions, now } = args
  const approvedCards = cards.filter((card) => card.approved)
  const activeApprovedCards = approvedCards.filter((card) => !card.suspended)
  const deckStats = computeDeckStats(
    activeApprovedCards.map((card) => ({
      fsrs_state: card.fsrs_state,
      suspended: card.suspended,
    })),
    now,
  )

  const sevenDayStart = startOfUtcDay(now)
  sevenDayStart.setUTCDate(sevenDayStart.getUTCDate() - 6)
  const currentWeekStart = startOfUtcDay(now)
  const dayOfWeek = currentWeekStart.getUTCDay()
  const mondayOffset = (dayOfWeek + 6) % 7
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - mondayOffset)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)
  const heatmapStart = new Date(currentWeekStart)
  heatmapStart.setUTCDate(heatmapStart.getUTCDate() - 77)

  const sessions7d = sessions.filter(
    (session) => new Date(session.started_at).getTime() >= sevenDayStart.getTime(),
  )
  const currentWeekSessions = sessions.filter((session) => {
    const ts = new Date(session.started_at).getTime()
    return ts >= currentWeekStart.getTime()
  })
  const previousWeekSessions = sessions.filter((session) => {
    const ts = new Date(session.started_at).getTime()
    return ts >= previousWeekStart.getTime() && ts < currentWeekStart.getTime()
  })

  const cardsReviewed7d = sessions7d.reduce(
    (sum, session) => sum + (session.cards_reviewed ?? 0),
    0,
  )

  const retentionPct = retentionForSessions(sessions)
  const avgResponseMs = avgResponseForSessions(sessions)

  const activityMap = new Map<string, ProgressActivityDay>()
  for (let i = 0; i <= 6; i += 1) {
    const day = new Date(sevenDayStart)
    day.setUTCDate(sevenDayStart.getUTCDate() + i)
    const key = isoDay(day)
    activityMap.set(key, {
      isoDate: key,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      cardsReviewed: 0,
      sessions: 0,
    })
  }

  for (const session of sessions7d) {
    const key = isoDay(new Date(session.started_at))
    const existing = activityMap.get(key)
    if (!existing) continue
    existing.cardsReviewed += session.cards_reviewed ?? 0
    existing.sessions += 1
  }

  const heatmapMap = new Map<string, ProgressHeatmapDay>()
  for (let i = 0; i < 84; i += 1) {
    const day = new Date(heatmapStart)
    day.setUTCDate(heatmapStart.getUTCDate() + i)
    const key = isoDay(day)
    heatmapMap.set(key, {
      isoDate: key,
      cardsReviewed: 0,
      sessions: 0,
      level: 0,
    })
  }
  for (const session of sessions) {
    const key = isoDay(new Date(session.started_at))
    const existing = heatmapMap.get(key)
    if (!existing) continue
    existing.cardsReviewed += session.cards_reviewed ?? 0
    existing.sessions += 1
  }
  const heatmapValues = Array.from(heatmapMap.values())
  const maxHeat = Math.max(...heatmapValues.map((day) => day.cardsReviewed), 0)
  for (const day of heatmapValues) {
    if (day.cardsReviewed === 0 || maxHeat === 0) {
      day.level = 0
    } else {
      const ratio = day.cardsReviewed / maxHeat
      day.level =
        ratio >= 0.75 ? 4 :
        ratio >= 0.5 ? 3 :
        ratio >= 0.25 ? 2 :
        1
    }
  }

  const currentWeekCards = currentWeekSessions.reduce(
    (sum, session) => sum + (session.cards_reviewed ?? 0),
    0,
  )
  const previousWeekCards = previousWeekSessions.reduce(
    (sum, session) => sum + (session.cards_reviewed ?? 0),
    0,
  )
  const strongestDay = [...activityMap.values()].sort((a, b) => {
    if (b.cardsReviewed !== a.cardsReviewed) return b.cardsReviewed - a.cardsReviewed
    return a.isoDate.localeCompare(b.isoDate)
  })[0]

  const weakConceptMap = new Map<string, WeakConcept>()
  for (const card of activeApprovedCards) {
    if (!card.concept_tag) continue
    const lapses = card.fsrs_state?.lapses ?? 0
    if (lapses === 0) continue
    const entry = weakConceptMap.get(card.concept_tag) ?? {
      tag: card.concept_tag,
      lapses: 0,
      dueNowCount: 0,
    }
    entry.lapses += lapses
    if (isDueNow(card, now)) {
      entry.dueNowCount += 1
    }
    weakConceptMap.set(card.concept_tag, entry)
  }

  const cardsByDeck = new Map<string, ProgressCard[]>()
  for (const card of activeApprovedCards) {
    const group = cardsByDeck.get(card.deck_id) ?? []
    group.push(card)
    cardsByDeck.set(card.deck_id, group)
  }

  const deckSnapshots = decks
    .filter((deck) => deck.status === 'ready')
    .map((deck) => {
      const group = cardsByDeck.get(deck.id) ?? []
      const stats = computeDeckStats(
        group.map((card) => ({
          fsrs_state: card.fsrs_state,
          suspended: card.suspended,
        })),
        now,
      )
      return {
        id: deck.id,
        title: deck.title,
        subjectFamily: deck.subject_family as subjectFamily,
        status: deck.status,
        cardCount: deck.card_count,
        tier: stats.tier,
        masteryPct: stats.masteryPct,
        dueCount: stats.dueCount,
      }
    })
    .sort((a, b) => {
      if (b.dueCount !== a.dueCount) return b.dueCount - a.dueCount
      if (a.masteryPct !== b.masteryPct) return a.masteryPct - b.masteryPct
      return a.title.localeCompare(b.title)
    })

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 6)
    .map((session) => ({
      id: session.id,
      startedAt: session.started_at,
      cardsReviewed: session.cards_reviewed ?? 0,
      accuracyPct:
        session.mean_accuracy === null ? null : Math.round(session.mean_accuracy * 100),
      meanResponseMs: session.mean_response_ms ?? null,
      modeLabel: modeLabel(session.mode),
    }))

  return {
    summary: {
      totalCards: cards.length,
      activeCards: deckStats.activeCount,
      dueNowCount: deckStats.dueCount,
      masteryPct: deckStats.masteryPct,
      retentionPct,
      streak: computeStreak(
        sessions.map((session) => session.started_at),
        now,
      ),
      cardsReviewed7d,
      sessions7d: sessions7d.length,
      avgResponseMs,
    },
    weeklySummary: {
      cardsReviewed: currentWeekCards,
      sessions: currentWeekSessions.length,
      retentionPct: retentionForSessions(currentWeekSessions),
      avgResponseMs: avgResponseForSessions(currentWeekSessions),
      activeDays: [...activityMap.values()].filter((day) => day.cardsReviewed > 0).length,
      strongestDayLabel: strongestDay && strongestDay.cardsReviewed > 0 ? strongestDay.label : null,
      cardsDeltaVsPreviousWeek:
        previousWeekCards === 0 ? null : currentWeekCards - previousWeekCards,
    },
    activity: Array.from(activityMap.values()),
    heatmap: heatmapValues,
    weakConcepts: Array.from(weakConceptMap.values())
      .sort((a, b) => {
        if (b.lapses !== a.lapses) return b.lapses - a.lapses
        if (b.dueNowCount !== a.dueNowCount) return b.dueNowCount - a.dueNowCount
        return a.tag.localeCompare(b.tag)
      })
      .slice(0, 5),
    recentSessions,
    deckSnapshots,
  }
}
