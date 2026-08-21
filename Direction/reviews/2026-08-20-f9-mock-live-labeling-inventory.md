---
metadata_profile: valor-brain/v1
page_id: omen.trust.f9.mock-live-labeling
page_type: verification-inventory
layer: L2
authority: COMPILED
owner: Justin Duverge
state:
  task: VERIFIED
  implementation: BUILT
  ios_verification: RUN_PASSED
  android_ui_verification: RUN_PASSED
sources:
  - Direction/current_sprint.md#f9--mock--live-labeling-sweep
  - Blueprints/demo-mode.md
  - Blueprints/specs/b2-unified-omen-recommendation-layer.md
  - Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md
  - frontend/src/lib/recommendationDataMode.js
  - mobile/ios/OmenIOS/OmenIOS/App/Api/OmenDecision.swift
  - mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/api/OmenDecision.kt
relationships:
  requires:
    - recommendation-mode:EXPLICIT
    - mock-data:LABELED
  enables:
    - F9:VERIFIED
    - recommendation-surfaces:TRUSTWORTHY
  checks_against:
    - Blueprints/definition-of-done.md
    - Blueprints/done/recommendation-done.md
    - Blueprints/done/design-done.md
freshness:
  reviewed_on: 2026-08-20
  triggers:
    - a recommendation route or screen is added
    - an envelope mode or is_mock contract changes
    - native DecisionBrief state mapping changes
    - demo or fixture behavior changes
snapshot:
  repository: justinduverge-design/omen
  commit: 4e67c82
  compiled_by: Codex; cross-platform verification completed by Claude on macOS
---

# F9 mock / live labeling inventory

This page compiles the trust state of every currently shipped Omen recommendation surface. It does not replace `Direction/current_sprint.md`; F9 remains `IN_PROGRESS` until the remaining platform evidence is recorded.

## Compiled truth

The F9 implementation is built across web, iOS, and Android at `4c4a0fe`, and the two deferred platform runs were completed on macOS on 2026-08-20. The signed iOS simulator suite and the Android on-device instrumented suite both pass, so F9 is `VERIFIED`.

The iOS run also surfaced a real defect the Windows session could not see: the F9 iOS test target **did not compile**. `testSuccessModeMustBeExplicitAndControlsTheVisibleTruthState` wrote four Swift triple-quote literals inline, which the compiler rejects — multi-line content and the closing delimiter must each begin on a new line. So `4c4a0fe`'s "instrumented-test compilation" evidence covered Android only, and no iOS assertion in that commit had ever executed. Fixed in `4e67c82`; literal formatting only, no assertion or expectation changed.

## Decision rule

- `Live` requires an explicit backend truth field: `mode: live` for Omen or `is_mock: false` for the legacy waiver envelope.
- `Mock` and `Demo` render distinct persistent labels and never submit live feedback.
- Missing, unknown, or contradictory truth fields fail closed as `Unverified` or an error. They never inherit a live badge from a platform name or successful HTTP response.
- `Stub`, `Unavailable`, `Stale`, `Offline`, and disconnected inputs keep their own text labels. Color is never the only carrier.
- User-entered Trade Analyzer calculations are `Input-based analysis`, not connected-league data.

## Shipped surface inventory

