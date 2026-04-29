# Image-Only PDF OCR Design

## Goal

Support scanned/image-only PDF uploads by automatically detecting when normal PDF text extraction produced no useful text, then using AI OCR through OpenRouter with `baidu/qianfan-ocr-fast:free`.

## Scope

This feature applies only to uploaded PDFs. It does not add direct `.png` or `.jpg` uploads. Normal selectable-text PDFs should keep using the current `pdf2json` parser and should not pay the OCR latency cost.

## Detection

The parser should first run the current `parsePdf(buffer)` flow. OCR should run only when the parsed result is effectively textless:

- zero parsed pages, or
- all parsed page text is below a small useful-text threshold after whitespace normalization.

The initial threshold should be conservative: fewer than `40` total non-whitespace characters across the PDF means “image-only/textless.” This avoids OCR for normal PDFs with real extracted text while still catching scanned worksheets.

## OCR Architecture

Add a parsing fallback layer:

```text
parsePdfWithOcrFallback(buffer)
  -> parsePdf(buffer)
  -> if useful text exists: return pages with source "pdf-text"
  -> render PDF pages to page images
  -> OCR each page image with OpenRouter model baidu/qianfan-ocr-fast:free
  -> return ParsedPage[] with source "ocr"
```

The ingest pipeline should call this fallback parser instead of directly calling `parsePdf`. Downstream card extraction should stay unchanged: OCR output becomes the same `ParsedPage[]` shape used by `chunkPages`, `extractCards`, critique, embeddings, and card insertion.

## Rendering PDF Pages

The OCR model accepts image input, so scanned PDFs must be rendered to page images first. Use a server-compatible PDF renderer that works in Vercel. The implementation should prefer a Node/Vercel-safe package and avoid browser-only canvas assumptions unless the build verifies them.

Render only the pages that need OCR. For the first implementation, if the whole PDF is textless, render all pages up to a fixed cap.

## Limits

To protect latency and free-tier usage:

- OCR at most `12` pages per ingest job initially.
- If a PDF has more than `12` image-only pages, OCR the first `12` pages and continue with those.
- If OCR returns no text, fail the job with a clear message.
- Keep OCR output text only; do not store page images after processing.

## OpenRouter OCR Client

Create a dedicated OCR client separate from the card-generation LLM client:

- model default: `baidu/qianfan-ocr-fast:free`
- env override: `OCR_MODEL`
- provider: OpenRouter using existing `OPENROUTER_API_KEY`
- prompt: ask for plain extracted text only, preserving reading order, formulas, headings, and math notation where possible.

The OCR client should return one `ParsedPage` per image. It should strip markdown fences and avoid passing OCR commentary into card extraction.

## Progress And Diagnostics

Extend ingest status so users can see when OCR is running. The existing stages are `parsing`, `extracting`, `critiquing`, `embedding`, `ready`, and `failed`. Add an `ocr` stage or use `parsing` with diagnostics if schema constraints make adding a stage expensive. Preferred: add `ocr` because it explains why image-only PDFs take longer.

Progress should look like:

- `parsing` at 5%
- `ocr` at 8-25% for image-only PDFs
- `extracting` begins after OCR text is available

## Error Handling

If the OpenRouter OCR call fails once, retry once. If it still fails:

- mark deck failed
- set job error to: `OCR could not read this scanned PDF. Try a clearer scan or a text-based PDF.`

If the model returns empty text for all pages:

- mark deck failed
- set job error to: `OCR found no readable text in this scanned PDF.`

## Testing

Unit tests should cover:

- useful-text detection returns false for empty/tiny extraction
- useful-text detection returns true for normal page text
- fallback parser skips OCR when text is already extractable
- fallback parser calls OCR when parsed text is empty
- OCR response cleanup removes code fences and trims text

Integration tests should mock rendering and OpenRouter calls rather than requiring live OCR.

## Non-Goals

- Direct image uploads
- Handwriting-perfect recognition
- OCRing every PDF by default
- Replacing Supabase, storage, or the existing card-generation pipeline

## Open Questions Resolved

OCR should run by default only for image-only/textless PDFs. Normal uploaded PDFs should stay on the current fast text extraction path.
