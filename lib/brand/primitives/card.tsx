import * as React from 'react'
import { cn } from '@/lib/utils'
import { subjectFamily, subjectTint } from '@/lib/brand/tokens'

export type CueCardTone = 'paper' | 'cream' | 'mint' | 'pink' | 'blue' | 'highlight'

const toneClass: Record<CueCardTone, string> = {
  paper: 'bg-paper-white',
  cream: 'bg-soft-cream',
  mint: 'bg-mint-green',
  pink: 'bg-bubble-pink',
  blue: 'bg-trust-blue',
  highlight: 'bg-cue-yellow',
}

export interface CueCardProps extends React.HTMLAttributes<HTMLDivElement> {
  subject?: subjectFamily
  tone?: CueCardTone
}

export const CueCard = React.forwardRef<HTMLDivElement, CueCardProps>(
  ({ subject, tone, className, style, children, ...props }, ref) => {
    // `subject` (legacy ergonomic) wins for the inline-style tint; otherwise tone class applies.
    const tintStyle = subject ? { backgroundColor: subjectTint(subject), ...style } : style
    const base = 'rounded-card p-6 shadow-sm'
    return (
      <div
        ref={ref}
        style={tintStyle}
        className={cn(
          base,
          !subject && (tone ? toneClass[tone] : 'bg-paper-white'),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)
CueCard.displayName = 'CueCard'