| Surface | Reachability | Truth source | Visible treatment | F9 result |
| :--- | :--- | :--- | :--- | :--- |
| Web Omen of the Week | Authenticated `/omen` | Required envelope `mode`; per-signal `status` | `Live · <platform>`, Mock banner, Demo badge, or unverified warning; signal list preserves partial inputs | **PASS after F9** |
| Public Omen demo | Public `/demo` | Local deterministic `mode: demo` fixture | Persistent Demo Mode banner plus Demo badge; live feedback suppressed | **PASS existing** |
| Web waiver picks | Authenticated `/waiver` | Explicit `is_mock` boolean | `Live · Yahoo`, `Mock · Yahoo` plus banner, or `Unverified · Yahoo` plus warning | **PASS after F9** |
| Trade Analyzer result | Public `/trade` | Values entered in the form; deterministic comparison plus explanation | `Input-based analysis · not connected league data` beside Result | **PASS after F9** |
| Trade share snapshot | Public `/trade/share/:hash` | Stored sanitized input/result snapshot | `Input-based analysis` badge and explicit not-connected-league-data disclosure | **PASS after F9** |
| Trade Pulse buy-low card | `/trade` sidebar | Preseason fixture with `is_mock: true` | Mock badge and MockBanner | **PASS existing** |
| Move History / Ledger fixtures | Authenticated history surfaces | `is_mock`, `mode`, and fixture metadata | MockBanner before fixture outcomes | **PASS existing** |
| Promo and private visual fixtures | Development-only routes | Explicit private fixture key / mock result | Page-level MockBanner; production route guard remains intact | **PASS existing** |
| Draft Assistant | Not routed in the shipped app | Preserved source only | No reachable recommendation surface; preserved preview code remains labeled | **NOT SHIPPED** |
| iOS Omen DecisionBrief | Native Omen destination | Required envelope `mode`; decoded backend signals | Live success, distinct Mock or Demo preview card, or fail-closed error; stale/disconnected/off-season remain distinct | **PASS — 14/14 executed on iPhone 16 simulator** |
| Android Omen DecisionBrief | Native Omen destination | Required envelope `mode`; decoded backend signals | Live success, distinct Mock or Demo preview card, or fail-closed error; stale/disconnected/off-season remain distinct | **PASS — unit mapping + on-device instrumented labels** |
| iOS and Android Command Center demo | Native Try Demo session | Local demo user ID; network short-circuit | Top-level `Demo ·` greeting, mock-league context, and DecisionBrief Demo banner | **PASS source contract** |
| Native Trade / League placeholders | Native navigation destinations | No recommendation data rendered | Explicit unavailable/placeholder state; no advice to mislabel | **NO RECOMMENDATION** |

## Trust defects corrected

1. Native success previously minted one `Live league data` signal for every renderable success and ignored `mode` and backend signals. Both clients now require the mode and preserve the server's `live`, `stub`, `mock`/`demo`, and `unavailable` statuses.
2. Native `.mock` previously displayed a `Demo` badge. Mock now says `Mock — Fixture data — not live advice`; Demo has its own state and retains `Demo — Sample data — not live advice`.
3. Web Omen previously inferred live from “not mock and not demo,” so a missing future mode could acquire a Live platform badge. The shared classifier now returns `unverified` for missing, unknown, or mock-contradictory live envelopes.
4. Waiver results previously showed a platform name without a live/mock prefix and treated a missing `is_mock` as live-looking. The page now labels all three outcomes.
5. Trade results and public snapshots previously described the artifact but not the data boundary. Both now state that the analysis comes from entered values and is not connected-league data.

## Verification evidence

| Check | Result on 2026-08-20 |
| :--- | :--- |
| Web truth-classifier and trade-share focused tests | 5 passed |
| Full backend / source-contract suite | 575 passed |
| Frontend production build | PASS; 564 modules transformed; pre-existing large-chunk warning only |
| Android focused `OmenDecisionTest` | 15 passed |
| Full Android app JVM unit suite | PASS |
| Android instrumented-test compilation + `:app:assembleDebug` | PASS; existing Compose test deprecation warnings only |
| Root and frontend moderate audits | 0 vulnerabilities in each |
| `git diff --check` | PASS |
| iOS test-target compilation | **FAILED at `4c4a0fe`** — four malformed Swift literals; fixed in `4e67c82` |
| Signed iOS simulator suite (`OmenIOSTests`) | **246 passed, 0 failures** — Xcode 26.6 (17F113), iPhone 16, no `CODE_SIGNING` overrides |
| iOS focused `OmenDecisionTests` | **14 passed, 0 failures** |
| iOS UI suite (`OmenIOSUITests`) | 12 executed, **2 failures — pre-existing, not F9**: `ContextualHelpAccessibilityUITests` contrast. Reproduced identically at pre-F9 base `33fcfe6` in a clean worktree. Belongs to F11. |
| Android instrumented suite (`:core:designsystem:connectedDebugAndroidTest`) | **60 passed, 0 failures, 0 skipped** on `medium_phone` AVD, Android 16 |
| Android instrumented label assertions | **Executed and passed on-device**: `mockStateLabelsFixtureDataAndRendersPayload`, `demoStateLabelsSampleDataAndRendersPayload` |
| Re-run on macOS at `4e67c82` | backend 575 passed; frontend build PASS; both audits 0 vulnerabilities; `git diff --check` clean |
| `node scripts/check-valor-brain.mjs` | 2/2 valid, 0 invalid |
| `node scripts/check-sprint-staleness.js` | 1 finding — `O6`, unrelated to F9. Coverage read: 5 checks ran, 1 skipped (no item cites 2+ numbers), 3 not checked — prose-vs-prose without an issue number, whether a `Done when:` was genuinely met, and anything outside `Direction/`+`Blueprints/handoffs/`. The `Done when:` judgement below is therefore human/agent-made, not tool-confirmed. |

