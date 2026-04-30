import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LibraryHero } from './library-hero'

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

vi.mock('@/components/upload-modal', () => ({
  UploadModal: () => <button type="button">Upload PDF</button>,
}))

describe('LibraryHero', () => {
  it('renders progress and only shows study actions when cards are due', () => {
    const { rerender } = render(
      <LibraryHero
        name="Shubham"
        doneToday={7}
        dailyGoal={20}
        progressPct={35}
        globalDueNowCount={9}
      />,
    )

    expect(screen.getByText('Hi, Shubham')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveClass('motion-premium-reveal')
    expect(screen.getByRole('banner')).toHaveClass('cue-grid-hero')
    expect(screen.getByTestId('library-hero-stats')).toHaveClass('grid-cols-1')
    expect(screen.getByTestId('library-hero-stats')).toHaveClass('sm:grid-cols-3')
    expect(screen.getByText('Goal: 20 cards today')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Due Today')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review all due' })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'Quick 5' })).toHaveAttribute('href', '/review?mode=quick')
    expect(screen.getByRole('button', { name: 'Upload PDF' })).toBeInTheDocument()

    rerender(
      <LibraryHero
        name="Shubham"
        doneToday={7}
        dailyGoal={20}
        progressPct={35}
        globalDueNowCount={0}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Review all due' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Quick 5' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload PDF' })).toBeInTheDocument()
  })
})
