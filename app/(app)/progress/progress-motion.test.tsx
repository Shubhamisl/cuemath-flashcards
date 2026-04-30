import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ProgressBar,
  ProgressHeatCell,
  ProgressListItem,
  ProgressPanel,
  ProgressStatTile,
} from './progress-motion'

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

describe('progress motion primitives', () => {
  it('marks animated progress surfaces with stable motion hooks', () => {
    render(
      <div>
        <ProgressPanel index={0} data-testid="progress-panel">
          Study rhythm
        </ProgressPanel>
        <ProgressStatTile index={1}>Due now</ProgressStatTile>
        <ProgressBar index={2} height={84} label="Mon: 4 cards reviewed" className="bar" />
        <ProgressHeatCell index={3} className="cell" aria-label="2026-04-30: 8 cards reviewed" />
        <ProgressListItem index={4}>Weak concept</ProgressListItem>
      </div>,
    )

    expect(screen.getByTestId('progress-panel')).toHaveAttribute('data-motion', 'progress-panel')
    expect(screen.getByText('Due now')).toHaveAttribute('data-motion', 'progress-stat')
    expect(screen.getByLabelText('Mon: 4 cards reviewed')).toHaveAttribute('data-motion', 'progress-bar')
    expect(screen.getByLabelText('2026-04-30: 8 cards reviewed')).toHaveAttribute(
      'data-motion',
      'progress-heat-cell',
    )
    expect(screen.getByText('Weak concept')).toHaveAttribute('data-motion', 'progress-list-item')
  })
})
