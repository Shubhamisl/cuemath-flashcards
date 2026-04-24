import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { UploadModal } from '@/components/upload-modal'
import { DeckCard } from '@/components/deck-card'
import type { subjectFamily } from '@/lib/brand/tokens'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_goal_cards')
    .eq('user_id', user!.id)
    .single()

  const { data: decks } = await supabase
    .from('decks')
    .select('id, title, subject_family, status, card_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const name = profile?.display_name?.split(' ')[0] ?? 'there'

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Hi, {name}</h1>
          <p className="text-sm opacity-70">Goal: {profile?.daily_goal_cards ?? 20} cards today</p>
        </div>
        <CuePill tone="highlight">Day 1</CuePill>
      </header>

      <div><UploadModal /></div>

      {(!decks || decks.length === 0) && (
        <CueCard className="text-center space-y-2">
          <h2 className="font-display text-xl font-bold">No decks yet</h2>
          <p className="text-sm opacity-80">Drop a PDF above to get started.</p>
        </CueCard>
      )}

      {decks && decks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {decks.map((d) => (
            <DeckCard
              key={d.id}
              id={d.id}
              title={d.title}
              subjectFamily={d.subject_family as subjectFamily}
              status={d.status as 'ingesting' | 'ready' | 'failed'}
              cardCount={d.card_count}
            />
          ))}
        </div>
      )}
    </main>
  )
}
