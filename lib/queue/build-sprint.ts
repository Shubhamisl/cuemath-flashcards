import type { SprintCard } from './types'
import { createClient } from '@/lib/db/server'
import { buildHintFromBack } from '@/lib/cards/hints'

const DEFAULT_GLOBAL_NEW_CARD_CAP = 10
const DEFAULT_PER_DECK_NEW_CARD_CAP = 5

type NewCardBudget = {
  remainingGlobal: number
  remainingByDeck: Record<string, number>
}

type StructureMode = 'standard' | 'quick'

function isDue(c: SprintCard, now: Date): boolean {
  if (c.suspended) return false
  if (!c.approved) return false
  if (!c.fsrs_state) return true
  return new Date(c.fsrs_state.due).getTime() <= now.getTime()
}

function priority(c: SprintCard, now: Date): number {
  if (!c.fsrs_state) return Number.POSITIVE_INFINITY
  const stabilityDays = Math.max(c.fsrs_state.stability, 1)
  const dueMs = new Date(c.fsrs_state.due).getTime()
  const overdueMs = Math.max(0, now.getTime() - dueMs)
  const overdueRatio = Math.max(1, overdueMs / (stabilityDays * 86400000))
  return overdueRatio * (1 / stabilityDays)
}

function interleave(cards: SprintCard[]): SprintCard[] {
  const out: SprintCard[] = []
  const pool = [...cards]
  while (pool.length) {
    const prevTag = out.length ? out[out.length - 1].concept_tag : null
    let idx = pool.findIndex((c) => c.concept_tag !== prevTag)
    if (idx === -1) idx = 0
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

function reviewEaseScore(card: SprintCard): number {
  if (!card.fsrs_state) return Number.NEGATIVE_INFINITY
  return (
    card.fsrs_state.stability * 100 -
    card.fsrs_state.difficulty * 10 -
    card.fsrs_state.lapses * 5
  )
}

function applyWarmupCooldownStructure(cards: SprintCard[], mode: StructureMode): SprintCard[] {
  if (mode !== 'standard' || cards.length < 6) {
    return cards
  }

  const reviewCards = cards
    .filter((card) => card.fsrs_state !== null)
    .sort((a, b) => {
      const scoreDiff = reviewEaseScore(b) - reviewEaseScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return a.id.localeCompare(b.id)
    })

  if (reviewCards.length < 2) {
    return cards
  }

  const warmup = reviewCards[0]
  const cooldown = reviewCards[1]
  const middle = cards.filter((card) => card.id !== warmup.id && card.id !== cooldown.id)
  return [warmup, ...middle, cooldown]
}

function computeGlobalNewCardCap(dailyGoalCards: number): number {
  return Math.max(1, Math.min(dailyGoalCards, DEFAULT_GLOBAL_NEW_CARD_CAP))
}

function isInitialFsrsState(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const state = value as { state?: number; reps?: number }
  return state.state === 0 && state.reps === 0
}

export function buildSprintFromCards(cards: SprintCard[], now: Date, size: number): SprintCard[] {
  return buildSprintFromCardsWithFilter(cards, now, size)
}

export function buildSprintFromCardsWithFilter(
  cards: SprintCard[],
  now: Date,
  size: number,
  options?: {
    conceptTag?: string
    newCardBudget?: NewCardBudget
    structureMode?: StructureMode
  },
): SprintCard[] {
  const eligible = cards.filter((c) => {
    if (!isDue(c, now)) return false
    if (options?.conceptTag && c.concept_tag !== options.conceptTag) return false
    return true
  })
  eligible.sort((a, b) => {
    const pb = priority(b, now)
    const pa = priority(a, now)
    if (pb !== pa) return pb - pa
    return a.id.localeCompare(b.id)
  })
  const budget = options?.newCardBudget
    ? {
        remainingGlobal: options.newCardBudget.remainingGlobal,
        remainingByDeck: { ...options.newCardBudget.remainingByDeck },
      }
    : null

  const selected: SprintCard[] = []
  for (const card of eligible) {
    if (selected.length >= size) break
    if (card.fsrs_state !== null || !budget) {
      selected.push(card)
      continue
    }
    const remainingForDeck = budget.remainingByDeck[card.deck_id] ?? 0
    if (budget.remainingGlobal <= 0 || remainingForDeck <= 0) {
      continue
    }
    budget.remainingGlobal -= 1
    budget.remainingByDeck[card.deck_id] = remainingForDeck - 1
    selected.push(card)
  }

  return applyWarmupCooldownStructure(
    interleave(selected),
    options?.structureMode ?? 'quick',
  )
}

export async function buildSprint(args: {
  userId: string
  size: number
  mode?: StructureMode
  deckId?: string
  conceptTag?: string
  readyDeckIds?: string[]
  now?: Date
}): Promise<SprintCard[]> {
  const now = args.now ?? new Date()
  if (!args.deckId && args.readyDeckIds && args.readyDeckIds.length === 0) {
    return []
  }
  const supabase = await createClient()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  let query = supabase
    .from('cards')
    .select('id, deck_id, concept_tag, front, back, fsrs_state, suspended, approved')
    .eq('user_id', args.userId)
    .eq('suspended', false)
    .eq('approved', true)
    .limit(500)
  if (args.deckId) {
    query = query.eq('deck_id', args.deckId)
  } else if (args.readyDeckIds) {
    query = query.in('deck_id', args.readyDeckIds)
  }
  if (args.conceptTag) {
    query = query.eq('concept_tag', args.conceptTag)
  }
  const [{ data, error }, { data: profile }, { data: todayReviews, error: reviewsError }] = await Promise.all([
    query,
    supabase
      .from('profiles')
      .select('daily_goal_cards')
      .eq('user_id', args.userId)
      .single(),
    supabase
      .from('reviews')
      .select('card_id, fsrs_state_before')
      .eq('user_id', args.userId)
      .gte('rated_at', todayStart.toISOString()),
  ])
  if (error) throw error
  if (reviewsError) throw reviewsError
  const rows = ((data ?? []) as Array<Omit<SprintCard, 'hint'>>).map((card) => ({
    ...card,
    hint: buildHintFromBack(card.back.text),
  }))
  const globalCap = computeGlobalNewCardCap(profile?.daily_goal_cards ?? 20)
  const reviewedNewIds = new Set(
    (todayReviews ?? [])
      .filter((review) => isInitialFsrsState(review.fsrs_state_before))
      .map((review) => review.card_id as string),
  )
  const remainingByDeck: Record<string, number> = {}
  for (const row of rows) {
    if (!(row.deck_id in remainingByDeck)) {
      remainingByDeck[row.deck_id] = Math.min(DEFAULT_PER_DECK_NEW_CARD_CAP, globalCap)
    }
  }
  for (const row of rows) {
    if (!reviewedNewIds.has(row.id)) continue
    remainingByDeck[row.deck_id] = Math.max(0, (remainingByDeck[row.deck_id] ?? 0) - 1)
  }

  return buildSprintFromCardsWithFilter(rows, now, args.size, {
    conceptTag: args.conceptTag,
    newCardBudget: {
      remainingGlobal: Math.max(0, globalCap - reviewedNewIds.size),
      remainingByDeck,
    },
    structureMode: args.mode ?? 'quick',
  })
}
