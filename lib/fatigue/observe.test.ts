import { describe, it, expect } from 'vitest'
import { observe, type ReviewEvent } from './observe'

function e(rating: 1 | 2 | 3 | 4, elapsedMs: number): ReviewEvent {
  return { rating, elapsedMs, timestamp: 0 }
}

describe('fatigue/observe', () => {
  it('no events → continue', () => {
    expect(observe([], { injectedEasy: false, promptedBreak: false }).action).toBe('continue')
  })

  it('few events → continue', () => {
    const events = [e(3, 4000), e(3, 4000)]
    expect(observe(events, { injectedEasy: false, promptedBreak: false }).action).toBe('continue')
  })

  it('6 consecutive cards with ≥50% Forgot/Tough → inject_easy', () => {
    const events = [
      e(3, 4000), e(3, 4000),
      e(1, 5000), e(2, 5000), e(1, 5000),
      e(3, 4000), e(2, 5000), e(1, 5000),
    ]
    expect(observe(events, { injectedEasy: false, promptedBreak: false }).action).toBe('inject_easy')
  })

  it('inject_easy not repeated if already triggered', () => {
    const events = [
      e(1, 5000), e(1, 5000), e(1, 5000),
      e(2, 5000), e(2, 5000), e(1, 5000),
    ]
    expect(observe(events, { injectedEasy: true, promptedBreak: false }).action).toBe('continue')
  })

  it('response-time balloon → prompt_break', () => {
    const fast = Array.from({ length: 10 }, () => e(3, 3000))
    const slow = Array.from({ length: 10 }, () => e(3, 8000))
    expect(observe([...fast, ...slow], { injectedEasy: false, promptedBreak: false }).action).toBe('prompt_break')
  })

  it('prompt_break not repeated if already triggered', () => {
    const fast = Array.from({ length: 10 }, () => e(3, 3000))
    const slow = Array.from({ length: 10 }, () => e(3, 8000))
    expect(observe([...fast, ...slow], { injectedEasy: false, promptedBreak: true }).action).toBe('continue')
  })

  it('inject_easy takes precedence over prompt_break when both would fire', () => {
    const fast = Array.from({ length: 10 }, () => e(3, 3000))
    const slowAndWrong = Array.from({ length: 10 }, () => e(1, 8000))
    expect(observe([...fast, ...slowAndWrong], { injectedEasy: false, promptedBreak: false }).action).toBe('inject_easy')
  })
})
