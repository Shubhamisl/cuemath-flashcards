import { describe, it, expect } from 'vitest'
import { chunkPages } from './chunk'

describe('chunkPages', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ index: i, text: `p${i}` }))

  it('groups into batches of 10 by default', () => {
    expect(chunkPages(mk(25))).toHaveLength(3)
  })

  it('respects custom batch size', () => {
    expect(chunkPages(mk(6), 2)).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(chunkPages([])).toEqual([])
  })

  it('each batch carries its start page index', () => {
    const batches = chunkPages(mk(25), 10)
    expect(batches[0].startPage).toBe(0)
    expect(batches[1].startPage).toBe(10)
    expect(batches[2].startPage).toBe(20)
  })
})
