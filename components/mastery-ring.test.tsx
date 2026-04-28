import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MasteryRing } from './mastery-ring'

describe('MasteryRing', () => {
  it('animates the progress stroke from empty to the current mastery value', () => {
    const { container } = render(<MasteryRing pct={40} />)

    const progress = container.querySelector('.motion-premium-ring')
    const ring = container.querySelector('[aria-label="Mastery 40%"]')

    expect(progress).not.toBeNull()
    expect(ring).not.toBeNull()
    expect((ring as HTMLElement).style.getPropertyValue('--ring-start')).toBe(
      '113.09733552923255',
    )
    expect((ring as HTMLElement).style.getPropertyValue('--ring-end')).toBe(
      '67.85840131753953',
    )
  })

  it('renders visual-only by default when the surrounding UI owns the percentage label', () => {
    const { queryByText } = render(<MasteryRing pct={40} />)

    expect(queryByText('40%')).not.toBeInTheDocument()
  })

  it('can show an inline percentage label for compact contexts', () => {
    const { getByText } = render(<MasteryRing pct={40} showLabel />)

    expect(getByText('40%')).toBeInTheDocument()
  })
})
