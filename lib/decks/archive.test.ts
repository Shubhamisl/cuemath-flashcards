import { describe, expect, it } from 'vitest'
import { canArchiveDeck, canRestoreDeck, restoreStatusForArchivedDeck } from './archive'

describe('deck archive policy', () => {
  it('allows ready decks to be archived', () => {
    expect(canArchiveDeck('ready')).toBe(true)
    expect(canArchiveDeck('draft')).toBe(false)
  })

  it('allows archived decks to be restored back to ready', () => {
    expect(canRestoreDeck('archived')).toBe(true)
    expect(restoreStatusForArchivedDeck('archived')).toBe('ready')
  })
})
