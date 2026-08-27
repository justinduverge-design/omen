# A6 — scoring coverage matrix

<!-- GENERATED FILE. Do not edit by hand.
     Regenerate: node scripts/generate-scoring-coverage-matrix.js --write
     test/scoringCoverageMatrix.test.js fails if this drifts from the code. -->

**Generated from** `src/services/scoringContract.js` (canonical event vocabulary)
and `src/services/scoringRuleSnapshot.js` (per-provider derivation).

Answers one question per row: **can Omen reproduce this scoring rule from the
provider's own settings?** A ✅ is a mapping that exists in code and is exercised
by tests. It is not a claim that the resulting score has been reconciled against
that provider's final result — that is the separate reconciliation state.

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Mapped from a named provider key. Reproducible. |
| ❌ | Not mapped. Any **non-zero** value for this rule forces the whole contract to `ambiguous` — it is never silently treated as zero. |
| 🔒 | **Provider-restricted.** No provider-granted path to capture and retain the complete private rule set. Derives a hashed restriction attestation, never a snapshot. |
| ⏳ | **Pending.** The rules exist and Omen may be able to read them once access clears. |

## Provider status

| Provider | Rule derivation | Rule-body retention | Blocker |
|---|---|---|---|
| Sleeper | ✅ 32/37 canonical events | ✅ permitted | Written commercial-use permission pending (requested 2026-08-22) |
| ESPN | 🔒 none | ⛔ withheld | Provider-restricted absent express permission |
| Yahoo | ⏳ none | ⛔ withheld | API refused at the app-entitlement level (issue #308) |

**Retention is gated separately from derivation.** Deriving a snapshot in memory
to compute a hash is not the same act as retaining a provider's rules in the
database. `RETAIN_RULE_BODY` in `scoringSnapshotResolver.js` controls the
second; today it is `false` for every provider, so `moves.scoring_contract`
stays `null` and only the hash and coverage state are persisted.

## The honest gap

Even a fully ✅ row does **not** yet produce a league-exact grade, because the
current Tuesday source publishes aggregate fantasy points rather than the
per-event facts a contract prices. Reconciliation reports `unsupported` and
names the missing facts rather than scoring them as zero. That seam is what the
owned football-data pipeline (`A7B`) fills.

## Sleeper — unmapped canonical events

- `defense_points_allowed`
- `defense_yards_allowed`
- `field_goals_made_0_39`
- `field_goals_made_40_49`
- `field_goals_made_50_plus`

These are canonical events Omen understands but has no Sleeper key for. `field_goals_made_*` band variants are covered instead by `field_goals_made` with a `range_event` operator, so they are unreachable by design rather than missing. `defense_points_allowed` and `defense_yards_allowed` are genuinely unmapped: Sleeper expresses them as tiered `pts_allow_*` / `yds_allow_*` keys that do not fit a single per-event rule, so a league scoring them non-zero derives `ambiguous` — correctly, and deliberately.

## Sleeper keys deliberately ignored

- `pts_allow` — carries no scoring weight; listed explicitly so it is *known* irrelevant rather than falling through to the unmapped bucket, which would make every league permanently ambiguous.
- `yds_allow` — carries no scoring weight; listed explicitly so it is *known* irrelevant rather than falling through to the unmapped bucket, which would make every league permanently ambiguous.

## Per-event detail

### Offensive player

| Canonical event | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| `fumbles_lost` | ✅ `fum_lost` | 🔒 restricted | ⏳ pending |
| `passing_interceptions` | ✅ `pass_int` | 🔒 restricted | ⏳ pending |
| `passing_touchdowns` | ✅ `pass_td` | 🔒 restricted | ⏳ pending |
| `passing_yards` | ✅ `pass_yd` | 🔒 restricted | ⏳ pending |
| `receiving_receptions` | ✅ `rec` | 🔒 restricted | ⏳ pending |
| `receiving_touchdowns` | ✅ `rec_td` | 🔒 restricted | ⏳ pending |
| `receiving_yards` | ✅ `rec_yd` | 🔒 restricted | ⏳ pending |
| `return_touchdowns` | ✅ `st_td` | 🔒 restricted | ⏳ pending |
| `rushing_touchdowns` | ✅ `rush_td` | 🔒 restricted | ⏳ pending |
| `rushing_yards` | ✅ `rush_yd` | 🔒 restricted | ⏳ pending |
| `two_point_conversions` | ✅ `pass_2pt`, `rec_2pt`, `rush_2pt` | 🔒 restricted | ⏳ pending |

### Kicker

| Canonical event | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| `extra_points_made` | ✅ `xpm` | 🔒 restricted | ⏳ pending |
| `extra_points_missed` | ✅ `xpmiss` | 🔒 restricted | ⏳ pending |
| `field_goals_made` | ✅ `fgm_0_19`, `fgm_20_29`, `fgm_30_39`, `fgm_40_49`, `fgm_50p` | 🔒 restricted | ⏳ pending |
| `field_goals_made_0_39` | ❌ not mapped | 🔒 restricted | ⏳ pending |
| `field_goals_made_40_49` | ❌ not mapped | 🔒 restricted | ⏳ pending |
| `field_goals_made_50_plus` | ❌ not mapped | 🔒 restricted | ⏳ pending |
| `field_goals_missed` | ✅ `fgmiss` | 🔒 restricted | ⏳ pending |

### Team defense / special teams

| Canonical event | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| `defense_blocks` | ✅ `blk_kick` | 🔒 restricted | ⏳ pending |
| `defense_fumble_recoveries` | ✅ `fum_rec` | 🔒 restricted | ⏳ pending |
| `defense_interceptions` | ✅ `int` | 🔒 restricted | ⏳ pending |
| `defense_points_allowed` | ❌ not mapped | 🔒 restricted | ⏳ pending |
| `defense_return_touchdowns` | ✅ `def_st_td` | 🔒 restricted | ⏳ pending |
| `defense_sacks` | ✅ `sack` | 🔒 restricted | ⏳ pending |
| `defense_safeties` | ✅ `safe` | 🔒 restricted | ⏳ pending |
| `defense_touchdowns` | ✅ `def_td` | 🔒 restricted | ⏳ pending |
| `defense_yards_allowed` | ❌ not mapped | 🔒 restricted | ⏳ pending |

### Individual defensive player (IDP)

| Canonical event | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| `idp_assisted_tackles` | ✅ `idp_tkl_ast` | 🔒 restricted | ⏳ pending |
| `idp_defensive_touchdowns` | ✅ `idp_def_td` | 🔒 restricted | ⏳ pending |
| `idp_forced_fumbles` | ✅ `idp_ff` | 🔒 restricted | ⏳ pending |
| `idp_fumble_recoveries` | ✅ `idp_fum_rec` | 🔒 restricted | ⏳ pending |
| `idp_interceptions` | ✅ `idp_int` | 🔒 restricted | ⏳ pending |
| `idp_passes_defended` | ✅ `idp_pass_def` | 🔒 restricted | ⏳ pending |
| `idp_sacks` | ✅ `idp_sack` | 🔒 restricted | ⏳ pending |
| `idp_safeties` | ✅ `idp_safe` | 🔒 restricted | ⏳ pending |
| `idp_solo_tackles` | ✅ `idp_tkl_solo` | 🔒 restricted | ⏳ pending |
| `idp_tackles_for_loss` | ✅ `idp_tkl_loss` | 🔒 restricted | ⏳ pending |
