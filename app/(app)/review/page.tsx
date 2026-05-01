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
    <main className="mx-auto max-w-[760px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="cue-hard-panel motion-premium-reveal overflow-hidden bg-paper-white">
        <div className="flex flex-col gap-4 border-b border-ink-black bg-soft-cream px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 space-y-1">
            <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
              Review sprint
            </p>
            <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-[28px] truncate">
              {title}
            </h1>
          </div>
          <span className="w-fit border border-ink-black bg-cue-yellow px-3 py-2 text-xs font-display font-bold uppercase tracking-[0.06em]">
            {cards.length} card{cards.length === 1 ? '' : 's'} ready
          </span>
        </div>
        <div className="grid grid-cols-1 divide-y divide-ink-black text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/50">
              Mode
            </p>
            <p className="font-display font-bold">{labelForMode(mode)} mode</p>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/50">
              Scope
            </p>
            <p className="font-display font-bold truncate">
              {deckId ? 'Deck drill' : conceptTag ? 'Focused drill' : 'All ready decks'}
            </p>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-ink-black/50">
              Plan
            </p>
            <p className="font-display font-bold">{sprintSizeForMode(mode)} card plan</p>
          </div>
        </div>
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
