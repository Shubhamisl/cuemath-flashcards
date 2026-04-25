import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { UploadModal } from '@/components/upload-modal'
import { DeckCard } from '@/components/deck-card'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import type { subjectFamily } from '@/lib/brand/tokens'

function computeStreak(sessionDates: string[], today: Date): number {
  if (sessionDates.length === 0) return 0
  const days = new Set(
    sessionDates.map((d) => new Date(d).toISOString().slice(0, 10)),
  )
  const cursor = new Date(Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
  ))
  // Allow today OR yesterday to seed the streak (user hasn't reviewed yet today).
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0
  }
  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_goal_cards, onboarded_at')
    .eq('user_id', user!.id)
    .single()

  if (!profile?.onboarded_at) {
    redirect('/onboarding/subject')
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('user_id', user!.id)
    .gte('started_at', new Date(Date.now() - 40 * 86400000).toISOString())
  const streak = computeStreak(
    (sessions ?? []).map((s) => s.started_at as string),
    new Date(),
  )

  const { data: decks } = await supabase
    .from('decks')
    .select('id, title, subject_family, status, card_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const readyIds = (decks ?? []).filter((d) => d.status === 'ready').map((d) => d.id)
  const statsByDeck: Record<string, { tier: string; masteryPct: number }> = {}
  if (readyIds.length > 0) {
    const { data: cardsRaw } = await supabase
      .from('cards')
      .select('deck_id, fsrs_state, suspended')
      .eq('user_id', user!.id)
      .in('deck_id', readyIds)
    const grouped: Record<string, StatCard[]> = {}
    for (const r of cardsRaw ?? []) {
      const row = r as { deck_id: string } & StatCard
      ;(grouped[row.deck_id] ??= []).push({ fsrs_state: row.fsrs_state, suspended: row.suspended })
    }
    const now = new Date()
    for (const [id, group] of Object.entries(grouped)) {
      const s = computeDeckStats(group, now)
      statsByDeck[id] = { tier: s.tier, masteryPct: s.masteryPct }
    }
  }

  const name = profile?.display_name?.split(' ')[0] ?? 'there'

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Hi, {name}</h1>
          <p className="text-sm opacity-70">Goal: {profile?.daily_goal_cards ?? 20} cards today</p>
        </div>
        <CuePill tone="highlight">{streak > 0 ? `Day ${streak}` : `Day 1`}</CuePill>
      </header>

      <div><UploadModal /></div>

      {(!decks || decks.length === 0) && (
        <CueCard className="text-center space-y-2 shadow-card-rest">
          <h2 className="font-display text-xl font-bold">No decks yet</h2>
          <p className="text-sm opacity-80">Drop a PDF above to get started.</p>
        </CueCard>
      )}

      {decks && decks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {decks.map((d) => {
            const s = statsByDeck[d.id]
            return (
              <DeckCard
                key={d.id}
                id={d.id}
                title={d.title}
                subjectFamily={d.subject_family as subjectFamily}
                status={d.status as 'ingesting' | 'ready' | 'failed'}
                cardCount={d.card_count}
                tier={s?.tier as import('@/lib/progress/deck-stats').Tier | undefined}
                masteryPct={s?.masteryPct}
              />
            )
          })}
        </div>
      )}
    </main>
  )
}
