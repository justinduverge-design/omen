# Omen decision engine v2 — Omen's own read

**Status:** PROPOSED — founder review. Written 2026-09-30 after the founder's direction: *"We're not trying to guess which projection is higher. We're taking real football data — stats, location, travel, rest, primetime track record — and giving the analysis, not just whether three is more than two."*
**Replaces:** the optimizer-only pick in `src/services/optimizer.js` as the source of a recommendation. The provider projection stays as one input, not as the answer.

## The problem being fixed

Today the pick is `evaluateLineup()`: it compares the provider's projected points (with an injury-status haircut) and swaps when the gap exceeds 0.5. Weather, travel, matchup, kickoff time, trends and scheme run *after* the pick as one-sentence narration (`agents.js`, `routes/omen.js` enrichment stages) and never move it. Verified 2026-09-30, `Direction/2026-09-30-technical-root-assessment.md`.

A recommendation that reads as analysis but is produced by comparing two provider numbers is not what Omen is for.

## Experiments, 2026-09-30 — read before building anything in this spec

`Direction/2026-09-30-first-factor-experiment.md`. Every factor family was tested out of sample on 8 seasons of real data under a rule written beforehand: availability, usage trends, player-specific splits, team tempo and scheme, game lines, rest and primetime, weather, opponent strength, recent form, variance, and waiver value. **None met the bar for improving close start/sit calls** (best: game lines, +0.22 points, real but too small). Variance from recent history is not predictable once scoring level is controlled. Waiver value: the model beats a trailing average clearly (by 0.69 points) and this week's projection by only 0.10.

A second round tested combinations and interactions directly (trees on every feature, and a nested best-subset selection) and found nothing distinguishable from zero (best +0.31 points, 99% CI -0.06 to +0.70).

**The factor-adjusted expected-points model this spec describes is not supported by the evidence.** Consequences:

1. **Do not build the football-data pipeline, the factor library, or the extra tables on faith.** S2, S4 and S5 are on hold; the harness already exists as `scripts/research/context-vs-projection/`.
2. **Reframe the product around what the evidence supports:** an honest confidence layer (the projection is right 52% of the time within a point and 82% at 8+, so tell the user which kind of call this is), cross-provider integration, workflow where projections do not decide (waivers, trades, deadlines, what changed), and, to be tested with the forward shadow log, speed on availability and news.
3. **Keep the guard.** A factor is admitted only after it passes a pre-registered out-of-sample test; the shadow log (Omen's read beside the provider's, logged weekly) is the proof that matters.

## Principle

**Every factor that appears in the explanation must have moved the number.** The explanation is generated from the factors' recorded contributions. Nothing is narrated that did not contribute, and nothing contributes without a recorded, tested magnitude.

## Shape

```
provider projection (baseline, never the answer)
   + player form and role      (what he has actually been doing)
   + opponent and matchup      (who he is facing)
   + game context              (where, when, how the game is expected to go)
   + availability              (is he actually going to play, and how much)
   = Omen read: expected points, a range, and the ranked reasons that moved it
```

Each term is an adjustment with a source, a magnitude and a confidence. The engine returns the adjusted expectation **and the contribution of each factor**, so the app can say *"Kyler Murray over Brian Thomas: +2.1 opponent (their defense allows the 3rd-most QB points), +0.8 indoors, -0.6 short rest"* and the number and the sentence cannot disagree.

## Factor families and where the data comes from

All rows below are available in nflverse today (verified 2026-09-30 against `games.csv` and `stats_player_week`), except where marked.

| Family | Factors | Source |
|---|---|---|
| **Player form and role** | Target share, air-yards share, WOPR, carries and red-zone touches, EPA per play, CPOE, snap share, trend over the last N weeks | `stats_player_week`; snap counts (confirm asset path) |
| **Opponent and matchup** | Defense against the position (points, yards, EPA allowed), pass rush pressure and sacks, coverage tendencies, opposing QB and coach | `stats_player_week` aggregated by `opponent_team`; play-by-play; `games` coaches and QBs |
| **Where and when** | Home or away, roof, surface, temperature, wind, kickoff day and time (**primetime**), the player's and team's own history in those conditions | `games`: `location`, `roof`, `surface`, `temp`, `wind`, `weekday`, `gametime` |
| **Travel and rest** | Days of rest for each team, short-week and bye effects, cross-country and time-zone travel | `games`: `away_rest`, `home_rest`; stadium coordinates (derive) |
| **Game script** | Spread and total, implied team points, pace, expected pass rate | `games`: `spread_line`, `total_line`, moneylines |
| **Availability** | Injury status, practice participation, depth-chart position and changes, inactives | nflverse injuries and depth charts (confirm asset paths); provider status as fallback |
| **Scheme and coaching** | Coach origin and scheme lineage, scheme-versus-scheme fit | `src/services/footballIntelligence/` (built 2026-09-24/29; **not in production**, phase 4) |
| **News** | Beat reports, role changes | Not yet sourced. **Out of scope until a lawful source is chosen** (`pre-build-research` first). |

