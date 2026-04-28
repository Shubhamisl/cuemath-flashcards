# Demo vs. Prod Deviations

Running list of knobs relaxed or swapped for demo/free-tier so Cuemath can see motion fast. Each entry has the file, the current demo value, the spec/prod value, and why.

---

## Shipped baseline updates

These are no longer product gaps and should not be re-planned as net-new work:

- Deck rename/delete is shipped from the deck detail surface.
- Library search/sort and due badges are shipped.
- The card browser is shipped at `/deck/[id]/cards`.
- Individual card edit/delete is shipped in the card browser.
- The Next.js request hook has migrated from deprecated root `middleware.ts` behavior to root `proxy.ts`.
- A fresh Vercel deployment from `master` commit `7db9cdc` succeeded after the proxy migration.
- **Font stack** wired via `next/font/google` — Plus Jakarta Sans (display) + Nunito Sans (body) in `app/layout.tsx`. (Closes former item 16.)
- **`llm_calls` cost logging** is live via `lib/llm/observability.ts` → `logLlmCall()`, invoked from the Anthropic, OpenRouter chat, and OpenRouter embedding adapters. Provider, model, latency, token counts, classified error class, and deck/job FKs are persisted. (Closes former item 13.)
- **Critique pass** is shipped as a pipeline stage (`parsing → extracting → critiquing → embedding → insert`). Quality-scored decisions, null-card drops, and a fallback to extracted candidates when the critique drops everything are all in place. (Partially closes former item 12 — see updated entry below.)
- **Activity heatmap** (12-week, 5-level Cuemath yellow gradient) is shipped on `/progress`. (Partially closes former item 15 — predicted-retention charts still deferred.)
- **Optimistic onboarding navigation:** subject/level steps navigate immediately, pass selection via URL search params, prefetch the next route, and fire the profile patch in the background. Goal step still awaits its patch because middleware gates on `onboarded_at`.

---

## 1. LLM provider — OpenRouter (GPT-5 mini), not Anthropic Claude

- **Files:** `.env.local`, `lib/llm/extract-cards.ts` (`getLlmProvider`), `lib/llm/openrouter-chat.ts`
- **Demo:** `LLM_PROVIDER=openrouter`, `LLM_MODEL=openai/gpt-5-mini` (paid, via OpenRouter)
- **Prod:** `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-sonnet-4-6` via `lib/llm/claude.ts` → `anthropicChat()`
- **Why:** GPT-5 mini gives clean structured extraction + critique output without requiring an Anthropic key for the showcase. Provider abstraction already in place — flipping envs swaps it.
- **Risk at prod time:** none beyond standardising on a single vendor. Output quality is already production-grade; swap to Claude when consolidating the model surface.

## 2. Embedding provider — Google embedding 2 preview via OpenRouter (not OpenAI)

- **Files:** `.env.local`, `lib/embeddings/openrouter.ts` (the in-code `DEFAULT_MODEL` constant still references the previous Nemotron fallback; runtime model is overridden by `EMBEDDING_MODEL` env)
- **Demo:** Google embedding 2 preview via OpenRouter, set through `EMBEDDING_MODEL`
- **Prod (per spec):** OpenAI `text-embedding-3-small` (1536 dims)
- **Why:** Google embedding 2 preview gives strong retrieval quality on the showcase corpora and routes through the same OpenRouter gateway as the LLM, so we keep one vendor surface during the demo.
- **Why it's safe:** `cards.embedding` column is flexible `vector` + `embedding_dim int` so dims don't need to match between providers. Interference search (Plan 5+) must scope queries to matching `embedding_dim`.
- **Cleanup:** the in-code `DEFAULT_MODEL` fallback should be updated to match before the next code review pass.

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

## 12. PDF ingestion — partial pipeline (critique shipped; structure / interference / review-gate still deferred)

- **File:** `lib/ingest/pipeline.ts`
- **Demo:** 5 stages — `parsing → extracting → critiquing → embedding → insert`. Critique drops cards below quality threshold and falls back to the extracted candidates if it would drop the whole batch.
- **Spec §5:** 7 stages (parse → structure → extract → critique → embed → tag interference → review gate).
- **Still missing vs. spec:** explicit `structure` stage, interference-pair tagging, and a human review gate that holds the deck in `draft` until approved.
- **Prod:** insert structure pass before extraction; add interference tagging on the embedding output; gate `status='ready'` on user approval.

## 13. ~~No `llm_calls` cost logging~~ — RESOLVED

Shipped via `lib/llm/observability.ts`. Every LLM and embedding call writes a row with provider, model, stage, latency, token counts, classified error class, and deck/job FKs. Inserts go through the service-role admin client; users can read their own rows under RLS. See "Shipped baseline updates" above.

## 14. Profiles: onboarding

- **Files:** `app/(app)/onboarding/{subject,level,goal}/{page,*-form,*-options}.tsx`, `app/(app)/onboarding/actions.ts`, `app/(app)/library/page.tsx`, `app/(app)/deck/[id]/page.tsx`.
- **Status:** implemented post-Plan-5; new users redirect to `/onboarding/subject` until `onboarded_at` is set. Subject and level steps now navigate optimistically (URL-passed selection + prefetched next route + background patch); goal step still awaits the patch because middleware gates on `onboarded_at`.
- **Spec §7:** 4-question Cuemath-style onboarding (subject, level, daily goal, first PDF). The first-PDF step is still part of the library upload flow rather than the onboarding wizard.

## 15. Predicted-retention charts (heatmap shipped)

- **Spec §9:** activity heatmap + predicted-retention overlay (Week 2 stretch).
- **Demo:** 12-week activity heatmap is shipped on `/progress`. Predicted-retention charts are not yet built.
- **Prod:** add a per-deck retention curve fed from FSRS stability values.

## 16. ~~Font stack~~ — RESOLVED

Plus Jakarta Sans (display) and Nunito Sans (body) are wired via `next/font/google` in `app/layout.tsx`. See "Shipped baseline updates" above.

## 17. "Break prompt" triggers on last card of default 20-sprint

- **File:** `lib/fatigue/observe.ts`
- **Current:** `BASELINE_WINDOW = 10` → needs 20 events to fire, which lands on the very last card of a 20-card sprint and gets immediately replaced by the "done" screen.
- **Spec:** shows mid-sprint when slowdown is detected.
- **Suggested fix:** drop `BASELINE_WINDOW` from 10 → 5 so it fires after 10 cards.
- **Status:** intentionally unchanged for the showcase — the prompt is non-blocking and dismissable, and the perceived-speed fixes on onboarding were prioritised first. One-line tune-up when revisited.

---

## Known production gaps

The current production backlog is tracked in `docs/superpowers/plans/2026-04-26-next-stages-roadmap.md`. Use that roadmap before adding new work items here; it already accounts for shipped rename/delete, library search/sort, card browser, card edit/delete, and the Next proxy migration.

---

## How to revert for prod

A single PR can flip most of these:
- Items 1, 2 → env vars only (`LLM_PROVIDER`, `LLM_MODEL`, `EMBEDDING_MODEL`).
- Items 4, 5, 6, 7, 8 → one-line code changes.
- Items 9, 10, 11, 12 (remaining stages), 14 (PDF-in-onboarding), 15 (retention charts), 17 → new tasks in the next-stages roadmap.
- Items 13, 16 → already resolved; left in this doc as historical record.

Keep this file updated as more deviations accrue.
