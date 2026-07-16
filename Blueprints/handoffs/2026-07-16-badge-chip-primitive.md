# Handoff: Badge / Chip Primitive (Phase A)

**Date:** 2026-07-16
**Author:** Jules
**Queue Position:** 03
**Status:** Component Build Complete (Phase A)

## What
Added `Badge.jsx` and `Chip.jsx` primitives per `omen-ui-north-star-v1.md` §4 and `jules-03-badge-chip.md`. This is a component-only PR with no page migration. Unblocks: PlatformConnectionCard (08), PlayerRow/PlayerChip (10), PageHero trailing slot, DecisionBrief (09).

## Why no migration here
13+ files have drifted badge/chip markup. Sweeping them in one PR would violate the "favor smaller PRs" rule and collide with nearly every other queue item's own migration scope. Each consuming brief adopts Badge/Chip narrowly within its own PR.

## Verification
- Built locally via `npm --prefix frontend run build`.
- Zero page files were modified.
- No package lockfile churn (verified via `git diff --name-only`).
- Visual check logic:
  - For **Badge**, AA contrast is achieved by using a 15% opacity background built from the tone token via `color-mix`, combined with `--color-text-primary` for the foreground text. A colored dot is prepended to clearly indicate the tone color.
  - For **Chip**, full solid backgrounds are used based on the exact position or brand tokens, paired with `--color-text-on-accent` or `--color-text-primary`, which provides high contrast on both light and dark modes per CSS var specs.
- Zero raw hex values or Tailwind color scale variables were used.
