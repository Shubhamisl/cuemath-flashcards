'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/library', label: 'Library' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
] as const

export function PrimaryNavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-ink-black/10 bg-paper-white/85 p-1">
      {LINKS.map((link) => {
        const active = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors',
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
