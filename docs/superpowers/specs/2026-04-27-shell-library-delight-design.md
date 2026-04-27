# Shell + Library Delight Design

**Date:** 2026-04-27  
**Owner:** Shubham  
**Status:** Approved design, awaiting written-spec review  
**Scope:** First UI/UX delight slice for the authenticated app shell and library home

---

## 1. Context

SharpMind is now functionally strong: upload, trust gate, review depth, progress, scheduling, exports, and production hardening are all in place. The remaining gap is not core product logic. It is the quality of the experience itself.

The app currently feels:

- coherent
- useful
- trustworthy
- partially polished

But it does **not yet feel consistently delightful**. The most visible gap is the first authenticated experience: the app shell and the library home.

This slice exists to fix that first impression before deeper polish passes on review, progress, deck detail, and upload.

---

## 2. Goal

Make the app feel like a designed learning product the moment a user lands after login.

The desired user reaction is:

> "This feels like my study space."

Not:

> "This is a dashboard with some deck cards."

This slice should improve both:

- **discoverability**: users can instantly find where they are and what to do next
- **beauty**: the app feels playful-smart, warm, and intentional

---

## 3. Approved Direction

### Tone

**Playful smart**

This means:

- warm, light, clever
- not childish
- not stern
- not productivity-tool cold

The tone should appear **everywhere lightly**, not in one loud surface.

### Shell freedom

The shell can change **boldly** if that is what it takes to feel right. This is not a "minor top-nav polish" pass.

### Primary priority

The whole shell should feel special before any one deck card does.

### Chosen visual direction

**Ribbon Shell**

The approved design base is the "Ribbon Shell" direction explored during brainstorming.

Its role:

- establish a brighter, more intentional app frame
- make navigation first-class
- make study actions feel obviously available
- preserve the app's calm study-first character

We may borrow a little energy from the more expressive "Momentum Canvas" direction, but the implementation should stay anchored in Ribbon Shell restraint.

---

## 4. What Changes

## 4.1 App shell

The current app shell is functionally thin:

- logo link on the left
- streak pill and avatar menu on the right
- key destinations partly hidden behind logo/avatar behaviors

The new shell should become a real product frame:

- clear primary navigation for `Library`, `Progress`, and `Profile`
- active location visually obvious
- streak and identity still present, but integrated into the shell instead of floating separately
- clearer placement for global learning actions

The shell should feel brighter and more composed without turning into a marketing hero.

## 4.2 Library home

The library page should stop reading as:

- top bar
- greeting
- filters
- card grid

And instead read as a single composed study home:

- greeting and daily progress as the left-side anchor
- study actions as a deliberate right-side "study now" zone
- search/sort/filter controls as a cleaner, more intentional rail
- deck grid with more rhythm, hierarchy, and collectible energy

## 4.3 Deck cards

Deck cards should remain efficient, but gain more character:

- stronger title hierarchy
- cleaner badge rhythm
- better readability of mastery / due / tags / state
- more deliberate spacing and hover behavior
- clearer contrast between `ready`, `draft`, `failed`, and `archived`

The cards should feel like part of one product language rather than generic grid items.

---

## 5. What Must Not Change

This is a delight pass, not a behavior rewrite.

The following must remain intact:

- auth and sign-out flow
- trust/review gate behavior
- upload and ingest actions
- review-entry behavior
- filtering and sorting behavior
- archive/delete/retry controls
- FSRS and queue logic

This pass may improve presentation and discoverability, but not change the underlying learning model.

---

## 6. Proposed UI Structure

## 6.1 Shell

The shell should include:

- brand mark / product name
- persistent primary nav
- streak / momentum signal
- profile entry

The current-location state should be obvious without requiring the user to infer it from page content.

Recommended shell behavior:

- desktop: inline primary nav
- mobile: compact but still explicit nav treatment
- profile menu remains available, but it should no longer be the only way to discover important destinations

## 6.2 Library header band

The library header should become a two-sided band:

- **left:** greeting, daily progress, lightweight supportive framing
- **right:** action cluster for `Review all due`, `Quick 5`, `Upload PDF`

