import { createClient } from '@/lib/db/server'
import { buildDeckCsv, cardTextFromContent, deckCsvFilename } from '@/lib/export/csv'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family, tags')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!deck) {
    return new Response('Not found', { status: 404 })
  }

  const { data: cards, error } = await supabase
    .from('cards')
    .select('concept_tag, front, back, approved, suspended')
    .eq('deck_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const csv = buildDeckCsv({
    title: deck.title,
    subjectFamily: deck.subject_family,
    tags: (deck.tags ?? []) as string[],
    cards: (cards ?? []).map((card) => ({
      conceptTag: card.concept_tag,
      frontText: cardTextFromContent(card.front),
      backText: cardTextFromContent(card.back),
      approved: card.approved,
      suspended: card.suspended,
    })),
  })

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${deckCsvFilename(deck.title)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
