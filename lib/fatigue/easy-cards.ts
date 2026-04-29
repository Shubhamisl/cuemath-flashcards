'use server'

import { createClient } from '@/lib/db/server'
import { buildHintFromBack } from '@/lib/cards/hints'
import type { SprintCard } from '@/lib/queue/types'
import { textCardFormatSchema } from '@/lib/llm/types'

export async function fetchEasyCards(args: {
  deckId: string
  excludeIds: string[]
  n: number
}): Promise<SprintCard[]> {
  const { deckId, excludeIds, n } = args
  if (n <= 0) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('cards')
    .select('id, deck_id, format, concept_tag, front, back, fsrs_state, suspended, approved')
    .eq('user_id', user.id)
    .eq('deck_id', deckId)
    .eq('suspended', false)
    .eq('approved', true)
    .not('fsrs_state', 'is', null)
    .limit(200)
  if (error || !data) return []

  // Take the top-N most-stable reviewed cards that aren't already in the session.
  // We intentionally do NOT require stability > 30 — on early sprints no card
  // has that much stability yet, and inject-easy would never fire. Relative
  // "easier than what you just struggled on" is what matters for morale.
  const candidates = (data as Array<Omit<SprintCard, 'hint'>>)
    .map((card) => ({
      ...card,
      format: textCardFormatSchema.catch('qa').parse(card.format),
      hint: buildHintFromBack(card.back.text),
    }))
    .filter(
    (c) => !excludeIds.includes(c.id) && (c.fsrs_state?.stability ?? 0) > 0,
  )
  candidates.sort((a, b) => (b.fsrs_state?.stability ?? 0) - (a.fsrs_state?.stability ?? 0))
  return candidates.slice(0, n)
}
