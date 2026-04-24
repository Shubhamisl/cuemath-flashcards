import type { ParsedPage } from './parse'

export type PageBatch = { startPage: number; pages: ParsedPage[] }

export function chunkPages(pages: ParsedPage[], size = 10): PageBatch[] {
  const out: PageBatch[] = []
  for (let i = 0; i < pages.length; i += size) {
    out.push({ startPage: i, pages: pages.slice(i, i + size) })
  }
  return out
}
