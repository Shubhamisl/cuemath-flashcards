import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CuePill } from './pill'

describe('CuePill', () => {
  it('renders children in a rounded pill', () => {
    render(<CuePill>Fresh</CuePill>)
    const pill = screen.getByText('Fresh')
    expect(pill.className).toMatch(/rounded-full/)
  })

  it('applies tone colors', () => {
    render(<CuePill tone="success">Got it</CuePill>)
    expect(screen.getByText('Got it').className).toMatch(/bg-mint-green/)
  })

  it('defaults to soft-cream tone', () => {
    render(<CuePill>Neutral</CuePill>)
    expect(screen.getByText('Neutral').className).toMatch(/bg-soft-cream/)
  })
})
