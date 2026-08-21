# F9 — mock / live labeling sweep: deferred cross-platform verification

**Date:** 2026-08-20
**Branch:** `codex/f9-mock-live-labeling`
**Commits:** `4c4a0fe` (code, prior session) · `bfae983` (inventory, prior session) · `4e67c82` (iOS test compile fix) · docs/closure commit
**Outcome:** F9 `IN_PROGRESS` → `VERIFIED`. Not pushed, no PR, not merged — founder approval pending.

## What this session did

The implementation was not rebuilt. This pass ran the two platform verifications the prior Windows session recorded as deferred, attributed the failures it found, and applied the closure gates.

## Evidence

**Toolchain:** Xcode 26.6, Build version 17F113. `xcode-select -p` → `/Applications/Xcode.app/Contents/Developer`.

| Run | Result |
| :--- | :--- |
| `xcodebuild test` — `OmenIOS`, iPhone 16 simulator, **no signing overrides** | `OmenIOSTests` **246 passed, 0 failures** |
| `-only-testing:OmenIOSTests/OmenDecisionTests` | **14 passed, 0 failures** |
| `OmenIOSUITests` | 12 executed, **2 failures — pre-existing** (see below) |
| `:core:designsystem:connectedDebugAndroidTest` on `medium_phone` AVD (Android 16) | **60 passed, 0 failures, 0 skipped** — BUILD SUCCESSFUL in 5m29s |
| F9 label assertions in the results XML | `mockStateLabelsFixtureDataAndRendersPayload`, `demoStateLabelsSampleDataAndRendersPayload` — both present, both passed |
| `npm test` | 575 passed |
| `npm --prefix frontend run build` | PASS — pre-existing large-chunk warning only |
| `npm audit --audit-level=moderate` (root + frontend) | 0 vulnerabilities each |
| `git diff --check` | clean |
| `node scripts/check-valor-brain.mjs` | 2/2 valid, 0 invalid |
| `node scripts/check-sprint-staleness.js` | 1 finding — `O6`, unrelated to F9 |

**Staleness coverage block, read rather than skimmed:** 5 checks ran (sprint-vs-merged-PR titles over 48 items; handoffs claiming unmerged; OPEN known-issues without a GitHub issue; direction files contradicting a cited issue state; known-issues naming dead paths). 1 skipped — no `READY`/`IN_PROGRESS` item cites 2+ numbers. 3 **not checked** — prose-vs-prose contradictions with no issue number, **whether a `Done when:` clause was genuinely met (always a human call)**, and anything outside `Direction/` and `Blueprints/handoffs/`. The F9 `Done when:` judgement below is therefore agent-made against the clauses, not tool-confirmed.

## The defect the deferred run found

`4c4a0fe`'s **iOS test target did not compile.** `testSuccessModeMustBeExplicitAndControlsTheVisibleTruthState` wrote four Swift triple-quote literals inline; the compiler requires multi-line content and the closing delimiter to each begin on a new line. Eight errors, `** TEST FAILED **`, testing cancelled before a single case ran.

So **none of F9's iOS assertions had ever executed** — including the four that are the entire point of the task. The prior commit message said "Android instrumented-test compilation", which was true, and reads as cross-platform at a glance.

Fixed in `4e67c82`: literal formatting only. No assertion, expectation, or fixture changed.

## The two red iOS UI tests are not F9's

`ContextualHelpAccessibilityUITests` fails `testEveryContextualHelpSurfacePassesTheAccessibilityAudit` and `testHelpSurfacesPassTheAuditAtTheLargestDynamicType`, both `Contrast nearly passed`.

Attributed by **running that class at pre-F9 base `33fcfe6`** in a throwaway worktree with a separate derived-data path: identical 2 failures of 5. Not inferred from the diff. They belong to F11.

## Code review — `4c4a0fe`

No correctness defect. Two observations, neither blocking:

- **Uneven strictness.** Web trims/lowercases `mode`; iOS and Android match exactly. Backend emitters are canonical lowercase (`src/routes/omen.js:303`, `src/services/omen.js:206,447,490`, `src/services/demoMode.js:236,331`), so the divergence is theoretical — and native errs toward refusing to claim live. Left as-is.
- **Feedback gating tightened.** `feedbackVisible` no longer lets an explicit `showFeedback` opt a preview envelope into the live feedback ritual; only `false` is honored. Both callers (`Demo.jsx:194`, `PromoCapture.jsx:79`) already pass `false`.

## AAA

- **Accuracy — PASS.** Explicit mode is the only route to `Live`; per-signal status preserved rather than minted; input-based and preview paths named. Now executed on both platforms, not asserted.
- **Accessibility — PASS by contract and source, plus a passing on-device Compose suite.** Every truth state is text-labeled; no color-only meaning added. **Not a human screen-reader pass.**
- **Aesthetic Integrity — PASS by source review.** Existing cards, badges, banners, spacing, and data-semantic tokens reused; no new visual primitive or hardcoded color.

## Not proven — deliberately unclaimed

1. **No rendered evidence** of the new Mock / Demo / Unverified treatments. The Compose assertions prove the label text is in the tree, not that it is legible. `O7` established on this repo that a design-token defect survives a fully green suite.
2. **No human VoiceOver or TalkBack pass** over the labeled states.
3. Both belong to **F10 / F11** and are recorded as unsatisfied on the LEDGER row rather than folded into the pass.

## Procedure gap

`definition-of-done.md`'s DEFERRED-CI guidance says to record what will be re-run. It does not ask **which platforms the existing compile evidence covers** — and that is precisely how "tests compile" beside a three-client change was read as all three. Worth amending the row.

## State on exit

Branch is local and ahead of `origin/codex/f9-mock-live-labeling` by two commits. **Nothing pushed, no PR opened, nothing merged or deployed, F9 not closed on GitHub** — all pending founder approval.
