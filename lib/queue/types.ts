import type { FsrsCardState } from '@/lib/srs/schedule'

export type SprintCard = {
  id: string
  deck_id: string
  concept_tag: string | null
  front: { text: string }
  back: { text: string }
  fsrs_state: FsrsCardState | null  // null = never reviewed ("new")
  suspended: boolean
}
