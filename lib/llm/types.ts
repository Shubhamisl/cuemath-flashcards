import { z } from 'zod'

export const TEXT_CARD_FORMATS = ['qa', 'cloze', 'worked_example'] as const
export const textCardFormatSchema = z.enum(TEXT_CARD_FORMATS)
export type TextCardFormat = z.infer<typeof textCardFormatSchema>

export const atomicCardSchema = z.object({
  format: textCardFormatSchema.default('qa'),
  front: z.string().min(1).max(400),
  back: z.string().min(1).max(600),
  concept_tag: z.string().min(1).max(80),
  source_page: z.number().int().min(0),
})

export const extractionBatchSchema = z.object({
  cards: z.array(atomicCardSchema).max(200),
})

export type AtomicCard = z.infer<typeof atomicCardSchema>
export type ExtractionBatch = z.infer<typeof extractionBatchSchema>
