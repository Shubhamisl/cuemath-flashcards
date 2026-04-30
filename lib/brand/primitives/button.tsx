import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-display font-bold transition-transform duration-tap active:translate-x-0.5 active:translate-y-0.5 min-h-[48px] px-6 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'cue-primary-block bg-cue-yellow text-ink-black hover:brightness-95',
        ghost: 'bg-paper-white text-ink-black border border-ink-black hover:bg-soft-cream',
        pill: 'bg-cue-yellow text-ink-black rounded-full px-8',
      },
      size: {
        default: 'text-base',
        sm: 'min-h-[40px] text-sm px-4',
        lg: 'text-lg px-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface CueButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const CueButton = React.forwardRef<HTMLButtonElement, CueButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
CueButton.displayName = 'CueButton'
