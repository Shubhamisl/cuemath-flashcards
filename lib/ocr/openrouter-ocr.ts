const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const DEFAULT_OCR_MODEL = 'baidu/qianfan-ocr-fast:free'

type OpenRouterOcrResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

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

  const json = (await response.json()) as OpenRouterOcrResponse
  const content = json.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('OpenRouter OCR returned no text')
  return cleanOcrText(content)
}
