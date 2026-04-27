# Review Arena Flow Design

**Date:** 2026-04-27  
**Owner:** Shubham  
**Status:** Approved design, awaiting written-spec review  
**Scope:** Second UI/UX delight slice for the active review flow, weak-card retry interstitial, and done-state experience

---

## 1. Context

SharpMind now has a strong study engine:

- trust-gated AI cards
- standard review and Quick 5
- hints
- typing challenge
- weak-card retry loop
- post-session preview
- progress surfaces and scheduling maturity

The remaining gap is not capability. It is **felt quality during the actual learning run**.

Right now, review works, but it still reads more like:

- a card on a page
- utility helper panels
- a mechanically correct done screen

Than:

- a focused study arena
- an energetic learning loop
- a satisfying session with momentum

This slice exists to make the review experience feel like the emotional center of the product.

---

## 2. Goal

Make the review flow feel **energetic, gameful, and rewarding** while preserving the speed needed for repeated daily use.

The desired reaction is:

> "This feels alive. I know exactly what to do, and finishing a session feels good."

Not:

> "The system works, but the study loop still feels plain."

This slice must improve all three of these:

- **card presentation**
- **interaction rhythm**
- **finish / consequence states**

And it is allowed to make **dramatic UI changes** if needed, as long as the learning engine stays intact.

---

## 3. Approved Direction

### Emotional target

**Energetic and gameful**

This means:

- more charged than the current calm utility layout
- stronger momentum and reward signals
- clearer phase transitions
- more emotional payoff at the right moments

It does **not** mean:

- noisy
- childish
- distracting
- slow

### Motion target

**Moderate motion**

Motion should be visible enough to reinforce:

- reveal
- answer-check state
- rating resolution
- next-card arrival
- session completion

But it should stay short and comprehension-first.

### Repetition tradeoff

**Balance**

The review experience should feel much better, but not at the cost of making repetition annoying.

The rule is:

- **ceremony at transitions**
- **speed inside repetition**

### Chosen structural direction

**Arena Flow**

The approved direction is to redesign the **whole session plus done/retry screens**, not just the card component in isolation.

This means a real end-to-end review-flow redesign rather than a control polish pass.

---

## 4. What Changes

## 4.1 Session structure

The active review session should become a composed arena with four layers:

- session header
- card stage
- action zone
- consequence states

The experience should feel like a focused run, not just a single card embedded in a page.

## 4.2 Card stage

The review card becomes the visual center of gravity:

- stronger framing
- clearer front/back distinction
- more premium presence
- better sense of anticipation before reveal

The card should feel important enough to carry the session emotionally.

## 4.3 Action zone

The interaction zone should be more obviously phased:

### Before reveal

- optional tools (`Hint`, `Try typing it`) feel like high-agency power moves
- `Show answer` remains the clear primary action

### After reveal

- typed-answer feedback feels integrated, not bolted on
- rating choices scan faster and feel more intentional
- action hierarchy is unmistakable

## 4.4 Consequence states

The weak-card loop and done screen should feel meaningfully redesigned:

- weak-card retry should feel encouraging and sharp
- done screen should feel more rewarding and directional
- next-step CTAs should feel like invitations with momentum, not generic utility buttons

---

## 5. What Must Not Change

This is a delight pass, not a learning-model rewrite.

The following must remain intact:

- FSRS rating semantics
- keyboard support
- hint availability and persistence
- typing-challenge logic and soft grading behavior
- weak-card loop behavior
- done-screen routing / restart behavior
- session-finalization and review logging
- trust/review gate enforcement

This slice may change layout, hierarchy, motion, copy, and composition. It must **not** change the meaning of review ratings or the safety logic around what can be reviewed.

---

## 6. Proposed Experience Structure

## 6.1 Session header

The session header should become more intentional and more energetic.

It should communicate:

- current mode (`Sprint`, `Quick 5`, focused drill, etc.)
- session progress
- number of cards in the run
- a visible, intentional early-exit path

The current header is correct but thin. The new one should feel like the frame of a round.

## 6.2 Card stage

The card stage should:

- sit more prominently
- use stronger front/back framing
- feel visibly different between the question phase and answer phase
- avoid looking like a generic surface dropped into the page

The pre-reveal state should carry a little tension. The post-reveal state should feel like a meaningful state change, not just more text on the same object.

## 6.3 Action zone

The action zone should become easier to parse instantly.

### Pre-reveal

Expected hierarchy:

1. `Show answer`
2. `Hint` if available
3. `Try typing it` if supported

Typing and hint should feel intentional and useful, not like secondary clutter.

### Post-reveal

Expected hierarchy:

1. typed-feedback panel if relevant
2. rating bar
3. interval / helper text

The rating bar should feel more expressive than the current flat grid while staying fast and keyboard-compatible.

## 6.4 Weak-card retry interstitial

This state should feel like a quick sharpen-up opportunity:

