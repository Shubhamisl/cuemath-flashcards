import type { TextCardFormat } from '@/lib/llm/types'

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function tsvCell(value: string): string {
  return value.replaceAll(/\s+/g, ' ').trim()
}

export function cardTextFromContent(value: unknown): string {
  if (typeof value === 'string') return value
  if (
    value &&
    typeof value === 'object' &&
    'text' in value &&
    typeof (value as { text?: unknown }).text === 'string'
  ) {
    return (value as { text: string }).text
  }
  return ''
}

export function deckCsvFilename(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'deck'}.csv`
}

export function buildDeckCsv(args: {
  title: string
  subjectFamily: string
  tags: string[]
  cards: Array<{
    conceptTag: string | null
    format: TextCardFormat
    frontText: string
    backText: string
    approved: boolean
    suspended: boolean
  }>
}): string {
  const lines = [
    'deck_title,subject_family,deck_tags,format,concept_tag,front_text,back_text,approved,suspended',
  ]

  for (const card of args.cards) {
    lines.push(
      [
        args.title,
        args.subjectFamily,
        args.tags.join('|'),
        card.format,
        card.conceptTag ?? '',
        card.frontText,
        card.backText,
        String(card.approved),
        String(card.suspended),
      ]
        .map(csvCell)
        .join(','),
    )
  }

  return lines.join('\n')
}

export function buildDeckAnkiTsv(args: {
  cards: Array<{
    conceptTag: string | null
    format: TextCardFormat
    frontText: string
    backText: string
    tags: string[]
  }>
}): string {
  return args.cards
    .map((card) => [
      tsvCell(card.frontText),
      tsvCell(card.backText),
      tsvCell([`format:${card.format}`, card.conceptTag ?? '', ...card.tags].filter(Boolean).join(' ')),
    ].join('\t'))
    .join('\n')
}
