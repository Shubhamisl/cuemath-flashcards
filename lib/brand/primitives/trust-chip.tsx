import * as React from 'react'
import { cn } from '@/lib/utils'

export function TrustChip({
  icon,
  label,
  className,
}: {
  icon?: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-full bg-soft-cream text-ink-black text-sm font-medium',
        className,
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}</span>
    </div>
  )
}
