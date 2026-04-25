export type ParsedPage = { index: number; text: string }

/**
 * Extract per-page text from a PDF buffer using pdf-parse v2.
 *
 * pdf-parse v2 wraps pdfjs-dist, which references DOMMatrix / ImageData /
 * Path2D at module-load time. Those globals exist in browsers but not in the
 * Vercel serverless Node runtime, so we install no-op stubs before the import.
 * We only extract text — no rendering — so the stubs never get exercised.
 *
 * The dynamic `import()` is intentional: it ensures the polyfill runs before
 * pdfjs-dist is evaluated. A static import would hoist pdfjs-dist evaluation
 * above the polyfill and re-trigger the original `DOMMatrix is not defined`
 * crash.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const g = globalThis as unknown as Record<string, unknown>
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class {}
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class {}
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class {}
  }

  const { PDFParse } = await import('pdf-parse')
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
