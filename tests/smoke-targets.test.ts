import { describe, expect, it } from 'vitest'
import { resolveSmokeTargets } from './smoke-targets'

describe('smoke-targets', () => {
  it('normalizes optional smoke env values into flags and ids', () => {
    const targets = resolveSmokeTargets({
      E2E_BASE_URL: 'http://127.0.0.1:3000',
      E2E_STORAGE_STATE: 'tests/e2e/.auth/user.json',
      E2E_READY_DECK_ID: 'deck-ready',
      E2E_EDITABLE_DECK_ID: 'deck-edit',
      E2E_UPLOAD_PDF_PATH: 'fixtures/sample.pdf',
    })

    expect(targets).toMatchObject({
      baseURL: 'http://127.0.0.1:3000',
      storageState: 'tests/e2e/.auth/user.json',
      hasAuth: true,
      readyDeckId: 'deck-ready',
      editableDeckId: 'deck-edit',
      uploadPdfPath: 'fixtures/sample.pdf',
    })
  })

  it('treats missing optional env values as unavailable smoke scopes', () => {
    const targets = resolveSmokeTargets({})

    expect(targets).toMatchObject({
      baseURL: 'http://127.0.0.1:3000',
      storageState: null,
      hasAuth: false,
      readyDeckId: null,
      editableDeckId: null,
      uploadPdfPath: null,
    })
  })
})
