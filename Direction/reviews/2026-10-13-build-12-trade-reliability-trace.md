# Build 12 Trade reliability trace

**Date:** 2026-10-13  
**Branch:** `codex/build-12`  
**Scope:** deterministic source/contract/test trace from native iOS through Trade API and scoring. No tester/Rhody inspection, provider calls, deployment, or product-code change.

## Verdict

Trade's server routes are deterministic and fail honestly under fixtures, but the native two-team roster builder does not know which returned team is the viewer. It therefore offers and initially selects the viewer's own team as a trade partner. Manual compare also claims connected-league scoring before the server has established it, although ESPN and Yahoo currently downgrade to neutral analysis. Those are P1 product-truth defects for Build 12.

The walkthrough's “manual trade gave no answer” was not reproduced in the deterministic path. Every traced terminal outcome is rendered: success becomes a verdict or needs-context screen; transport/decode/422 becomes a visible retryable error; a missing side keeps Compare disabled. Physical-device/network evidence is still required to identify the observed failure's actual terminal state.

## Findings

### P1 — the partner picker includes and preselects the viewer's own team

- `GET /api/trade/roster` returns every team when `team_id` is omitted (`src/routes/trade.js:753-763`). That behavior is intentional and pinned by `test/tradeRosterRoute.test.js` (“returns every Sleeper team when team_id is omitted”).
- iOS calls that all-team form (`mobile/ios/OmenIOS/OmenIOS/App/Api/TradeViewModel.swift:65-70`), maps every response team into `rosterPartners` (`:375-379`), and selects the first team by default (`:73-75`, `:390-392`). No viewer-team id is present in `TradeRosterResponse` or `TradeViewModel`.
- The native regression fixture makes the defect explicit: `TradeRosterAndShareTests.swift:37-45` returns `Own Team` first, and `:55-64` asserts that team id `1` is the selected partner.
- This contradicts the product contract: `Blueprints/specs/design/screen-contracts/TradePartnerPicker-v1.md:24` requires excluding the viewer and the selected primary partner.
- Provider impact: all three providers, because Sleeper, ESPN, and Yahoo share the same native mapping and all three roster adapters can return the complete league.

**Required repair:** carry authoritative viewer team identity into the roster response/flow and exclude it before default selection, primary partner display, and third-team candidates. Add route and native tests that fail if the viewer is offered as a partner. Do not infer the viewer from array order or team name.

### P1 — the manual builder states personalized scoring before it is true

- As soon as `offer.leagueContext` is non-null, the screen says “Using your connected league's scoring and roster” (`mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenTradeScreen.swift:143-150`).
- The server currently personalizes only Sleeper. ESPN and Yahoo return neutral analysis with `provider_unsupported`; this is pinned by `test/tradePersonalization.test.js` and documented in `Blueprints/api-routes.md:145-158`.
- The eventual answer caveat is honest (`OmenTradeJourneyScreens.swift:1270-1286`), but the builder's standing claim is false until `analysis_context.mode == personalized` comes back.

