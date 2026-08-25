# Omen football-data normalization and scoring acceptance v1

**Status:** implemented locally for A7B Phase 2 on `codex/a7b-football-data`

**Authority:** `ATA-20260825-01`

**Production effect:** none. This contract creates non-promoted local replay evidence only.

## Exact inputs

One acceptance run requires three exact `omen-football-raw-manifest.v1` snapshots from the reviewed nflverse allowlist:

- `stats_player_week_<season>.csv` from release `stats_player`;
- `stats_team_week_<season>.csv` from release `stats_team`;
- `games.csv` from release `schedules`.

The run revalidates each manifest, rights record, fixed source/release identity, schema fingerprint, byte length, and raw SHA-256. `latest` aliases, arbitrary URLs, provider credentials, databases, production roots, and publication are unavailable.

## Canonical identities

- Game: `nfl:<season>:<game_id>`. `old_game_id`, `gsis`, `pfr`, `pff`, and `espn` remain typed aliases and cannot resolve to multiple games.
- Player: GSIS `player_id` matching `00-#######`. Names are validity-bounded aliases and never join keys.
- Team/DST: `nfl:<franchise>:<season>`. nflverse abbreviations are source aliases with week and game-date validity. Known relocation/rename aliases resolve to the current franchise code.

A blank player identity is excluded only when every scoring component and both nflverse publisher totals are exactly zero. The observed 2025 input has one such team-penalty-only row in each selected replay week. Any anonymous scoreable row fails closed.

## Versioned facts and results

Facts are immutable replay output under:

- `omen-offensive-facts.v1`;
- `omen-kicker-facts.v1`;
- `omen-dst-facts.v1`.

Derived results are keyed by season, season type, week, subject type, canonical subject ID, ruleset version, and the SHA-256 bundle of the three exact input manifests. A repeated derived key is a hard failure.

### `omen-fantasy-v1`

Standard scoring is:

```text
passing_yards / 25
+ 4 * passing_touchdowns
- 2 * passing_interceptions
+ (rushing_yards + receiving_yards) / 10
+ 6 * (rushing_touchdowns + receiving_touchdowns + special_teams_touchdowns)
+ 2 * (passing + rushing + receiving two-point conversions)
- 2 * (sack + rushing + receiving lost fumbles)
```

Half PPR is Standard plus `0.5 * receptions`; PPR is Standard plus `receptions`. Every derived Standard and PPR result must equal nflverse's separately published reference columns within `1e-8`.

### `omen-kicker-v1`

| Event | Points |
|---|---:|
| PAT made | 1 |
| FG made, 0–39 yards | 3 |
| FG made, 40–49 yards | 4 |
| FG made, 50–59 yards | 5 |
| FG made, 60+ yards | 6 |

Made-distance buckets must sum to total field goals made; attempts must reconcile to made, missed, and blocked outcomes. Player kicking totals must exactly equal the separately published `stats_team` aggregate for every team-game.

### `omen-dst-v1`

| Event | Points |
|---|---:|
| Sack | 1 |
| Interception | 2 |
| Opponent fumble recovery | 2 |
| Defensive, fumble-recovery, or special-teams touchdown | 6 |
| Safety | 2 |
| Blocked punt/PAT/field goal | 2 |

Final opponent score from the exact schedule supplies the points-allowed tier: 0 → 10; 1–6 → 7; 7–13 → 4; 14–20 → 1; 21–27 → 0; 28–34 → −1; 35+ → −4.

These are Omen's explicit versioned baseline rules, not a claim that every fantasy provider or league uses them. League-exact scoring remains owned by the separate full scoring-contract work.

Kicker and DST totals are identical in the Standard, Half PPR, and PPR fields because reception scoring does not apply to either subject class.

## Hard acceptance gates

The run stops without an artifact when any of these fail:

1. exact manifest/source/rights/hash/schema validation;
2. four or more distinct completed REG weeks;
3. schedule/game/team/opponent agreement and exactly two reciprocal team facts per completed game;
4. canonical game, player, and franchise-season identity coverage;
5. unique player-game facts, team-game facts, and derived keys;
6. integer nonnegative counters, finite totals, and valid completed scores;
7. evidenced player cardinality bands of 1–200 per game and 1–100 per team-game;
8. exact Standard/Half/PPR identities and nflverse Standard/PPR reference match within `1e-8`;
9. complete kicker outcome/bucket reconciliation and exact player-to-team kicking match;
10. complete DST facts with points allowed resolved from the schedule;
11. exact resolution for every supplied recommendation target.

The acceptance artifact and receipt always contain `publication.authorized: false` and `promoted: false`. Staging, correction drills, source-loss drills, KVM1 recovery, Pi witness, timers, databases, publication, deployment, production scoring, and ADP remain later founder-gated work.

## Local replay

```bash
node scripts/football-data.js accept \
  --root /tmp/omen-football-vault \
  --player-manifest /tmp/omen-football-vault/manifests/nflverse-data/stats_player/2025/<exact-manifest>.json \
  --team-manifest /tmp/omen-football-vault/manifests/nflverse-data/stats_team/2025/<exact-manifest>.json \
  --schedule-manifest /tmp/omen-football-vault/manifests/nflverse-data/schedules/2025/<exact-manifest>.json \
  --season 2025 \
  --weeks 1,7,14,17 \
  --out /tmp/omen-football-acceptance

node scripts/validate-football-acceptance.js \
  --acceptance /tmp/omen-football-acceptance/<run-id>/acceptance.json \
  --receipt /tmp/omen-football-acceptance/<run-id>/receipt.json
```

The validator is read-only and independently recomputes all three rulesets from the emitted facts while binding the exact acceptance bytes to their receipt hash.
