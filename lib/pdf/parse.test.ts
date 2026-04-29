import { describe, expect, it } from 'vitest'
import { hasUsefulPdfText } from './parse'

describe('hasUsefulPdfText', () => {
  it('rejects empty or tiny extracted text', () => {
    expect(hasUsefulPdfText([])).toBe(false)
    expect(hasUsefulPdfText([{ index: 0, text: '  12 ', source: 'pdf-text' }])).toBe(false)
  })

  it('accepts normal extracted page text', () => {
    expect(
      hasUsefulPdfText([
        {
          index: 0,
          text: 'Quadratic equations can be solved by factoring or by using the quadratic formula.',
          source: 'pdf-text',
        },
      ]),
    ).toBe(true)
  })
})
