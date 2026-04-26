function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
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
    frontText: string
    backText: string
    approved: boolean
    suspended: boolean
  }>
}): string {
  const lines = [
    'deck_title,subject_family,deck_tags,concept_tag,front_text,back_text,approved,suspended',
  ]

  for (const card of args.cards) {
    lines.push(
      [
        args.title,
        args.subjectFamily,
        args.tags.join('|'),
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
