import { PDFParse } from 'pdf-parse'

export type ParsedPage = { index: number; text: string }

/**
 * Extract per-page text from a PDF buffer using pdf-parse v2.
 *
 * pdf-parse v2 exposes a `PDFParse` class (no default export). `getText()`
 * returns a `TextResult` whose `.pages` array holds one `PageTextResult`
 * per page with a `num` (1-based) and `text` property — no `pagerender`
 * hack required.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText({
    // Collapse the default page-boundary marker so we get clean per-page text.
    pageJoiner: '',
  })
  await parser.destroy()

  return result.pages.map((page, i) => ({
    index: i,
    text: page.text.replace(/\s+/g, ' ').trim(),
  }))
}
