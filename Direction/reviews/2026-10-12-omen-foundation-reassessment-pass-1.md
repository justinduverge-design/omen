# Omen foundation reassessment — pass 1: runtime shape and release implications

**Date:** 2026-10-12  
**Status:** Inspection evidence; not an implementation authorization or Beta 2 commitment  
**Method:** Read-only source/contract trace plus focused tests. No production/provider account read.

## Executive result

Omen does not yet have one shared football-input foundation. It has a strong deterministic selector,
a useful shared decision-receipt vocabulary, and substantial feature-level provider handling, but
weekly Omen, Start/Sit, Waiver, Trade and League still load and normalize overlapping provider
inputs independently. The receipt makes the outputs look coherent; it does not yet guarantee that
the inputs used the same selected context, player identity, scoring snapshot, projection source,
availability state or freshness policy.

That is the central foundation finding. Preserve the receipt and deterministic decision rules.
Consolidate the shared football primitives underneath them before adding more screen-local logic.

## What was inspected

- `src/services/decisionContext.js` and its consumers.
- Provider dispatch in weekly Omen, Start/Sit, Waiver, Trade and League.
- Trade roster, comparison and native partner-selection paths.
- Existing provider capability and screen-data matrices.
- Native API/view-model wiring and journey tests.
- Canvas coverage/foundation checkers.
- Xcode, paired-device and current capture/install scripts.

Not inspected yet:

- live provider responses or production logs from the founder's phone walk;
- the implementation diff on `omen-projections-v1` / PR #654;
- the provider-read WIP branch `feat/provider-gap-g3-g8`;
- restored-warehouse model output;
- pixel-by-pixel canvas-to-current-build comparison;
- physical-device automated journey execution.

## Architecture map: intended versus actual

Intended:

```text
provider account
  -> canonical selected league/team/week
  -> canonical players + roster + scoring + availability + projections
  -> feature engines
  -> one decision receipt
  -> Ledger outcome
```

Actual today:

```text
                         +-> weekly Omen provider loaders ---+
connection selection ----+-> Start/Sit route loaders --------+
                         +-> Waiver route loaders -----------+--> feature answer
                         +-> Trade context/roster loaders ---+        |
                         +-> League overview loaders --------+        v
                                                          shared receipt vocabulary
                                                                   |
                                                                   v
                                                                Ledger
```

`shared-decision-context.v1` is request-scoped bookkeeping with injected/recorded inputs. It
deduplicates only inside one request and deliberately owns no provider, identity, scoring,
projection or cache logic. Most consumers record source names after their feature-specific reads;
they do not resolve their inputs through one shared loader.

## Foundation disposition register

