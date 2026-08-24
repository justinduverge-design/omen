# Handoff — 2026-08-24 — ESPN full-scoring capability disclosure

**Branch:** `codex/espn-scoring-disclosure`

**Purpose:** a small, independently reviewable disclosure change split from the incomplete A6/A7 full-scoring work.

## Result

Every ESPN recommendation now carries the existing unavailable SignalList item:

> **Exact ESPN scoring unavailable**
>
> Omen may recognize some league settings, but it cannot yet verify every scoring rule and final ESPN result for this league. Any point-based guidance is not an exact final-score calculation.

The statement is deliberately about full football scoring: offensive, kicking, team-defense, individual-defense, return, turnover, bonus, threshold, roster, and provider-adjustment rules—not only receptions.

## Boundaries

- The existing ESPN adapter requests `mSettings`, but currently normalizes only the reception rule; this change does not expand extraction or call that narrow value a scoring contract.
- Existing web, iOS, and Android SignalList components render the server-owned state. No new UI component, token, provider access, credential, collector, SQL, migration, dependency, or timer was introduced.
- This branch can be reviewed independently. It does not merge the A6 partial scoring implementation or the A7 pipeline work, both of which remain blocked on the complete scoring contract and their separate gates.

## Evidence

- Focused Node tests: 63/63 passed.
- Android decision mapping: `:app:testDebugUnitTest --tests '*OmenDecisionTest*'` passed.
- Before merge: run the full Node suite, frontend build, iOS mapping test, diff check, and staleness check; merging `main` deploys, so founder approval remains required.
