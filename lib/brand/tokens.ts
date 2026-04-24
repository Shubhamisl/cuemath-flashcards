export const colors = {
  cueYellow: '#FFBA07',
  inkBlack: '#000000',
  paperWhite: '#FFFFFF',
  softCream: '#FFF1CC',
  mintGreen: '#D0FBE5',
  bubblePink: '#FFE0FD',
  trustBlue: '#DBEAFE',
  alertCoral: '#F97373',
} as const

export const radius = {
  input: '12px',
  card: '24px',
  panel: '32px',
} as const

export const motion = {
  tap: '120ms',
  progress: '400ms',
} as const

export type subjectFamily = 'math' | 'language' | 'science' | 'humanities' | 'other'

export function subjectTint(family: subjectFamily): string {
  switch (family) {
    case 'math': return colors.softCream
    case 'language': return colors.bubblePink
    case 'science': return colors.mintGreen
    case 'humanities': return colors.trustBlue
    case 'other': return colors.softCream
  }
}
