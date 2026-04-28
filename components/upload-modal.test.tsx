import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UploadModal } from './upload-modal'

vi.mock('@/app/(app)/library/actions', () => ({
  createDeckFromUpload: vi.fn(),
}))

describe('UploadModal', () => {
  it('opens with calm modal motion hooks', async () => {
    const user = userEvent.setup()

    render(<UploadModal />)
    await user.click(screen.getByRole('button', { name: 'Upload PDF' }))

    expect(screen.getByRole('dialog', { name: 'Upload a PDF' })).toHaveClass('motion-premium-reveal')
    expect(screen.getByText('Drop a PDF here or click to choose').closest('label')).toHaveClass(
      'motion-premium-list-item',
    )
  })
})
