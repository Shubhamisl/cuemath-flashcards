import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
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

      {(!decks || decks.length === 0) && (
        <CueCard className="text-center space-y-4">
          <h2 className="font-display text-xl font-bold">No decks yet</h2>
          <p className="text-sm opacity-80">
            Drop a PDF and we&apos;ll turn it into atomic flashcards — one idea per card.
          </p>
          <CueButton disabled>Upload PDF (coming in next plan)</CueButton>
        </CueCard>
      )}

      {decks && decks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {decks.map((d) => (
            <CueCard key={d.id} subject={d.subject_family as subjectFamily}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{d.title}</div>
                  <div className="text-sm opacity-70">{d.card_count} cards · {d.status}</div>
                </div>
                <CuePill>View</CuePill>
              </div>
            </CueCard>
          ))}
        </div>
      )}
    </main>
  )
}
