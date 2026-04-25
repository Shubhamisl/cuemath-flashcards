# Demo vs. Prod Deviations

Running list of knobs relaxed or swapped for demo/free-tier so Cuemath can see motion fast. Each entry has the file, the current demo value, the spec/prod value, and why.

---

## 1. LLM provider — OpenRouter free models (not Anthropic Claude)

- **Files:** `.env.local`, `lib/llm/extract-cards.ts` (`getLlmProvider`), `lib/llm/openrouter-chat.ts`
- **Demo:** `LLM_PROVIDER=openrouter`, `LLM_MODEL=google/gemma-4-31b-it:free` (or other OR free tier)
- **Prod:** `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-sonnet-4-6` via `lib/llm/claude.ts` → `anthropicChat()`
- **Why:** free tier for testing. Provider abstraction already in place — flipping envs swaps it.
- **Risk at prod time:** free tier is rate-limited / often 5xx. Swap before any user traffic.

## 2. Embedding provider — OpenRouter Nemotron (not OpenAI)

- **Files:** `.env.local`, `lib/embeddings/openrouter.ts`
- **Demo:** `nvidia/llama-nemotron-embed-vl-1b-v2:free` via OpenRouter
- **Prod (per spec):** OpenAI `text-embedding-3-small` (1536 dims)
- **Why:** same — free-tier viability.
- **Why it's safe:** `cards.embedding` column is flexible `vector` + `embedding_dim int` so dims don't need to match between providers. Interference search (Plan 5+) must scope queries to matching `embedding_dim`.

## 3. `cards.embedding` schema — flexible `vector`, not `vector(1536)`

- **File:** `supabase/migrations/20260424000004_embedding_flex.sql`
- **Demo:** `embedding vector` + `embedding_dim int` column
- **Prod (per spec):** `embedding VECTOR(1536)`
- **Why:** enables mixing embedding providers of different dims during experimentation.
- **Prod migration:** once provider is locked, re-constrain to the committed dimension for index efficiency.

## 4. Anthropic `extractionBatchSchema.cards.max` — 200 (was 50)

- **File:** `lib/llm/types.ts`
- **Demo:** `.max(200)`
- **Original plan:** `.max(50)` per batch
- **Why:** some free-tier models (tencent/hy3) produced >50 cards in one response.
- **Prod note:** with Claude, 50/batch is enforced by prompt. Can revert once LLM is stable.

## 5. `atomicCardSchema.front.min(1)` (was `.min(3)`)

- **File:** `lib/llm/types.ts`
- **Demo:** `front: z.string().min(1)`
- **Original plan:** `.min(3)`
- **Why:** TDD fixtures used `"Q"` as placeholder.
- **Prod note:** `.min(3)` is the sensible floor once LLM output is stable.

## 6. Mastery formula — continuous (was step-function at 30d)

- **File:** `lib/progress/deck-stats.ts`
- **Demo:** `avg(min(stability, 30) / 30) × 100` → ring moves every successful review.
- **Spec §9:** `% of active cards with stability > 30 days` (binary).
- **Why:** spec formula never moves within a single session — terrible demo. Continuous formula still grounds "full mastery" at 30d stability, just reveals progress along the way.
- **Prod call:** keep continuous for UX or switch back? Arguable either way — leave as continuous.

## 7. Easy-card injection threshold — `stability > 0` (was `> 30d`)

- **File:** `lib/fatigue/easy-cards.ts`
- **Demo:** top-N most-stable cards with any prior review, excluding current session.
- **Spec §8:** "2 mature cards (stability > 30d)".
- **Why:** no card has stability > 30d during first sprints; inject-easy would never fire. Relative "easier than you just struggled on" is what matters for morale.
- **Prod:** raise threshold (15d? 30d?) once user decks have aged.

## 8. Review sprint is per-deck, not global cross-deck

