import { describe, expect, it } from 'vitest'
import { findRlsCoverageGaps, listPublicTablesFromMigrations } from './rls-audit'

describe('supabase/rls-audit', () => {
  it('finds every public table created in migrations', () => {
    expect(listPublicTablesFromMigrations()).toEqual(
      expect.arrayContaining([
        'profiles',
        'decks',
        'ingest_jobs',
        'cards',
        'interference_pairs',
        'reviews',
        'sessions',
        'llm_calls',
      ]),
    )
  })

  it('reports no RLS coverage gaps for current public tables', () => {
    expect(findRlsCoverageGaps()).toEqual([])
  })
})
