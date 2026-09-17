# Shared Decision Capabilities v1 — implementation handoff

**Date:** 2026-09-17
**Worktree:** `/Users/justinduvergecatalino/.codex/worktrees/shared-decision-capabilities-v1`
**Branch:** `codex/shared-decision-capabilities-v1`
**Authority:** Founder authorization for SharedDecisionCapabilities-v1; explicitly excludes
production deploys, scoring/publication flips, SQL, secrets, provider credentials, dependencies,
and store release.

## Delivered

- `src/services/decisionCapabilities.js` defines `decision-capabilities.v1`: stable name,
  availability state, request-specific `used`, semantic evidence kind, safe source/statement,
  and optional observation/freshness timestamps.
- `POST /api/omen/mvp-move` accepts `omen-decision-brief.v3`; v3 is additive to v2 and turns the
  legacy internal `stub` marker into a user-safe `unavailable` capability record.
- `GET /api/start-sit/detail?contract_version=start-sit-detail.v2` is additive to v1 and emits
  the same manifest for normalized roster, scoring coverage, player projections, and the lineup
  inference. Unknown scoring remains `unavailable` + `limitation`; it is never defaulted to PPR.
- A shared native `OmenDecisionCapability` transport model now exists in both design systems.
  Omen consumes it immediately; Command, League, Waiver, Trade, and Ledger models accept the
  additive field without changing their own screen responsibility. Start/Sit now has matching
  iOS/Android v2 repository seams and decoding fixtures, but **no native Start/Sit screen is
  introduced or claimed**.
- `Blueprints/specs/mobile/decision-capabilities-v1.md` and `Blueprints/api-routes.md` define
  the boundary and negotiated carriers.

## Completed six-capability composition

- **Game Time / TV and Travel / Home-Away:** `scheduleTravelCapabilities` derives kickoff,
  opponent, and home/away only from the public ESPN scoreboard. “TV” is explicitly a kickoff
  window rather than a claimed broadcaster; travel is explicitly a static-stadium-distance
  model and an unknown distance is never rendered as zero.
- **Matchup DvP:** a resolver may query nflverse only after a schedule-backed opponent exists.
  It has no team-to-opponent fallback, requires a supported position and at least three
  distinct regular-season weeks, and now counts sample weeks rather than player rows.
- **LLM reasoning:** a private configured model may replace only bounded summary/why copy after
  its data labels are proven to be a subset of deterministic evidence. Risk, confidence, and
  decision selection remain deterministic.
- **Waivers and league-exact scoring:** Omen v3 preserves waiver reason codes (including a
  completed no-move read), never makes a null bid zero, and exposes exact scoring as live only
  for `supported` coverage plus `exact` reconciliation. No flag or publication state changes.
- The shared iOS/Android transport binding also preserves `reason_code`, `coverage_state`, and
  `reconciliation_state` for Omen, Command, League, Start/Sit, Trade, and Ledger.

## Verified

| Gate | Result | Evidence |
|---|---|---|
| Shared backend + Start/Sit focused tests | PASS | `NODE_PATH=/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen/node_modules node --test test/startSitDetailRoute.test.js test/decisionCapabilities.test.js test/decisionBriefV2.test.js` — 29/29 |
| Omen v3 route negotiation | PASS | focused `test/omenMvpLiveRoute.test.js` native-v3 case — 1/1 |
| Android native decode tests | PASS | `./gradlew :app:testDebugUnitTest --tests '*OmenDecisionTest'` |
| iOS native decode tests | PASS | `OmenIOSTests/OmenDecisionTests` on iPhone 17 simulator — 22/22 in xcresult |
| iOS project metadata | PASS | `plutil -lint mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` |
| whitespace (first contract slice) | PASS | `git diff --check` before the host tooling regression |
| whitespace (latest six-capability slice) | BLOCKED | Host `git diff --check` exits 69 at the unaccepted Xcode licence prompt; targeted changed-source whitespace scan was run instead and found no new trailing whitespace. |
| Six-capability source/route batch | PASS | 60 focused backend tests; separately partitioned MVP route suite passed all 13 cases because the existing scoring-persistence fixture takes ~7 seconds per live case |
| Waiver + scoring batch | PASS | 31 focused tests |
| Android native capability decode | PASS | `./gradlew :app:testDebugUnitTest --tests 'com.slopssaloon.omen.app.feature.api.OmenDecisionTest'` |
| iOS native capability decode (latest rerun) | BLOCKED | Host Xcode license is not accepted; `xcodebuild` stopped before compilation. The earlier 22/22 evidence above is retained but is not a rerun of the added fields. |

## Explicit non-claims / remaining work

- No production/API deployment, merge, push, SQL, migration, credential/provider-auth change,
  dependency addition, scoring/publication change, store release, or live provider exercise.
- The six source paths are implemented and exercised with deterministic fixtures. Actual live
  state is request-specific: no fixture, source outage, missing context, incomplete waiver
  read, unsupported scoring, or non-exact reconciliation remains unavailable. This work makes
  no claim that a production request was exercised.
- The shared type is bound across existing destination transport models, but not every endpoint
  emits a negotiated manifest yet. The next endpoint work must derive each record from its
  authoritative source rather than client-side inference.
- Native Start/Sit has only a transport seam. Its screen, loading/empty/error states, Dynamic
  Type, VoiceOver/TalkBack, and visual screenshots remain unbuilt and unproven.
- No fresh native screenshots or manual VoiceOver/TalkBack pass were performed; this is contract
  and transport work, not a visual release claim. The latest iOS XCTest rerun is additionally
  blocked by the host's unaccepted Xcode licence.

## 2026-09-17 backend-first follow-up — shared decision use

The native/Canvas track is paused by founder direction. This worktree adds
`shared-decision-context.v1`, a request-scoped, provider-neutral input receipt with no
credential or persistent-cache ownership. It is wired into canonical live MVP, Start/Sit detail
v2, Waiver analysis v2, and Trade compare v2. These routes record an input as `used` only when
their existing deterministic engine consumed it; presentation code cannot promote a fetched
capability into decision evidence.

MVP records selected context, normalized roster, provider projections, and, when selected, the
actually read waiver pool or Sleeper league rosters. The other routes preserve their source
constraints and expose non-requested/incomplete input as typed limitations. This is not an
all-data fan-out: request-local memoization avoids duplicate reads within a feature call, while
existing source caches retain responsibility for user/league-safe persistent keys.

**Verified:** focused backend decision suite 161/161. **Still not claimed:** Pi source activation,
new ingest, live provider exercise, deployment, merge, push, SQL, credential access/change,
dependency change, scoring/publication toggle, or store release.

**Broader Node check:** completed after the focused suite. The only remaining failures were the
three existing `footballDataProductionOps` Python-harness cases: this host resolves `python3`
through an Xcode Command Line Tools shim, which exits 69 until the machine owner accepts the Xcode
licence. The Omen route's previous mock-enrichment failures are resolved (route/evidence 38/38).
No licence acceptance or host configuration change was attempted.

## 2026-09-17 destination completion — Command, League, and Ledger

The backend now carries the same source-safe capability language through all destination data
paths. Command summary adds compact routing coverage only; it does not claim it made a football
decision. League overview adds independently resolved standings, matchup, playoff, activity, and
not-requested transaction records without extra provider fan-out. Ledger detail preserves only
issue-time receipt and reconciliation evidence; non-exact and legacy outcomes remain explicitly
non-verified. Focused combined verification: 64/64 Node assertions. Native transport is additive;
Canvas/native rendering remains a separate visual implementation phase.
