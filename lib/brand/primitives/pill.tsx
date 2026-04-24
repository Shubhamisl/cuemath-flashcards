import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'highlight'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-soft-cream text-ink-black',
  success: 'bg-mint-green text-ink-black',
  warning: 'bg-alert-coral text-ink-black',
  info: 'bg-trust-blue text-ink-black',
  highlight: 'bg-cue-yellow text-ink-black',
}

export interface CuePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function CuePill({ tone = 'neutral', className, children, ...props }: CuePillProps) {
  return (
    <span
      className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', toneClass[tone], className)}
      {...props}
    >
      {children}
    </span>
  )
}
