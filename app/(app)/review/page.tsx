import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { buildSprint } from '@/lib/queue/build-sprint'
import { ReviewSession } from './review-session'
import type { subjectFamily } from '@/lib/brand/tokens'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>
}) {
  const { deck: deckId } = await searchParams
  if (!deckId) redirect('/library')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) redirect('/library')

  const cards = await buildSprint({ userId: user.id, deckId, size: 20 })

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold truncate">{deck.title}</h1>
        <span className="text-sm opacity-60">{cards.length} cards</span>
      </header>
      <ReviewSession cards={cards} subject={deck.subject_family as subjectFamily} deckId={deckId} />
    </main>
  )
}
