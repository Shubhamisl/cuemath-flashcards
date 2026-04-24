'use client'

import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <CueCard className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="text-sm opacity-80">Sign in to keep your SharpMind journey going.</p>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-input border-2 border-ink-black px-4 py-3"
              placeholder="you@example.com"
            />
          </label>
          <CueButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Sending…' : 'Email me a sign-in link'}
          </CueButton>
        </form>

        <div className="relative text-center text-sm opacity-60">
          <span className="bg-paper-white px-2 relative z-10">or</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-ink-black/10" />
        </div>

        <CueButton variant="ghost" onClick={handleGoogle} className="w-full">
          Continue with Google
        </CueButton>

        {status !== 'idle' && (
          <p className={status === 'sent' ? 'text-sm text-green-700' : 'text-sm text-red-700'}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <TrustChip label="Backed by 700M+ reviews" />
          <TrustChip label="Cognitive-science tuned" />
          <TrustChip label="Your PDFs stay private" />
        </div>
      </CueCard>
    </main>
  )
}