| Foundation | Evidence | Disposition | Why |
|---|---|---|---|
| Deterministic Omen selector | Rejects mock/stale/cross-context/unknown scores; stable ranking tests pass | **Preserve** | It prevents unsafe advice and does not let narration select the move. |
| `shared-decision-context.v1` receipt | Used by Omen, Start/Sit, Waiver, Trade, League and Ledger; focused tests pass | **Preserve, then extend carefully** | The public-safe source/used/limitation vocabulary is valuable. It is evidence metadata, not yet the shared input engine. |
| Selected league/team context | Multiple selectors and feature-specific connection logic remain | **Consolidate** | A league switch can still reach different resolution paths by feature. One server-owned selected-context resolver should be authoritative. |
| Player identity | Provider keys, warehouse crosswalk, Trade resolver and football-intelligence identity dimensions coexist | **Consolidate** | Identity is currently solved at several boundaries. Every feature needs the same canonical player plus provider aliases and an explicit unresolved state. |
| Scoring snapshot | Shared resolver exists, but feature loaders and Trade personalization still have separate capability paths | **Repair and consolidate** | Unknown scoring is generally handled honestly, but the same league is not guaranteed to produce one identical scoring receipt everywhere. |
| Projection evidence | ESPN/Sleeper provider projections, no Yahoo player projections, warehouse store flags off, unfinished Omen model | **Replace the ad hoc selection with one source policy after backtest** | The founder-approved provider-leads/Omen-challenges policy is not yet one live primitive with source, week, scoring basis and freshness. |
| Availability/injury | Adapter-specific fields are normalized in several places; freshness policy is not universal | **Consolidate** | Status meaning and age must be identical for Start/Sit, Waiver, Omen and Trade. |
| Feature-specific engines | Strong focused behavior and honest-state tests | **Preserve** | Start/Sit, Waiver and Trade should remain different decisions; the shared layer should provide inputs, not become one giant feature engine. |
| Provider adapter reads | Substantial real capability exists | **Preserve adapters; repair exposed gaps** | Do not replace working provider parsers. Normalize their output once and expose partial/failure metadata. |
| Ledger receipt/outcome | Provider-neutral receipt path exists; scoring outcome remains separately gated | **Repair** | It can be the audit trail only when every recommendation persists the canonical context/source receipt and later outcome uses the same identity/week. |
| Canvas contract bookkeeping | 35/35 artboards/contracts/requirement records; foundation checker passes | **Preserve** | It prevents missing files and token/API drift. |
| Canvas behavioral certification | Phone walk found broken Trade and incomplete League despite green canvas checks | **Replace the claim, extend the checker** | Structural coverage is not behavior/reachability/provider certification. Add journey/state and current-implementation evidence. |
| Native install/capture scripts | Simulator batch capture and physical build/install/launch exist separately | **Consolidate** | One manifest-producing verification command should orchestrate tests, build identity, physical install/launch/capture and explicit manual steps. |

## Provider-by-core-feature provisional matrix

This is source/test evidence only. `PASS-SOURCE` is not physical-device certification.

| Feature | Sleeper | ESPN | Yahoo | Principal limitation |
|---|---|---|---|---|
| League discovery/context | PASS-SOURCE | PASS-SOURCE, fragile session lifecycle | PASS-SOURCE, OAuth/rate-limit modes | Same selected-context resolver is not consumed uniformly by every feature. |
| Weekly Omen | PASS-SOURCE | PASS-SOURCE with exact-scoring limitation | HOLD | Yahoo has no verified player projection source, so several candidate types cannot rank. |
| Start/Sit | PASS-SOURCE | PASS-SOURCE | HOLD | Yahoo route is honest but useful ranking depends on projections not presently available. |
| Waiver | PASS-SOURCE | PASS-SOURCE | HOLD | Yahoo availability is read, but no player projections means no credible ranking; waiver/FA distinction is incomplete. |
| Manual Trade roster browse | PASS-SOURCE | PASS-SOURCE | HOLD | Yahoo N+1 team reads can silently turn a failed team into an empty roster; needs G8. |
| Manual Trade personalization | PASS-SOURCE | HOLD | HOLD | Current Trade context tests explicitly treat ESPN as unsupported and Yahoo as unavailable for personalization, even though roster reads exist. |
| Find a Trade | HOLD pending device/log diagnosis | HOLD pending device/log diagnosis | FAIL/HOLD | Founder phone walk says the feature does not work; shipped source is insufficient evidence. Yahoo projections remain a structural blocker. |
| League overview | PASS-SOURCE | HOLD until live playoff/settings proof | HOLD until live settings/partial-read proof | Transactions are `not_requested`; some settings fields are unproven; exposed UI has unfulfilled sections. |
| Ledger | HOLD | HOLD | HOLD | Provider-neutral code exists, but release truth requires persisted scoped decisions and active outcome scoring/device evidence. |

No row is promoted to release `PASS` until the provider journey is exercised with the real native
client or an equivalent authenticated contract recording plus physical-device proof where the user
claim is visible.

## Trade findings relevant to the next investigation

These are hypotheses grounded in source; they are not the phone-walk root cause yet.

