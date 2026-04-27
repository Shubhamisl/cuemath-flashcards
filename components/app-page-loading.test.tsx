import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppPageLoading } from './app-page-loading'

describe('AppPageLoading', () => {
  it('renders shell placeholders that match the authenticated app frame', () => {
    render(<AppPageLoading title="Loading library" />)

    expect(screen.getByText('Loading library')).toBeInTheDocument()
    expect(screen.getByText('Just getting things ready...')).toBeInTheDocument()
    expect(screen.getByRole('presentation', { name: 'Navigation loading' })).toBeInTheDocument()
    expect(screen.getByRole('presentation', { name: 'Hero loading' })).toBeInTheDocument()
    expect(screen.getByRole('presentation', { name: 'Controls loading' })).toBeInTheDocument()
    expect(screen.getAllByRole('presentation', { name: 'Deck loading' })).toHaveLength(6)
  })
})
