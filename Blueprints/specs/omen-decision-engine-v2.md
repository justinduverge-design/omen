# Omen decision engine v2 — Omen's own read

**Status:** PROPOSED — founder review. Written 2026-09-30 after the founder's direction: *"We're not trying to guess which projection is higher. We're taking real football data — stats, location, travel, rest, primetime track record — and giving the analysis, not just whether three is more than two."*
**Replaces:** the optimizer-only pick in `src/services/optimizer.js` as the source of a recommendation. The provider projection stays as one input, not as the answer.

## The problem being fixed

Today the pick is `evaluateLineup()`: it compares the provider's projected points (with an injury-status haircut) and swaps when the gap exceeds 0.5. Weather, travel, matchup, kickoff time, trends and scheme run *after* the pick as one-sentence narration (`agents.js`, `routes/omen.js` enrichment stages) and never move it. Verified 2026-09-30, `Direction/2026-09-30-technical-root-assessment.md`.

A recommendation that reads as analysis but is produced by comparing two provider numbers is not what Omen is for.

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

## Not decided here (founder)

- Which factors are must-have for the first beta versus later.
- Whether an LLM may phrase the reasons. It may phrase them; it may not add reasons.
- The Sleeper commercial-use and retention questions (A6) — unchanged and still blocking anything that stores league scoring rules.
