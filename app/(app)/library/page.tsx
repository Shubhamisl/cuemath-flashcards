import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/db/server'
import { DeckCard } from '@/components/deck-card'
import { SearchSortBar } from '@/components/search-sort-bar'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import type { IngestJobSnapshot } from '@/lib/ingest/diagnostics'
import type { subjectFamily } from '@/lib/brand/tokens'
import { getAppShellData } from '../_lib/app-shell-data'
import {
  filterAndSortDecks,
  type LibraryMasteryFilter,
  type LibrarySort,
  type LibraryStatusFilter,
} from '@/lib/library/library-view'
import { LibraryHero } from './library-hero'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    sort?: string
    subject?: string
    status?: string
    mastery?: string
  }>
}) {
  const {
    q = '',
    sort = 'created',
    subject = 'all',
    status = 'active',
    mastery = 'all',
  } = await searchParams
  const { user, profile, firstName: name } = await getAppShellData()
  const supabase = await createClient()

  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const [{ data: todaySessions }, { data: decks }] = await Promise.all([
    supabase
      .from('sessions')
      .select('cards_reviewed')
      .eq('user_id', user.id)
      .gte('started_at', todayStart.toISOString()),
    supabase
      .from('decks')
      .select('id, title, subject_family, status, card_count, tags')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile?.onboarded_at) {
    redirect('/onboarding/subject')
  }

  const doneToday = (todaySessions ?? []).reduce(
    (sum, s) => sum + (s.cards_reviewed ?? 0),
    0,
  )

  const latestJobByDeck: Record<string, IngestJobSnapshot> = {}
  const ingestDeckIds = (decks ?? [])
    .filter((deck) => deck.status === 'ingesting' || deck.status === 'failed')
    .map((deck) => deck.id)
  const studyDeckIds = (decks ?? [])
    .filter((d) => d.status === 'ready' || d.status === 'archived')
    .map((d) => d.id)
  const statsByDeck: Record<string, { tier: string; masteryPct: number; dueCount: number }> = {}
  const [{ data: ingestJobs }, { data: cardsRaw }] = await Promise.all([
    ingestDeckIds.length > 0
      ? supabase
          .from('ingest_jobs')
          .select('deck_id, stage, progress_pct, error, started_at, finished_at')
          .in('deck_id', ingestDeckIds)
          .order('started_at', { ascending: false })
      : Promise.resolve({ data: null }),
    studyDeckIds.length > 0
      ? supabase
          .from('cards')
          .select('deck_id, fsrs_state, suspended')
          .eq('user_id', user.id)
          .in('deck_id', studyDeckIds)
      : Promise.resolve({ data: null }),
  ])

  for (const job of ingestJobs ?? []) {
    if (!latestJobByDeck[job.deck_id]) {
      latestJobByDeck[job.deck_id] = {
        stage: job.stage,
        progress_pct: job.progress_pct,
        error: job.error,
        started_at: job.started_at,
        finished_at: job.finished_at,
      }
    }
  }

  const grouped: Record<string, StatCard[]> = {}
  for (const r of cardsRaw ?? []) {
    const row = r as { deck_id: string } & StatCard
    ;(grouped[row.deck_id] ??= []).push({ fsrs_state: row.fsrs_state, suspended: row.suspended })
  }
  for (const [id, group] of Object.entries(grouped)) {
    const s = computeDeckStats(group, now)
    statsByDeck[id] = { tier: s.tier, masteryPct: s.masteryPct, dueCount: s.dueCount }
  }
  const globalDueNowCount = (decks ?? [])
    .filter((deck) => deck.status === 'ready')
    .reduce(
      (sum, deck) => sum + (statsByDeck[deck.id]?.dueCount ?? 0),
      0,
    )

  const filtered = filterAndSortDecks(
    (decks ?? []).map((deck) => ({
      id: deck.id,
      title: deck.title,
      subjectFamily: deck.subject_family as subjectFamily,
      status: deck.status,
      cardCount: deck.card_count,
      tags: (deck.tags ?? []) as string[],
      tier: statsByDeck[deck.id]?.tier as import('@/lib/progress/deck-stats').Tier | undefined,
      masteryPct: statsByDeck[deck.id]?.masteryPct,
      dueCount: statsByDeck[deck.id]?.dueCount,
    })),
    {
      query: q,
      sort: sort as LibrarySort,
      subject: subject as 'all' | subjectFamily,
      status: status as LibraryStatusFilter,
      mastery: mastery as LibraryMasteryFilter,
    },
  )

  const dailyGoal = profile?.daily_goal_cards ?? 20
  const progressPct = Math.min(100, Math.round((doneToday / dailyGoal) * 100))

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8 sm:px-6 sm:py-10 sm:space-y-10">
        <LibraryHero
          name={name}
          doneToday={doneToday}
          dailyGoal={dailyGoal}
          progressPct={progressPct}
          globalDueNowCount={globalDueNowCount}
        />

        <Suspense>
          <SearchSortBar
            initialQ={q}
            initialSort={sort as LibrarySort}
            initialSubject={subject as 'all' | subjectFamily}
            initialStatus={status as LibraryStatusFilter}
            initialMastery={mastery as LibraryMasteryFilter}
          />
        </Suspense>

        {(!decks || decks.length === 0) ? (
          <div className="space-y-2 rounded-card border-2 border-dashed border-ink-black/20 p-8 text-center sm:p-12">
            <h2 className="font-display text-xl font-extrabold">No decks yet</h2>
            <p className="text-sm text-ink-black/70">Drop a PDF above to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="space-y-2 rounded-card border-2 border-dashed border-ink-black/20 p-8 text-center sm:p-12">
            <h2 className="font-display text-xl font-extrabold">No decks match</h2>
            <p className="text-sm text-ink-black/70">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((d) => (
              <DeckCard
                key={d.id}
                id={d.id}
                title={d.title}
                subjectFamily={d.subjectFamily}
                status={d.status as 'ingesting' | 'draft' | 'ready' | 'failed' | 'archived'}
                cardCount={d.cardCount}
                tags={d.tags}
                tier={d.tier}
                masteryPct={d.masteryPct}
                dueCount={d.dueCount}
                initialJob={latestJobByDeck[d.id] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
