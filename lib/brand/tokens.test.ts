import { describe, it, expect } from 'vitest'
import { colors, radius, motion, subjectFamily, subjectTint } from './tokens'

describe('brand tokens', () => {
  it('exposes the 8 Cuemath colors with exact hex values', () => {
    expect(colors.cueYellow).toBe('#FFBA07')
    expect(colors.inkBlack).toBe('#000000')
    expect(colors.paperWhite).toBe('#FFFFFF')
    expect(colors.softCream).toBe('#FFF1CC')
    expect(colors.mintGreen).toBe('#D0FBE5')
    expect(colors.bubblePink).toBe('#FFE0FD')
    expect(colors.trustBlue).toBe('#DBEAFE')
    expect(colors.alertCoral).toBe('#F97373')
  })

  it('exposes radius tokens', () => {
    expect(radius.input).toBe('12px')
    expect(radius.card).toBe('24px')
    expect(radius.panel).toBe('32px')
  })

  it('exposes motion tokens', () => {
    expect(motion.tap).toBe('120ms')
    expect(motion.progress).toBe('400ms')
  })

  it('maps every subject family to a pastel tint', () => {
    const families: subjectFamily[] = ['math', 'language', 'science', 'humanities', 'other']
    for (const f of families) {
      expect(subjectTint(f)).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('maps math→cream, language→pink, science→mint, humanities→blue, other→cream', () => {
    expect(subjectTint('math')).toBe('#FFF1CC')
    expect(subjectTint('language')).toBe('#FFE0FD')
    expect(subjectTint('science')).toBe('#D0FBE5')
    expect(subjectTint('humanities')).toBe('#DBEAFE')
    expect(subjectTint('other')).toBe('#FFF1CC')
  })
})
