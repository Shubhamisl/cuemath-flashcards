import type { FsrsCardState } from '@/lib/srs/schedule'
import type { TextCardFormat } from '@/lib/llm/types'

export type SprintCard = {
  id: string
  deck_id: string
  format: TextCardFormat
  concept_tag: string | null
  front: { text: string }
  back: { text: string }
  hint: string | null
  fsrs_state: FsrsCardState | null  // null = never reviewed ("new")
  suspended: boolean
  approved: boolean
}
