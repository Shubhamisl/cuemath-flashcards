export function canArchiveDeck(status: string): boolean {
  return status === 'ready'
}

export function canRestoreDeck(status: string): boolean {
  return status === 'archived'
}

export function restoreStatusForArchivedDeck(status: string): 'ready' {
  if (status !== 'archived') {
    throw new Error(`Cannot restore deck from status "${status}"`)
  }
  return 'ready'
}
