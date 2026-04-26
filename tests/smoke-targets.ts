export type SmokeTargets = {
  baseURL: string
  storageState: string | null
  hasAuth: boolean
  readyDeckId: string | null
  editableDeckId: string | null
  uploadPdfPath: string | null
}

export type SmokeEnv = Record<string, string | undefined>

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function resolveSmokeTargets(env: SmokeEnv): SmokeTargets {
  const baseURL = clean(env.E2E_BASE_URL) ?? 'http://127.0.0.1:3000'
  const storageState = clean(env.E2E_STORAGE_STATE)

  return {
    baseURL,
    storageState,
    hasAuth: Boolean(storageState),
    readyDeckId: clean(env.E2E_READY_DECK_ID),
    editableDeckId: clean(env.E2E_EDITABLE_DECK_ID),
    uploadPdfPath: clean(env.E2E_UPLOAD_PDF_PATH),
  }
}
