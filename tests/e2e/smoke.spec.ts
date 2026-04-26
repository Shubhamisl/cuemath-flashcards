import { expect, test } from '@playwright/test'
import { resolveSmokeTargets } from '../smoke-targets'

const targets = resolveSmokeTargets(process.env)

test.describe('app smoke', () => {
  test('library shell loads for an authenticated user', async ({ page }) => {
    test.skip(!targets.hasAuth, 'Set E2E_STORAGE_STATE to run authenticated smoke tests.')

    await page.goto('/library')
    await expect(page.getByRole('button', { name: 'Upload PDF' })).toBeVisible()
    await expect(page.getByPlaceholder('Search decks...')).toBeVisible()
  })

  test('progress dashboard loads', async ({ page }) => {
    test.skip(!targets.hasAuth, 'Set E2E_STORAGE_STATE to run authenticated smoke tests.')

    await page.goto('/progress')
    await expect(page.getByText('Due now')).toBeVisible()
    await expect(page.getByText('Recent sessions', { exact: true })).toBeVisible()
  })

  test('ready deck supports review entry points', async ({ page }) => {
    test.skip(!targets.hasAuth, 'Set E2E_STORAGE_STATE to run authenticated smoke tests.')
    test.skip(!targets.readyDeckId, 'Set E2E_READY_DECK_ID to exercise ready deck smoke coverage.')

    await page.goto(`/deck/${targets.readyDeckId}`)
    await expect(page.getByText('Mastered')).toBeVisible()
    await expect(page.getByRole('link', { name: /Start sprint|All caught up/i })).toBeVisible()
  })

  test('editable deck opens the card browser', async ({ page }) => {
    test.skip(!targets.hasAuth, 'Set E2E_STORAGE_STATE to run authenticated smoke tests.')
    test.skip(!targets.editableDeckId, 'Set E2E_EDITABLE_DECK_ID to exercise deck editing smoke coverage.')

    await page.goto(`/deck/${targets.editableDeckId}`)
    await page.getByRole('link', { name: /Browse .* cards/i }).click()
    await expect(page).toHaveURL(new RegExp(`/deck/${targets.editableDeckId}/cards`))
  })

  test('upload modal can submit a fixture PDF', async ({ page }) => {
    test.skip(!targets.hasAuth, 'Set E2E_STORAGE_STATE to run authenticated smoke tests.')
    test.skip(!targets.uploadPdfPath, 'Set E2E_UPLOAD_PDF_PATH to exercise upload smoke coverage.')
    const uploadPdfPath = targets.uploadPdfPath!

    await page.goto('/library')
    await page.getByRole('button', { name: 'Upload PDF' }).click()
    await page.locator('input[type="file"]').setInputFiles(uploadPdfPath)
    await page.getByRole('button', { name: 'Upload' }).click()

    await expect(page.locator('a[href^="/deck/"]').first()).toBeVisible()
  })
})
