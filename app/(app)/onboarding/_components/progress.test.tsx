import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OnboardingProgress } from './progress'

describe('OnboardingProgress', () => {
  it('uses calm motion for the step meter', () => {
    const { container } = render(<OnboardingProgress step={2} total={3} />)

    expect(screen.getByRole('navigation', { name: 'Onboarding progress' })).toBeInTheDocument()
    expect(screen.getByText('Subject')).toBeInTheDocument()
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.getByText('Goal')).toBeInTheDocument()
    expect(screen.getByText('Level').closest('.motion-premium-choice')).toHaveClass(
      'border-2',
      'border-ink-black',
    )
    expect(container.querySelector('[data-motion-stage="onboarding-progress"]')).toHaveClass(
      'motion-premium-reveal',
    )
  })
})
