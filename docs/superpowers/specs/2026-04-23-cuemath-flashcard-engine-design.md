# Cuemath Flashcard Engine — Design Spec

**Date:** 2026-04-23
**Owner:** Shubham
**Status:** Draft for review
**Target:** Week 1 MVP (prod-leaning), Week 2 stretch scope defined and additive

---

## 1. Context & Goals

Cuemath's learning philosophy favors long-term retention over cramming. This project builds a flashcard engine that:

1. Ingests a PDF (chapter, notes, study material) and produces a **high-quality, atomic deck** — not a scrape, but cards a great teacher would write.
2. Schedules reviews using a **modern ML-driven spaced repetition algorithm** (FSRS / DSR model), not legacy SM-2 heuristics.
3. Treats the learner as a **neurobiological system** — fatigue-aware pacing, interleaved practice, hidden backlogs, encouraging feedback.
4. Feels unmistakably **Cuemath** — yellow primary CTA, pastel category system, rounded cards, SharpMind-journey progress framing, parent-safe + child-encouraging voice.

The supporting research document (`User assets/Architecture of Next.docx`) defines four pillars this design explicitly implements:

- **Pillar 1** — Algorithmic scheduling (FSRS/DSR, proportional overdue handling, priority queue)
- **Pillar 2** — Knowledge formulation (Wozniak's rules, CLT, interference tagging)
- **Pillar 3** — Retrieval practice (desirable difficulty ~85% retrievability, interleaving, dual coding)
- **Pillar 4** — Behavioral friction (fatigue sensing, hide-the-mountain, leech quarantine, dopaminergic pacing)

The deliverable is a showcase of AI-assisted build craft for Cuemath's internal skills evaluation. Quality bar is production-leaning, not throwaway.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui, extended with Cuemath design tokens |
| Fonts | Plus Jakarta Sans (display), Nunito Sans (body) |
| Auth | Supabase Auth — email magic link + Google OAuth |
| Database | Supabase Postgres (with `pgvector` extension) |
| Storage | Supabase Storage (uploaded PDFs + extracted figure images) |
| Realtime | Supabase Realtime (streams ingest job progress to client) |
| LLM | Anthropic Claude Sonnet 4.6 (extraction, generation, critique, rewrite) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) for interference search |
| SRS library | `ts-fsrs` (default published weights; custom weights stretch goal) |
| PDF parsing | `unpdf` (text + page metadata) + figure extraction |
| Hosting | Vercel (frontend + serverless functions) |
| UI tooling | Stitch by Google + Claude design for rapid component scaffolding against Cuemath tokens |

---

## 3. Module Architecture

The system decomposes into isolated modules with narrow interfaces. Each module can be understood, tested, and swapped without reading its neighbors.

```
app/                     Next.js App Router routes + server actions
lib/
  ingest/                PDF → deck pipeline (parse, structure, extract, generate, critique, interference)
  srs/                   Pure ts-fsrs wrapper: schedule(state, rating, now) → nextState
  queue/                 Session builder: buildSprint(userId, size) with interleaving + priority
  review/                Review UI surface, keyboard flow, telemetry emission
  fatigue/               Pure decision logic over review telemetry events
  progress/              Read-only projections: mastery rings, heatmap, tier assignments
  auth/                  Supabase Auth wrapper
  db/                    Typed Supabase client, migrations
  brand/                 Design tokens, theme setup, component primitives
```

**Data flow for one review session:**
`review` → `queue.buildSprint(userId)` → reads cards via `db` → UI plays through → user rates → `srs.schedule()` → persist → `fatigue.observe(event)` → `queue` may inject easy card or UI may prompt break.

**Isolation principle:** `srs/` has no DB knowledge. `queue/` knows cards but not UI. `fatigue/` is pure decision logic over event streams. `review/` orchestrates but owns no state.

---

## 4. Data Model (Postgres)

