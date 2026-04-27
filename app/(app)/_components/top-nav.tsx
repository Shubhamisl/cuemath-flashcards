'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { CuePill } from '@/lib/brand/primitives/pill'
import { signOut } from '../profile/actions'
import { PrimaryNavLinks } from './primary-nav-links'

export interface TopNavProps {
  name: string
  streak: number
}

export function TopNav({ name, streak }: TopNavProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const wrapRef = useRef<HTMLDivElement>(null)
  const fullName = name && name.length > 0 ? name : 'there'
  const initial = (fullName[0] ?? '?').toUpperCase()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleSignOut() {
    if (pending) return
    setOpen(false)
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <nav className="max-w-[1200px] mx-auto px-6 py-5">
      <div className="rounded-[28px] border border-ink-black/10 bg-soft-cream/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <Link href="/library" className="font-display text-xl font-extrabold tracking-tight">
              SharpMind
            </Link>
            <PrimaryNavLinks />
          </div>
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <CuePill tone="neutral">{streak > 0 ? `Day ${streak}` : 'Day 1'}</CuePill>
            <div ref={wrapRef} className="relative">
              <button
                type="button"
                aria-label={`${fullName} menu`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex size-9 items-center justify-center rounded-full bg-paper-white font-display text-sm font-bold transition-transform hover:brightness-95 active:scale-[0.98]"
              >
                {initial}
              </button>
              {open && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-44 rounded-card border border-ink-black/10 bg-paper-white p-1"
                  style={{ boxShadow: 'var(--shadow-card-flip)' }}
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleSignOut}
                    disabled={pending}
                    className="block w-full rounded-input px-3 py-2 text-left font-body text-sm text-alert-coral hover:bg-alert-coral/10 disabled:opacity-50"
                  >
                    {pending ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
