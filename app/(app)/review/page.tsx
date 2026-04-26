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
  searchParams: Promise<{ deck?: string; mode?: string; run?: string; concept?: string }>
}) {
  const { deck: deckId, mode: rawMode, run, concept: rawConcept } = await searchParams
  const conceptTag = rawConcept?.trim() || undefined
  const mode = parseReviewMode(rawMode)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let title = conceptTag ?? 'Review'
  let subject: subjectFamily | undefined
  let backHref = '/library'
  let sessionDeckId: string | undefined = deckId
  let previewScope:
    | {
        deckId?: string
        conceptTag?: string
      }
    | undefined
  let cards = [] as Awaited<ReturnType<typeof buildSprint>>

  if (deckId) {
    const { data: deck } = await supabase
      .from('decks')
      .select('id, title, subject_family, status')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single()
    if (!deck) redirect('/library')
    if (deck.status !== 'ready') redirect(`/deck/${deckId}?review=blocked`)

    title = conceptTag ? `${deck.title}: ${conceptTag}` : deck.title
    subject = deck.subject_family as subjectFamily
    backHref = `/deck/${deckId}`
    previewScope = { deckId, conceptTag }
    cards = await buildSprint({
      userId: user.id,
      deckId,
      conceptTag,
      mode,
      size: sprintSizeForMode(mode),
    })
  } else {
    const { data: readyDecks } = await supabase
      .from('decks')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'ready')
    const readyDeckIds = (readyDecks ?? []).map((deck) => deck.id as string)
    title = conceptTag ?? 'All decks'
    backHref = conceptTag ? '/progress' : '/library'
    sessionDeckId = undefined
    previewScope = { conceptTag }
    cards = await buildSprint({
      userId: user.id,
      conceptTag,
      readyDeckIds,
      mode,
      size: sprintSizeForMode(mode),
    })
  }

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
            {conceptTag && !deckId ? `Focused drill - ${labelForMode(mode)}` : labelForMode(mode)}
          </p>
          <h1 className="font-display text-lg font-bold truncate">{title}</h1>
        </div>
        <span className="text-sm opacity-60">{cards.length} cards</span>
      </header>
      <ReviewSession
        key={`${deckId ?? `concept:${conceptTag ?? 'all'}`}:${mode}:${run ?? 'base'}`}
        cards={cards}
        subject={subject}
        deckId={sessionDeckId}
        conceptTag={conceptTag}
        previewScope={previewScope}
        backHref={backHref}
        startedAt={new Date().toISOString()}
        mode={mode}
      />
    </main>
  )
}
