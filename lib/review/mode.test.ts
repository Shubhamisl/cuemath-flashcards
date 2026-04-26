import { describe, expect, it } from 'vitest'
import { labelForMode, parseReviewMode, sprintSizeForMode } from './mode'

describe('review/mode', () => {
  it('normalizes unknown modes to standard', () => {
    expect(parseReviewMode(undefined)).toBe('standard')
    expect(parseReviewMode('nope')).toBe('standard')
  })

  it('accepts quick mode', () => {
    expect(parseReviewMode('quick')).toBe('quick')
  })

  it('maps mode to sprint size and label', () => {
    expect(sprintSizeForMode('standard')).toBe(20)
    expect(sprintSizeForMode('quick')).toBe(5)
    expect(labelForMode('quick')).toBe('Quick 5')
  })
})
