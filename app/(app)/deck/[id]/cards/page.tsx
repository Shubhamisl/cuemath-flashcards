import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db/server'
import { CardBrowser } from './card-browser'

export default async function CardsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!deck) notFound()

  const { data: cards } = await supabase
    .from('cards')
    .select('id, front, back, concept_tag, suspended, approved, updated_at')
    .eq('deck_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const rows = (cards ?? []) as Array<{
    id: string
    front: { text: string }
    back: { text: string }
    concept_tag: string | null
    suspended: boolean
    approved: boolean
    updated_at: string
  }>
  const browserKey = `${deck.status}:${rows.map((card) => `${card.id}:${card.updated_at}`).join('|')}`

  return (
    <main className="min-h-screen">
      <div className="max-w-[900px] mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link
            href={`/deck/${id}`}
            className="text-sm font-body text-ink-black/60 hover:text-ink-black"
          >
            ← {deck.title}
          </Link>
          <h1 className="font-display font-extrabold text-2xl">
            {rows.length} {rows.length === 1 ? 'card' : 'cards'}
          </h1>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-ink-black/20 p-12 text-center space-y-2">
            <p className="text-sm text-ink-black/70">No cards yet.</p>
          </div>
        ) : (
          <CardBrowser key={browserKey} deckId={id} deckStatus={deck.status} initialCards={rows} />
        )}
      </div>
    </main>
  )
}
