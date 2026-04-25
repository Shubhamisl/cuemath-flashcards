'use client'

import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { TrustChip } from '@/lib/brand/primitives/trust-chip'
import { sendMagicLink, signInWithGoogle } from './actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await sendMagicLink(formData)
      if ('ok' in res) {
        setStatus('sent')
        setMessage('Check your email for a sign-in link.')
      } else {
        setStatus('error')
        setMessage(res.error)
      }
    })
  }

  async function handleGoogle() {
    const res = await signInWithGoogle()
    if ('url' in res && res.url) window.location.href = res.url
    else if ('error' in res && res.error) {
      setStatus('error')
      setMessage(res.error)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper-white">
      <div className="w-full max-w-md space-y-8">
        <CueCard tone="paper" className="space-y-6 shadow-card-rest p-8">
          <div className="space-y-3">
            <CuePill tone="highlight">Welcome back</CuePill>
            <h1 className="font-display font-extrabold text-[28px] leading-tight tracking-tight">
              Sign in to keep your SharpMind journey going.
            </h1>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-display font-semibold">Email</span>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-input border-2 border-ink-black bg-paper-white px-5 py-4 font-body placeholder:text-ink-black/40 focus:outline-none focus:ring-2 focus:ring-cue-yellow"
                placeholder="you@example.com"
              />
            </label>
            <CueButton type="submit" disabled={pending} className="w-full">
              {pending ? 'Sending…' : 'Email me a sign-in link'}
            </CueButton>
          </form>

          <div className="relative text-center text-sm text-ink-black/60">
            <div className="absolute inset-x-0 top-1/2 h-px bg-ink-black/10" />
            <span className="bg-paper-white px-3 relative z-10">or</span>
          </div>

          <CueButton variant="ghost" onClick={handleGoogle} className="w-full">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="font-display font-bold">G</span>
              <span>Continue with Google</span>
            </span>
          </CueButton>

          {status !== 'idle' && (
            <p className={status === 'sent' ? 'text-sm text-green-700' : 'text-sm text-red-700'}>
              {message}
            </p>
          )}
        </CueCard>

        <div className="flex flex-wrap justify-center gap-2">
          <TrustChip label="Backed by 700M+ reviews" />
          <TrustChip label="Cognitive-science tuned" />
          <TrustChip label="Your PDFs stay private" />
        </div>
      </div>
    </main>
  )
}