## How a factor earns its place

Not by being plausible. Before a factor is allowed to move a pick, it is tested on historical weeks (2018 onward, nflverse has them): does adding it reduce error against what the player actually scored, out of sample, versus the version without it? **The factor stays only if it does.** The report for each factor is stored with the spec: sample size, effect size, where it helped and where it did not.

The "start the higher projection" rule is used only as the yardstick to beat, and only to answer *"is Omen's read better than what ESPN already tells you?"* — the claim the product makes. It is never the product.

## Honesty rules (inherited, not new)

- A factor with no data for this player or week is **named as not read**, never silently dropped or defaulted (facts-of-record; `capability-expression-v1.md`).
- Confidence is the band (`Confident / Leaning / Coin flip`) computed server-side from the size of the edge relative to its range, with its drivers. No numeric percentage on native.
- No factor's effect is described as causal. Association language only for scheme and trend factors.
- Mock or stub factor values are labelled and never enter a live recommendation.

## Phases

1. **Data layer.** A weekly job that pulls nflverse games, player-week stats, snap counts, injuries and depth charts into a compact store, with receipts and content hashes (reusing `src/services/footballData/` receipts where possible). Read-only against production until reviewed.
2. **Factor library plus the harness.** One module per factor family returning `{ adjustment, range, confidence, evidence }`. A backtest harness that scores each factor on historical weeks and writes the report.
3. **The engine.** Combines admitted factors into the adjusted expectation with per-factor contributions. Replaces the optimizer as the source of the pick. The old path stays behind a flag until parity is shown.
4. **Scheme and coaching.** Wire `footballIntelligence` in as a factor once phase 2's harness can judge it.
5. **On the phone.** The Omen and Start/Sit screens render the ranked reasons from the contributions, checked on the founder's device against real leagues (`definition-of-done.md`, native UI device gate).

## Done when

- For a real league on the founder's phone, Omen recommends a start/sit whose displayed reasons are exactly the factors that moved the number, with magnitudes.
- Each admitted factor has a backtest report showing out-of-sample improvement; rejected factors are listed with why.
- The engine's read beats the provider-projection-only pick on historical weeks by a stated margin, or the spec says plainly that it does not and what that means for the product claim.


## What the visual lock needs from the engine

The 2026-09-13 lock was designed around an engine like this one: `OmenEvidence` already draws Weather, Rest and Matchup rows, and its copy says *"Three independent factors point the same way and none contradicts. That is what moves a call from Leaning to Confident — agreement, not margin."* That sentence is a **specification for the confidence band**: agreement between independent factors, not the size of the projection gap.

| Screen (contract) | What it takes from the engine |
|---|---|
| **OmenCall**, **OmenEvidence** (`omen-decision-brief.v3`) | The move; the band with its drivers; risk with its reason; evidence rows per factor (kind, what it says, whether it was used); "what Omen could not read"; the alternatives it considered and why each was rejected |
| **StartSitClear**, **StartSitIncomplete** (`start-sit-detail.v2`) | Per-player expected points and range; the factors that separated the two; the honest "incomplete" reasons (missing factor, unread provider) |
| **CommandCenter** (waiver watch, matchup, ledger line) | The week's top move summary; matchup projection with the game-script context; the same waiver read as League |
| **LeagueTable**, **LeagueWaiver**, **WaiverNoMove**, **WaiverNotDetermined** (`waiver-analysis.v1`) | The add/drop read with factor contributions; the honest no-move and not-determined states |
| **TradeBuild**, **TradeVerdict**, **TradeNeedsContext** (`trade-compare.v2`) | The same factor-adjusted expectation for both sides of a trade, so a trade is judged on Omen's read, not on provider projections |
| **Ledger**, **LedgerDetail** (`moves-history.v2`, `move-detail.v2`) | The stored factors and their contributions at issue time, so a wrong call can say which factor misled it. This is what makes "we admit when we were wrong" checkable. |

