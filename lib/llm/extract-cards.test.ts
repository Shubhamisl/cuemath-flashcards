import { describe, it, expect } from 'vitest'
import { buildExtractionPrompt, parseExtractionResponse } from './extract-cards'

describe('buildExtractionPrompt', () => {
  it('embeds page texts with page markers', () => {
    const p = buildExtractionPrompt({
      pages: [{ index: 3, text: 'Hello' }, { index: 4, text: 'World' }],
      alreadyCarded: [],
      remainingBudget: 200,
    })
    expect(p).toContain('--- Page 3 ---')
    expect(p).toContain('Hello')
    expect(p).toContain('--- Page 4 ---')
    expect(p).toContain('World')
  })

  it('includes already-carded list when non-empty', () => {
    const p = buildExtractionPrompt({
      pages: [{ index: 0, text: 'x' }],
      alreadyCarded: ['mitosis', 'photosynthesis'],
      remainingBudget: 50,
    })
    expect(p).toContain('mitosis')
    expect(p).toContain('photosynthesis')
  })

  it('passes remaining budget into prompt', () => {
    const p = buildExtractionPrompt({ pages: [], alreadyCarded: [], remainingBudget: 17 })
    expect(p).toContain('17')
  })
})

describe('parseExtractionResponse', () => {
  it('parses well-formed JSON', () => {
    const raw = JSON.stringify({
      cards: [{ front: 'Q1', back: 'A1', concept_tag: 'topic', source_page: 2 }],
    })
    const parsed = parseExtractionResponse(raw)
    expect(parsed.cards).toHaveLength(1)
    expect(parsed.cards[0].front).toBe('Q1')
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n{"cards":[{"front":"Q","back":"A","concept_tag":"t","source_page":0}]}\n```'
    expect(parseExtractionResponse(raw).cards).toHaveLength(1)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseExtractionResponse('not json')).toThrow()
  })
})