This should feel like the "start here" part of the product.

## 6.3 Control rail

Search, sort, and filters should remain powerful, but be visually calmer:

- grouped
- aligned
- easier to scan
- less like a raw form row

## 6.4 Deck grid

The grid should feel:

- denser where useful
- cleaner in rhythm
- easier to scan by title, state, and next action

The cards should still support repeated use without ornamental clutter.

---

## 7. Alternatives Considered

## Option A: Ribbon Shell (approved)

**Pros**

- best balance of warmth, clarity, and implementation safety
- keeps the app airy
- strong first impression without over-dramatizing the page
- works well with the existing palette and card system

**Cons**

- requires high-quality card polish to fully land
- can drift back toward "nice but ordinary" if spacing and hierarchy are not executed carefully

## Option B: Studio Shelf

**Pros**

- strongest discoverability
- side rail gives the app a very explicit structure
- naturally supports more destinations later

**Cons**

- risks feeling too much like a productivity tool
- less emotionally warm
- heavier shell may reduce the sense of calm space

## Option C: Momentum Canvas

**Pros**

- strongest emotional impact
- feels most "special on arrival"
- strongest momentum framing

**Cons**

- easiest to overdo
- risks becoming too hero-like for a repeated study surface
- can compete with the actual deck grid instead of supporting it

**Decision**

Use **Ribbon Shell** as the implementation base, borrowing only selective energy from Momentum Canvas.

---

## 8. Implementation Shape

This slice should be implemented in three layers.

## Layer 1: App shell and nav

Primary files:

- [D:/CUEMATH/Flashcard/app/(app)/_components/top-nav.tsx](D:/CUEMATH/Flashcard/app/(app)/_components/top-nav.tsx)

Likely work:

- introduce explicit nav links
- make active route obvious with a client-side pathname-aware subcomponent
- rebalance shell spacing and grouping
- preserve existing sign-out behavior

## Layer 2: Library header and control rail

Primary files:

- [D:/CUEMATH/Flashcard/app/(app)/library/page.tsx](D:/CUEMATH/Flashcard/app/(app)/library/page.tsx)
- [D:/CUEMATH/Flashcard/components/search-sort-bar.tsx](D:/CUEMATH/Flashcard/components/search-sort-bar.tsx)

Likely work:

- recompose header into a more intentional study-home band
- improve CTA grouping
- refine filter/search composition
- preserve data and behavior

## Layer 3: Deck-card refinement

Primary files:

- [D:/CUEMATH/Flashcard/components/deck-card.tsx](D:/CUEMATH/Flashcard/components/deck-card.tsx)

Likely work:

- hierarchy, spacing, badges, hover behavior
- clearer state design
- stronger but still efficient visual presentation

---

## 9. Guardrails

- Do not add nested card-on-card page sections.
- Do not add decorative gradients or blobs unrelated to the study context.
- Do not hide important controls behind ambiguous icons.
- Do not make the library feel slower or heavier during repeated daily use.
- Do not regress mobile ergonomics while optimizing desktop composition.

---

## 10. Testing and Verification

Functional verification required:

- library still loads and filters correctly
- nav still reaches `Library`, `Progress`, and `Profile`
- sign-out still works
- `Upload PDF`, `Review all due`, and `Quick 5` still behave correctly
- deck cards still support the same actions and routes

Technical verification required:

- `pnpm lint`
- `pnpm test`
- `pnpm build`

Visual verification required:

- desktop shell reads clearly
- mobile shell remains legible
- library hierarchy feels stronger than the current version
- loading state still feels compatible with the new shell

---

## 11. Out of Scope

Not part of this slice:

- review-screen redesign
- progress-dashboard redesign
- deck-detail redesign
- upload-flow redesign
- copy audit across the whole app
- new motion system across all screens

Those belong to later delight slices already tracked in the handover file.

---

## 12. Follow-on Work

If this slice lands well, the next best delight slice is:

1. review-screen emotional quality
2. progress dashboard polish
3. trust/admin surfaces

That order preserves the biggest user-visible impact while keeping the app coherent.
