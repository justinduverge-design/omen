# Phase 5 — Decision Core Baseline (prep)

Date: 2026-10-17. Status: PREP. No code changed. Parent plan: `Blueprints/specs/infrastructure/omen-rust-infrastructure-plan-v1.md` (Phase 5).

## Summary

- CPU is a small share of request time in all but one path. Lineup, waiver, confidence, selector and projection math each take under 1.5 ms per call (p95). Provider reads have timeouts of 15-30 s and a 1.5 s trade read budget. So I/O dominates those paths.
- The trade search is the exception. It ran 340 ms (10 teams x 15) to 1.2-1.4 s (16 teams x 20) per call, all synchronous on the event loop. That is close to the 2 s `TRADE_SEARCH_BUDGET_MS` fuse. It is the only module clearly worth porting.
- Worth porting: `tradeLineup.js` (search + Hungarian solver) and `tradeFind.js` (league scan). Maybe later: `waiverAnalysis.js` (~0.7 ms, only if ported together for one shared contract).
- Not worth porting for speed: `optimizer.js`, `confidencePolicy.js`, `omenSelector.js`, `decisionBriefV2.js`, `omenProjections/projectPlayerWeek.js`. They are micro-seconds. Port them only if one shared core across server and mobile is the goal, not speed.
- A cheaper first step than Rust: move the trade search to a `worker_threads` worker, or cut its search space. That removes the event-loop block with no FFI.
- No production baseline exists. OpenTelemetry is installed but not wired. Sentry tracing is off.

## Measurements

Local, Node v22.22.0, this container. Synthetic inputs (no fixture covers a full league of projected rosters). Seeded random projections 3-23 pts, slots `QB,RB,RB,WR,WR,TE,FLEX,K,DEF` + 6 BN. Benchmark script lived in the scratchpad only, not in the repo. Trade rows: n=40; others n=2,000-20,000, after 20 warm-up calls.

| Function | Input | p50 ms | p95 ms |
|---|---|---|---|
| `optimizer.evaluateLineup` | 15-player roster | 0.03 | 0.08 |
| `optimizer.findWaiverMoves` | 15 roster + 200 pool | 0.09 | 0.18 |
| `waiverAnalysis.buildWaiverAnalysis` | 15 roster + 200 pool | 0.74 | 1.38 |
| `tradeLineup.solveOptimalLineup` | 15 / 16 / 20 players | 0.04 / 0.07 / 0.11 | 0.14 / 0.31 / 0.25 |
| `tradeLineup.findTradeCandidate` | 10 teams x 15 | 342 | 413 |
| `tradeLineup.findTradeCandidate` | 12 teams x 16 | 583 | 653 |
| `tradeLineup.findTradeCandidate` | 16 teams x 20 | 1,236 (n=5) | 1,364 (n=5) |
| `tradeFind.findLeagueTradeCandidates` | 10 x 15 | 362 | 427 |
| `tradeFind.findLeagueTradeCandidates` | 12 x 16 | 558 | 621 |
| `tradeFind.findLeagueTradeCandidates` | 16 x 20 | 1,229 | 1,438 |
| `confidencePolicy.assessConfidence` | one swap | 0.001 | 0.002 |
| `omenSelector.selectDecision` | 3 candidates | 0.001 | 0.002 |
| `omenProjections.projectPlayerWeek` | 1 WR, 8-week history | 0.03 | 0.06 |
| same, x15 (a roster) | 15 players | 0.28 | 0.80 |

Notes:
- The budget fuse did not trip in any run.
- The `tradeLineup.js` header says a 16x20 league needs 7,625 solves and 203 ms. We saw ~1.2 s. Our synthetic rosters project every bench player, which widens the search. Real rosters may be cheaper. Treat our trade numbers as an upper-side estimate until production spans exist.
- `buildWaiverAnalysis` output state was not checked against a golden; the timing covers whatever path the synthetic input took.
- Not measured: `omen.js` orchestration (I/O-bound by design), `fantasyMetrics/`, `footballIntelligence/` (offline/cron artifact builders, not on the request path), `omenProjections/backtest.js` (offline script).

