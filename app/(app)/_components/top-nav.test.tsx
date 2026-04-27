import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopNav } from './top-nav'

const { pathnameMock, signOutMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}))

vi.mock('../profile/actions', () => ({
  signOut: signOutMock,
}))

describe('TopNav', () => {
  it('shows explicit primary nav and marks the current route', () => {
    pathnameMock.mockReturnValue('/library')

    render(<TopNav name="Shubham" streak={3} />)

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByText('Day 3')).toBeInTheDocument()
  })

  it('keeps sign-out inside the profile menu', async () => {
    pathnameMock.mockReturnValue('/progress')
    signOutMock.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<TopNav name="Shubham" streak={0} />)

    await user.click(screen.getByRole('button', { name: 'Shubham menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1)
    })
  })
})
