'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { CuePill } from '@/lib/brand/primitives/pill'
import { signOut } from '../profile/actions'
import { NavRouteWarmer } from './nav-route-warmer'
import { PrimaryNavLinks } from './primary-nav-links'

export interface TopNavProps {
  name: string
  streak: number
}

export function TopNav({ name, streak }: TopNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const wrapRef = useRef<HTMLDivElement>(null)
  const fullName = name && name.length > 0 ? name : 'there'
  const initial = (fullName[0] ?? '?').toUpperCase()
  const hideNav = pathname?.startsWith('/onboarding')

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

  if (hideNav) {
    return <NavRouteWarmer />
  }

  return (
    <nav className="motion-premium-reveal cue-nav-shell sticky top-0 z-30">
      <NavRouteWarmer />
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6">
        <div
          data-testid="top-nav-layout"
          className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-2 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:py-0"
        >
          <div className="flex min-w-0 items-center gap-3 lg:gap-8">
            <Link
              href="/library"
              className="truncate font-display text-[24px] font-extrabold tracking-tight text-ink-black sm:text-2xl"
            >
              CUEMATH
            </Link>
            <span className="hidden border-l border-ink-black/25 pl-3 text-xs font-display font-bold uppercase tracking-[0.12em] text-ink-black/55 lg:block">
              Flashcards
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 lg:order-3 lg:gap-3">
            <CuePill tone="neutral">{streak > 0 ? `Day ${streak}` : 'Day 1'}</CuePill>
            <div ref={wrapRef} className="relative">
              <button
                type="button"
                aria-label={`${fullName} menu`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex size-9 items-center justify-center rounded-[4px] border border-ink-black bg-paper-white font-display text-sm font-bold transition-transform hover:bg-soft-cream active:translate-x-0.5 active:translate-y-0.5"
              >
                {initial}
              </button>
              {open && (
                <div
                  role="menu"
                  className="motion-premium-modal absolute right-0 z-20 mt-2 w-44 rounded-card border border-ink-black bg-paper-white p-1"
                  style={{ boxShadow: '3px 3px 0 var(--color-ink-black)' }}
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
          <PrimaryNavLinks className="col-span-2 lg:order-2 lg:col-span-1" />
        </div>
      </div>
    </nav>
  )
}
