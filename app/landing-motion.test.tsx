import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  MotionCollage,
  MotionHeroLine,
  MotionNavLink,
  RecallSlider,
  MotionProofCard,
  MotionSection,
} from './landing-motion'

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
          const Component = tag as keyof React.JSX.IntrinsicElements
          return <Component {...props}>{children}</Component>
        },
    },
  ),
}))

describe('landing motion primitives', () => {
  it('marks the animated landing sections with stable motion hooks', () => {
    render(
      <div>
        <MotionSection data-testid="proof-strip">
          <MotionProofCard index={1}>Smart cards</MotionProofCard>
        </MotionSection>
        <MotionNavLink href="#proof">Proof</MotionNavLink>
        <MotionHeroLine index={2}>memory sprints</MotionHeroLine>
        <MotionCollage>Product collage</MotionCollage>
        <RecallSlider />
      </div>,
    )

    expect(screen.getByTestId('proof-strip')).toHaveAttribute('data-motion', 'section')
    expect(screen.getByText('Smart cards')).toHaveAttribute('data-motion', 'proof-card')
    expect(screen.getByRole('link', { name: 'Proof' })).toHaveAttribute('data-motion', 'nav-link')
    expect(screen.getByText('memory sprints')).toHaveAttribute('data-motion', 'hero-line')
    expect(screen.getByText('Product collage')).toHaveAttribute('data-motion', 'collage')
    expect(screen.getByRole('slider', { name: 'Recall confidence' })).toHaveAttribute('aria-valuenow', '4')
    expect(screen.getByText('4 of 7 recall checkpoints')).toBeInTheDocument()
  })
})