```sql
-- Supabase Auth owns `users` (id, email, created_at)

profiles (
  user_id PK → auth.users,
  display_name TEXT,
  timezone TEXT,
  daily_goal_cards INT DEFAULT 20,
  fsrs_weights JSONB NULL              -- null = use ts-fsrs defaults
)

decks (
  id UUID PK,
  user_id FK,
  title TEXT,
  subject_family TEXT,                 -- math | language | science | humanities | other
  source_pdf_path TEXT,                -- Supabase Storage key
  source_pdf_hash TEXT,
  status TEXT,                         -- ingesting | ready | failed
  card_count INT DEFAULT 0,
  created_at, updated_at
)

ingest_jobs (
  id UUID PK,
  deck_id FK,
  stage TEXT,                          -- parsing | structuring | extracting | generating | critiquing | tagging | review
  progress_pct INT,
  error TEXT,
  started_at, finished_at
)

cards (
  id UUID PK,
  deck_id FK, user_id FK,
  format TEXT,                         -- qa | cloze | image_occlusion
  front JSONB,                         -- { text, image_url?, occlusion_regions? }
  back JSONB,                          -- { text, image_url?, explanation? }
  source_chunk_id TEXT,                -- back-reference into parsed PDF
  concept_tag TEXT,
  embedding VECTOR(1536),              -- pgvector
  fsrs_state JSONB,                    -- { due, stability, difficulty, elapsed_days,
                                       --   scheduled_days, reps, lapses, state, last_review }
  suspended BOOLEAN DEFAULT false,     -- leech quarantine
  created_at, updated_at
)

interference_pairs (
  card_a FK, card_b FK,
  discriminative_prompt TEXT,
  similarity FLOAT,
  PRIMARY KEY (card_a, card_b)
)

reviews (                              -- append-only log; source of truth
  id UUID PK,
  card_id FK, user_id FK,
  rated_at TIMESTAMPTZ,
  rating SMALLINT,                     -- 1 Forgot | 2 Tough | 3 Got it | 4 Easy
  elapsed_ms INT,                      -- user response time
  scheduled_days_before INT,           -- for overdue ratio math
  fsrs_state_before JSONB,
  fsrs_state_after JSONB
)

sessions (
  id UUID PK,
  user_id FK,
  started_at, ended_at,
  cards_reviewed INT,
  mean_accuracy FLOAT,
  mean_response_ms INT,
  break_prompted_at TIMESTAMPTZ NULL
)

llm_calls (                            -- cost visibility
  id UUID PK, user_id FK,
  stage TEXT, model TEXT,
  input_tokens INT, output_tokens INT,
  latency_ms INT, created_at
)
```

**Key decisions:**
- `reviews` is append-only → enables FSRS re-training and audit without data loss.
- Cards own their FSRS state (MVP = single-user decks). If shared decks are added later, split into `card_states(user_id, card_id, fsrs_state)` — no-op migration now.
- `pgvector` powers interference-pair discovery and future "find related cards."
- RLS policies on every table keyed to `user_id`.

---

## 5. Ingestion Pipeline

**Trigger:** PDF upload to Supabase Storage → `ingest_jobs` row created → server action kicks off pipeline → streams progress to client via Supabase Realtime on the job row.

### Stages (each pure, independently testable)

**1. Parse** (`lib/ingest/parse.ts`) — `unpdf` for text + page/bbox metadata. Extract embedded images to Storage. Output: `ParsedDoc { pages: [{text, images, headings?}] }`. Deterministic.

**2. Structure** (`lib/ingest/structure.ts`) — heuristic section detection (font-size jumps, numbered headings). LLM fallback if structure is weak ("segment this into logical sections"). Output: `Chunk[] { title, text, pageRange, figures }`. Target chunk size 400–800 tokens.

**3. Extract** (`lib/ingest/extract.ts`) — per-chunk Claude call with structured output schema:
```ts
{ concepts: [{ name, definition, importance: 1-3 }],
  relationships: [{ from, to, kind }],
  worked_examples: [{ problem, solution_steps }],
  figures_worth_occluding: [{ image_id, regions_to_mask }] }
```
Parallelized, rate-limited to 5 concurrent requests.

**4. Generate** (`lib/ingest/generate.ts`) — per concept/relationship/example, one Claude call producing candidate card(s). Prompt constrained by Wozniak's rules (atomic, minimum info, no complex sets) with negative examples. Format chosen by content type:
- Concept/definition → Q&A
- Relationship → Q&A ("How does X relate to Y?")
- Worked example → multi-step cloze
- Figure → image occlusion (Week 2 stretch for rendering; data captured in Week 1)

