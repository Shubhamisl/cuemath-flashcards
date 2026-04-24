import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustChip } from './trust-chip'

describe('TrustChip', () => {
  it('renders label and icon slot', () => {
    render(<TrustChip icon="★" label="4.9+ rating" />)
    expect(screen.getByText('★')).toBeInTheDocument()
    expect(screen.getByText('4.9+ rating')).toBeInTheDocument()
  })

  it('uses soft-cream background', () => {
    render(<TrustChip label="Private" />)
    const chip = screen.getByText('Private').closest('div')!
    expect(chip.className).toMatch(/bg-soft-cream/)
  })
})
