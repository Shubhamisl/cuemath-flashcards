# Image-Only PDF OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OCR for scanned/image-only PDF uploads while keeping selectable-text PDFs on the current fast `pdf2json` path.

**Architecture:** Wrap the current PDF parser with a fallback parser that detects textless PDFs, renders capped PDF pages to images, sends those images to OpenRouter `baidu/qianfan-ocr-fast:free`, and returns normal `ParsedPage[]` data to the existing ingest pipeline.

**Tech Stack:** Next.js 16.2, Node server runtime, Supabase Storage, OpenRouter chat completions, `pdf2json`, Vitest.

---

## Task 1: Text-Usefulness Detection

**Files:**
- Modify: `lib/pdf/parse.ts`
- Test: `lib/pdf/parse.test.ts`

- [ ] **Step 1: Add parser metadata and detection helpers**

In `lib/pdf/parse.ts`, extend the parsed page shape without breaking existing callers:

```ts
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
```

Update `parsePdf()` page mapping so selectable-text pages include `source: 'pdf-text'`.

- [ ] **Step 2: Add tests**

Add these cases to `lib/pdf/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hasUsefulPdfText } from './parse'

describe('hasUsefulPdfText', () => {
  it('rejects empty or tiny extracted text', () => {
    expect(hasUsefulPdfText([])).toBe(false)
    expect(hasUsefulPdfText([{ index: 0, text: '  12 ', source: 'pdf-text' }])).toBe(false)
  })

  it('accepts normal extracted page text', () => {
    expect(
      hasUsefulPdfText([
        {
          index: 0,
          text: 'Quadratic equations can be solved by factoring or by using the quadratic formula.',
          source: 'pdf-text',
        },
      ]),
    ).toBe(true)
  })
})
```

- [ ] **Step 3: Run parser tests**

Run: `pnpm test -- lib/pdf/parse.test.ts`

Expected: parser tests pass.

## Task 2: OpenRouter OCR Client

**Files:**
- Create: `lib/ocr/openrouter-ocr.ts`
- Test: `lib/ocr/openrouter-ocr.test.ts`

- [ ] **Step 1: Create OCR client**

Create `lib/ocr/openrouter-ocr.ts`:

```ts
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const DEFAULT_OCR_MODEL = 'baidu/qianfan-ocr-fast:free'

export function cleanOcrText(raw: string): string {
  return raw
    .replace(/^\s*```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/\r\n/g, '\n')
    .trim()
}