**5. Critique** (`lib/ingest/critique.ts`) — one LLM pass over the full candidate set: flags shallow cards, duplicates, cards >30 words on the answer side. Returns keep/split/drop decisions; obvious splits auto-apply.

**6. Tag interference** (`lib/ingest/interference.ts`) — embed all cards → pgvector similarity search within deck → pairs with similarity > 0.85 go to LLM: "Are these genuinely confusable? If yes, write a discriminative-contrast prompt." Results stored in `interference_pairs`.

**7. Review gate** — user lands on review UI: cards grouped by source section, inline edit, bulk accept/reject. On approve → `decks.status = 'ready'`.

### Observability & failure handling

- Every LLM call logged to `llm_calls` (tokens, latency, cost estimate).
- Stage failures set `ingest_jobs.error`; user sees Retry. Partial chunk failures don't fail the whole job — partial decks beat no deck.
- Estimated cost per 30-page PDF: ~$0.15–0.40 at current Claude Sonnet pricing.

---

## 6. SRS, Queue & Scheduling

### `lib/srs/` — pure wrapper over `ts-fsrs`

```ts
schedule(state: FsrsState, rating: 1|2|3|4, now: Date, weights?: number[])
  → { nextState, dueDate, intervalDays }

initialState(): FsrsState       // for new cards
```

Defaults to library-published weights (trained on ~700M reviews). Personalization stretch goal: nightly cron runs `FSRS.computeParameters(reviewHistory)` for users with ≥1K reviews, writes to `profiles.fsrs_weights`. No schema change required.

### `lib/queue/` — session builder (Pillar 3 work)

Core: `buildSprint(userId, { size = 20 }) → Card[]`.

1. Fetch cards where `fsrs_state.due ≤ now OR state = 'new'`, `suspended = false`, across all user decks.
2. **Priority score** = `overdue_ratio × (1 / stability)`. Highly overdue + low stability floats up. Mature cards (stability > 30d) with small overdue ratio get auto-postponed if sprint is otherwise full.
3. **Interleave** — sort by priority, then greedy walk placing cards such that consecutive cards don't share `deck_id` or `concept_tag` when feasible (2-ahead lookahead, no starvation).
4. **Interference-pair adjacency** — if a card in the sprint has a paired card also due, place them adjacent. After the second is rated, UI surfaces the `discriminative_prompt`.
5. **Warm-up / cool-down** — first 2 and last 2 cards of a sprint biased toward high-stability cards (easy wins → dopaminergic priming at session start; success at session end).

### Rating & overdue handling

- 4-button FSRS standard: **Forgot (1) / Tough (2) / Got it (3) / Easy (4)**. Keys 1–4. Space flips. Enter = Got it (common case).
- ts-fsrs `next()` consumes actual elapsed time → overdue math is correct by construction. No legacy "low interval hell."

### Leech handling

- Suspend card when `lapses ≥ 6` and `reps ≥ 10`.
- Suspended cards appear in a "Needs reformulating" tray.
- Week 1: flag only. Stretch: one-click LLM rewrite flow producing 2–3 atomized replacement cards; original archived.

---

## 7. Visual System & Brand (Cuemath)

### Design tokens

```
--cue-yellow:   #FFBA07   (primary CTA, selected, highlight)
--ink-black:    #000000   (text, selected controls)
--paper-white:  #FFFFFF   (card surface, app background)
--soft-cream:   #FFF1CC   (warm panels, active nav group, math subject tint)
--mint-green:   #D0FBE5   (success, reassurance, science tint)
--bubble-pink:  #FFE0FD   (discovery, language tint)
--trust-blue:   #DBEAFE   (info panel, humanities tint)
--alert-coral:  #F97373   (gentle warning — never harsh red)

--radius-input: 12px
--radius-card:  24px
--radius-panel: 32px

--motion-tap:       120ms
--motion-progress:  400ms

font-display: "Plus Jakarta Sans", "Sora", system-ui
font-body:    "Nunito Sans", system-ui
```

Exposed as Tailwind theme extensions and CSS custom properties. All UI references tokens — no one-off values.

### Brand translation — "SharpMind Journey"

Cuemath's "MathFit" progress metaphor generalizes to **"SharpMind"** for a subject-agnostic flashcard engine. Mastery tiers: **Curious → Practicing → Confident → SharpMind**. Tier is derived from per-deck mean stability.

### Core screens