## Module inventory

Pure = no network, DB, Redis or LLM. Line counts from `wc -l`.

| Module | Lines | Pure? | Inputs -> outputs | Callers |
|---|---|---|---|---|
| `src/services/optimizer.js` | 316 | Pure (uses `confidencePolicy`, `sightDecision`) | roster `{slots:{starters,bench}}`, opts (usage Map), scoringConfig -> swap recs; roster + pool -> waiver moves | `omen.js`, `routes/optimizer.js`, `routes/startSit.js`, `startSitDetail.js`, `omenHold.js`, `demoMode.js`, `vorp.js`, `tradeValue.js` |
| `src/services/tradeLineup.js` | 462 | Pure (clock read for budget) | `{ownTeam, opponentTeams, rosterPositions, budget}` -> one trade candidate or null | `omenTradeCandidate.js`, `tradeFind.js` |
| `src/services/tradeFind.js` | 344 | Pure | `{ownTeamId, teams, rosterPositions, maxOpponents=16, maxCandidates=10}` -> ranked candidates | `routes/trade.js` |
| `src/services/omenTradeCandidate.js` | 280 | Mixed. `readSleeper/readEspn/readYahoo`, `fillDisplayNames` do I/O; the rest wraps `findTradeCandidate` | connection, roster, deps -> trade evaluation | `omen.js` |
| `src/services/confidencePolicy.js` | 156 | Pure | `{gap, corroboration, startStatus, sitStatus, closeCall, maxBand}` -> `{band, score, ...}` | optimizer, omen, decisionBriefV2 |
| `src/services/omenSelector.js` | 159 | Pure | candidates[] -> `{selected, rejections}` | `omen.js` |
| `src/services/waiverAnalysis.js` | 516 | Pure (uses `waiverSystem`, `waiverBid`, `sightDecision`) | `{roster, pool, platform, leagueId, week, season, scoringFormat, availabilityConfirmed, deadline, waiverSystem}` -> waiver envelope | `routes/waivers.js`, omen waiver path |
| `src/services/decisionBriefV2.js` | 131 | Pure (formatting) | response body -> brief v2/v3 | `routes/omen.js`, `routes/moves.js`, `ledger.js` |
| `src/services/omen.js` | 2,361 | Mixed, mostly I/O orchestration (Supabase, adapters, warehouse, Yahoo auth, LLM enrichment) | connection -> Omen decision | `routes/omen.js` |
| `src/services/omenProjections/` (projectPlayerWeek 306, priors 167, scoring 104, constants 87, challenger 117, index 18) | 799 | Pure | player history + game + priors -> stat line, confidence | backtest, `scripts/omen-projections-backtest.js` (not on request path today) |
| `omenProjections/backtest.js`, `pgSource.js` | 703, 124 | Mixed (`pgSource` reads Postgres) | offline | scripts |
| `src/services/fantasyMetrics/` | 689 + JSON table | Mostly pure | data tables -> metric lines / fated points | routes and cron (not measured) |
| `src/services/footballIntelligence/` | ~3,000 across 25 files | Mixed (`servingRepository`, `readModel` I/O; rest artifact building) | warehouse data -> artifacts | cron / build scripts |

## Proposed core boundary

Start with the trade search only. One call, JSON in, JSON out, no I/O inside.

Input:
```json
{
  "contract": "omen.trade_search.v1",
  "own_team_id": "1",
  "roster_positions": ["QB","RB","RB","WR","WR","TE","FLEX","K","DEF","BN"],
  "teams": [{ "team_id": "1", "players": [{
    "player_key": "p1", "position": "RB", "eligible_positions": ["RB","FLEX"],
    "selected_position": "BN", "projected_points": 18.0, "status": "ACTIVE"
  }]}],
  "limits": { "budget_ms": 2000, "max_solves": 200000, "max_opponents": 16, "max_candidates": 10 },
  "fairness": { "kind": "mutual" }
}
```

