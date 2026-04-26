import { describe, expect, it } from 'vitest'
import { computeSessionPreview } from './session-preview'

const now = new Date('2026-04-26T12:00:00.000Z')

describe('review/session-preview', () => {
  it('computes weak tags and upcoming buckets', () => {
    const preview = computeSessionPreview(
      [
        {
          concept_tag: 'fractions',
          fsrs_state: { lapses: 3, due: '2026-04-26T18:00:00.000Z' },
        },
        {
          concept_tag: 'fractions',
          fsrs_state: { lapses: 1, due: '2026-04-27T10:00:00.000Z' },
        },
        {
          concept_tag: 'geometry',
          fsrs_state: { lapses: 2, due: '2026-04-30T10:00:00.000Z' },
        },
      ],
      now,
    )

    expect(preview.weakTags).toEqual(['fractions', 'geometry'])
    expect(preview.dueLaterToday).toBe(1)
    expect(preview.dueTomorrow).toBe(1)
    expect(preview.dueThisWeek).toBe(1)
    expect(preview.suggestedMode).toBe('quick')
  })

  it('suggests a full sprint when the queue is larger and no weak tags stand out', () => {
    const preview = computeSessionPreview(
      [
        { concept_tag: null, fsrs_state: { due: '2026-04-27T10:00:00.000Z', lapses: 0 } },
        { concept_tag: null, fsrs_state: { due: '2026-04-28T10:00:00.000Z', lapses: 0 } },
        { concept_tag: null, fsrs_state: { due: '2026-04-29T10:00:00.000Z', lapses: 0 } },
        { concept_tag: null, fsrs_state: { due: '2026-04-30T10:00:00.000Z', lapses: 0 } },
        { concept_tag: null, fsrs_state: { due: '2026-05-01T10:00:00.000Z', lapses: 0 } },
        { concept_tag: null, fsrs_state: { due: '2026-05-02T10:00:00.000Z', lapses: 0 } },
      ],
      now,
    )

    expect(preview.suggestedMode).toBe('standard')
  })
})
