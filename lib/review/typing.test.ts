import { describe, expect, it } from 'vitest'
import { checkTypedAnswer, supportsTypingChallenge } from './typing'

describe('review/typing', () => {
  it('only enables typing for short single-line answers', () => {
    expect(supportsTypingChallenge('2x')).toBe(true)
    expect(supportsTypingChallenge('neural network')).toBe(true)
    expect(supportsTypingChallenge('')).toBe(false)
    expect(supportsTypingChallenge('This answer is intentionally too long to fit the typing challenge gate cleanly')).toBe(false)
    expect(supportsTypingChallenge('line one\nline two')).toBe(false)
  })

  it('treats normalized exact matches as correct', () => {
    expect(checkTypedAnswer('Newton\'s second law', 'newtons second law')).toEqual({
      empty: false,
      exact: true,
      close: false,
    })
    expect(checkTypedAnswer('2x', '2 x')).toEqual({
      empty: false,
      exact: true,
      close: false,
    })
  })

  it('marks partial shortfall answers as close instead of exact', () => {
    expect(checkTypedAnswer('photosynthesis', 'photo')).toEqual({
      empty: false,
      exact: false,
      close: true,
    })
  })

  it('flags empty submissions', () => {
    expect(checkTypedAnswer('2x', '   ')).toEqual({
      empty: true,
      exact: false,
      close: false,
    })
  })
})