Output:
```json
{
  "candidates": [{ "give": ["p1"], "receive": ["p9"], "opponent_team_id": "4",
                   "own_delta": 3.1, "opponent_delta": 0.4 }],
  "exhaustive": true,
  "stats": { "solves": 7625, "elapsed_ms": 203, "budget_exceeded": false }
}
```

Rules for the boundary:
- `null` projections stay `null`, never 0. The JS already guards this.
- The fairness guard is a JS callback today (`mutualFairnessGuard`). The core needs it as data or a fixed rule.
- Display names, reasoning text and need profiles stay in JS.
- Same output on budget trip: no candidate, `budget_exceeded: true`.

Later, if wanted: `evaluate_lineup` (roster -> swaps) and `assess_confidence` (gap + corroboration -> band) on the same pattern.

## Parity tests available

| Test file | Tests | Covers |
|---|---|---|
| `test/tradeLineup.test.js` | 13 | solver, budget, search |
| `test/tradeFind.test.js` | 6 | league scan |
| `test/tradeHotPath.test.js`, `tradeFindRoute.test.js` | - | route-level trade behaviour |
| `test/optimizer.test.js`, `optimizerService.test.js` | 3 + | lineup swaps |
| `test/confidencePolicy.test.js`, `confidenceStates.test.js` | 4 + | bands |
| `test/omenSelector.test.js` | 23 | selection rules |
| `test/waiverAnalysisPositions.test.js`, `waiverContractInvariants.test.js` | 5 + 5 | waiver envelope |
| `test/omenProjections.test.js` | 15 | projection determinism |
| `test/decisionBriefV2.test.js` | 7 | brief shape |
| `test/contracts/` | - | recorded response contracts |

Gap: no golden file of full-league trade inputs and outputs. Parity needs one: record 20-50 real league shapes (anonymised) with the JS output, and diff the core against them.

## Production spans to add

Today: `@opentelemetry/*` packages are in `package.json` but no file in `src/` imports them. `node_modules` was not installed here. `src/middleware/sentry.js` sets `tracesSampleRate: 0` and ignores Express layer spans. A decision-log entry calls the OTLP exporter an unused dependency. So there is no timing baseline.

Spans to add (names, where), not added:

| Span | Where |
|---|---|
| `omen.request` | `routes/omen.js` handler, whole request |
| `omen.provider.read` (attr `platform`) | `omen.js` roster reads; `omenTradeCandidate.readSleeper/readEspn/readYahoo` |
| `omen.db.read` | Supabase calls in `omen.js` |
| `omen.warehouse.usage` | `readRosterUsage` / `getUsageReader` |
| `omen.decision.lineup` | `optimizer.evaluateLineup` call sites in `omen.js` |
| `omen.decision.waiver` | `buildWaiverCandidateForConnection` / `buildWaiverAnalysis` |
| `omen.decision.trade` (attrs `teams`, `players`, `solves`, `budget_exceeded`) | around `findTradeCandidate` in `omenTradeCandidate.js` |
| `trade.find.scan` (same attrs) | `findLeagueTradeCandidates` in `routes/trade.js` |
| `omen.decision.select` | `omenSelector.selectDecision` |
| `omen.llm.enrich` | LLM enrichment path (`mvpEvidenceEnrichment.js`) |
| `cron.<job>` | each cron entry point |

The goal metric: CPU spans / `omen.request` span, per path, p50 and p95. Also record event-loop delay (`perf_hooks.monitorEventLoopDelay`) next to the trade spans.

## Open questions

1. Do real leagues hit the trade sizes we measured? Need production `teams` x `players` counts.
2. Is the 1.2 s gap vs the header's 203 ms from our synthetic data or a regression?
3. Would a worker thread be enough, making Rust unnecessary for speed?
4. Is a shared core for mobile (on-device) a goal? That changes which modules are in scope.
5. Should OpenTelemetry be wired directly, or should Sentry tracing be turned on (sample rate > 0) instead?
6. How does the fairness guard become data rather than a callback?
