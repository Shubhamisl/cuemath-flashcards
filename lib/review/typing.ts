export type TypedAnswerCheck = {
  empty: boolean
  exact: boolean
  close: boolean
}

const MAX_TYPING_CHALLENGE_CHARS = 48
const MAX_TYPING_CHALLENGE_WORDS = 6

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function squashAnswer(text: string): string {
  return collapseWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function supportsTypingChallenge(answer: string): boolean {
  if (answer.includes('\n')) return false
  const collapsed = collapseWhitespace(answer)
  if (!collapsed) return false
  if (collapsed.length > MAX_TYPING_CHALLENGE_CHARS) return false
  return collapsed.split(' ').length <= MAX_TYPING_CHALLENGE_WORDS
}

export function checkTypedAnswer(expected: string, attempt: string): TypedAnswerCheck {
  const normalizedExpected = squashAnswer(expected)
  const normalizedAttempt = squashAnswer(attempt)

  if (!normalizedAttempt) {
    return { empty: true, exact: false, close: false }
  }

  if (normalizedExpected === normalizedAttempt) {
    return { empty: false, exact: true, close: false }
  }

  const close =
    normalizedExpected.length >= 4 &&
    normalizedAttempt.length >= 4 &&
    (normalizedExpected.includes(normalizedAttempt) || normalizedAttempt.includes(normalizedExpected))

  return {
    empty: false,
    exact: false,
    close,
  }
}
