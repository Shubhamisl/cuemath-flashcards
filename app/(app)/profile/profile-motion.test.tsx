import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileChoice, ProfilePanel, ProfileSummaryTile } from './profile-motion'

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

describe('profile motion primitives', () => {
  it('marks animated profile surfaces with stable motion hooks', () => {
    render(
      <div>
        <ProfilePanel index={0}>Identity</ProfilePanel>
        <ProfileSummaryTile index={1}>20 cards</ProfileSummaryTile>
        <ProfileChoice index={2} type="button">
          Math
        </ProfileChoice>
      </div>,
    )

    expect(screen.getByText('Identity')).toHaveAttribute('data-motion', 'profile-panel')
    expect(screen.getByText('20 cards')).toHaveAttribute('data-motion', 'profile-summary-tile')
    expect(screen.getByRole('button', { name: 'Math' })).toHaveAttribute('data-motion', 'profile-choice')
  })
})
