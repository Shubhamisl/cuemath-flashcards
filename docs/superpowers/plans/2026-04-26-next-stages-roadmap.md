# Cuemath Flashcards Next Stages Roadmap

> **For agentic workers:** Before implementing any stage, read `AGENTS.md`, the relevant Next.js docs in `node_modules/next/dist/docs/`, and use the repo's existing patterns. Do not rewrite unrelated surfaces.

**Goal:** Turn the current deployed demo into a trustworthy learning product by closing the AI quality loop, improving practice depth, adding progress intelligence, and hardening production operations.

**Source inputs:** `User assets/cuemath_flashcard_gap_analysis.pdf`, current local `master` at commit `7db9cdc`, and live verification against `https://cuemath-flashcards-mu.vercel.app/`.

**Current baseline:** The app now has Supabase auth, PDF upload and card generation, deck grid, deck rename/delete, deck search/sort, due badges, deck detail, card browser with edit/delete, FSRS review flow, sprint building, weak concept hints on deck detail, and a fresh Vercel deployment from local `master`.

**Important stale gap-analysis corrections:** Deck rename/edit, basic deck search/sort, and individual card edit/delete are no longer missing. They should be treated as foundations to extend, not as net-new work.

## Active Leftovers Tracker

- **Stage 1 still open:** page-range upload, source page/chunk visibility in card review, single-card regenerate from source chunk, and clearer scanned/low-text PDF warning states.
- **Stage 2 remaining policy gap:** changing FSRS scheduling based on `hint_used`. We already persist hint usage, but any mastery penalty should be treated as a data-backed scheduling policy decision, not a casual FSRS rewrite.

---

## Stage 0: Planning Hygiene

**Objective:** Make the planning surface truthful before more product work starts.

**Why now:** Several older docs still describe gaps that have since been closed. Future workers will move faster if the source of truth is current.

**Tasks:**

- Update `docs/demo-deviations.md` so it reflects the shipped rename, search/sort, card browser, card edit/delete, and Next proxy migration.
- Add a short "known production gaps" section that points to this roadmap.
- Check that `README.md` and any handoff docs do not still refer to deprecated `middleware.ts` behavior.
- Decide whether the untracked local `.vercelignore` should be committed. It is useful for CLI deploy hygiene but was not part of commit `7db9cdc`.

**Acceptance checks:**

- `pnpm lint`
- `npx tsc --noEmit`

---

## Stage 1: AI Trust And Deck Quality

**Objective:** Let students or parents review, correct, and approve AI-generated decks before serious study begins.

**Why now:** Flashcards only work if learners trust the cards. The app can generate and edit cards, but it does not yet provide a strong post-generation quality workflow.

**Primary user outcome:** After uploading a PDF, the user can inspect generated cards, fix weak ones, regenerate selected cards, and approve the deck for review.

**Tasks:**

- Add explicit deck lifecycle states: `processing`, `draft`, `ready`, `failed`, and optionally `archived`.
- Route newly generated decks to a review gate instead of treating them as fully ready immediately.
- Extend the card browser with review workflow affordances:
  - mark card approved/unapproved
  - show source page/chunk when available
  - regenerate a single card from its source chunk
  - bulk approve all visible cards
- Add page-range support to the upload flow and ingestion pipeline.
- Improve ingestion feedback for scanned PDFs or low-text pages so empty decks do not feel mysterious.
- Store enough source metadata to support regeneration and review confidence.

**Likely files:**

- `app/(app)/library/page.tsx`
- `app/(app)/deck/[id]/page.tsx`
- `app/(app)/deck/[id]/cards/page.tsx`
- `app/(app)/deck/[id]/cards/actions.ts`
- `app/(app)/upload/*`
- `lib/ingest/*`
- `lib/cards/*`
- `supabase/migrations/*`

**Acceptance checks:**

