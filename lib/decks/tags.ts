const MAX_TAGS = 6
const MAX_TAG_LENGTH = 23

export function normalizeDeckTags(input: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const rawPart of input.split(',')) {
    const normalized = rawPart.trim().toLowerCase().slice(0, MAX_TAG_LENGTH)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    tags.push(normalized)
    if (tags.length >= MAX_TAGS) break
  }

  return tags
}

export function tagsToInputValue(tags: string[]): string {
  return tags.join(', ')
}
