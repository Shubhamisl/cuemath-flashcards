import { ocrPageImage } from '@/lib/ocr/openrouter-ocr'
import { renderPdfPagesForOcr } from '@/lib/ocr/render-pdf-pages'
import { hasUsefulPdfText, parsePdf, type ParsedPage } from './parse'

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    return await fn()
  }
}

export async function parsePdfWithOcrFallback(
  buffer: Buffer,
  options: { onOcrStart?: () => Promise<void> | void } = {},
): Promise<ParsedPage[]> {
  const textPages = await parsePdf(buffer)
  if (hasUsefulPdfText(textPages)) return textPages

  await options.onOcrStart?.()
  const rendered = await renderPdfPagesForOcr(buffer)
  const pages = await Promise.all(
    rendered.map(async (page) => ({
      index: page.index,
      text: await withRetry(() =>
        ocrPageImage({
          imageBase64: page.imageBase64,
          mimeType: page.mimeType,
          pageIndex: page.index,
        }),
      ),
      source: 'ocr' as const,
    })),
  )
  const usefulPages = pages.filter((page) => page.text.trim().length > 0)
  if (!hasUsefulPdfText(usefulPages)) {
    throw new Error('OCR found no readable text in this scanned PDF.')
  }
  return usefulPages
}
