import { describe, expect, it } from 'vitest'
import { normalizeDeckTags } from './tags'

describe('deck tags', () => {
  it('normalizes comma-separated tags by trimming, lowercasing, and deduplicating', () => {
    expect(normalizeDeckTags(' Algebra, calculus, algebra ,  geometry ')).toEqual([
      'algebra',
      'calculus',
      'geometry',
    ])
  })

  it('drops empty tags and caps the list to six items', () => {
    expect(
      normalizeDeckTags('a,,b,c,d,e,f,g'),
    ).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('clips long tags to a readable maximum length', () => {
    expect(normalizeDeckTags('supercalifragilisticexpialidocious')).toEqual([
      'supercalifragilisticexp',
    ])
  })
})
