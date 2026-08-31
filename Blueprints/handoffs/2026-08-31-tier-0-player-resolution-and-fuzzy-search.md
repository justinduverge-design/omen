# Handoff — Tier 0 player identity and fuzzy search

**Date:** 2026-08-31  
**Release commit:** `a09b045` on `main`
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

The release is deployed by Actions run `33445423517`. Independent production probes proved:

1. `Ted McMillan` → Tetairoa McMillan with `match_type: fuzzy`.
2. `Jackson Dart` → Jaxson Dart with `match_type: fuzzy`.
3. an invented name in Trade → `422`, with no analysis fields.
4. canonical exact players still reach the honest `insufficient_data` response.

Item 5—both running native apps render **Did you mean?** and can commit the suggested
player—remains unverified and must not be inferred from the successful native unit tests.

## Explicitly not verified

- Full iOS UI suite: the first run hung in Xcode after losing its runner; unit target passed in a
  fresh directory. The app was clean-installed and visibly launched against production, but the
  Trade interaction was not driven because this environment exposed no native UI-control tool.
- Android running-app proof: the APK built, but Gradle first lost ADB device properties and then
  ADB became nonresponsive during direct installation. No successful install or interaction is
  claimed from that attempt.
- Physical iPhone or Android hardware: simulator/emulator only are available here.
- 2026 projections: still deliberately deferred to the 2026-09-05 season-floor check.
- Web handling of `422`: the web app is secondary and was not changed in this native-first Tier 0
  slice. The server refusal is safe; web copy may remain generic.
- Provider source outage in production: unit-proven as a `503`, not induced against live Sleeper.

## Next beta work after live proof

Tier 0 backend behavior is deployed. Tier 0 native presentation is complete only after the
remaining simulator/emulator interaction proof.
Beta readiness still depends on founder/store/device gates in the canonical sprint: signing and
internal tracks, real-account Yahoo/Sleeper/ESPN QA, auth edge/destructive cases, accessibility,
and the 2026-09-05 live projection check. Those are not made complete by this backend fix.
