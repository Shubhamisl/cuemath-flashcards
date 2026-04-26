import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
import { MasteryRing } from '@/components/mastery-ring'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import { tierToTone } from '@/lib/progress/tier-tone'
import { canArchiveDeck } from '@/lib/decks/archive'
import { canMarkDeckReady, summarizeReviewGate } from '@/lib/decks/review-gate'
import { labelForMode } from '@/lib/review/mode'
import { computeSessionPreview } from '@/lib/review/session-preview'
import { ArchiveDeckButton } from './archive-deck-button'
import { DeleteDeckButton } from './delete-deck-button'
import { RenameDeckForm } from './rename-deck-form'
import { ReviewReadyButton } from './review-ready-button'

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <CueCard tone="cream" className="shadow-card-rest px-5 py-4 space-y-1">
      <div className="font-display font-extrabold text-2xl text-ink-black">{value}</div>
      <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60">{label}</div>
    </CueCard>
  )
}

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ review?: string }>
}) {
  const { id } = await params
  const { review } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('user_id', user.id)
    .single()
  if (!profile?.onboarded_at) redirect('/onboarding/subject')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family, card_count, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!deck) notFound()

  const { data: cards } = await supabase
    .from('cards')
    .select('fsrs_state, suspended, approved')
    .eq('deck_id', id)
    .eq('user_id', user.id)

  const cardRows = (cards ?? []) as Array<
    StatCard & {
      approved: boolean
      suspended: boolean
    }
  >
  const gateSummary = summarizeReviewGate(
    cardRows.map((card) => ({ approved: card.approved, suspended: card.suspended })),
  )
  const stats = computeDeckStats(
    cardRows
      .filter((card) => card.approved)
      .map((card) => ({ fsrs_state: card.fsrs_state, suspended: card.suspended })),
    new Date(),
  )
  const canReady = canMarkDeckReady(deck.status, gateSummary)
  const canArchive = canArchiveDeck(deck.status)

  const { data: reviewedCards } = await supabase
    .from('cards')
    .select('concept_tag, fsrs_state')
    .eq('deck_id', id)
    .eq('user_id', user.id)
    .eq('approved', true)
    .not('fsrs_state', 'is', null)
    .eq('suspended', false)

  const preview = computeSessionPreview(
    (reviewedCards ?? []) as Array<{
      concept_tag: string | null
      fsrs_state: { due?: string; lapses?: number } | null
    }>,
    new Date(),
  )

  return (
    <main className="min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <Link
          href="/library"
          className="inline-block text-sm font-body text-ink-black/60 hover:text-ink-black"
        >
          {'<-'} Library
        </Link>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-start">
        <div className="flex flex-col items-center lg:items-start gap-4">
          <div className="relative">
            <MasteryRing pct={stats.masteryPct} size={256} stroke={12} showLabel={false} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-extrabold text-5xl text-ink-black">
                {stats.masteryPct}%
              </div>
              <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60 mt-1">
                Mastered
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <CuePill tone={tierToTone(stats.tier)}>{stats.tier}</CuePill>
              {deck.status === 'draft' && <CuePill tone="warning">Draft</CuePill>}
              {deck.status === 'ingesting' && <CuePill tone="info">Processing</CuePill>}
              {deck.status === 'failed' && <CuePill tone="warning">Failed</CuePill>}
              {deck.status === 'archived' && <CuePill tone="neutral">Archived</CuePill>}
            </div>
            <RenameDeckForm deckId={deck.id} initialTitle={deck.title} />
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[600px]">
            <StatTile value={deck.card_count ?? 0} label="Total" />
            <StatTile value={gateSummary.approvedCount} label="Approved" />
            <StatTile value={`${stats.masteryPct}%`} label="Mastery" />
          </div>

          {deck.status === 'draft' && (
            <div className="max-w-[520px] rounded-card border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
              <p className="font-display font-semibold text-sm text-ink-black">Review gate</p>
              <p className="text-sm text-ink-black/70">
                {gateSummary.reviewableCount === 0
                  ? 'This deck does not have any reviewable cards yet.'
                  : `${gateSummary.approvedCount} of ${gateSummary.reviewableCount} reviewable cards are approved.`}
                {gateSummary.reviewableCount > 0 && gateSummary.pendingCount > 0
                  ? ` Approve ${gateSummary.pendingCount} more card(s) before study starts.`
                  : gateSummary.reviewableCount > 0
                    ? ' All reviewable cards are approved. Mark the deck ready to unlock review.'
                    : ''}
              </p>
              {review === 'blocked' && (
                <p className="text-sm text-amber-800">
                  Finish approving this deck before starting a sprint.
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {deck.status === 'ready' ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[480px]">
                  <Link href={`/review?deck=${deck.id}`} className="inline-block flex-1">
                    <CueButton size="lg" className="w-full" disabled={stats.dueCount === 0}>
                      {stats.dueCount > 0 ? 'Start sprint' : 'All caught up'}
                    </CueButton>
                  </Link>
                  {stats.dueCount > 0 && (
                    <Link href={`/review?deck=${deck.id}&mode=quick`} className="inline-block flex-1">
                      <CueButton variant="ghost" size="lg" className="w-full">
                        {labelForMode('quick')}
                      </CueButton>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-ink-black/70 max-w-[480px]">
                  {stats.dueCount > 0
                    ? 'Choose a full sprint or a shorter Quick 5 with hints available during review.'
                    : 'Nothing due right now. Check back later.'}
                </p>
              </>
            ) : deck.status === 'archived' ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-black/70 max-w-[480px]">
                  This deck is archived, so it stays out of the default library and review queue until you restore it.
                </p>
                <ArchiveDeckButton deckId={deck.id} archived />
              </div>
            ) : deck.status === 'draft' ? (
              <>
                <Link href={`/deck/${deck.id}/cards`} className="inline-block w-full max-w-[480px]">
                  <CueButton size="lg" className="w-full">
                    Review generated cards
                  </CueButton>
                </Link>
                <p className="text-sm text-ink-black/70 max-w-[480px]">
                  Approve, edit, or delete cards until the deck feels trustworthy.
                </p>
                <ReviewReadyButton deckId={deck.id} disabled={!canReady} />
              </>
            ) : deck.status === 'ingesting' ? (
              <p className="text-sm text-ink-black/70 max-w-[480px]">
                We are still generating cards for this deck.
              </p>
            ) : (
              <p className="text-sm text-ink-black/70 max-w-[480px]">
                This deck is not ready for review yet.
              </p>
            )}
          </div>

          <Link
            href={`/deck/${deck.id}/cards`}
            className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
          >
            Browse {deck.card_count ?? 0} cards {'->'}
          </Link>

          {preview.weakTags.length > 0 && (
            <div className="space-y-2 max-w-[480px]">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Focus areas
              </p>
              <div className="flex flex-wrap gap-2">
                {preview.weakTags.map((tag) => (
                  <CuePill key={tag} tone="warning">{tag}</CuePill>
                ))}
              </div>
            </div>
          )}

          {preview.hasUpcoming && (
            <div className="space-y-2 max-w-[480px]">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Upcoming
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-ink-black/70">
                {preview.dueLaterToday > 0 && (
                  <span>
                    <span className="font-display font-bold text-ink-black">{preview.dueLaterToday}</span> later today
                  </span>
                )}
                {preview.dueTomorrow > 0 && (
                  <span>
                    <span className="font-display font-bold text-ink-black">{preview.dueTomorrow}</span> tomorrow
                  </span>
                )}
                {preview.dueThisWeek > 0 && (
                  <span>
                    <span className="font-display font-bold text-ink-black">{preview.dueThisWeek}</span> this week
                  </span>
                )}
              </div>
            </div>
          )}

          {canArchive && <ArchiveDeckButton deckId={deck.id} archived={false} />}

          <DeleteDeckButton deckId={deck.id} deckTitle={deck.title} />
        </div>
      </div>
    </main>
  )
}
