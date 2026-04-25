export function computeStreak(sessionDates: string[], today: Date): number {
  if (sessionDates.length === 0) return 0
  const days = new Set(
    sessionDates.map((d) => new Date(d).toISOString().slice(0, 10)),
  )
  const cursor = new Date(Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
  ))
  // Allow today OR yesterday to seed the streak (user hasn't reviewed yet today).
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0
  }
  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
