import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReviewPage from './page'

const {
  redirectSpy,
  buildSprintSpy,
  getUserSpy,
  singleSpy,
  eqSpy,
  selectSpy,
  fromSpy,
} = vi.hoisted(() => ({
  redirectSpy: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`)
  }),
  buildSprintSpy: vi.fn(),
  getUserSpy: vi.fn(),
  singleSpy: vi.fn(),
  eqSpy: vi.fn(),
  selectSpy: vi.fn(),
  fromSpy: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectSpy,
}))

vi.mock('@/lib/queue/build-sprint', () => ({
  buildSprint: buildSprintSpy,
}))

vi.mock('./review-session', () => ({
  ReviewSession: (props: {
    cards: Array<{ id: string }>
    backHref: string
    mode: string
  }) => (
    <div>
      <div>mock review session</div>
      <div>{props.backHref}</div>
      <div>{props.mode}</div>
      <div>{props.cards.map((card) => card.id).join(',')}</div>
    </div>
  ),
}))

vi.mock('@/lib/db/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: getUserSpy,
    },
    from: fromSpy,
  }),
}))

describe('review/page', () => {
  it('builds a global review queue across ready decks when no deck or concept is selected', async () => {
    redirectSpy.mockClear()
    buildSprintSpy.mockReset()
    buildSprintSpy.mockResolvedValue([{ id: 'card-1' }])
    getUserSpy.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    singleSpy.mockResolvedValue({ data: null })
    eqSpy.mockReturnValue({ single: singleSpy })
    selectSpy.mockReturnValue({ eq: eqSpy })
    fromSpy.mockImplementation((table: string) => {
      if (table === 'decks') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'deck-1' }, { id: 'deck-2' }],
              }),
            }),
          }),
        }
      }
      return { select: selectSpy }
    })

    render(
      await ReviewPage({
        searchParams: Promise.resolve({}),
      }),
    )

    expect(redirectSpy).not.toHaveBeenCalledWith('/library')
    expect(buildSprintSpy).toHaveBeenCalledWith({
      userId: 'user-1',
      readyDeckIds: ['deck-1', 'deck-2'],
      size: 20,
    })
    expect(screen.getByText('mock review session')).toBeInTheDocument()
    expect(screen.getByText('/library')).toBeInTheDocument()
  })
})
