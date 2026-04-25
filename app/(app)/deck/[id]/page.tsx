import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
import { MasteryRing } from '@/components/mastery-ring'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import type { subjectFamily } from '@/lib/brand/tokens'

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

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/library" className="text-sm opacity-60 hover:opacity-100">← Library</Link>
        <h1 className="font-display text-3xl font-bold">{deck.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <CuePill tone="highlight">{stats.tier}</CuePill>
          <CuePill>{deck.card_count ?? 0} cards</CuePill>
          <MasteryRing pct={stats.masteryPct} />
        </div>
      </header>

      <CueCard subject={deck.subject_family as subjectFamily} className="space-y-4 shadow-card-rest">
        <div>
          <h2 className="font-display text-xl font-bold">Today's sprint</h2>
          <p className="text-sm opacity-70">
            {stats.dueCount > 0
              ? `Up to 20 cards ready — keep your edge.`
              : `Nothing due right now. Check back later.`}
          </p>
        </div>
        <Link href={`/review?deck=${deck.id}`} className="block">
          <CueButton className="w-full" disabled={stats.dueCount === 0}>
            {stats.dueCount > 0 ? 'Start sprint' : 'All caught up'}
          </CueButton>
        </Link>
      </CueCard>
    </main>
  )
}
