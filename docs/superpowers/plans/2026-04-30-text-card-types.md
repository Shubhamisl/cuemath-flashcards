# Text Card Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add text-only card formats (`qa`, `cloze`, `worked_example`) end-to-end while leaving image occlusion out of scope.

**Architecture:** Reuse the existing `cards.format` column and front/back JSON shape. Add one shared format type/schema, then thread it through extraction, critique, ingest, queue, review, card browser, and export. Keep all formats reviewable as text cards so FSRS and rating logic remain unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Supabase Postgres, Vitest, Testing Library.

---

## File Structure

- Modify `lib/llm/types.ts`: define `TEXT_CARD_FORMATS`, `textCardFormatSchema`, and add `format` to `atomicCardSchema` with a default of `qa`.
- Modify `lib/llm/extract-cards.ts`: teach prompts to generate only `qa`, `cloze`, or `worked_example`.
- Modify `lib/llm/extract-cards.test.ts`: verify parsing defaults old cards to `qa`, accepts new formats, and prompts mention allowed formats.
- Modify `lib/llm/critique-cards.ts`: require critique to preserve/select a supported format.
- Modify `lib/ingest/pipeline.ts`: store `format: c.format` instead of hard-coded `qa`.
- Modify `lib/queue/types.ts` and `lib/queue/build-sprint.ts`: fetch and expose `format` to review UI.
- Modify `components/review-card.tsx` and `components/review-card.test.tsx`: render type-aware labels/helper copy.
- Modify `app/(app)/review/review-session.tsx`: pass `current.format` into `ReviewCard`.
- Modify `app/(app)/deck/[id]/cards/page.tsx`, `card-browser.tsx`, and `actions.ts`: display and preserve format during edits.
- Modify `lib/export/csv.ts`, `lib/export/csv.test.ts`, and `app/deck/[id]/export/route.ts`: include format in CSV and Anki tags.

---

### Task 1: Shared Format Type And Extraction Schema

**Files:**
- Modify: `lib/llm/types.ts`
- Modify: `lib/llm/extract-cards.ts`
- Test: `lib/llm/extract-cards.test.ts`

- [ ] **Step 1: Write schema tests**

Add tests asserting:

```ts
expect(parseExtractionResponse(JSON.stringify({
  cards: [{ front: 'Q', back: 'A', concept_tag: 't', source_page: 0 }],
})).cards[0].format).toBe('qa')

expect(parseExtractionResponse(JSON.stringify({
  cards: [{ format: 'cloze', front: 'The derivative of x^2 is ___.', back: '2x', concept_tag: 'derivative_power_rule', source_page: 0 }],
})).cards[0].format).toBe('cloze')

expect(buildExtractionPrompt({ pages: [], alreadyCarded: [], remainingBudget: 3 })).toContain('qa | cloze | worked_example')
```

- [ ] **Step 2: Run focused extraction tests**

Run: `pnpm test -- lib/llm/extract-cards.test.ts`

Expected: fail because `format` is not in the schema or prompts yet.

- [ ] **Step 3: Add format schema**

In `lib/llm/types.ts`, add:

```ts
export const TEXT_CARD_FORMATS = ['qa', 'cloze', 'worked_example'] as const
export const textCardFormatSchema = z.enum(TEXT_CARD_FORMATS)
export type TextCardFormat = z.infer<typeof textCardFormatSchema>
```

Then add to `atomicCardSchema`:

```ts
format: textCardFormatSchema.default('qa'),
```

- [ ] **Step 4: Update generation prompts**

In `lib/llm/extract-cards.ts`, update card-generation instructions to require:

```text
Choose format as exactly one of: qa | cloze | worked_example.
- qa: direct question and answer.
- cloze: front contains one blank marker "___"; back gives the missing phrase plus a short explanation when useful.
- worked_example: front asks for the next step, method, or reusable procedure; back gives concise steps.
Do not use image_occlusion.
```

Update JSON examples to include `"format":"qa"`.

- [ ] **Step 5: Re-run extraction tests**

Run: `pnpm test -- lib/llm/extract-cards.test.ts`

Expected: pass.

---

### Task 2: Preserve Format Through Critique And Ingest

**Files:**
- Modify: `lib/llm/critique-cards.ts`
- Modify: `lib/ingest/pipeline.ts`
- Test: `lib/llm/extract-cards.test.ts`

- [ ] **Step 1: Update critique prompt**

In `lib/llm/critique-cards.ts`, add rules:

```text
- Preserve the candidate card format unless changing it clearly makes the card better.
- Final card format must be exactly one of: qa, cloze, worked_example.
- Do not use image_occlusion.
```

Update the response example to include `"format":"qa"`.

- [ ] **Step 2: Store generated format**

In `lib/ingest/pipeline.ts`, change:

```ts
format: 'qa',
```

to:

```ts
format: c.format,
```

- [ ] **Step 3: Run focused LLM tests**

Run: `pnpm test -- lib/llm/extract-cards.test.ts`

Expected: pass.

---

### Task 3: Review UI Format Awareness

