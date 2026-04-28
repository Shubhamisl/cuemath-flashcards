import type { CSSProperties } from 'react'

export function MasteryRing({
  pct,
  size = 40,
  stroke = 4,
  label,
  showLabel = false,
}: {
  pct: number
  size?: number
  stroke?: number
  label?: string
  showLabel?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)
  return (
    <div
      className="inline-flex items-center gap-2"
      aria-label={label ?? `Mastery ${clamped}%`}
      style={{
        '--ring-start': String(circumference),
        '--ring-end': String(dashOffset),
      } as CSSProperties}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="motion-premium-ring"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-soft-cream)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-cue-yellow)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && <span className="text-xs font-semibold">{clamped}%</span>}
    </div>
  )
}
