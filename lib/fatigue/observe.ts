export type ReviewEvent = {
  rating: 1 | 2 | 3 | 4
  elapsedMs: number
  timestamp: number
}

export type FatigueFlags = {
  injectedEasy: boolean
  promptedBreak: boolean
}

export type FatigueAction = 'continue' | 'inject_easy' | 'prompt_break'

const ACCURACY_WINDOW = 6
const ACCURACY_THRESHOLD = 0.5
const BASELINE_WINDOW = 10
const SLOWDOWN_FACTOR = 2

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function observe(
  events: ReviewEvent[],
  flags: FatigueFlags,
): { action: FatigueAction } {
  if (!flags.injectedEasy && events.length >= ACCURACY_WINDOW) {
    const window = events.slice(-ACCURACY_WINDOW)
    const wrong = window.filter((e) => e.rating <= 2).length
    if (wrong / window.length >= ACCURACY_THRESHOLD) {
      return { action: 'inject_easy' }
    }
  }

  if (!flags.promptedBreak && events.length >= BASELINE_WINDOW * 2) {
    const baseline = median(events.slice(0, BASELINE_WINDOW).map((e) => e.elapsedMs))
    const recent = median(events.slice(-BASELINE_WINDOW).map((e) => e.elapsedMs))
    if (baseline > 0 && recent >= SLOWDOWN_FACTOR * baseline) {
      return { action: 'prompt_break' }
    }
  }

  return { action: 'continue' }
}
