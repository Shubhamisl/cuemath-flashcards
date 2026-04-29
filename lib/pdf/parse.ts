import PDFParser from 'pdf2json'

export type ParsedPage = {
  index: number
  text: string
  source?: 'pdf-text' | 'ocr'
}

export function hasUsefulPdfText(pages: ParsedPage[], minChars = 40): boolean {
  const totalChars = pages.reduce(
    (sum, page) => sum + page.text.replace(/\s+/g, '').length,
    0,
  )
  return totalChars >= minChars
}

/**
 * Extract per-page text from a PDF buffer using pdf2json.
 *
 * Why pdf2json: it's pure JavaScript with no DOM globals, no canvas/worker
 * dependencies, and no `pdfjs-dist` runtime asset resolution. Unlike
 * `pdf-parse` v2 (which wraps pdfjs-dist), it ships cleanly to Vercel's
 * serverless runtime — no DOMMatrix polyfills, no worker file tracing.
 *
 * The library is event-driven; we wrap it in a Promise.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, true) // `true` enables `getRawTextContent`-style page text
    parser.on('pdfParser_dataError', (err) => {
      const msg = (err as { parserError?: Error }).parserError?.message ?? 'pdf2json error'
      reject(new Error(msg))
    })
    parser.on('pdfParser_dataReady', () => {
      const raw = parser.getRawTextContent()
      // pdf2json separates pages with this exact marker. Split, trim, drop empty trailing splits.
      const pageTexts = raw.split(/-{5,}Page \(\d+\) Break-{5,}/)
      const pages: ParsedPage[] = pageTexts
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter((t) => t.length > 0)
        .map((text, index) => ({ index, text, source: 'pdf-text' as const }))
      resolve(pages)
    })
    parser.parseBuffer(buffer)
  })
}
