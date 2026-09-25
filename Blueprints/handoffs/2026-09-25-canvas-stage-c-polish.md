# Canvas Stage C polish — inventory and coverage gate

**Date:** 2026-09-25
**Status:** Stage C inventory started; implementation intentionally paused at the safe mechanical gate.

## Completed in this stage

- Added `scripts/check-canvas-contract-coverage.mjs`, which compares the visual-lock artboard directory with the screen-contract directory and fails on missing or orphan contracts.
- Added `test/canvasContractCoverage.test.mjs` plus a complete one-screen fixture proving the checker can pass a complete inventory.
- Corrected stale 30-artboard references to 32 in the journey, handoff, and capability-symbol docs.
- Corrected the stale `omen-decision-brief.v2` binding note in `OmenCall-v1.md` to v3. `Blueprints/api-routes.md`, the Android request body, and the Android API test all establish v3 as the current native binding; v2 remains a compatibility response contract.

## Explicit blocker — not invented

The canvas contains 32 artboards, while the contract directory contains 30 contracts. The two missing contracts are:

- `LedgerDegraded-v1.md` for `design/native-visual-lock-2026-09-13/LedgerDegraded.dc.html`
- `LedgerDetailDegraded-v1.md` for `design/native-visual-lock-2026-09-13/LedgerDetailDegraded.dc.html`

This stage does **not** author those contracts because their API/state binding, literal strings, controls, and element tables must be derived from the degraded Ledger artifacts and `moves-history.v2`/`move-detail.v1` behavior, not guessed. The new checker intentionally fails until those contracts are authored or the artboards are explicitly marked contract-exempt by decision.