export async function ocrPageImage(args: {
  imageBase64: string
  mimeType: 'image/png' | 'image/jpeg'
  pageIndex: number
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

  const model = process.env.OCR_MODEL ?? DEFAULT_OCR_MODEL
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cuemath-flashcards.local',
      'X-Title': 'Cuemath Flashcards OCR',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Extract all readable text from this document page. Preserve reading order, headings, equations, symbols, and numbered steps. Return plain text only.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${args.mimeType};base64,${args.imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 6000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter OCR failed: ${response.status}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('OpenRouter OCR returned no text')
  return cleanOcrText(content)
}
```

- [ ] **Step 2: Add tests**

Create `lib/ocr/openrouter-ocr.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cleanOcrText, DEFAULT_OCR_MODEL } from './openrouter-ocr'

describe('cleanOcrText', () => {
  it('strips fences and trims text', () => {
    expect(cleanOcrText('```text\nHello\n```')).toBe('Hello')
  })
})

describe('DEFAULT_OCR_MODEL', () => {
  it('uses the free Qianfan OCR model', () => {
    expect(DEFAULT_OCR_MODEL).toBe('baidu/qianfan-ocr-fast:free')
  })
})
```

- [ ] **Step 3: Run OCR tests**

Run: `pnpm test -- lib/ocr/openrouter-ocr.test.ts`

Expected: OCR client tests pass without live network calls.

## Task 3: PDF Page Rendering Boundary

**Files:**
- Create: `lib/ocr/render-pdf-pages.ts`
- Test: `lib/ocr/render-pdf-pages.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Choose renderer package**

Use a Vercel-compatible renderer. Start by evaluating `pdfjs-dist` in Node only if the current Next build supports it cleanly. If `pdfjs-dist` causes worker/canvas issues, use a package that renders PDF pages to image buffers in Node and document the reason in a code comment.

Install the chosen renderer with pnpm.

- [ ] **Step 2: Create rendering interface**

Create `lib/ocr/render-pdf-pages.ts`:

```ts
export type RenderedPageImage = {
  index: number
  imageBase64: string
  mimeType: 'image/png'
}

export const OCR_PAGE_LIMIT = 12

export async function renderPdfPagesForOcr(buffer: Buffer): Promise<RenderedPageImage[]> {
  // Implement with the selected renderer.
  // Return at most OCR_PAGE_LIMIT page images.
  throw new Error('renderPdfPagesForOcr not implemented')
}
```

Replace the placeholder in the implementation step once the renderer is selected.

- [ ] **Step 3: Add limit test**

Add a unit test that mocks the renderer internals or extracts a pure limiter helper:

```ts
import { describe, expect, it } from 'vitest'
import { OCR_PAGE_LIMIT } from './render-pdf-pages'

describe('OCR_PAGE_LIMIT', () => {
  it('caps OCR to 12 pages initially', () => {
    expect(OCR_PAGE_LIMIT).toBe(12)
  })
})
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`

Expected: build passes with the selected renderer dependency.

## Task 4: Fallback Parser

**Files:**
- Create: `lib/pdf/parse-with-ocr.ts`
- Test: `lib/pdf/parse-with-ocr.test.ts`

- [ ] **Step 1: Implement fallback parser**

Create `lib/pdf/parse-with-ocr.ts`:

```ts
import { parsePdf, hasUsefulPdfText, type ParsedPage } from './parse'
import { renderPdfPagesForOcr } from '@/lib/ocr/render-pdf-pages'
import { ocrPageImage } from '@/lib/ocr/openrouter-ocr'

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    return await fn()
  }
}

export async function parsePdfWithOcrFallback(buffer: Buffer): Promise<ParsedPage[]> {
  const textPages = await parsePdf(buffer)
  if (hasUsefulPdfText(textPages)) return textPages

  const rendered = await renderPdfPagesForOcr(buffer)
  const pages = await Promise.all(
    rendered.map(async (page) => ({
      index: page.index,
      text: await withRetry(() => ocrPageImage(page)),
      source: 'ocr' as const,
    })),
  )
  const usefulPages = pages.filter((page) => page.text.trim().length > 0)
  if (!hasUsefulPdfText(usefulPages)) {
    throw new Error('OCR found no readable text in this scanned PDF.')
  }
  return usefulPages
}
```

- [ ] **Step 2: Add fallback tests with mocks**

Mock `parsePdf`, `renderPdfPagesForOcr`, and `ocrPageImage`.

Test cases:

```ts
it('returns pdf text pages without OCR when text is useful')
it('runs OCR when parsed PDF text is empty')
it('throws a clear error when OCR returns no useful text')
```

- [ ] **Step 3: Run fallback tests**

Run: `pnpm test -- lib/pdf/parse-with-ocr.test.ts`

Expected: fallback behavior passes.

## Task 5: Ingest Pipeline Integration

**Files:**
- Modify: `lib/ingest/job.ts`
- Modify: `lib/ingest/pipeline.ts`
- Test: existing ingest diagnostics tests if stage labels depend on enum values

- [ ] **Step 1: Add OCR ingest stage**

In `lib/ingest/job.ts`, add `'ocr'` to `IngestStage`.

- [ ] **Step 2: Use fallback parser**

In `lib/ingest/pipeline.ts`, replace:

```ts
import { parsePdf } from '../pdf/parse'
```

with:

```ts
import { parsePdfWithOcrFallback } from '../pdf/parse-with-ocr'
```

Then replace:

```ts
const pages = await withRetry(() => parsePdf(buffer), 'parsePdf')
```

with:

```ts
const pages = await withRetry(() => parsePdfWithOcrFallback(buffer), 'parsePdfWithOcrFallback')
```

Keep the existing `if (pages.length === 0)` guard.

- [ ] **Step 3: Update progress around OCR**

If the fallback parser exposes whether OCR ran, update progress to `ocr` before rendering/calling OpenRouter. If not, keep the first version simple and rely on parser errors. Preferred follow-up: return `{ pages, usedOcr }`.

- [ ] **Step 4: Run ingest-related tests**

Run:

```bash
pnpm test -- lib/pdf lib/ocr lib/ingest
```

Expected: all targeted tests pass.

## Task 6: Final Verification

- [ ] **Step 1: Run full tests**

Run: `pnpm test -- --exclude '.claude/**'`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: no errors.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: build passes on Next.js 16.2.4.

- [ ] **Step 4: Manual smoke**

Upload:

- a normal text-based PDF and confirm OCR is not invoked
- a scanned/image-only PDF and confirm OCR is invoked

Expected: both produce draft cards or a clear failure message.

## Self-Review

- Spec coverage: plan covers image-only detection, OpenRouter Qianfan OCR, fallback parsing, ingest integration, limits, errors, and tests.
- Placeholder scan: the rendering task intentionally requires selecting a renderer during implementation because Vercel compatibility must be verified against this repo. The plan names the decision point and requires build verification before integration.
- Type consistency: parser returns `ParsedPage[]`; OCR pages use `source: 'ocr'`; downstream card extraction remains unchanged.