- more pep
- more encouragement
- clearer framing of why the user might want one more pass

It should not feel like an admin confirmation dialog.

## 6.5 Done screen

The done screen should have more payoff:

- more energetic score treatment
- stronger visual rhythm
- better next-step hierarchy
- a clearer sense of whether the session was strong, partial, or timed out

The session preview should still be smart, but it should feel like part of the celebration rather than a utility appendage.

---

## 7. Alternatives Considered

## Option A: Arena Flow (approved)

**Pros**

- biggest emotional lift
- improves all three target areas at once
- makes review feel like the center of the product
- matches the user request for bold changes if needed

**Cons**

- broader implementation surface
- more layout states to keep coherent
- requires discipline so motion and reward do not slow repeated use

## Option B: Card-First Upgrade

**Pros**

- safer
- faster to implement
- lower chance of layout regressions

**Cons**

- would not make the whole loop feel transformed
- weak-card retry and done screen would still feel secondary

## Option C: Finish-First Reward Pass

**Pros**

- quickest emotional payoff
- low risk to active review mechanics

**Cons**

- minute-to-minute review would still feel too plain
- would not satisfy the goal of making the study loop itself feel special

**Decision**

Use **Arena Flow** and redesign the session end to end.

---

## 8. Implementation Shape

This slice should be implemented in three layers.

## Layer 1: Card stage and active session layout

Primary files:

- [D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx](D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx)
- [D:/CUEMATH/Flashcard/components/review-card.tsx](D:/CUEMATH/Flashcard/components/review-card.tsx)
- [D:/CUEMATH/Flashcard/components/rating-bar.tsx](D:/CUEMATH/Flashcard/components/rating-bar.tsx)

Likely work:

- recompose header / progress / arena layout
- strengthen card-stage hierarchy and state distinction
- improve pre-answer and post-answer action composition
- refine rating-bar treatment without changing rating semantics

## Layer 2: Consequence states

Primary files:

- [D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx](D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx)

Likely work:

- redesign weak-card retry interstitial
- redesign done screen
- improve CTA hierarchy
- better integrate the session preview

## Layer 3: Feedback, motion, and consistency

Primary files:

- [D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx](D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx)
- [D:/CUEMATH/Flashcard/app/(app)/review/loading.tsx](D:/CUEMATH/Flashcard/app/(app)/review/loading.tsx)
- [D:/CUEMATH/Flashcard/docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md](D:/CUEMATH/Flashcard/docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md)

Likely work:

- align helper panels and empty-state polish with the new arena
- tighten copy around hint / typing / interval feedback / end-early states
- add moderate transition polish where it helps understanding
- update handover checklist after the slice ships

---

## 9. Interaction Rules

To keep the redesign coherent, the following interaction rules should guide implementation:

### Rule 1: The primary action must always be obvious

At every step, the learner should know the most natural next move immediately.

### Rule 2: Optional tools should feel empowering, not mandatory

Hints and typing challenge should invite deeper recall without making the loop feel heavier.

### Rule 3: State changes should feel visible

Reveal, rating, retry, and completion should each feel like a state transition, not just swapped text.

### Rule 4: Speed beats flourish inside the core loop

Once the user is in repetition mode, the UI should get out of the way quickly.

### Rule 5: Reward should land most at boundaries

The biggest emotional lift should appear at:

- reveal
- successful answer-check feedback
- weak-loop invitation
- done screen

---

## 10. Guardrails

- Do not turn the review loop into a game that obscures honest self-rating.
- Do not add long or floaty animations between every card.
- Do not bury keyboard support behind mouse-first UI.
- Do not make `Hint` or typing challenge feel required.
- Do not add decorative panels that compete with the card stage.
- Do not regress mobile ergonomics while optimizing the desktop session.

---

## 11. Testing and Verification

Functional verification required:

- review still works for standard, quick, and concept-drill sessions
- hint reveal still works
- typing challenge still works
- keyboard shortcuts still work
- weak-card loop still triggers and completes correctly
- done-screen restart and back-navigation still work
- preview CTA behavior still respects due-now availability

Technical verification required:

- `pnpm lint`
- `pnpm test`
- `pnpm build`

Visual verification required:

- session header reads clearly
- card stage feels more premium than the current version
- pre-answer vs post-answer states are easy to distinguish
- weak-card interstitial feels encouraging
- done screen feels more rewarding and directional

---

## 12. Out of Scope

Not part of this slice:

- changes to FSRS logic
- changes to review-gate rules
- progress-dashboard redesign
- deck-detail redesign
- upload-flow redesign
- a full-system motion language across every screen

Those remain separate delight or product-maintenance tracks.

---

## 13. Follow-on Work

If this slice lands well, the next best delight slices are:

1. progress dashboard polish
2. deck detail / card browser polish
3. upload and ingest polish
4. final consistency sweep across loading, empty, and feedback states

That order keeps the most user-visible study surfaces coherent before the broader cleanup pass.
