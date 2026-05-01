import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SubjectPage from './page'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}))

vi.mock('../actions', () => ({
  patchProfile: vi.fn(),
}))

describe('SubjectPage', () => {
  beforeEach(() => {
    routerMocks.push.mockClear()
    routerMocks.prefetch.mockClear()
  })

  it('opens onboarding with a branded subject chooser', () => {
    render(<SubjectPage />)

    expect(screen.getByText('Start with your strongest subject signal')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Study subject choices' })).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2',
    )
    expect(screen.getByRole('button', { name: /Math.*Problem solving/i })).toHaveClass(
      'min-h-[154px]',
    )
    expect(screen.getByText(/Formula-heavy/)).toBeInTheDocument()
    expect(screen.getByText('Reading-heavy')).toBeInTheDocument()
  })
})
