import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signInWithPassword, signUpWithPassword } from './actions'

const { createClientMock, headersMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  headersMock: vi.fn(),
}))

vi.mock('@/lib/db/server', () => ({
  createClient: createClientMock,
}))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

describe('login actions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    headersMock.mockResolvedValue({
      get: (key: string) => (key === 'origin' ? 'http://127.0.0.1:3000' : null),
    })
  })

  it('rejects password sign-in without both fields', async () => {
    const form = new FormData()
    form.set('email', 'user@example.com')

    await expect(signInWithPassword(form)).resolves.toEqual({ error: 'Email and password required' })
  })

  it('calls Supabase password sign-in and returns the next destination', async () => {
    const signInWithPasswordMock = vi.fn().mockResolvedValue({ data: {}, error: null })
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    const singleMock = vi.fn().mockResolvedValue({
      data: { onboarded_at: '2026-04-27T00:00:00.000Z' },
    })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
        getUser: getUserMock,
      },
      from: vi.fn().mockReturnValue({ select: selectMock }),
    })

    const form = new FormData()
    form.set('email', 'user@example.com')
    form.set('password', 'secret123')

    await expect(signInWithPassword(form)).resolves.toEqual({
      ok: true,
      destination: '/library',
    })
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    })
  })

  it('signs up with email/password and reports confirmation state', async () => {
    const signUpMock = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    })

    createClientMock.mockResolvedValue({
      auth: {
        signUp: signUpMock,
      },
    })

    const form = new FormData()
    form.set('email', 'user@example.com')
    form.set('password', 'secret123')

    await expect(signUpWithPassword(form)).resolves.toEqual({
      ok: true,
      requiresConfirmation: true,
      destination: null,
    })
  })
})