- **Files:** `app/(app)/review/page.tsx`, `lib/queue/build-sprint.ts`
- **Demo:** `/review?deck=<id>` only; queue filters by `deck_id`.
- **Spec §6:** global interleaved queue across all user decks.
- **Why:** lean MVP scope (Plan 3 deferred cross-deck).
- **Prod add:** add a `/review` entry with no `deck` param that calls a `buildSprintGlobal(userId)`.

## 9. No interference-pair tagging / adjacency in sprints

- **Files:** (not yet implemented) — `lib/ingest/interference.ts`, `buildSprint` enhancement
- **Demo:** table exists, empty. Adjacency rule omitted from queue.
- **Spec §5 stage 6, §6:** embed-and-tag pairs during ingest, place paired cards adjacent in sprints.
- **Why:** deferred to keep Plan 2 lean.
- **Prod:** Week 2 stretch per spec.

## 10. No warm-up / cool-down bias in sprint

- **File:** `lib/queue/build-sprint.ts`
- **Demo:** priority sort + tag interleave only.
- **Spec §6 rule 5:** "first 2 and last 2 cards biased toward high-stability cards".
- **Why:** cut for lean MVP.

## 11. Leech flag but no "Needs reformulating" tray

- **Files:** `app/(app)/review/actions.ts` (flag is set), UI tray not built.
- **Demo:** `suspended = true` when `lapses≥6 && reps≥10`. No UI surface.
- **Spec §6:** coral-tinted tray with click-through to rewrite flow.
- **Prod:** Plan 5+ or Week 2 stretch.

## 12. PDF ingestion — no critique / interference / review-gate stages

- **File:** `lib/ingest/pipeline.ts`
- **Demo:** 4 stages (parse → extract → embed → insert).
- **Spec §5:** 7 stages (+ structure, critique, tag interference, review gate).
- **Why:** Scope B shortcut. User-approved.
- **Prod:** add critique pass + human review gate before `status='ready'`.

## 13. No `llm_calls` cost logging

- **Files:** schema has the table; no inserts yet.
- **Demo:** all LLM calls fire-and-forget.
- **Spec §5:** every LLM call logged (tokens, latency, cost).
- **Prod:** wrap `LlmProvider.generate` and `embed()` to log per-call.

## 14. Profiles: onboarding

- **Files:** `app/(app)/onboarding/{subject,level,goal}/page.tsx`, `app/(app)/library/page.tsx`, `app/(app)/deck/[id]/page.tsx`.
- **Status:** implemented post-Plan-5; new users redirect to `/onboarding/subject` until `onboarded_at` is set.
- **Spec §7:** 4-question Cuemath-style onboarding (subject, level, daily goal, first PDF). The first-PDF step is still part of the library upload flow rather than the onboarding wizard.

## 15. No heatmap, no predicted-retention charts

- **Spec §9:** stretch (Week 2).
- **Demo:** omitted.

## 16. Font stack

- **File:** `app/layout.tsx` (check current)
- **Demo:** Geist (Next default) until brand wiring confirmed
- **Spec §7:** Plus Jakarta Sans (display), Nunito Sans (body)
- **Prod:** wire via `next/font/google`.
- **Verify before launch.**

## 17. "Break prompt" triggers on last card of default 20-sprint

- **File:** `lib/fatigue/observe.ts`
- **Demo:** needs 20 events → fires at the very end, gets immediately replaced by the "done" screen.
- **Spec:** shows mid-sprint when slowdown is detected.
- **Suggested fix:** drop `BASELINE_WINDOW` from 10 → 5 so it fires after 10 cards.
- **Not yet fixed** — pending user decision (noted in chat).

---

## How to revert for prod

A single PR can flip most of these:
- Item 1, 2 → env vars only.
- Items 4, 5, 6, 7, 8 → one-line code changes.
- Items 9–16 → new tasks in Plan 5+ backlog.

Keep this file updated as more deviations accrue.
