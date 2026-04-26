import { describe, expect, it } from 'vitest'
import { buildDeckCsv, deckCsvFilename } from './csv'

describe('deck csv export', () => {
  it('serializes deck cards into quoted csv rows', () => {
    const csv = buildDeckCsv({
      title: 'Synthetic Data Models',
      subjectFamily: 'science',
      tags: ['biology', 'systems'],
      cards: [
        {
          conceptTag: 'mitosis',
          frontText: 'What happens in "prophase"?',
          backText: 'Chromosomes condense,\nand the spindle begins forming.',
          approved: true,
          suspended: false,
        },
      ],
    })

    expect(csv).toContain(
      '"Synthetic Data Models","science","biology|systems","mitosis","What happens in ""prophase""?","Chromosomes condense,\nand the spindle begins forming.","true","false"',
    )
  })

  it('emits a header row even when a deck has no cards', () => {
    const csv = buildDeckCsv({
      title: 'Empty Deck',
      subjectFamily: 'other',
      tags: [],
      cards: [],
    })

    expect(csv.trim()).toBe(
      'deck_title,subject_family,deck_tags,concept_tag,front_text,back_text,approved,suspended',
    )
  })

  it('builds a filesystem-safe csv filename from the deck title', () => {
    expect(deckCsvFilename('Vectors / Matrices: Week 1')).toBe('vectors-matrices-week-1.csv')
  })
})
