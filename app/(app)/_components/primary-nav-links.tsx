'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/library', label: 'Library' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
] as const

export function PrimaryNavLinks({ className = '' }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div
      data-testid="primary-nav-links"
      className={[
        'grid w-full grid-cols-3 gap-1 overflow-x-auto rounded-[18px] border border-ink-black/10 bg-paper-white/85 p-1 sm:inline-flex sm:w-auto sm:items-center sm:gap-2 sm:rounded-full',
        className,
      ].join(' ')}
    >
      {LINKS.map((link) => {
        const active = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'min-w-0 rounded-full px-2 py-2 text-center font-body text-xs font-semibold transition-colors sm:px-4 sm:text-sm',
              active
                ? 'bg-cue-yellow text-ink-black'
                : 'text-ink-black/65 hover:bg-soft-cream hover:text-ink-black',
            ].join(' ')}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