**Onboarding** (one-question-per-screen, Cuemath signature):
1. *"What are you studying?"* — subject family (drives category color)
2. *"What's your level?"* — Beginner / Intermediate / Advanced
3. *"How many cards per day feels right?"* — 10 / 20 / 40 → `daily_goal_cards`
4. *"Drop your first PDF."* — upload → ingestion

Thin yellow progress bar, large tap targets, skippable after step 1.

**Home / Deck library**:
- Greeting + streak pill (yellow dot, never flame emoji)
- **Today's sprint** hero card — yellow CTA, shows "20 cards ready" chip, 7-day sparkline. No raw due counts.
- **Your decks** grid — pastel rounded cards colored by subject family, each with mastery ring (yellow over soft-cream track), status sticker ("Fresh" / "In practice" / "Keeping sharp").
- **+ New deck** dashed tile.

**Ingestion progress screen**:
- Soft-cream panel, yellow accent bar animating through the 7 stages.
- Copy narrates cognitive-science choices in plain language: *"Writing atomic cards (one idea per card)…"*, *"Spotting easily-confused pairs…"*.
- Turns a 30-second wait into a trust-building moment. **No purple AI gradients.**

**Review sprint screen** (mobile-first, 390px baseline):
- Paper-white surface, card in 24px-radius container with soft shadow.
- Slim yellow sprint-progress bar at top (visual dots, not "5/20" text).
- Four pill-shaped rating buttons. **Got it** is yellow-filled default (Enter); others ghost-outlined. ≥48px tap targets.
- Subtle flip animation (~160ms, respects `prefers-reduced-motion`).
- Deck category color as a thin rim on the card (not a flood).
- **Interference-pair callout** (after second paired card): soft-cream panel with yellow accent, warm copy: *"These two are easy to mix up. Here's the difference:"* — feels like a tutor note.

**Sprint-end screen**:
- Yellow sticker-style badge on promotions (card promoted to a higher tier).
- Mint success panel: *"Nice sprint. 18 remembered."*
- Yellow pill CTA **Another sprint** / ghost **Done for today**.
- **Never** shows "247 due" or similar.

**Leech / Needs-reformulating tray**:
- Coral-tinted chip label (gentle, not alarming).
- Click → warm panel: *"This one keeps slipping. Want to split it into smaller questions?"*
- Stretch: LLM rewrite flow.

**Trust strip** (landing + upload): rounded chips — *"Backed by 700M+ reviews"*, *"Cognitive-science tuned"*, *"Your PDFs stay private"*. Black text on soft-cream fills. Sits near decisions per Cuemath conversion rule.

### Keyboard flow

`Space` = flip · `1–4` = rate · `E` = edit inline · `S` = suspend · `Esc` = end sprint early.

### Accessibility

- 2px yellow focus rings over black.
- Full review loop keyboard-navigable.
- Screen-reader labels on all interactive elements.
- Color is never the only signal — icons accompany state.
- Responsive from 390px mobile up; no overlay intercepts background taps.

### Avoid list (explicit)

- Generic SaaS blue CTAs
- Purple AI gradients on ingestion or anywhere else
- Confetti, XP bars, toy-only visuals
- Harsh red
- Raw "X cards due" counts anywhere user-facing
- Enterprise dashboard density
- Overlays without locked backgrounds

### UI tooling approach

Use **Stitch by Google** to generate initial screen mockups and component scaffolds against the Cuemath design tokens. Use **Claude design** for refinement, React component wiring, and token-fidelity audits. Do not hand-craft every primitive from scratch.

---

## 8. Fatigue-Aware Behavior (Pillar 4)

### `lib/fatigue/` — pure decision logic

Consumes telemetry events emitted by `review/`: `{ cardId, elapsedMs, rating, timestamp }`. Rolling window of last 10 cards per session.

**Triggers:**

1. **Accuracy drop** — rolling rate of Forgot+Tough ≥ 50% for 6 consecutive cards → `action: 'inject_easy'`. Queue injects 2 mature cards (stability >30d) to restore dopaminergic tone per research Pillar 4.
2. **Response-time balloon** — median `elapsed_ms` 2× session baseline → `action: 'prompt_break'`. Mint-green panel: *"You've been going hard. Stretch for 60 seconds?"* Dismissible. At most once per sprint.
3. **Sprint cap** — hard stop at 20 cards OR 15 minutes. End screen emphasizes completion, not remaining queue.

