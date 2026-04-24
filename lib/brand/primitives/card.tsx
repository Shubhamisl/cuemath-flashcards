import * as React from 'react'
import { cn } from '@/lib/utils'
import { subjectFamily, subjectTint } from '@/lib/brand/tokens'

export interface CueCardProps extends React.HTMLAttributes<HTMLDivElement> {
  subject?: subjectFamily
}

export const CueCard = React.forwardRef<HTMLDivElement, CueCardProps>(
  ({ subject, className, style, children, ...props }, ref) => {
    const tintStyle = subject ? { backgroundColor: subjectTint(subject), ...style } : style
    const base = 'rounded-card p-6 shadow-sm'
    return (
      <div
        ref={ref}
        style={tintStyle}
        className={cn(base, !subject && 'bg-paper-white', className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)
CueCard.displayName = 'CueCard'
