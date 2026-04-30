'use client'

import { useState, useTransition } from 'react'
import { BookOpenCheck, LogOut, Save, Sparkles, Target, Trash2, UserRound } from 'lucide-react'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { subjectTint, type subjectFamily } from '@/lib/brand/tokens'
import { updateProfile, signOut, deleteAccount } from './actions'
import { ProfileChoice, ProfilePanel, ProfileSummaryTile } from './profile-motion'

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

function labelForSubject(subject: subjectFamily) {
  return SUBJECTS.find((item) => item.id === subject)?.label ?? 'Math'
}

function labelForLevel(level: string) {
  return LEVELS.find((item) => item.id === level)?.label ?? 'Intermediate'
}

function initialsFor(name: string, email: string) {
  const source = name.trim() || email.trim() || 'Student'
  const parts = source
    .replace(/@.*/, '')
    .split(/\s+|[._-]+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S'
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
  const profileName = displayName.trim() || 'Student'
  const subjectLabel = labelForSubject(subject)
  const levelLabel = labelForLevel(level)
  const initials = initialsFor(displayName, email)

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
      <ProfilePanel index={0} className="lg:sticky lg:top-24">
        <CueCard tone="highlight" className="space-y-6 p-5 shadow-card-rest sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 border border-ink-black bg-paper-white px-3 py-2 font-display text-xs font-extrabold uppercase text-ink-black">
                <Sparkles aria-hidden="true" size={16} strokeWidth={2.5} />
                Study profile
              </div>
              <h2 className="font-display text-4xl font-extrabold leading-none text-ink-black">
                {profileName}
              </h2>
            </div>
            <div className="grid size-16 place-items-center rounded-[18px] border-2 border-ink-black bg-paper-white font-display text-2xl font-extrabold text-ink-black shadow-card-rest">
              {initials}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ProfileSummaryTile index={0} className="rounded-card border border-ink-black bg-paper-white px-4 py-4">
              <div className="font-display text-3xl font-extrabold leading-none text-ink-black">{goal}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.08em] text-ink-black/60">cards / day</div>
            </ProfileSummaryTile>
            <ProfileSummaryTile index={1} className="rounded-card border border-ink-black bg-paper-white px-4 py-4">
              <div className="font-display text-3xl font-extrabold leading-none text-ink-black">
                {dailyNewCardsLimit}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.08em] text-ink-black/60">new / day</div>
            </ProfileSummaryTile>
          </div>

          <div className="space-y-3 rounded-card border border-ink-black bg-paper-white p-4">
            <div className="flex items-center gap-3">
              <BookOpenCheck aria-hidden="true" size={20} strokeWidth={2.5} />
              <div>
                <div className="font-display text-sm font-extrabold uppercase text-ink-black">{subjectLabel}</div>
                <div className="text-sm text-ink-black/60">{levelLabel} pacing</div>
              </div>
            </div>
            <div className="h-px bg-ink-black/10" />
            <div className="flex items-start gap-3 text-sm text-ink-black/70">
              <UserRound aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
              <span className="min-w-0 break-all sm:break-normal [overflow-wrap:anywhere]">{email}</span>
            </div>
          </div>
        </CueCard>
      </ProfilePanel>

      <div className="space-y-6">
        <ProfilePanel index={1}>
          <CueCard tone="paper" className="space-y-6 p-5 shadow-card-rest sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 className="font-display font-semibold text-[24px] text-ink-black">Identity</h2>
                <p className="font-body text-sm text-ink-black/60">
                  Name, contact, and the subject this workspace should feel tuned toward.
                </p>
              </div>
              <div className="hidden rounded-full border border-ink-black/15 bg-soft-cream px-4 py-2 font-display text-xs font-extrabold uppercase text-ink-black/70 sm:block">
                Ready
              </div>
            </div>

            <div className="grid gap-6">
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
                <div className="inline-flex max-w-full items-center rounded-full border border-ink-black/15 bg-soft-cream px-4 py-2 font-body text-sm text-ink-black/60 break-all sm:break-normal [overflow-wrap:anywhere]">
                  {email}
                </div>
              </div>

              <div>
                <FieldLabel>Subject</FieldLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SUBJECTS.map((s, index) => {
                    const active = subject === s.id
                    const tinted = s.id !== 'other'
                    return (
                      <ProfileChoice
                        key={s.id}
                        index={index}
                        type="button"
                        onClick={() => setSubject(s.id)}
                        aria-pressed={active}
                        style={tinted ? { backgroundColor: subjectTint(s.id) } : undefined}
                        className={`min-h-[48px] rounded-input px-4 py-2 font-display text-sm font-extrabold text-ink-black ${
                          active ? 'border-2 border-ink-black shadow-card-rest' : 'border border-ink-black/15'
                        } ${!tinted ? 'bg-paper-white' : ''}`}
                      >
                        {s.label}
                      </ProfileChoice>
                    )
                  })}
                </div>
              </div>
            </div>
          </CueCard>
        </ProfilePanel>

        <ProfilePanel index={2}>
          <CueCard tone="cream" className="space-y-6 p-5 shadow-card-rest sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 className="font-display font-semibold text-[24px] text-ink-black">Study defaults</h2>
                <p className="font-body text-sm text-ink-black/60">
                  Set the daily load before a sprint starts asking questions.
                </p>
              </div>
              <Target aria-hidden="true" className="hidden text-ink-black sm:block" size={32} strokeWidth={2.5} />
            </div>

            <div className="grid gap-6">
              <div>
                <FieldLabel>Level</FieldLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {LEVELS.map((l, index) => {
                    const active = level === l.id
                    return (
                      <ProfileChoice
                        key={l.id}
                        index={index}
                        type="button"
                        onClick={() => setLevel(l.id)}
                        aria-pressed={active}
                        className={`min-h-[52px] rounded-input px-4 py-3 font-display text-sm font-extrabold text-ink-black ${
                          active
                            ? 'border-2 border-ink-black bg-paper-white shadow-card-rest'
                            : 'border border-ink-black/15 bg-paper-white/70'
                        }`}
                      >
                        {l.label}
                      </ProfileChoice>
                    )
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Daily goal</FieldLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {GOALS.map((g, index) => {
                    const active = goal === g
                    return (
                      <ProfileChoice
                        key={g}
                        index={index}
                        type="button"
                        onClick={() => {
                          setGoal(g)
                          setDailyNewCardsLimit((current) => Math.min(current, Math.min(g, 20)))
                        }}
                        aria-pressed={active}
                        className={`min-h-[56px] rounded-input px-4 py-3 font-display text-sm font-extrabold text-ink-black ${
                          active
                            ? 'border-2 border-ink-black bg-cue-yellow shadow-card-rest'
                            : 'border border-ink-black/15 bg-cue-yellow/45'
                        }`}
                      >
                        {g} cards / day
                      </ProfileChoice>
                    )
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Daily new cards</FieldLabel>
                <p className="mb-3 text-sm text-ink-black/60">
                  Brand-new cards only. Reviews still show up whenever they are due.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {newCardOptions.map((count, index) => {
                    const active = dailyNewCardsLimit === count
                    return (
                      <ProfileChoice
                        key={count}
                        index={index}
                        type="button"
                        onClick={() => setDailyNewCardsLimit(count)}
                        aria-pressed={active}
                        className={`min-h-[52px] rounded-input px-4 py-3 font-display text-sm font-extrabold text-ink-black ${
                          active
                            ? 'border-2 border-ink-black bg-paper-white shadow-card-rest'
                            : 'border border-ink-black/15 bg-paper-white/70'
                        }`}
                      >
                        {count} new cards / day
                      </ProfileChoice>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              {toast && (
                <span
                  role="status"
                  aria-live="polite"
                  className="font-body text-sm text-ink-black/70 transition-opacity"
                >
                  {toast}
                </span>
              )}
              <CueButton onClick={save} disabled={pending} className="w-full gap-2 sm:w-auto">
                <Save aria-hidden="true" size={18} strokeWidth={2.5} />
                {pending ? 'Saving...' : 'Save changes'}
              </CueButton>
            </div>
          </CueCard>
        </ProfilePanel>

        <ProfilePanel index={3}>
          <CueCard tone="paper" className="space-y-6 p-5 shadow-card-rest sm:p-8">
            <div className="space-y-1">
              <h2 className="font-display font-semibold text-[24px] text-ink-black">Account</h2>
              <p className="font-body text-sm text-ink-black/60">Session controls and account safety.</p>
            </div>

            <div className="flex flex-col gap-4 rounded-card border border-ink-black/15 bg-trust-blue/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="font-body text-base text-ink-black">Sign out of this device.</span>
              <CueButton
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signOutPending}
                className="w-full gap-2 sm:w-auto"
              >
                <LogOut aria-hidden="true" size={17} strokeWidth={2.5} />
                {signOutPending ? 'Signing out...' : 'Sign out'}
              </CueButton>
            </div>

            <div
              className="flex flex-col gap-4 rounded-card border border-alert-coral px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
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
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-input border-2 border-alert-coral bg-paper-white px-4 py-2 font-display text-sm font-bold text-alert-coral transition hover:bg-alert-coral/10"
              >
                <Trash2 aria-hidden="true" size={17} strokeWidth={2.5} />
                Delete
              </button>
            </div>
          </CueCard>
        </ProfilePanel>
      </div>
    </div>
  )
}