The engine therefore has to persist, per decision: the expectation, its range, each factor's contribution, and each factor's source and as-of time. Contract-wise this is `move-detail` gaining the historical band/risk/reasoning it lacks today (a known gap in `Direction/2026-09-29-tuesday-readiness.md`).

## Keeping the API from breaking again

Two things broke the API before: production drifted from what the code assumed, and clients and server changed without a mechanical check between them. The rules below make both impossible to do quietly.

1. **One public shape, private internals.** The engine produces a private `engine-read.v1` that no client ever sees. A single adapter maps it to the existing public contracts (`omen-decision-brief.v3`, `start-sit-detail.v2`, `waiver-analysis.v1`, `trade-compare.v2`, `moves-history.v2`). Engine work can change freely behind the adapter; the public shape only changes through the rules below.
2. **New factors are new evidence rows, not new fields or new versions.** The capability manifest (`decision-capabilities.v1`) is already additive, with evidence kinds `verified / projection / model / inference / limitation`. A new factor (rest, wind, primetime history) ships as a new capability entry. Clients render an entry they do not recognise as a generic evidence row (label, sentence, kind, used or not), so a new factor needs **no client release**.
3. **Additive only within a version.** Within a contract version the server may add optional fields and new capability entries. It may not remove, rename, retype or change the meaning of anything. A change that would do any of those is a **new contract version served alongside the old one**; the old one is kept until `GET /api/system/min-version` shows no supported client still needs it, then sunset with a dated note. Never mutate a shipped version in place (this is how `omen-decision-brief.v2` and `.v3` already coexist).
4. **The visual lock is the test.** Every screen in `Blueprints/specs/design/canvas-contract-requirements-v1.json` already names its `api_contracts`. From that file, generate one JSON Schema per contract plus golden fixtures, and check them in **both directions in CI**: (a) the real server response, for a seeded league, validates against the schema; (b) the iOS decoder (and Android's, once it resumes) decodes the same fixtures and every required screen state renders. A server change that breaks a screen, or a client change that stops reading a field, fails a build.
5. **Shadow before serving.** The new engine runs beside the old optimizer on real requests, logs both reads and their differences, and serves only after the differences are reviewed. The old path stays behind a flag until parity is shown.
6. **Production schema is a checked input.** The engine's persistence changes are migrations under the framework added in WO-02, rehearsed up, down and up again on a restored clone, and applied to production only through a founder-approved bounded order. Tests run against the migrated schema, not against a hand-written stub of it.
7. **The device gate applies.** A contract-affecting change is not done until the affected screens have run against the real server on the founder's phone (`definition-of-done.md`, native UI device gate).

**Platform scope (founder, 2026-09-30):** iOS only for now. The engine, adapter, schemas and fixtures are platform-neutral so Android can catch up later without rework; no Android screen work under D1.

## Work split for the groundwork

| Who | Does | Does not |
|---|---|---|
| **Jules** | Phase 1 data layer (weekly nflverse pull, receipts, store) as a migration and job on a scratch database; factor-library skeletons; the backtest harness; the schema and fixture generator from `canvas-contract-requirements-v1.json` | Merge; touch the production database; change a public contract |
| **Muse** | Dispatches the work orders; gate-reviews against the rules above (schema check, UP/DOWN/UP, fixtures, shadow-mode diff); keeps the tracker | Production writes; merging anything without the gate evidence |
| **Claude (this session's lane)** | The adapter and the engine-to-contract mapping; the contract tests in CI; the native screens against the real server and the founder's phone | Applying database changes; marking a screen verified without the device gate |
| **Founder** | Ratify this spec; pick the first-beta factor set; approve each bounded production order | — |

**Ordering:** contract schemas and fixtures first (they need no new data and protect everything after), then the data layer, then the factor library and harness, then the engine behind the adapter in shadow mode.

## Not decided here (founder)

- Which factors are must-have for the first beta versus later.
- Whether an LLM may phrase the reasons. It may phrase them; it may not add reasons.
- The Sleeper commercial-use and retention questions (A6) — unchanged and still blocking anything that stores league scoring rules.
