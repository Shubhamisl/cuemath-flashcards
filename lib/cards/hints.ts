function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function buildHintFromBack(back: string): string | null {
  const clean = normalize(back)
  if (!clean) return null

  const tokens = clean.match(/[A-Za-z0-9]+/g) ?? []
  if (tokens.length === 0) {
    return `Answer is ${pluralize(clean.length, 'character')} long`
  }

  if (tokens.length === 1 && /^\d+$/.test(tokens[0])) {
    return `Number with ${pluralize(tokens[0].length, 'digit')}`
  }

  const initials = tokens
    .slice(0, 3)
    .map((token) => token[0].toUpperCase())
    .join(' ')

  if (tokens.length === 1) {
    return `Starts with ${initials} - ${pluralize(tokens[0].length, 'letter')}`
  }

  return `Starts with ${initials} - ${pluralize(tokens.length, 'word')}`
}
