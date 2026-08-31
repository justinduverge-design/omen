# Handoff — Tier 0 player identity and fuzzy search

**Date:** 2026-08-31  
**Branch:** `codex/tier0-player-resolution`  
**Findings:** `F-BAR-29`, `F-BAR-30`

## Outcome

The engine can no longer score a player it cannot resolve. Every submitted player now passes a
canonical-identity gate before recommendation math, scarcity/VORP/tiering, sharing, or the LLM
explainer. Unknown or ambiguous names return `422 trade_unresolved_players` with suggestions and
none of the fields that could be mistaken for analysis.

Autocomplete now falls back to bounded fuzzy suggestions when exact/substring matching finds
nothing. `Ted McMillan` suggests Tetairoa McMillan and `Jackson Dart` suggests Jaxson Dart.
Fuzzy rows carry `match_type: fuzzy`; both native clients label an all-fuzzy result set **Did you
mean?** and require a tap. Fuzzy matches are never silently promoted to player identity.

## Verification

- Backend: **922/922**, 0 failures.
- iOS unit target: **318/318**, 0 failures. The first full-suite attempt hung after its test
  runner exited and left an incomplete xcresult; it was terminated and replaced with a clean
  unit run in fresh DerivedData. This is not recorded as a UI-suite pass.
- Android: **192/192**, 0 failures.
- Focused backend identity/search/personalization tests: **54/54**, 0 failures.
- Fuzzy fallback benchmark over ~11.4k synthetic players: **1.9–2.6ms** after shortlisting,
  down from the first implementation's 15–21ms.
- `git diff --check`: clean.

The key negative proof spies on the explainer: an unknown player produces zero explainer calls
and a body with no verdict, scarcity analysis, summary, or explanation.

## Production state

The previous Tier 0 release (`1f156fc`, `a2e3e3e`) is deployed and independently verified in
production. This branch is **not yet merged or deployed** at the time of this handoff. Do not
describe F-BAR-29/F-BAR-30 as live until production probes prove:

1. `Ted McMillan` → Tetairoa McMillan with `match_type: fuzzy`.
2. `Jackson Dart` → Jaxson Dart with `match_type: fuzzy`.
3. an invented name in Trade → `422`, with no analysis fields.
4. canonical picked players still compare.
5. both running native apps render **Did you mean?** and can commit the suggested player.

## Explicitly not verified

- Full iOS UI suite: the first run hung in Xcode after losing its runner; unit target passed in a
  fresh directory. Running-app proof is still owed after deployment.
- Physical iPhone or Android hardware: simulator/emulator only are available here.
- 2026 projections: still deliberately deferred to the 2026-09-05 season-floor check.
- Web handling of `422`: the web app is secondary and was not changed in this native-first Tier 0
  slice. The server refusal is safe; web copy may remain generic.
- Provider source outage in production: unit-proven as a `503`, not induced against live Sleeper.

## Next beta work after live proof

Tier 0 from the 2026-08-30 bar audit is complete once this branch is deployed and verified.
Beta readiness still depends on founder/store/device gates in the canonical sprint: signing and
internal tracks, real-account Yahoo/Sleeper/ESPN QA, auth edge/destructive cases, accessibility,
and the 2026-09-05 live projection check. Those are not made complete by this backend fix.
