'use client'

import { useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { subjectTint, type subjectFamily } from '@/lib/brand/tokens'
import { updateProfile, signOut, deleteAccount } from './actions'

type Initial = {
  display_name: string
  subject_family: subjectFamily
  level: string
  daily_goal_cards: number
  daily_new_cards_limit: number
}

const SUBJECTS: Array<{ id: subjectFamily; label: string }> = [
  { id: 'math', label: 'Math' },
  { id: 'language', label: 'Language' },
  { id: 'science', label: 'Science' },
  { id: 'humanities', label: 'Humanities' },
  { id: 'other', label: 'Other' },
]

const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

const GOALS = [10, 20, 40]
const NEW_CARD_OPTIONS = [3, 5, 8, 10, 15, 20]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-body font-semibold mb-2">
      {children}
    </div>
  )
}

export function ProfileForm({ email, initial }: { email: string; initial: Initial }) {
  const [displayName, setDisplayName] = useState(initial.display_name)
  const [subject, setSubject] = useState<subjectFamily>(initial.subject_family)
  const [level, setLevel] = useState(initial.level)
  const [goal, setGoal] = useState(initial.daily_goal_cards)
  const [dailyNewCardsLimit, setDailyNewCardsLimit] = useState(initial.daily_new_cards_limit)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [signOutPending, startSignOut] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  function save() {
    if (pending) return
    startTransition(async () => {
      const res = await updateProfile({
        display_name: displayName,
        subject_family: subject,
        level,
        daily_goal_cards: goal,
        daily_new_cards_limit: dailyNewCardsLimit,
      })
      if ('error' in res && res.error) showToast('Could not save.')
      else showToast('Saved.')
    })
  }

  function handleSignOut() {
    if (signOutPending) return
    startSignOut(async () => {
      await signOut()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount()
      showToast('Coming soon - talk to support to delete your account.')
    })
  }

  const maxNewCardsOption = Math.min(goal, 20)
  const newCardOptions = NEW_CARD_OPTIONS.filter((value) => value <= maxNewCardsOption)

  return (
    <div className="space-y-8">
      <CueCard tone="paper" className="shadow-card-rest p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="font-display font-semibold text-[22px] text-ink-black">Profile</h2>
          <p className="font-body text-sm text-ink-black/60">Tune your SharpMind defaults.</p>
        </div>

        <div className="space-y-6">
          <div>
            <FieldLabel>Display name</FieldLabel>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-body text-base text-ink-black focus:outline-none focus:ring-2 focus:ring-cue-yellow"
              placeholder="Your name"
            />
          </div>

          <div>
            <FieldLabel>Email</FieldLabel>
            <div className="inline-flex items-center rounded-full border border-ink-black/15 bg-paper-white px-4 py-2 font-body text-sm text-ink-black/60">
              {email}
            </div>
          </div>

          <div>
            <FieldLabel>Subject</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => {
                const active = subject === s.id
                const tinted = s.id !== 'other'
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubject(s.id)}
                    aria-pressed={active}
                    style={tinted ? { backgroundColor: subjectTint(s.id) } : undefined}
                    className={`rounded-full px-4 py-2 font-body text-sm font-semibold text-ink-black transition ${
                      active ? 'border-2 border-ink-black' : 'border border-ink-black/15'
                    } ${!tinted ? 'bg-paper-white' : ''}`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <FieldLabel>Level</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => {
                const active = level === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLevel(l.id)}
                    aria-pressed={active}
                    className={`rounded-full px-6 py-3 font-body text-base font-semibold text-ink-black transition ${
                      active
                        ? 'border-2 border-ink-black bg-soft-cream'
                        : 'border border-ink-black/15 bg-paper-white hover:bg-soft-cream/40'
                    }`}
                  >
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <FieldLabel>Daily goal</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => {
                const active = goal === g
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGoal(g)
                      setDailyNewCardsLimit((current) => Math.min(current, Math.min(g, 20)))
                    }}
                    aria-pressed={active}
                    className={`rounded-full px-6 py-3 font-body text-base font-semibold text-ink-black transition ${
                      active
                        ? 'border-2 border-ink-black bg-cue-yellow'
                        : 'border border-ink-black/15 bg-cue-yellow/50 hover:bg-cue-yellow/70'
                    }`}
                  >
                    {g} cards / day
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <FieldLabel>Daily new cards</FieldLabel>
            <p className="mb-3 text-sm text-ink-black/60">
              Brand-new cards only. Reviews still show up whenever they are due.
            </p>
            <div className="flex flex-wrap gap-2">
              {newCardOptions.map((count) => {
                const active = dailyNewCardsLimit === count
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setDailyNewCardsLimit(count)}
                    aria-pressed={active}
                    className={`rounded-full px-6 py-3 font-body text-base font-semibold text-ink-black transition ${
                      active
                        ? 'border-2 border-ink-black bg-soft-cream'
                        : 'border border-ink-black/15 bg-paper-white hover:bg-soft-cream/40'
                    }`}
                  >
                    {count} new cards / day
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {toast && (
            <span
              role="status"
              aria-live="polite"
              className="font-body text-sm text-ink-black/70 transition-opacity"
            >
              {toast}
            </span>
          )}
          <CueButton onClick={save} disabled={pending}>
            {pending ? 'Saving...' : 'Save changes'}
          </CueButton>
        </div>
      </CueCard>

      <CueCard tone="paper" className="shadow-card-rest p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="font-display font-semibold text-[22px] text-ink-black">Account</h2>
          <p className="font-body text-sm text-ink-black/60">Sign out or wipe everything.</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="font-body text-base text-ink-black">Sign out of this device.</span>
          <CueButton
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={signOutPending}
          >
            {signOutPending ? 'Signing out...' : 'Sign out'}
          </CueButton>
        </div>

        <div className="h-px bg-ink-black/10" />

        <div
          className="rounded-2xl border-l-4 border-alert-coral px-5 py-4 flex items-center justify-between gap-4"
          style={{ backgroundColor: 'rgba(249, 115, 115, 0.10)' }}
        >
          <div className="space-y-1">
            <div className="font-display font-semibold text-base text-ink-black">
              Delete account permanently
            </div>
            <p className="font-body text-sm text-ink-black/70">
              This wipes every deck, card, and review. No undo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-input border-2 border-alert-coral bg-paper-white px-4 py-2 font-body text-sm font-semibold text-alert-coral hover:bg-alert-coral/10 transition"
          >
            Delete
          </button>
        </div>
      </CueCard>
    </div>
  )
}
