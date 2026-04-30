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
  })
})
