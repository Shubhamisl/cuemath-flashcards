import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OnboardingLayout from './layout'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

describe('OnboardingLayout', () => {
  it('wraps first-run setup in a branded Cuemath shell', () => {
    const { container } = render(
      <OnboardingLayout>
        <p>Onboarding child</p>
      </OnboardingLayout>,
    )

    expect(container.firstElementChild).toHaveClass('cue-grid-surface')
    expect(screen.getByRole('banner')).toHaveClass('border-b-2', 'border-ink-black')
    expect(screen.getByRole('link', { name: /Cuemath Flashcards/i })).toHaveAttribute('href', '/')
    expect(screen.getByText('Build your study loop')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveClass('max-w-5xl')
  })
})