`fatigue.observe(event)` returns `{ action: 'continue' | 'inject_easy' | 'prompt_break' }`. Review UI honors action at next card boundary. Pure logic → unit-testable with synthetic event streams.

### Hide-the-mountain principle

Absolute due counts never appear in user-facing UI. Backlogs are abstracted into sprints. Priority queue + auto-postpone ensures mature cards slip quietly when backlog is large, preventing psychological stress spikes per Pillar 4 neurobiology.

---

## 9. Progress & Mastery (Pillar 1 + UX)

### `lib/progress/` — read-only projections

- **Per-deck mastery** = `% of active cards with stability > 30 days`.
- **Tier assignment** by mean stability:
  - < 7d → Curious
  - 7–21d → Practicing
  - 21–60d → Confident
  - ≥ 60d → SharpMind
- **Heatmap** of review activity last 30 days (rendered in deck detail, Week 2 stretch).
- **Predicted-retention-in-30-days** (stretch) — computed from FSRS stability.

Projections are computed on-read with a short in-memory cache for MVP. Materialized views / write-side triggers are an optimization deferred to Week 2 if needed (see Open Questions).

---

## 10. Testing Strategy

- **Unit tests** (Vitest): `srs/` (85% retention invariant; overdue proportionality), `queue/` (no starvation, interleaving property, interference-pair adjacency), `fatigue/` (synthetic event streams → expected actions), ingestion stage purity.
- **Integration tests**: full ingest pipeline on 2–3 fixture PDFs (math chapter, history notes, language list); assert card count ranges, atomicity checks (answer length ≤ 30 words on 90%+), interference-pair detection on known duplicate pair.
- **E2E** (Playwright): upload → ingest → review sprint → rating persists → mastery ring updates. Mobile viewport (390px) + desktop.
- **LLM call snapshot tests**: record structured outputs for fixture inputs; flag large drift between model versions.
- **Accessibility audit**: axe-core in CI; manual keyboard-only walkthrough of core flows.

---

## 11. Phased Scope

### Week 1 — shippable MVP (priority order)

1. Foundation: Next.js + Supabase + tokens + auth (magic link + Google)
2. Ingestion pipeline (stages 1–7) with streamed progress
3. `srs/` wrapper + append-only `reviews` log + leech flagging
4. Review UI: sprint of 20, keyboard-driven, branded, mobile-first
5. Global interleaved queue with priority + overdue ratio
6. Deck library + mastery ring + SharpMind tiers + pastel categories
7. Fatigue basics: sprint cap, hidden counts, warm end screen

### Week 2 — stretch (additive, no rework)

- Interference-pair tagging + adjacent scheduling (full Pillar 2 + 3)
- Effort-sensing signal triggers (inject easy, prompt break)
- Leech reformulation flow (LLM rewrite)
- FSRS weight personalization cron (≥1K reviews)
- Image-occlusion rendering for PDF figures
- Heatmap + forgetting-curve charts
- Parent-mode read-only progress digest

### Explicitly out of scope

- Shared/collaborative decks
- Payments, subscriptions
- Native mobile apps, offline sync
- CBT reflection prompts, biometric integrations
- Multi-language UI

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM cost on large PDFs | Rate-limit concurrency; cost per PDF capped by chunk count; `llm_calls` observability |
| Ingestion quality varies by PDF type | Fixture-based integration tests; critique pass; human review gate before deck commit |
| `ts-fsrs` API drift | Pin version; thin wrapper isolates change |
| Supabase Realtime flakiness | Fallback to polling `ingest_jobs` every 2s if websocket drops |
| Timeline slip on Week 1 | Phased priority list; items 6–7 are cuttable without breaking core loop |
| Brand fidelity regressions | All tokens named; lint rule forbids raw color hex / raw pixel radius in components |

---

## 13. Open Questions (to resolve during writing-plans)

- Background job execution model for ingestion — Vercel serverless function with streaming vs dedicated worker on Supabase Edge Function?
- Mastery-ring recomputation — materialized view, trigger, or on-read aggregation?
- Subject-family auto-detection from PDF vs user-selected during onboarding only?

---

End of spec. Next step: writing-plans skill converts this into a step-by-step implementation plan.
