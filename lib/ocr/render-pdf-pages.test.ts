import { describe, expect, it } from 'vitest'
import { OCR_PAGE_LIMIT } from './render-pdf-pages'

describe('OCR_PAGE_LIMIT', () => {
  it('caps OCR to 12 pages initially', () => {
    expect(OCR_PAGE_LIMIT).toBe(12)
  })
})
