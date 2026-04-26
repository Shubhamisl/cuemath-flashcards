import { describe, expect, it } from 'vitest'
import { buildHintFromBack } from './hints'

describe('cards/hints', () => {
  it('returns null for empty answers', () => {
    expect(buildHintFromBack('   ')).toBeNull()
  })

  it('summarizes single-word answers by first letter and length', () => {
    expect(buildHintFromBack('Derivative')).toBe('Starts with D - 10 letters')
  })

  it('summarizes multi-word answers by initials and word count', () => {
    expect(buildHintFromBack('neural network')).toBe('Starts with N N - 2 words')
  })

  it('summarizes numeric answers by digit count', () => {
    expect(buildHintFromBack('4096')).toBe('Number with 4 digits')
  })
})
