import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CueButton } from './button'

describe('CueButton', () => {
  it('renders primary variant with yellow background', () => {
    render(<CueButton>Start</CueButton>)
    const btn = screen.getByRole('button', { name: 'Start' })
    expect(btn.className).toMatch(/bg-cue-yellow/)
    expect(btn.className).toMatch(/text-ink-black/)
  })

  it('renders ghost variant', () => {
    render(<CueButton variant="ghost">Cancel</CueButton>)
    const btn = screen.getByRole('button', { name: 'Cancel' })
    expect(btn.className).not.toMatch(/bg-cue-yellow/)
    expect(btn.className).toMatch(/border/)
  })

  it('has at least 48px tap target', () => {
    render(<CueButton>Tap</CueButton>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/min-h-\[48px\]/)
  })

  it('fires onClick', async () => {
    let clicked = false
    render(<CueButton onClick={() => { clicked = true }}>Go</CueButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('renders disabled state without yellow background', () => {
    render(<CueButton disabled>Disabled</CueButton>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.className).toMatch(/opacity/)
  })
})
