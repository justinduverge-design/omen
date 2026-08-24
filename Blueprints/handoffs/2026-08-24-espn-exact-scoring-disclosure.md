# Handoff — 2026-08-24 — ESPN exact-scoring availability disclosure

**Branch:** `codex/a6-a7-football-data`

**PR:** [#365](https://github.com/justinduverge-design/omen/pull/365) — open; do not merge or deploy as a final full-league-scoring solution.
**Deployed:** no.

## Outcome

Every ESPN recommendation envelope now carries the server-owned, unavailable signal `exact_espn_scoring_unavailable`. Existing web, iOS, and Android SignalList render the exact user-facing label:

> **Exact ESPN scoring unavailable**
>
> Omen can still offer guidance from the information available, but it cannot verify this recommendation against your final ESPN league score. ESPN does not currently provide Omen a supported way to perform that verification.

This is neutral capability transparency. It does not blame the user, ESPN, or a commissioner, and it does not claim that Omen’s estimate is a verified final league score.

## Implementation boundary

- The server emits the signal for both live and explicit/mock ESPN recommendation envelopes.
- Web, SwiftUI, and Compose preserve the approved ESPN capitalization instead of deriving `Espn` from the signal key.
- The implementation reuses the approved SignalList/DecisionBrief data-honesty surface. No component, token, layout, provider connection, credential, collector, SQL, migration, dependency, timer, deploy, or production change was introduced.
- The availability state remains in force until the rights review, supported provider path, full rules extraction, reconciliation proof, and client-contract review described in Policy v1.4 are complete.

## Evidence

- Node focused suite: 63/63 passing, including live and explicit/mock ESPN envelope coverage.
- Android: `:app:testDebugUnitTest --tests '*OmenDecisionTest*'` passed.
- iOS: `OmenDecisionTests` passed 14/14 on an iPhone 16 simulator with Xcode 26.6 (17F113).
- Policy: `Direction/policies/omen-football-data-policy-v1.4.md`.
- Shared API/state contract: `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`.

## Remaining limits

No actual ESPN provider connection, exact scoring, final-result reconciliation, or production behavior is proven by this change. The A6/A7 Full League Scoring Contract remains in progress; the earlier reception-format correction is not a final league-exact implementation.