**Required repair:** make the pre-answer copy capability-neutral (“Omen will check whether it can use this league's settings”) or drive it from a server-owned provider capability. Only a returned personalized analysis may say that league scoring and roster were applied.

### P1 observed / not yet reproduced — manual Compare produced no visible answer

The deterministic trace found no intended silent terminal branch:

- Compare is disabled until both sides contain a player (`OmenTradeScreen.swift:279-297`).
- The view model renders `.loading`, `.loaded`, and `.failed` (`TradeViewModel.swift:781-817`).
- Loaded `favors_you` / `you_give_up_too_much` becomes a verdict; loaded `close_needs_context` / `insufficient_data` becomes a needs-context screen (`OmenTradeJourneyScreens.swift:1439-1482`).
- Unknown identity is an explicit server 422 and iOS renders the correction message (`TradeViewModel.swift:859-871`).
- The explainer is budgeted and may become `null` without withholding the comparison; `test/tradeHotPath.test.js` proves this.

The physical observation remains release evidence, not a dismissed report. The next reproduction should record: players selected versus typed, whether loading appeared, final visible state, HTTP status/error class (never secret values), league/provider, and whether the league switched while the request was in flight. Do not turn this into a Rhody check until the founder asks.

### P2 — league context synchronization lacks an initial-state regression test

iOS copies League into Trade only from `CommandCenterView.swift:376-381` via `onChange(of: leagueViewModel.viewState)` without `initial: true`. `TradeViewModel.useLeague` itself is covered, but no shell-level test proves that an already-loaded overview initializes a newly rendered Trade destination. A missed synchronization hides “Browse a real roster” because that control requires non-null league context (`OmenTradeScreen.swift:151-163`). This is a plausible secondary explanation for the walkthrough, but source inspection alone does not prove the lifecycle race occurs.

**Required repair/proof:** add a shell-level regression that begins with League already loaded, opens Trade, and asserts the correct league context and roster action without requiring a second League refresh.

## Capability trace by provider

| Path | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| Manual compare transport and identity | Fixture-supported | Fixture-supported | Fixture-supported |
| Manual compare league personalization | Supported | Neutral downgrade (`provider_unsupported`) | Neutral downgrade (`provider_unsupported`) |
| Browse partner rosters | Fixture-supported, viewer-filter defect | Fixture-supported, viewer-filter defect | Fixture-supported, viewer-filter defect |
| Find a trade | Fixture-supported | Fixture-supported; no live-user claim made here | Honest unavailable when no projections; fixture-supported if projections exist |
| Provider submission | Handoff only | Handoff only | Handoff only |

## Verification

- `NODE_PATH=/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen/node_modules node --test test/tradeRoute.test.js test/tradeFind.test.js test/tradeFindRoute.test.js test/tradeHotPath.test.js test/tradePersonalization.test.js test/tradeWarehouseIdentity.test.js test/tradeSavedQueueRoute.test.js` — **116/116 passed**.
- `NODE_PATH=... node --test test/tradeRosterRoute.test.js` — **12/12 passed** across Sleeper, ESPN, Yahoo, unavailable, privacy, and failure fixtures.
- `xcodebuild -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -configuration Debug -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build` — **BUILD SUCCEEDED**. Debug emitted the expected missing-local-config warning and pre-existing Swift concurrency warnings; no signed install or live provider call occurred.
- Native unit tests were inspected but not executed: this Xcode installation exposes no concrete simulator destination, and this audit did not install a test build on the paired phone.

## Build 12 order

1. Fix authoritative viewer identity and partner exclusion; this is the direct partner-selection P1.
2. Remove the premature personalization claim and add cross-provider capability assertions.
3. Add the initial League→Trade synchronization regression.
4. Re-run the exact deterministic suites, then reproduce manual Compare on a controlled native journey and capture its terminal state before declaring the walkthrough P1 closed.

## 2026-10-14 implementation and review closeout

The source-confirmed defects above are repaired locally on `codex/build-12`:

- the league directory, independent of weekly matchup/bye state, supplies authoritative viewer-team identity;
- the viewer is excluded before default, primary-partner, prefill and third-team selection;
- unknown viewer identity fails closed;
- loading, failure and league switching invalidate roster, verdict, share and three-team state;
- generation guards reject late roster, authorization, three-team and share completions from the previous league; and
- neutral/pre-answer copy no longer claims unsupported scoring or assumes the user is disconnected.

Focused `TradeRosterAndShareTests` pass **24/24**. The unsigned generic iOS build and test-target
compilation succeed. A fresh independent review found and drove closure of the bye-week identity,
stale context and async completion races; its final re-review is clean with no remaining actionable
finding. The focused backend suite was attempted but could not start from this managed worktree
because its Node dependency directory is absent; no backend source changed in this repair.

This closes the source P1s, not the historical phone observation. The paired-iPhone journey must
still prove that the viewer is absent from partner choices and that manual Compare reaches a visible
terminal state before Build 12 is called release-ready.

