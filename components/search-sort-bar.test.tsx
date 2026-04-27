import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchSortBar } from './search-sort-bar'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () =>
    new URLSearchParams('sort=created&subject=all&status=active&mastery=all'),
}))

describe('SearchSortBar', () => {
  it('labels the control rail and pushes updated search params', async () => {
    const user = userEvent.setup()

    render(
      <SearchSortBar
        initialQ=""
        initialSort="created"
        initialSubject="all"
        initialStatus="active"
        initialMastery="all"
      />,
    )

    expect(screen.getByText('Find a deck')).toBeInTheDocument()

    await user.type(
      screen.getByPlaceholderText('Search decks, tags, or subjects...'),
      'bio{enter}',
    )

    expect(pushMock).toHaveBeenCalledWith(
      '/library?sort=created&subject=all&status=active&mastery=all&q=bio',
    )
  })
})