- Upload a small PDF, land in draft/review state, approve it, then review cards.
- Edit and regenerate one card without changing unrelated cards.
- A scanned or empty-text PDF shows a useful failure or warning state.
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`

---

## Stage 2: Practice Depth And Retrieval Modes

**Objective:** Make each review sprint more educational than "flip and rate."

**Why now:** The review engine is functional, but the gap analysis correctly calls out missing retrieval aids and variation: hints, typing challenges, weak-card re-review, Quick 5, and next-session preview.

**Primary user outcome:** Students get help when stuck, more variety when practicing, and a clearer sense of what comes next.

**Tasks:**

- Add a hint system:
  - generate or store one concise hint per card
  - reveal hint during review before showing the answer
  - track `hint_used` in review/session data
  - make hint usage affect mastery gently, without punishing learners too heavily
- Add Quick 5 mode using the existing sprint builder with a smaller requested size.
- Add optional typing challenge mode for suitable cards.
- Add weak-card re-review at the end of a sprint when lapses occurred.
- Add next-session preview after sprint completion:
  - upcoming due count
  - weak concepts
  - suggested next mode
- Keep the existing FSRS rating flow intact.

**Likely files:**

- `app/(app)/review/page.tsx`
- `app/(app)/review/actions.ts`
- `lib/queue/build-sprint.ts`
- `lib/fsrs/*`
- `lib/cards/*`
- `supabase/migrations/*`

**Acceptance checks:**

- Hint reveal works before answer reveal and is persisted.
- Quick 5 starts a short sprint without affecting the default sprint.
- Typing challenge can be completed or skipped.
- End-of-session weak-card loop appears only when there are weak cards.
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Add or update Playwright smoke coverage for review interactions.

---

## Stage 3: Progress Intelligence

**Objective:** Turn review history into clear, motivating insight.

**Why now:** The app already records reviews and shows some deck-level signals, but it lacks a real progress dashboard, weak concept surface, visible mastery progress across sessions, and weekly learning summaries.

**Primary user outcome:** A learner can answer "What am I improving at, what is weak, and what should I study next?"

**Tasks:**

- Build a progress dashboard page.
- Add per-deck and overall metrics:
  - mastery trend
  - due/new/learning/review counts
  - retention rate
  - streaks
  - session history
  - time spent, if reliable data exists
- Promote weak concepts from deck detail into an actionable study surface.
- Add targeted practice from a weak concept.
- Add 90-day review heatmap or activity calendar.
- Add weekly report generation as an in-app summary first. Email delivery can wait.

**Likely files:**

- `app/(app)/progress/page.tsx`
- `app/(app)/deck/[id]/page.tsx`
- `app/(app)/library/page.tsx`
- `lib/progress/*`
- `lib/queue/build-sprint.ts`
- `supabase/migrations/*`

**Acceptance checks:**

- Dashboard renders correctly for an account with no reviews, one review, and many reviews.
- Weak concept drill starts a targeted sprint.
- Metrics are scoped by authenticated user.
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`

---

## Stage 4: Scheduling Maturity

**Objective:** Improve long-term memory behavior without making the app feel complicated.

**Why now:** FSRS is present, but several scheduling refinements from the gap analysis remain missing or partial.

**Primary user outcome:** The app spaces new and old cards more sensibly, prevents overload, and gives learners a useful global review queue.

**Tasks:**

- Add daily new-card cap per deck and globally.
- Add interval fuzz for mature cards to avoid same-day review cliffs.
- Add a global review queue across decks.
- Add warm-up and cool-down cards around harder sprint blocks.
- Add optional cross-deck surprise retrieval once the global queue exists.
- Defer personalized FSRS weights until there is enough review data and a clear evaluation approach.

**Likely files:**

- `lib/queue/build-sprint.ts`
- `lib/fsrs/*`
- `app/(app)/review/*`
- `app/(app)/library/page.tsx`
- `supabase/migrations/*`

**Acceptance checks:**

- New cards are capped even when many unseen cards exist.
- Global review queue excludes cards outside the user account.
- Fuzz never schedules cards in the past.
- Existing deck-specific review behavior still works.
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

---

## Stage 5: Library Scale And Portability

**Objective:** Make the library work once users have many decks and want control over organization.

**Why now:** Basic search and sort are shipped. The next useful layer is filtering, tags, archive, and export.

**Primary user outcome:** Users can organize decks, hide old material, and take their cards elsewhere.

**Tasks:**

- Add subject/status/mastery filters to the existing library controls.
- Add deck tags.
- Add archive/unarchive behavior.
- Add export:
  - CSV first
  - Anki-compatible text or package later
  - PDF summary only if there is a clear user need
- Add multi-select actions only after archive/export are stable.

**Likely files:**

- `app/(app)/library/page.tsx`
- `app/(app)/library/actions.ts`
- `app/(app)/deck/[id]/page.tsx`
- `app/(app)/deck/[id]/cards/page.tsx`
- `lib/export/*`
- `supabase/migrations/*`

**Acceptance checks:**

- Filters compose with existing search and sort.
- Archived decks disappear from default view and can be restored.
- Export contains only the authenticated user's cards.
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

---

## Stage 6: Production Hardening

**Objective:** Make the system observable, debuggable, and safer to operate as real users arrive.

**Why now:** The app is now deployed and useful enough that failures should be visible and recoverable.

**Tasks:**

- Add LLM call logging:
  - provider
  - model
  - latency
  - token counts when available
  - error class
  - deck/job id
- Add ingestion job observability in the UI and database.
- Add retry controls for failed generation stages.
- Confirm RLS coverage for new tables and actions after every migration.
- Regenerate Supabase types after schema changes.
- Add E2E smoke tests for:
  - authenticated library
  - upload happy path with mocked or fixture generation
  - card edit/delete
  - review sprint
  - progress dashboard
- Keep Vercel deployment checks tied to `master`.

**Likely files:**

- `lib/llm/*`
- `lib/ingest/*`
- `app/(app)/upload/*`
- `app/(app)/library/page.tsx`
- `tests/*`
- `supabase/migrations/*`
- `supabase/types.ts`

**Acceptance checks:**

- Failed generation has a visible state and retry path.
- Logs can answer which model generated a deck and why it failed.
- E2E smoke tests pass locally.
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`

---

## Recommended Execution Order

1. Stage 0: Planning hygiene.
2. Stage 1: AI trust and deck quality.
3. Stage 2: Practice depth and retrieval modes.
4. Stage 3: Progress intelligence.
5. Stage 4: Scheduling maturity.
6. Stage 5: Library scale and portability.
7. Stage 6: Production hardening, with logging and RLS checks also done alongside any schema-changing stage.

## First Implementation Slice

Start with Stage 0 and the first half of Stage 1:

- Update stale docs.
- Add deck lifecycle states.
- Route newly generated decks to a draft/review state.
- Add approve/unapprove card workflow.
- Block review until the deck is approved or explicitly allow "review anyway" for advanced users.

This slice is the best next move because it protects the core trust loop before adding more practice modes or analytics on top of potentially unreviewed AI cards.