## AAA review

- **Accuracy:** PASS in implementation. Explicit mode is the only path to Live; signal status is no longer fabricated; input-based and preview paths are named.
- **Accessibility:** PASS by contract/source review, plus a passing on-device Compose suite. Not a human screen-reader pass — see *Not proven by this pass*. Every truth state is text-labeled, existing cards/badges remain in use, and the change adds no color-only meaning or new interaction.
- **Aesthetic Integrity:** PASS by source review. Existing preview cards, badges, banners, spacing, and data-semantic tokens are reused; no new visual primitive or hardcoded color was introduced.

## Gate result

Both deferred runs are complete and green, so F9 advances to `VERIFIED`.

`Done when:` clause by clause:

1. *Every recommendation surface either shows verifiably live data or is explicitly labeled* — **met.** The shipped-surface table above covers all thirteen; each maps to an explicit truth source and a text label.
2. *A written inventory maps each surface to its labeling* — **met.** This page.
3. *No path presents fallback output as live* — **met and now executed, not merely asserted.** All three clients fail closed on a missing or unknown mode, and the assertions proving it ran on both a simulator and a device.

### Recommendation Done gates

Gate 5 (*data sources labeled live / stub / mock / unavailable per signal*) was the failing gate and is the one F9 fixed: both native clients minted a single synthetic `Live league data` signal for every success. They now carry the backend's own per-signal status. Gates 1–4, 6–9 were already satisfied and are unchanged by this diff.

### Not proven by this pass

- No **human VoiceOver or TalkBack pass** on the labeled mock/demo states. Accessibility here is verified by contract, source, and the passing audits — not by a screen-reader user.
- No **rendered screenshot evidence** of the new Mock / Demo / Unverified treatments. The Android instrumented tests assert the label text exists in the tree; they do not prove it is legible. The O7 pass showed a token defect can survive a fully green suite.
- The two red iOS UI contrast tests are **pre-existing and out of F9 scope**; they remain F11's.

### Code review — F9 implementation diff

Reviewed `4c4a0fe` across all three clients. No correctness defect found. Two observations, neither blocking:

- **Strictness differs by client.** Web trims and lowercases `mode` before matching; iOS and Android compare the raw string exactly. A hypothetical `"Live"` would read live on web and fail closed on native. Backend emitters are canonical lowercase (`src/routes/omen.js:303`, `src/services/omen.js:206,447,490`, `src/services/demoMode.js`), so this is theoretical — and native errs toward the safe side.
- **Feedback gating tightened deliberately.** `feedbackVisible` no longer lets an explicit `showFeedback` prop opt a preview envelope into the live feedback ritual; only `false` is honored. Both existing callers (`Demo.jsx:194`, `PromoCapture.jsx:79`) pass `false`, so no caller regresses.

## Append-only timeline

- **2026-08-20:** F9 was founder-pinned and claimed by Codex from Omen `origin/main` at `33fcfe6`.
- **2026-08-20:** the sweep found fail-open native success mapping, fail-open web mode inference, unlabeled waiver mode, and ambiguous Trade Analyzer data provenance.
- **2026-08-20:** cross-platform mode enforcement, signal preservation, distinct Mock/Demo states, waiver labels, and input-based trade labels were built in the isolated F9 worktree.
- **2026-08-20:** 575 backend/source-contract tests, the frontend production build, all Android app JVM tests, Android instrumented-test compilation, debug assembly, both moderate audits, and the Valor Brain validator passed. iOS and Android device-level UI evidence remained pending; F9 stayed `IN_PROGRESS`.
- **2026-08-20 (macOS, later the same day):** the deferred verification ran. The iOS test target was found not to compile at `4c4a0fe` — four malformed Swift literals meant no iOS assertion in that commit had ever executed; fixed in `4e67c82` without changing any assertion. The signed iPhone 16 simulator suite then passed 246/246 (`OmenDecisionTests` 14/14) on Xcode 26.6, and `:core:designsystem:connectedDebugAndroidTest` passed 60/60 on a booted `medium_phone` AVD with both new Mock/Demo label assertions executing. Two iOS UI contrast failures were reproduced identically at pre-F9 base `33fcfe6` and attributed to F11, not F9. Backend 575, frontend build, both audits, and the Valor Brain validator re-passed on macOS. F9 advanced to `VERIFIED`.
