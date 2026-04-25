import type { Tier } from './deck-stats'

export type PillTone = 'neutral' | 'success' | 'warning' | 'info' | 'highlight'

export function tierToTone(tier: Tier): PillTone {
  switch (tier) {
    case 'Curious':
      return 'neutral'
    case 'Practicing':
      return 'success'
    case 'Confident':
      return 'info'
    case 'SharpMind':
      return 'highlight'
  }
}
