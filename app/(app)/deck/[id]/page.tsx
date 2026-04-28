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
import {
  buildIngestDiagnostics,
  getIngestStageLabel,
  type DeckStatus,
  type IngestJobSnapshot,
} from '@/lib/ingest/diagnostics'
import { ArchiveDeckButton } from './archive-deck-button'
import { DeckTagsForm } from './deck-tags-form'
import { DeleteDeckButton } from './delete-deck-button'
import { RenameDeckForm } from './rename-deck-form'
import { ReviewReadyButton } from './review-ready-button'

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <CueCard tone="cream" className="motion-premium-list-item shadow-card-rest px-5 py-4 space-y-1">
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

  // Run profile, deck, cards, ingest_jobs in parallel after auth. Cards is a
  // single fetch with a superset column list so both stats + preview can be
  // computed client-side without a second roundtrip.
  const [
    { data: profile },
    { data: deck },
    { data: cards },
    { data: latestJob },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('onboarded_at')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('decks')
      .select('id, title, subject_family, card_count, status, tags')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('cards')
      .select('fsrs_state, suspended, approved, concept_tag')
      .eq('deck_id', id)
      .eq('user_id', user.id),
    supabase
      .from('ingest_jobs')
      .select('stage, progress_pct, error, started_at, finished_at')
      .eq('deck_id', id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!profile?.onboarded_at) redirect('/onboarding/subject')
  if (!deck) notFound()
  const deckRow = deck

  const cardRows = (cards ?? []) as Array<
    StatCard & {
      approved: boolean
      suspended: boolean
      concept_tag: string | null
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
  const canReady = canMarkDeckReady(deckRow.status, gateSummary)
  const canArchive = canArchiveDeck(deckRow.status)

  const reviewedCards = cardRows.filter(
    (card) => card.approved && !card.suspended && card.fsrs_state != null,
  )

  const preview = computeSessionPreview(
    reviewedCards.map((card) => ({
      concept_tag: card.concept_tag,
      fsrs_state: card.fsrs_state as { due?: string; lapses?: number } | null,
    })),
    new Date(),
  )
  const ingestJob = (latestJob ?? null) as IngestJobSnapshot | null
  const ingestDiagnostics = buildIngestDiagnostics({
    status: deckRow.status as DeckStatus,
    job: ingestJob,
  })

  async function retryFailedDeck() {
    'use server'

    const { retryIngest } = await import('../../library/actions')
    await retryIngest(deckRow.id)
  }

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

      <div className="motion-premium-reveal max-w-[1100px] mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-start">
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
              {deckRow.status === 'draft' && <CuePill tone="warning">Draft</CuePill>}
              {deckRow.status === 'ingesting' && <CuePill tone="info">Processing</CuePill>}
              {deckRow.status === 'failed' && <CuePill tone="warning">Failed</CuePill>}
              {deckRow.status === 'archived' && <CuePill tone="neutral">Archived</CuePill>}
            </div>
            <RenameDeckForm deckId={deckRow.id} initialTitle={deckRow.title} />
            <DeckTagsForm deckId={deckRow.id} initialTags={(deckRow.tags ?? []) as string[]} />
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[600px]">
            <StatTile value={deckRow.card_count ?? 0} label="Total" />
            <StatTile value={gateSummary.approvedCount} label="Approved" />
            <StatTile value={`${stats.masteryPct}%`} label="Mastery" />
          </div>

          {deckRow.status === 'draft' && (
            <div className="motion-premium-reveal max-w-[520px] rounded-card border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
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
            {deckRow.status === 'ready' ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[480px]">
                  <Link href={`/review?deck=${deckRow.id}`} className="inline-block flex-1">
                    <CueButton size="lg" className="w-full" disabled={stats.dueCount === 0}>
                      {stats.dueCount > 0 ? 'Start sprint' : 'All caught up'}
                    </CueButton>
                  </Link>
                  {stats.dueCount > 0 && (
                    <Link href={`/review?deck=${deckRow.id}&mode=quick`} className="inline-block flex-1">
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
                <a href={`/deck/${deckRow.id}/export`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export CSV
                  </CueButton>
                </a>
                <a href={`/deck/${deckRow.id}/export?format=anki`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export for Anki
                  </CueButton>
                </a>
              </>
            ) : deckRow.status === 'archived' ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-black/70 max-w-[480px]">
                  This deck is archived, so it stays out of the default library and review queue until you restore it.
                </p>
                <a href={`/deck/${deckRow.id}/export`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export CSV
                  </CueButton>
                </a>
                <a href={`/deck/${deckRow.id}/export?format=anki`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export for Anki
                  </CueButton>
                </a>
                <ArchiveDeckButton deckId={deckRow.id} archived />
              </div>
            ) : deckRow.status === 'draft' ? (
              <>
                <Link href={`/deck/${deckRow.id}/cards`} className="inline-block w-full max-w-[480px]">
                  <CueButton size="lg" className="w-full">
                    Review generated cards
                  </CueButton>
                </Link>
                <p className="text-sm text-ink-black/70 max-w-[480px]">
                  Approve, edit, or delete cards until the deck feels trustworthy.
                </p>
                <a href={`/deck/${deckRow.id}/export`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export CSV
                  </CueButton>
                </a>
                <a href={`/deck/${deckRow.id}/export?format=anki`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export for Anki
                  </CueButton>
                </a>
                <ReviewReadyButton deckId={deckRow.id} disabled={!canReady} />
              </>
            ) : deckRow.status === 'ingesting' ? (
              <div className="motion-premium-reveal max-w-[560px] rounded-card border border-trust-blue/30 bg-trust-blue/10 px-5 py-4 space-y-2">
                <p className="font-display font-semibold text-sm text-ink-black">
                  {ingestDiagnostics?.title ?? 'Generating cards'}
                </p>
                <p className="text-sm text-ink-black/70">
                  {ingestDiagnostics?.detail ?? 'We are still generating cards for this deck.'}
                </p>
                <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.08em] text-ink-black/60">
                  {ingestDiagnostics?.stageLabel && <span>{ingestDiagnostics.stageLabel}</span>}
                  {ingestDiagnostics?.progressLabel && <span>{ingestDiagnostics.progressLabel}</span>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="motion-premium-reveal max-w-[560px] rounded-card border border-alert-coral/30 bg-alert-coral/10 px-5 py-4 space-y-2">
                  <p className="font-display font-semibold text-sm text-ink-black">
                    {ingestDiagnostics?.title ?? 'Generation failed'}
                  </p>
                  <p className="text-sm text-ink-black/70">
                    {ingestDiagnostics?.detail ?? 'This deck is not ready for review yet.'}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.08em] text-ink-black/60">
                    {ingestDiagnostics?.stageLabel && (
                      <span>{ingestDiagnostics.stageLabel}</span>
                    )}
                    {ingestDiagnostics?.progressLabel && (
                      <span>{ingestDiagnostics.progressLabel}</span>
                    )}
                    {!ingestDiagnostics?.stageLabel && ingestJob?.stage && (
                      <span>{getIngestStageLabel(ingestJob.stage)}</span>
                    )}
                  </div>
                </div>
                <form action={retryFailedDeck} className="w-full max-w-[480px]">
                  <CueButton size="lg" className="w-full">
                    Retry generation
                  </CueButton>
                </form>
                <a href={`/deck/${deckRow.id}/export`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export CSV
                  </CueButton>
                </a>
                <a href={`/deck/${deckRow.id}/export?format=anki`} className="inline-block w-full max-w-[480px]">
                  <CueButton variant="ghost" size="lg" className="w-full">
                    Export for Anki
                  </CueButton>
                </a>
              </div>
            )}
          </div>

          <Link
            href={`/deck/${deckRow.id}/cards`}
            className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
          >
            Browse {deckRow.card_count ?? 0} cards {'->'}
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

          {canArchive && <ArchiveDeckButton deckId={deckRow.id} archived={false} />}

          <DeleteDeckButton deckId={deckRow.id} deckTitle={deckRow.title} />
        </div>
      </div>
    </main>
  )
}
