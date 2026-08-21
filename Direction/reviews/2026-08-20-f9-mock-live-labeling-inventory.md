---
metadata_profile: valor-brain/v1
page_id: omen.trust.f9.mock-live-labeling
page_type: verification-inventory
layer: L2
authority: COMPILED
owner: Justin Duverge
state:
  task: IN_PROGRESS
  implementation: BUILT
  ios_verification: DEFERRED_CI
  android_ui_verification: COMPILED_NOT_RUN
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
  commit: 4c4a0fe
  compiled_by: Codex
---

# F9 mock / live labeling inventory

This page compiles the trust state of every currently shipped Omen recommendation surface. It does not replace `Direction/current_sprint.md`; F9 remains `IN_PROGRESS` until the remaining platform evidence is recorded.

## Compiled truth

The F9 implementation is built across web, iOS, and Android at `4c4a0fe`. Web focused tests and the production build pass; Android's focused mapping tests pass. The task is not yet `VERIFIED` because signed iOS simulator evidence and Android instrumented UI evidence have not been run in this Windows session.

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
| iOS Omen DecisionBrief | Native Omen destination | Required envelope `mode`; decoded backend signals | Live success, distinct Mock or Demo preview card, or fail-closed error; stale/disconnected/off-season remain distinct | **BUILT; iOS run deferred** |
| Android Omen DecisionBrief | Native Omen destination | Required envelope `mode`; decoded backend signals | Live success, distinct Mock or Demo preview card, or fail-closed error; stale/disconnected/off-season remain distinct | **PASS unit mapping; UI/device evidence pending** |
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
| iOS XCTest / simulator | **DEFERRED-CI** on Windows; run the signed simulator command from `Blueprints/definition-of-done.md` on the Mac |
| Android instrumented label assertions | Authored for distinct Mock and Demo copy; device/emulator execution pending |

## AAA review

- **Accuracy:** PASS in implementation. Explicit mode is the only path to Live; signal status is no longer fabricated; input-based and preview paths are named.
- **Accessibility:** PASS by contract/source review. Every truth state is text-labeled, existing cards/badges remain in use, and the change adds no color-only meaning or new interaction.
- **Aesthetic Integrity:** PASS by source review. Existing preview cards, badges, banners, spacing, and data-semantic tokens are reused; no new visual primitive or hardcoded color was introduced.

## Remaining gate

Run the iOS signed simulator suite on the Mac and the Android instrumented DecisionBrief test on an emulator/device. If those are green, run the broader quality baseline and sprint-staleness coverage check, then advance F9 through `VERIFIED` and close it with the required ledger and skill-usage receipts.

## Append-only timeline

- **2026-08-20:** F9 was founder-pinned and claimed by Codex from Omen `origin/main` at `33fcfe6`.
- **2026-08-20:** the sweep found fail-open native success mapping, fail-open web mode inference, unlabeled waiver mode, and ambiguous Trade Analyzer data provenance.
- **2026-08-20:** cross-platform mode enforcement, signal preservation, distinct Mock/Demo states, waiver labels, and input-based trade labels were built in the isolated F9 worktree.
- **2026-08-20:** 575 backend/source-contract tests, the frontend production build, all Android app JVM tests, Android instrumented-test compilation, debug assembly, both moderate audits, and the Valor Brain validator passed. iOS and Android device-level UI evidence remained pending; F9 stayed `IN_PROGRESS`.