1. The iOS partner chip callback is wired and updates `selectedPartnerTeamID`, but selection is only
   unit-tested against fixtures. The fixture in `TradeRosterAndShareTests` includes an "Own Team"
   row and initially selects it, while the current server contract/comment says the roster response
   contains opponent teams only. That fixture/contract disagreement can hide real selection bugs.
2. Partner selection and manual comparison are separate flows. Picking a partner determines which
   roster is browsed, but the two-team compare payload remains player-based and does not carry a
   selected partner team. The UI may therefore imply more relationship between the picker and
   verdict than the API actually has.
3. `TradeViewModel.compare` has explicit loaded/failed states, so a true "no answer" should be
   diagnosable as either a UI presentation path, a non-comparable offer guard, an invalidated late
   response, or a request that never completed. The phone action time/API log is needed to choose.
4. Provider roster support is broader than provider personalization support. The product can let a
   user browse ESPN/Yahoo opponents while the comparison silently degrades to neutral or unavailable
   league context. This split needs visible language and a single capability record.

## Canvas conclusion

The current automated checks answer:

- Is there one artboard, contract and requirement record per named screen?
- Do spacing/type tokens and registered API contract names line up?

They do not answer:

- Is the screen reachable from the current app?
- Does the live control call the expected route?
- Does every provider reach a terminal state?
- Does the current SwiftUI/Compose hierarchy match the artboard?
- Does a physical device render the promised data?

The checker should keep its current cheap structural role. Add a separate generated certification
manifest rather than turning one static script into an unreliable everything-checker.

## Xcode/device automation conclusion

Current capabilities:

- Xcode 27.0 is installed.
- The paired iPhone 15 is available.
- `scripts/install-latest-ios.sh` builds, installs and launches a development build.
- simulator fixture capture supports both themes and multiple scenarios.
- XCUITest journey files exist through J1/J2/J4/J5/J6.
- On current Xcode, the selected Trade model/transport suite passes 56/56 and the J4 simulator
  interaction suite passes 12/12. These are fixture and simulator results; they do not certify the
  authenticated provider flow that failed during the founder's phone walk.

Missing orchestration:

- no single command runs the relevant tests, records the exact commit/config/build, installs the
  physical app, launches a named journey, captures device logs/screenshots and emits one manifest;
- the batch screenshot tool is simulator-fixture authority, not physical/live-provider proof;
- physical screenshot capture is not joined to journey/test results;
- current scripts do not record provider, league-safe identifier, contract version, device OS,
  build number and manual-interaction gaps in a machine-readable evidence receipt.

Proposed later slice: an Omen-only `verify-ios-beta` orchestrator that composes existing scripts and
Xcode tooling. It must not contain credentials or pretend authentication ceremonies are automated.

## Smallest next inspection steps

1. Correlate the founder's Trade attempts with safe API/telemetry records and the uploaded build.
2. Reproduce the phone failure against its real provider/build context, then add a regression for
   that exact state. The current fixture tests are green and therefore do not explain the failure.
3. Trace one canonical league/player/scoring/projection tuple through all five engines and compare
   their receipts.
4. Inspect PR #654 and the two preserved branches without rebasing or merging; map their changes to
   the disposition register.
5. Produce the canvas behavior/reachability delta and Xcode orchestration brief.
6. Only then propose the bounded 2026-10-20 release outcome.

## Evidence

- Canvas coverage: PASS, 35 artboards / 35 contracts / 35 requirement records.
- Canvas foundation: PASS, 35 screens with token/API bookkeeping.
- Focused backend foundation tests: PASS, 157/157.
- Focused iOS Trade model/transport tests: PASS, 56/56.
- J4 Trade simulator interaction tests: PASS, 12/12 in 765.570 seconds.
- Native test boundary: simulator fixtures only; no authenticated provider or physical-device
  Trade success was proven.
- Xcode: 27.0 (`27A266a`).
- Paired physical device: iPhone 15 available.
- App Store status: founder reported archive/upload complete with release scheduled for 2026-10-13;
  store state was not independently read by this inspection.

