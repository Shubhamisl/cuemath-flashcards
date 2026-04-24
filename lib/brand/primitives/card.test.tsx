import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CueCard } from './card'

describe('CueCard', () => {
  it('renders children with card radius', () => {
    render(<CueCard>hello</CueCard>)
    const card = screen.getByText('hello').closest('div')!
    expect(card.className).toMatch(/rounded-card/)
  })

  it('applies subject tint when family provided', () => {
    render(<CueCard subject="science">sci</CueCard>)
    const card = screen.getByText('sci').closest('div')!
    expect(card.style.backgroundColor.toLowerCase()).toContain('208, 251, 229')
  })

  it('defaults to paper-white background when no subject', () => {
    render(<CueCard>plain</CueCard>)
    const card = screen.getByText('plain').closest('div')!
    expect(card.className).toMatch(/bg-paper-white/)
  })
})
