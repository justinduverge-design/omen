# Handoff — 2026-08-16 — M5-Native-API-Client slice D (Omen destination)

**Branch:** `feat/m5-slice-d-omen-destination` · **Not pushed, merged, or deployed at time of writing.**
*(If this line still reads that way after the PR lands, it is stale — see PR #316 for why that keeps happening.)*

## What was wrong

The Omen destination — the product's main event — picked between two hardcoded fixtures:

```swift
OmenDecisionScreen(state: isDemo ? OmenDecisionFixtures.demo : OmenDecisionFixtures.realDisconnected)
```

So **every real signed-in user saw `realDisconnected`**, regardless of their actual leagues. `M4-Omen-Screen` was VERIFIED as a composition and had been showing invented state to real people ever since. That is what made this a P0 beta blocker rather than a wiring chore.

## What changed

| File | Change |
|---|---|
| `App/Api/OmenDecision.swift` / `feature/api/OmenDecision.kt` | **New.** Decodes `2026-05-18.omen-live.v1` and maps it to the shipped `OmenDecisionBriefState`. |
| `App/Api/OmenDecisionViewModel.swift` / `feature/api/OmenDecisionViewModel.kt` | **New.** Load/demo/failure state machine, mirroring `CommandCenterViewModel`. |
| `DashboardRepository.swift` / `Repositories.kt` | `OmenDecisionRepository` + Api/Stub implementations. |
| `CommandCenterView.swift` / `OmenAndroidApp.kt` | Destination renders the view model; `isDemo` plumbing deleted as dead. |
| `AppShellView.swift` | Constructs `ApiOmenDecisionRepository` from the same public base URL. |

**No backend change.** The client sends `{}`; the server derives league, week, and provider from the authenticated session, so there is no context the client can get wrong.

## The part worth reviewing: state mapping

I enumerated the `state:` literals directly out of `src/services/omen.js` rather than trusting a spec summary. That produced **eleven** states. The §F2 table and the visual brief between them named four.

Had I modelled from the specs alone, seven healthy backend answers would have fallen into a default branch and told the user *"Omen sent something this app couldn't read"* — the app calling the server broken when the server was working correctly.

| Envelope state | Renders as |
|---|---|
| `success` | Decision brief |
| `empty` | Empty, using the server's own summary |
| `off_season` | Off-season |
| `platform_disconnected` | Disconnected, wired to the app's Connect flow |
| `pending_live_engine`, `context_unavailable`, `yahoo_reauth_required`, `sleeper_league_context_missing`, `espn_reauth_required`, `espn_league_context_missing`, `espn_import_blocked`, `error` | Error, rendering **the server's own** `recovery.message` |
| anything else | Error — fails safe |

Recovery sentences are rendered verbatim, not re-worded on the client. A second copy of that text would drift from the server's.

### Three honesty rules, each pinned by test

1. **An unrecognised state fails safe.** A state shipped after this build must not be force-fitted into `success` — that is exactly where guessing puts invented confidence in front of a real user.
2. **A `success` carrying nothing renderable becomes an error.** An empty card reads as a broken layout; an honest error reads as an honest error.
3. **An unmappable position drops the alternative row.** `OmenPosition` has no unknown case, and picking one would put a fabricated position chip beside a real player's name. The verdict and move still render.

Unknown risk defaults to `medium`, never `low` — an unfamiliar value must not read as safer than it is.

**Demo cannot reach the network.** The view model short-circuits on the demo user id, and a test supplies an exploding repository to prove the live path is never called (facts-of-record #7). `realDisconnected` is now **unreferenced on both platforms** — off the live path entirely, not merely unselected.

## Evidence

- **iOS 208/208** — `xcodebuild test`, **Xcode 26.6, build 17F113**, iPhone 17 Pro simulator (baseline 192, +16).
- **Android 64/64** connected instrumentation on `medium_phone` **API 36** (baseline 51, +13), plus `:app:assembleDebug` and the `:core:*` JVM suites green.
- **Backend 563/563** unchanged — this slice touches no server code.
- Both apps build clean; `git diff --check` clean.

## Limits, stated plainly

- **Not proven against a live provider.** Every state is exercised from contract-shaped JSON, not a real signed-in round trip. And per facts-of-record #10 the season floor means `success` **cannot** be observed live until the 2026 regular season opens. What is proven is the mapping; what is not is that the server emits exactly these bodies for this user today.
- **No device render captured.** Nobody has looked at the wired destination on either platform. This is test-proven, not eye-proven — and the M6 pass is the precedent for why that matters: a fully green suite missed a large-text layout defect that one screenshot caught.
- **Slice E (Ledger) is unstarted.** F and G remain design-gated and must not be pulled without approved M1 screen contracts.

## The Android JVM test source set — now blocking a second slice

`:app` has no JVM unit-test source set, so these **pure logic** tests must run in `androidTest` on an emulator. That was recorded as a limitation for slices A–C; slice D is the second time it has bitten, and the cost is now concrete: ~50s and a booted emulator to run assertions that need neither.

Adding one is a `build.gradle` change, which is founder-gated (`do not touch: package files or dependencies`). **It is worth doing** — it would move slice A–C's tests, slice D's mapping tests, and the Android half of the R7 copy ban onto a fast JVM path, and would let the R7 scanner be ported from iOS instead of staying a narrower behavioural check. It is a small, self-contained item; it just is not mine to authorise.

## Skills

Read gate satisfied before any code: `omen-native-mobile-foundation-v1`, `omen-native-delivery-governance-v1`, `omen-native-backend-state-contract-v1` §F2, `Blueprints/api-routes.md`, and the existing slice A–C implementations. `slops-tdd` followed with the contract states enumerated from the emitter.

**Skill improvement.** For any contract-mapping slice: **grep the emitter for its literal state values before trusting a spec's summary table.** Eleven states existed; the docs named four. The specs were not wrong, they were summaries — and a summary is the wrong source for an exhaustive `switch`.

**Repeat correction, second time in one session.** I drafted the first iOS test against an invented `OmenWaiverWatchState.allAuditableCases` API before checking the type existed, on a machine with Xcode installed and a one-line grep available. Caught at compile time both times, but a test that compiles only in imagination reads like coverage while proving nothing. Standing rule now: verify the symbol before writing the assertion.
