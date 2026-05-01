import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoalForm } from './goal-form'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
}))

const actionMocks = vi.hoisted(() => ({
  patchProfile: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}))

vi.mock('../actions', () => ({
  patchProfile: actionMocks.patchProfile,
}))

describe('GoalForm', () => {
  beforeEach(() => {
    routerMocks.push.mockClear()
    routerMocks.prefetch.mockClear()
    actionMocks.patchProfile.mockReset()
  })

  it('keeps a visible saving state on the picked daily goal', async () => {
    let resolvePatch!: (value: { ok: true }) => void
    actionMocks.patchProfile.mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = resolve
      }),
    )

    render(<GoalForm subject="math" level="beginner" />)

    await userEvent.click(screen.getByRole('button', { name: /20 cards per day/i }))

    expect(screen.getByRole('button', { name: /Saving 20 cards/i })).toBeInTheDocument()
    expect(screen.getByText('Locking in your 20-card rhythm')).toBeInTheDocument()

    resolvePatch({ ok: true })
    expect(await screen.findByText("You're all set.")).toBeInTheDocument()
  })
})
