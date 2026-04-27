const FALLBACK_GLOBAL_NEW_CARD_CAP = 10
const MAX_GLOBAL_NEW_CARD_CAP = 20
const PER_DECK_NEW_CARD_CAP = 5

function clampPositiveInteger(value: number, ceiling: number): number {
  return Math.max(1, Math.min(Math.round(value), ceiling))
}

export function resolveNewCardCaps(args: {
  dailyGoalCards: number
  dailyNewCardsLimit: number | null | undefined
}): { global: number; perDeck: number } {
  const goalCap = clampPositiveInteger(
    Number.isFinite(args.dailyGoalCards) ? args.dailyGoalCards : 20,
    MAX_GLOBAL_NEW_CARD_CAP,
  )

  const global =
    args.dailyNewCardsLimit == null
      ? clampPositiveInteger(goalCap, FALLBACK_GLOBAL_NEW_CARD_CAP)
      : clampPositiveInteger(args.dailyNewCardsLimit, goalCap)

  return {
    global,
    perDeck: Math.min(PER_DECK_NEW_CARD_CAP, global),
  }
}
