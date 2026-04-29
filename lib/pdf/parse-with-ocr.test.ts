import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parsePdfWithOcrFallback } from './parse-with-ocr'
import { parsePdf } from './parse'
import { renderPdfPagesForOcr } from '@/lib/ocr/render-pdf-pages'
import { ocrPageImage } from '@/lib/ocr/openrouter-ocr'

vi.mock('./parse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./parse')>()
  return {
    ...actual,
    parsePdf: vi.fn(),
  }
})

vi.mock('@/lib/ocr/render-pdf-pages', () => ({
  renderPdfPagesForOcr: vi.fn(),
}))

vi.mock('@/lib/ocr/openrouter-ocr', () => ({
  ocrPageImage: vi.fn(),
}))

const parsePdfMock = vi.mocked(parsePdf)
const renderPdfPagesForOcrMock = vi.mocked(renderPdfPagesForOcr)
const ocrPageImageMock = vi.mocked(ocrPageImage)

describe('parsePdfWithOcrFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pdf text pages without OCR when text is useful', async () => {
    parsePdfMock.mockResolvedValue([
      {
        index: 0,
        text: 'Quadratic equations can be solved by factoring or by using the quadratic formula.',
        source: 'pdf-text',
      },
    ])

    const pages = await parsePdfWithOcrFallback(Buffer.from('pdf'))

    expect(pages[0].source).toBe('pdf-text')
    expect(renderPdfPagesForOcrMock).not.toHaveBeenCalled()
    expect(ocrPageImageMock).not.toHaveBeenCalled()
  })

  it('runs OCR when parsed PDF text is empty', async () => {
    const onOcrStart = vi.fn()
    parsePdfMock.mockResolvedValue([])
    renderPdfPagesForOcrMock.mockResolvedValue([
      { index: 0, imageBase64: 'abc', mimeType: 'image/png' },
    ])
    ocrPageImageMock.mockResolvedValue(
      'Photosynthesis converts light energy into chemical energy in glucose.',
    )

    const pages = await parsePdfWithOcrFallback(Buffer.from('pdf'), { onOcrStart })

    expect(onOcrStart).toHaveBeenCalledTimes(1)
    expect(renderPdfPagesForOcrMock).toHaveBeenCalledTimes(1)
    expect(ocrPageImageMock).toHaveBeenCalledWith({
      imageBase64: 'abc',
      mimeType: 'image/png',
      pageIndex: 0,
    })
    expect(pages).toEqual([
      {
        index: 0,
        text: 'Photosynthesis converts light energy into chemical energy in glucose.',
        source: 'ocr',
      },
    ])
  })

  it('throws a clear error when OCR returns no useful text', async () => {
    parsePdfMock.mockResolvedValue([])
    renderPdfPagesForOcrMock.mockResolvedValue([
      { index: 0, imageBase64: 'abc', mimeType: 'image/png' },
    ])
    ocrPageImageMock.mockResolvedValue('')

    await expect(parsePdfWithOcrFallback(Buffer.from('pdf'))).rejects.toThrow(
      'OCR found no readable text in this scanned PDF.',
    )
  })
})
