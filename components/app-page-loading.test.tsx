import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppPageLoading } from './app-page-loading'

describe('AppPageLoading', () => {
  it('renders a lightweight loading shell with a title', () => {
    render(<AppPageLoading title="Loading library" />)

    expect(screen.getByText('Loading library')).toBeInTheDocument()
    expect(screen.getByText('Just getting things ready...')).toBeInTheDocument()
  })
})
