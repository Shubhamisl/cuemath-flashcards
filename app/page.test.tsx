import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Home from './page'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe('landing page', () => {
  it('presents a branded Cuemath grid-minimal landing page', () => {
    const { container } = render(<Home />)

    expect(screen.getByRole('link', { name: 'CUEMATH' })).toHaveAttribute('href', '/')
    expect(screen.getByTestId('landing-topbar')).toHaveClass('px-3')
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveClass('min-w-[132px]')
    expect(screen.getByRole('link', { name: 'Study flow' })).toHaveAttribute('href', '#how-it-works')
    expect(screen.getByRole('link', { name: 'Study flow' })).toHaveClass('border-r')
    expect(screen.queryByRole('link', { name: 'Proof' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Inside the app' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Turn study material into MathFit memory sprints',
    )
    expect(container.querySelector('main')).toHaveClass('cue-grid-surface')

    const collage = screen.getByTestId('landing-product-collage')
    expect(collage).toHaveClass('cue-hard-panel')
    expect(collage).toHaveTextContent('PDF upload')
    expect(collage).toHaveTextContent('Review queue')

    expect(screen.getByText('Smart cards')).toBeInTheDocument()
    expect(screen.getByText('Spaced review')).toBeInTheDocument()
    expect(screen.getByText('Built for focus')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Recall confidence' })).toBeInTheDocument()
  })
})
