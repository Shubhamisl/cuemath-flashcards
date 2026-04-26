import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
import { MasteryRing } from '@/components/mastery-ring'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import { tierToTone } from '@/lib/progress/tier-tone'
import { DeleteDeckButton } from './delete-deck-button'
import { RenameDeckForm } from './rename-deck-form'

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <CueCard tone="cream" className="shadow-card-rest px-5 py-4 space-y-1">
      <div className="font-display font-extrabold text-2xl text-ink-black">{value}</div>
      <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60">{label}</div>
    </CueCard>
  )
}

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    .select('fsrs_state, suspended')
    .eq('deck_id', id)
    .eq('user_id', user.id)

  const stats = computeDeckStats((cards ?? []) as StatCard[], new Date())

  // Query reviewed cards for weak tags + upcoming schedule
  const { data: reviewedCards } = await supabase
    .from('cards')
    .select('concept_tag, fsrs_state')
    .eq('deck_id', id)
    .eq('user_id', user.id)
    .not('fsrs_state', 'is', null)
    .eq('suspended', false)

  // Aggregate lapses per concept tag
  const tagLapses: Record<string, { lapses: number; count: number }> = {}
  for (const rc of reviewedCards ?? []) {
    const tag = rc.concept_tag
    if (!tag) continue
    const lapses = (rc.fsrs_state as { lapses?: number } | null)?.lapses ?? 0
    if (lapses === 0) continue
    tagLapses[tag] ??= { lapses: 0, count: 0 }
    tagLapses[tag].lapses += lapses
    tagLapses[tag].count += 1
  }

  // Top 3 tags by total lapses (descending)
  const weakTags = Object.entries(tagLapses)
    .sort(([, a], [, b]) => b.lapses - a.lapses)
    .slice(0, 3)
    .map(([tag]) => tag)

  // Upcoming schedule buckets
  const now = new Date()

  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const tomorrowEnd = new Date(now)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)

  let dueLaterToday = 0
  let dueTomorrow = 0
  let dueThisWeek = 0

  for (const card of reviewedCards ?? []) {
    const state = card.fsrs_state as { due?: string } | null
    if (!state?.due) continue
    const due = new Date(state.due)
    if (isNaN(due.getTime())) continue
    if (due <= now) continue

    if (due <= todayEnd) {
      dueLaterToday++
    } else if (due <= tomorrowEnd) {
      dueTomorrow++
    } else if (due <= weekEnd) {
      dueThisWeek++
    }
  }

  const hasUpcoming = dueLaterToday > 0 || dueTomorrow > 0 || dueThisWeek > 0

  return (
    <main className="min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <Link
          href="/library"
          className="inline-block text-sm font-body text-ink-black/60 hover:text-ink-black"
        >
          ← Library
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
            </div>
            <RenameDeckForm deckId={deck.id} initialTitle={deck.title} />
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[600px]">
            <StatTile value={deck.card_count ?? 0} label="Total" />
            <StatTile value={stats.dueCount} label="Due" />
            <StatTile value={`${stats.masteryPct}%`} label="Mastery" />
          </div>

          <div className="space-y-3">
            <Link href={`/review?deck=${deck.id}`} className="inline-block w-full max-w-[480px]">
              <CueButton size="lg" className="w-full" disabled={stats.dueCount === 0}>
                {stats.dueCount > 0 ? 'Start sprint' : 'All caught up'}
              </CueButton>
            </Link>
            <p className="text-sm text-ink-black/70 max-w-[480px]">
              {stats.dueCount > 0
                ? `Up to 20 cards ready — keep your edge.`
                : `Nothing due right now. Check back later.`}
            </p>
          </div>

          <Link
            href={`/deck/${deck.id}/cards`}
            className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
          >
            Browse {deck.card_count ?? 0} cards →
          </Link>

          {weakTags.length > 0 && (
            <div className="space-y-2 max-w-[480px]">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Focus areas
              </p>
              <div className="flex flex-wrap gap-2">
                {weakTags.map((tag) => (
                  <CuePill key={tag} tone="warning">{tag}</CuePill>
                ))}
              </div>
            </div>
          )}

          {hasUpcoming && (
            <div className="space-y-2 max-w-[480px]">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Upcoming
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-ink-black/70">
                {dueLaterToday > 0 && (
                  <span>
                    <span className="font-display font-bold text-ink-black">{dueLaterToday}</span> later today
                  </span>
                )}
                {dueTomorrow > 0 && (
                  <span>
                    <span className="font-display font-bold text-ink-black">{dueTomorrow}</span> tomorrow
                  </span>
                )}
                {dueThisWeek > 0 && (
                  <span>
                    <span className="font-display font-bold text-ink-black">{dueThisWeek}</span> this week
                  </span>
                )}
              </div>
            </div>
          )}

          <DeleteDeckButton deckId={deck.id} deckTitle={deck.title} />
        </div>
      </div>
    </main>
  )
}
