import type { SprintCard } from './types'
import { createClient } from '@/lib/db/server'
import { buildHintFromBack } from '@/lib/cards/hints'

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

export function buildSprintFromCards(cards: SprintCard[], now: Date, size: number): SprintCard[] {
  return buildSprintFromCardsWithFilter(cards, now, size)
}

export function buildSprintFromCardsWithFilter(
  cards: SprintCard[],
  now: Date,
  size: number,
  options?: { conceptTag?: string },
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
  return interleave(eligible.slice(0, size))
}

export async function buildSprint(args: {
  userId: string
  size: number
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
  const { data, error } = await query
  if (error) throw error
  const rows = ((data ?? []) as Array<Omit<SprintCard, 'hint'>>).map((card) => ({
    ...card,
    hint: buildHintFromBack(card.back.text),
  }))
  return buildSprintFromCardsWithFilter(rows, now, args.size, {
    conceptTag: args.conceptTag,
  })
}
