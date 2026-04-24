import { z } from 'zod'

export const atomicCardSchema = z.object({
  front: z.string().min(3).max(400),
  back: z.string().min(1).max(600),
  concept_tag: z.string().min(1).max(80),
  source_page: z.number().int().min(0),
})

export const extractionBatchSchema = z.object({
  cards: z.array(atomicCardSchema).max(50),
})

export type AtomicCard = z.infer<typeof atomicCardSchema>
export type ExtractionBatch = z.infer<typeof extractionBatchSchema>