**Files:**
- Modify: `lib/queue/types.ts`
- Modify: `lib/queue/build-sprint.ts`
- Modify: `components/review-card.tsx`
- Modify: `components/review-card.test.tsx`
- Modify: `app/(app)/review/review-session.tsx`

- [ ] **Step 1: Add review component tests**

Add tests:

```ts
render(<ReviewCard front="The value is ___." back="42" flipped={false} format="cloze" />)
expect(screen.getByText('Fill the blank')).toBeInTheDocument()

render(<ReviewCard front="Find the next step." back="Differentiate both sides." flipped={false} format="worked_example" />)
expect(screen.getByText('Method')).toBeInTheDocument()
```

- [ ] **Step 2: Run review-card tests**

Run: `pnpm test -- components/review-card.test.tsx`

Expected: fail because `ReviewCard` has no `format` prop.

- [ ] **Step 3: Thread format into queue**

Add `format: TextCardFormat` to `SprintCard` in `lib/queue/types.ts`.

Change the Supabase select in `lib/queue/build-sprint.ts` to include `format`, and normalize missing values to `qa`:

```ts
format: card.format ?? 'qa',
```

- [ ] **Step 4: Render type-aware labels**

In `components/review-card.tsx`, add a `format?: TextCardFormat` prop and map:

```ts
qa: Question / Think it through before you flip.
cloze: Fill the blank / Recall the missing piece before you flip.
worked_example: Method / Work the step before you flip.
```

Back label remains `Answer` for `qa` and `cloze`; use `Steps` for `worked_example`.

- [ ] **Step 5: Pass format from review session**

In `app/(app)/review/review-session.tsx`, pass:

```tsx
format={current.format}
```

- [ ] **Step 6: Re-run review tests**

Run: `pnpm test -- components/review-card.test.tsx`

Expected: pass.

---

### Task 4: Browser And Export Format Awareness

**Files:**
- Modify: `app/(app)/deck/[id]/cards/page.tsx`
- Modify: `app/(app)/deck/[id]/cards/card-browser.tsx`
- Modify: `app/(app)/deck/[id]/cards/actions.ts`
- Modify: `lib/export/csv.ts`
- Modify: `lib/export/csv.test.ts`
- Modify: `app/deck/[id]/export/route.ts`

- [ ] **Step 1: Update export tests**

Change CSV header expectation to:

```text
deck_title,subject_family,deck_tags,format,concept_tag,front_text,back_text,approved,suspended
```

Add `format: 'cloze'` to test card input and expect `"cloze"` in the CSV row.

- [ ] **Step 2: Run export tests**

Run: `pnpm test -- lib/export/csv.test.ts`

Expected: fail because CSV does not include format.

- [ ] **Step 3: Include format in browser fetch/display**

In cards page select, add `format`. In `CardRow`, add `format: TextCardFormat`. Display a small format label next to concept/status. Update local edit state to preserve `format` unchanged.

- [ ] **Step 4: Preserve format in update action**

No schema change is needed for text edits; `updateCard` should keep updating only `front` and `back`.

- [ ] **Step 5: Include format in export**

In `app/deck/[id]/export/route.ts`, select `format`, normalize missing values to `qa`, and pass through to `buildDeckCsv` / `buildDeckAnkiTsv`.

In CSV output, include `format` as a column. In Anki TSV tags, include `format:<format>` so card types survive export without changing Anki note fields.

- [ ] **Step 6: Re-run export tests**

Run: `pnpm test -- lib/export/csv.test.ts`

Expected: pass.

---

### Task 5: Verification And Commit

**Files:**
- All modified files above.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm test -- lib/llm/extract-cards.test.ts components/review-card.test.tsx lib/export/csv.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: pass.

- [ ] **Step 3: Run full tests excluding local worktrees**

Run: `pnpm test -- --exclude '.claude/**'`

Expected: all pass.

- [ ] **Step 4: Run build**

Run: `pnpm build`

Expected: pass.

- [ ] **Step 5: Commit and push**

Run:

```powershell
git add lib/llm/types.ts lib/llm/extract-cards.ts lib/llm/extract-cards.test.ts lib/llm/critique-cards.ts lib/ingest/pipeline.ts lib/queue/types.ts lib/queue/build-sprint.ts components/review-card.tsx components/review-card.test.tsx app/(app)/review/review-session.tsx app/(app)/deck/[id]/cards/page.tsx app/(app)/deck/[id]/cards/card-browser.tsx app/(app)/deck/[id]/cards/actions.ts lib/export/csv.ts lib/export/csv.test.ts app/deck/[id]/export/route.ts docs/superpowers/plans/2026-04-30-text-card-types.md
git commit -m "Add text card types"
git push origin master
```

Expected: push succeeds and Vercel deploys from the new commit.

---

## Self-Review

- Spec coverage: `qa`, `cloze`, and `worked_example` are covered across generation, critique, storage, review, browser, and export. `image_occlusion` is explicitly excluded.
- Placeholder scan: no `TBD`, `TODO`, or undefined task references remain.
- Type consistency: the shared `TextCardFormat` type is introduced first and reused by UI/queue/export code.
