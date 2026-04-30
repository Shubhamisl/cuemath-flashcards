import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProfileForm } from './profile-form'

const { updateProfileMock } = vi.hoisted(() => ({
  updateProfileMock: vi.fn(),
}))

vi.mock('./actions', () => ({
  updateProfile: updateProfileMock,
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
}))

describe('ProfileForm', () => {
  it('surfaces the current study profile and review pace', () => {
    render(
      <ProfileForm
        email="user@example.com"
        initial={{
          display_name: 'Shubham',
          subject_family: 'math',
          level: 'intermediate',
          daily_goal_cards: 20,
          daily_new_cards_limit: 10,
        }}
      />,
    )

    expect(screen.getByText('Study profile')).toBeInTheDocument()
    expect(screen.getByText('Shubham')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('cards / day')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('new / day')).toBeInTheDocument()
  })

  it('shows and saves the explicit daily new-card pace setting', async () => {
    updateProfileMock.mockResolvedValue({ ok: true })
    const user = userEvent.setup()

    render(
      <ProfileForm
        email="user@example.com"
        initial={{
          display_name: 'Shubham',
          subject_family: 'math',
          level: 'intermediate',
          daily_goal_cards: 20,
          daily_new_cards_limit: 10,
        }}
      />,
    )

    expect(screen.getByText('Daily new cards')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '5 new cards / day' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        daily_new_cards_limit: 5,
      }),
    )
  })
})
