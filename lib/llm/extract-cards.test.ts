import { describe, it, expect } from 'vitest'
import {
  buildExtractionPrompt,
  buildLearningUnitPrompt,
  parseExtractionResponse,
  shouldRetryExtractionWithFallback,
} from './extract-cards'

describe('buildLearningUnitPrompt', () => {
  it('embeds page texts with page markers', () => {
    const p = buildLearningUnitPrompt([{ index: 3, text: 'Hello' }, { index: 4, text: 'World' }])
    expect(p).toContain('--- Page 3 ---')
    expect(p).toContain('Hello')
    expect(p).toContain('--- Page 4 ---')
    expect(p).toContain('World')
  })
})

describe('buildExtractionPrompt', () => {
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

  it('lists the supported text-only card formats', () => {
    const p = buildExtractionPrompt({ pages: [], alreadyCarded: [], remainingBudget: 3 })
    expect(p).toContain('qa | cloze | worked_example')
    expect(p).toContain('Do not use image_occlusion')
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
    expect(parsed.cards[0].format).toBe('qa')
  })

  it('parses cloze cards', () => {
    const raw = JSON.stringify({
      cards: [
        {
          format: 'cloze',
          front: 'The derivative of x^2 is ___.',
          back: '2x',
          concept_tag: 'derivative_power_rule',
          source_page: 0,
        },
      ],
    })
    const parsed = parseExtractionResponse(raw)
    expect(parsed.cards[0].format).toBe('cloze')
  })

  it('parses worked example cards', () => {
    const raw = JSON.stringify({
      cards: [
        {
          format: 'worked_example',
          front: 'What is the next step after isolating x?',
          back: 'Substitute the value back into the original equation and verify it.',
          concept_tag: 'equation_checking',
          source_page: 1,
        },
      ],
    })
    const parsed = parseExtractionResponse(raw)
    expect(parsed.cards[0].format).toBe('worked_example')
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n{"cards":[{"front":"Q","back":"A","concept_tag":"t","source_page":0}]}\n```'
    expect(parseExtractionResponse(raw).cards).toHaveLength(1)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseExtractionResponse('not json')).toThrow()
  })
})

describe('shouldRetryExtractionWithFallback', () => {
  it('retries OpenRouter truncation errors', () => {
    expect(
      shouldRetryExtractionWithFallback(
        new Error('OpenRouter chat truncated (finish_reason=length, content=null). The model exhausted its output budget.'),
      ),
    ).toBe(true)
  })

  it('retries malformed length-limited reasoning payloads', () => {
    expect(
      shouldRetryExtractionWithFallback(
        new Error(
          'OpenRouter chat malformed response: {"choices":[{"finish_reason":"length","message":{"content":null,"reasoning":"..."} }]}',
        ),
      ),
    ).toBe(true)
  })

  it('does not retry unrelated provider failures', () => {
    expect(shouldRetryExtractionWithFallback(new Error('OPENROUTER_API_KEY missing'))).toBe(false)
  })
})
