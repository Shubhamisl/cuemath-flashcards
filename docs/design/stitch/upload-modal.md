# upload-modal mapping

Stitch screen `728deac81c2345ec9f879f6d1280dd84`. Desktop, 2560×2048 (1280×1024 logical).

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Backdrop (semi-transparent ink-black/40) | net-new — Radix `Dialog.Overlay` styled `bg-ink-black/40` | Today `components/upload-modal.tsx` is a custom modal (non-Radix). Recommend migrating to `@radix-ui/react-dialog` for focus trap + ESC. See net-new below. |
| Modal card (520px, paper-white, 32px radius, `shadow-card-flip`) | `CueCard` with `tone="paper"` (default) + `className="rounded-panel shadow-card-flip w-[520px] p-8"` | Reuse `CueCard`; override radius to `rounded-panel` and shadow to existing `--shadow-card-flip` token (added in card-flip-shadow-states pass). |
| "Upload a PDF" header | plain `<h2>` `font-display font-extrabold text-2xl` | No primitive. |
| ✕ close icon | inline `<button>` with lucide-react `X` icon | `text-ink-black/60 hover:text-ink-black`. |
| Drop zone (dashed border, 24px radius, ~440×180) | net-new `<DropZone>` composite | Border `border-2 border-dashed border-ink-black/20 rounded-card bg-soft-cream/30`. Wraps an `<input type="file" accept="application/pdf" hidden>`. Colocate at `components/upload-modal.tsx` — not worth a primitive. |
| File / cloud icon (centered) | lucide-react `UploadCloud` or `FileText` | |
| "Drop a PDF here…" + "Up to 20MB" | plain `<p>` Nunito Sans | |
| "What is this about?" label | plain `<label>` Plus Jakarta semibold | |
| 5 subject pill-buttons (Math/Lang/Sci/Hum/Other) | `CuePill` ×5 with **proposed `as="button"`** prop | Selected state: 2px ink-black border ring. Tones: `cream`/`pink`/`success` (mint)/`info` (blue)/`neutral` paper. The `Other` pill is paper-white border-only — needs a tone the existing primitive doesn't have (`paper-bordered`?). Easier: `<button className={cn(cuePill base, selected && 'ring-2 ring-ink-black')}>`. |
| Primary "Upload" CTA | `CueButton variant="primary"` with `disabled={!file \|\| !subject}` | Existing disabled state (opacity-50, cursor-not-allowed) is already in `CueButton`. |
| "Cancel" ghost | `CueButton variant="ghost"` OR plain `<button>` text-only | Mockup shows text-only — go plain. |

## Net-new

- **Dialog primitive (recommended):** wrap Radix Dialog as `lib/brand/primitives/dialog.tsx` exporting `CueDialog` (Root/Trigger/Overlay/Content). Defaults: overlay `bg-ink-black/40 backdrop-blur-[2px]`, content centered, animations via existing tap-duration token. Replaces the bespoke modal in `components/upload-modal.tsx`.
- **`CuePill` `as?: 'span' | 'button'`** prop (also called for in library-grid sticky-sidebar variant). Render polymorphically; preserve all tone styling. Selected state via consumer (`aria-pressed` + `ring-2 ring-ink-black`).
- **`CueCard` `tone="paper"`** default (no tint, no shadow override) — part of the unified `tone` enum proposed in sprint-complete mapping.
- No new tokens. `--shadow-card-flip` already exists.

## Notes for downstream

- Existing `components/upload-modal.tsx` already wires the upload action server-side. Visual refactor only — keep the action plumbing.
- After upload starts, the modal should optimistically close and the new `DeckCard` (status: `ingesting`) appears in the library grid; that polling loop is already in `DeckCard` (`useEffect` polling `ingest_jobs`). No new state machine needed.
- Subject chooser maps directly to the `subjectFamily` enum used everywhere else — extend with `'other'` as already proposed in onboarding-subject pass.
