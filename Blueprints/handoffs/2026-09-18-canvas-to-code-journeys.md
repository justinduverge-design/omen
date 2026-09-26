# Handoff — canvas-to-code, ready to build by journey

**Date:** 2026-09-18
**Branch:** `feat/u1-canvas-to-code` (head `12b455b3`)
**For:** the session that builds the remaining 29 screens.

## Read these three, then start. Do not re-derive the seam.

- `Blueprints/specs/design/screen-journeys-v1.md` — J1–J6, partitioning all 32 artboards
- `Blueprints/specs/design/capability-expression-v1.md` — the four presentation classes
- `Blueprints/specs/design/capability-symbols-v1.md` — **read the correction section**
- `Direction/decision_log.md`, 2026-09-18 entries — precedence, journeys, symbols

## Where the artboards actually are

`design/native-visual-lock-2026-09-13/*.dc.html` — 32 hand-written HTML files, plus `_shared.css`
and `CONTRACTS.md`. They are **not images**. Icons are inline `viewBox="0 0 24 24"` path data typed
into the markup. `canvas.json` is only a layout manifest (name/file/x/y/w/h) — it holds no design
data, so do not read it expecting any.

## Three findings that are settled. Take them as given.

1. **Artboard owns look, contract owns truth.** Where an artboard draws something the system cannot
   produce, the *shape* is binding and the *literal strings* are not. Founder decision.
2. **The artboards are not behind — they use a different taxonomy.** `OmenCall` draws factors
   (`WIND 22`, `2 ZONES`); the system emits capability inputs (`roster`, `projections`). Two
   vocabularies for two different things. A lag closes by catching up; a mismatch closes by
   deciding, and it was decided.
3. **No glyphs need drawing.** `OmenEvidence.dc.html` renders capabilities as a text key, a
   sentence and a status word — no icons. An earlier draft of the symbols spec invented a ten-glyph
   requirement and reported it as a founder dependency; it was never in the canvas. Capability rows
   render as words.

## State

- `U1` / `OmenCall` is built (`07aeb2a7`), diffed against its artboard (`e320b36a`). 1 of 30.
- `OmenEvidence.swift` exists in the iOS design system and is registered in `project.pbxproj`.
- PR #442 merged. PR #451 (ESPN) reported merged by the founder on 2026-09-18 — **verify iOS is
  green before trusting a baseline**; per-PR iOS CI was retired 2026-08-11, so CI silence is not
  evidence. `ConnectFlowTests` and `EspnEmittedBytesTests` were the two failing classes.

## Open, not blocking

- **F1** — D4's crest for the League tab. `CanvasShield` asset already exists, both platforms.
- **F2** — C6 fill-ring on provider chips.
- **Unresolved, needs the founder:** the `OmenCall` header slot holds the shipped contextual-help
  button where the artboard draws an account avatar. Do not silently pick one.

## Suggested order

Build **by journey, not by screen**. A journey is the unit that can be evaluated: shared components
get built once at its head, and each increment is reviewable instead of thirty disconnected screens
landing before anything can be judged. Each journey needs a **nominal and a degraded pass** — a
nominal-only capture proves the product works when nothing goes wrong, which is the condition it is
least often in.

**J3 "the first call"** is the cheapest complete journey, since `OmenCall` is already built and only
`OmenEvidence`, `StartSitClear` and `StartSitIncomplete` remain. **J1 "getting in"** is the one the
founder named first and contains the only confirmed beta failure. Either is a defensible start.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
