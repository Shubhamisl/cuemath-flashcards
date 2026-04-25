import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { UploadModal } from '@/components/upload-modal'
import { DeckCard } from '@/components/deck-card'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import { computeStreak } from '@/lib/progress/streak'
import type { subjectFamily } from '@/lib/brand/tokens'
import { TopNav } from '../_components/top-nav'

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

  const fullName = profile?.display_name ?? 'there'
  const name = fullName.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen">
      <TopNav name={name} streak={streak} />

      <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-10">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight">
              Hi, {name}
            </h1>
            <p className="text-base text-ink-black/70">
              Goal: {profile?.daily_goal_cards ?? 20} cards today
            </p>
          </div>
          <div className="md:w-auto">
            <UploadModal />
          </div>
        </header>

        {(!decks || decks.length === 0) ? (
          <div className="rounded-card border-2 border-dashed border-ink-black/20 p-12 text-center space-y-2">
            <h2 className="font-display text-xl font-extrabold">No decks yet</h2>
            <p className="text-sm text-ink-black/70">Drop a PDF above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
      </div>
    </main>
  )
}
