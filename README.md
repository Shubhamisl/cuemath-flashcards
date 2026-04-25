# Cuemath Flashcards

PDF → atomic flashcards → modern spaced-repetition review, wrapped in Cuemath's brand.

## Stack

- Next.js 16 App Router (TypeScript)
- Supabase (Auth + Postgres + Storage + pgvector)
- Tailwind v4 with Cuemath design tokens
- `ts-fsrs` for scheduling
- OpenRouter for LLM extraction + embeddings (free-tier during demo; see `docs/demo-deviations.md`)
- Vercel for hosting

## Local setup

1. `pnpm install`
2. Copy `.env.local.example` → `.env.local` and fill in values.
3. Apply migrations to your Supabase project:
   ```
   supabase/migrations/20260424000001_initial_schema.sql
   supabase/migrations/20260424000002_rls_policies.sql
   supabase/migrations/20260424000003_profile_trigger.sql
   supabase/migrations/20260424000004_embedding_flex.sql
   supabase/migrations/20260424000005_storage_bucket.sql
   ```
4. `pnpm dev`

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (ingest pipeline) |
| `SUPABASE_PROJECT_REF` | Supabase project ref |
| `OPENROUTER_API_KEY` | OpenRouter key for LLM + embeddings |
| `LLM_PROVIDER` | `openrouter` (demo) or `anthropic` (prod) |
| `LLM_MODEL` | e.g. `google/gemma-4-31b-it:free` |
| `EMBEDDING_MODEL` | e.g. `nvidia/llama-nemotron-embed-vl-1b-v2:free` |
| `ANTHROPIC_API_KEY` | Only needed when `LLM_PROVIDER=anthropic` |

## Project structure

```
app/                   Next routes + server actions
  (auth)/login         Magic-link + Google sign-in
  (app)/library        Deck grid + upload modal
  (app)/deck/[id]      Deck detail, mastery ring, sprint CTA
  (app)/review         Review sprint session
  api/ingest/[jobId]   Pipeline webhook
lib/
  brand/               Design tokens + primitives
  db/                  Supabase client helpers
  llm/                 LLM provider abstraction (OpenRouter / Anthropic)
  embeddings/          OpenRouter embeddings adapter
  pdf/                 pdf-parse v2 wrapper + chunking
  ingest/              PDF → deck pipeline
  srs/                 Pure ts-fsrs wrapper
  queue/               Sprint builder
  fatigue/             Pure effort-sensing decision logic
  progress/            Deck stats (tier, mastery)
supabase/migrations/   DDL + RLS policies
docs/
  superpowers/         Specs + implementation plans
  design/stitch/       Brand mockups + primitive-mapping notes
  demo-deviations.md   Demo-vs-prod knob log
```

## Design

- Spec: `docs/superpowers/specs/2026-04-23-cuemath-flashcard-engine-design.md`
- Plans: `docs/superpowers/plans/`
- Stitch mockups + Claude design mapping: `docs/design/stitch/`
- Demo deviations (free-tier shortcuts): `docs/demo-deviations.md`

## Deploy (Vercel)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Set all env vars from the table above in **Project Settings → Environment Variables** (Production + Preview).
4. Framework preset: Next.js (auto-detected).
5. Build command: `pnpm build`.
6. Deploy. Add the production URL as an allowed redirect in **Supabase → Authentication → URL Configuration**.
