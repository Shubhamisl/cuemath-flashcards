import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LevelOptions } from './level-options'

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

describe('LevelOptions', () => {
  beforeEach(() => {
    routerMocks.push.mockClear()
    routerMocks.prefetch.mockClear()
  })

  it('presents level choices as bold responsive segments', () => {
    render(<LevelOptions subject="math" />)

    expect(screen.getByText('Choose your pace')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Learning level choices' })).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-3',
    )
    expect(screen.getByRole('button', { name: /Beginner.*Start here/i })).toHaveClass(
      'min-h-[168px]',
    )
    expect(screen.getByText('Core idea')).toBeInTheDocument()
    expect(screen.getByText('Fast fluency')).toBeInTheDocument()
  })
})
