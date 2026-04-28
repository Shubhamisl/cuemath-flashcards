import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OnboardingProgress } from './progress'

describe('OnboardingProgress', () => {
  it('uses calm motion for the step meter', () => {
    const { container } = render(<OnboardingProgress step={2} total={3} />)

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(container.querySelector('[data-motion-stage="onboarding-progress"]')).toHaveClass(
      'motion-premium-reveal',
    )
    expect(container.querySelector('[data-motion-stage="onboarding-progress-bar"]')).toHaveClass(
      'motion-premium-progress',
    )
  })
})
