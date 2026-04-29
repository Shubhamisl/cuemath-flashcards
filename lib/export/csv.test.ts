import { describe, expect, it } from 'vitest'
import { buildDeckCsv, buildDeckAnkiTsv, deckCsvFilename } from './csv'

describe('deck csv export', () => {
  it('serializes deck cards into quoted csv rows', () => {
    const csv = buildDeckCsv({
      title: 'Synthetic Data Models',
      subjectFamily: 'science',
      tags: ['biology', 'systems'],
      cards: [
        {
          conceptTag: 'mitosis',
          format: 'cloze',
          frontText: 'What happens in "prophase"?',
          backText: 'Chromosomes condense,\nand the spindle begins forming.',
          approved: true,
          suspended: false,
        },
      ],
    })

    expect(csv).toContain(
      '"Synthetic Data Models","science","biology|systems","cloze","mitosis","What happens in ""prophase""?","Chromosomes condense,\nand the spindle begins forming.","true","false"',
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
      'deck_title,subject_family,deck_tags,format,concept_tag,front_text,back_text,approved,suspended',
    )
  })

  it('builds a filesystem-safe csv filename from the deck title', () => {
    expect(deckCsvFilename('Vectors / Matrices: Week 1')).toBe('vectors-matrices-week-1.csv')
  })

  it('serializes an Anki-friendly tab-separated note export', () => {
    const tsv = buildDeckAnkiTsv({
      cards: [
        {
          frontText: 'What is 2 + 2?',
          backText: '4',
          conceptTag: 'addition',
          format: 'qa',
          tags: ['math', 'easy'],
        },
      ],
    })

    expect(tsv.trim()).toBe('What is 2 + 2?\t4\tformat:qa addition math easy')
  })

  it('sanitizes tabs and newlines for anki note exports', () => {
    const tsv = buildDeckAnkiTsv({
      cards: [
        {
          frontText: 'Line 1\nLine 2',
          backText: 'Back\tfield',
          conceptTag: null,
          format: 'worked_example',
          tags: ['science'],
        },
      ],
    })

    expect(tsv.trim()).toBe('Line 1 Line 2\tBack field\tformat:worked_example science')
  })
})
