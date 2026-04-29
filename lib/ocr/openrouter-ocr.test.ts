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
