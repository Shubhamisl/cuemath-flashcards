import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { buildSprint } from '@/lib/queue/build-sprint'
import { ReviewSession } from './review-session'
import type { subjectFamily } from '@/lib/brand/tokens'
import { labelForMode, parseReviewMode, sprintSizeForMode } from '@/lib/review/mode'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; mode?: string; run?: string }>
}) {
  const { deck: deckId, mode: rawMode, run } = await searchParams
  if (!deckId) redirect('/library')
  const mode = parseReviewMode(rawMode)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family, status')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) redirect('/library')
  if (deck.status !== 'ready') redirect(`/deck/${deckId}?review=blocked`)

  const cards = await buildSprint({ userId: user.id, deckId, size: sprintSizeForMode(mode) })

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
            {labelForMode(mode)}
          </p>
          <h1 className="font-display text-lg font-bold truncate">{deck.title}</h1>
        </div>
        <span className="text-sm opacity-60">{cards.length} cards</span>
      </header>
      <ReviewSession
        key={`${deckId}:${mode}:${run ?? 'base'}`}
        cards={cards}
        subject={deck.subject_family as subjectFamily}
        deckId={deckId}
        startedAt={new Date().toISOString()}
        mode={mode}
      />
    </main>
  )
}
