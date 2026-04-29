import { createCanvas } from '@napi-rs/canvas'

export type RenderedPageImage = {
  index: number
  imageBase64: string
  mimeType: 'image/png'
}

export const OCR_PAGE_LIMIT = 12
const OCR_RENDER_SCALE = 1.8

export async function renderPdfPagesForOcr(buffer: Buffer): Promise<RenderedPageImage[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
  })
  const pdf = await loadingTask.promise
  const pageCount = Math.min(pdf.numPages, OCR_PAGE_LIMIT)
  const images: RenderedPageImage[] = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const context = canvas.getContext('2d')

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise

    images.push({
      index: pageNumber - 1,
      imageBase64: canvas.toBuffer('image/png').toString('base64'),
      mimeType: 'image/png',
    })
  }

  await pdf.destroy()
  return images
}
