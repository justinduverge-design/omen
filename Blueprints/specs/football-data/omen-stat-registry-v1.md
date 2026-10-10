# Omen stat registry v1 — every stat Omen creates, defined once

**Status:** Proposed — awaiting founder approval of definitions **and** names
**Date:** 2026-10-10
**Sprint item:** `FM-REGISTRY` in `Direction/current_sprint.md`
**Purpose:** the founder asked for the complete list before anything is built, so nothing is built and then
changed. Every stat Omen creates is defined here: an ID, a proposed name, what it measures, its inputs and
where its formula lives. A stat not in this registry isn't built. A change to a definition is a new version
(`-v2`), recorded in `Direction/decision_log.md`, never a silent edit.

**Not in the registry:**
- raw stats from nflverse;
- stats nflverse already publishes, which are copied, not recreated: `target_share`, `air_yards_share`,
  `wopr`, `racr`, `pacr`, `cpoe`, `epa`, `xpass`, `pass_oe`, `cp`, `xyac_*`;
- provider projections, which stay the main projection by founder decision (2026-10-10).

## 1. Names

The founder wants the headline stats to have names. **Every name below is a proposal**:

- **Brand theme:** prophecy, oracle, judgment, high vantage (`Brand/brand-system.md` §6). Norse raven names are
  retired.
- **Before any name appears in the app** it goes through the brand naming table (`Brand/brand-system.md`) and
  `slops-ux-copy`.
- **Internal IDs never change**, so a renamed stat needs no rebuild.

**Position ratings family (§3): founder decision 2026-10-10.** One family name, tied to Omen ("Augur"
rejected). The working name is **Omen Grade** (e.g. "QB Omen Grade 87", "OL Omen Grade 61").
- Alternatives for the founder: Omen Score, Omen Mark, OmenRank.
- The name is a display string only; IDs `RAT-*` never change.

**Founder, 2026-10-10:** the other proposed names are approved as working names ("the names are ok"). They still
pass through `slops-ux-copy` wording review before release copy is locked.

## 2. The registry

**Phase key:**
- **M** = `omen-fantasy-metrics-v1.md`
- **T** = `omen-trend-evidence-v1.md`
- **V** = `omen-trade-value-v3.md`
- **R** = position ratings (§3 of this file)
- **C** = catalogue items (`Direction/reviews/2026-10-10-fantasy-manager-stats-and-scenarios.md`), specified
  here and built after M and T

### Foundation

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `FND-01` | Expected stat line | expected receptions, yards, TDs, fumbles from how a player was used | play-by-play | M §3.2 |
| `FND-02` | **Fated Points** (xFP) | FND-01 scored in the league's own scoring | FND-01, league rules | M §3.3–3.4 |
| `FND-03` | **Fate Gap** | actual points minus Fated Points (luck or skill?) | FND-02 | M §3.3 |
| `FND-04` | TD Fate Gap | actual TDs minus expected TDs | FND-01 | M §3.3 |
| `FND-05` | Opportunity counts | red-zone, inside-10/5, end-zone and deep work | play-by-play | M §4 |
| `FND-06` | Carry share / red-zone share / Fated share | share of team carries, red-zone opportunities and expected points | FND-02, FND-05 | M §4–5 |
| `FND-07` | Stickiness | how well each stat repeats week to week and year to year | history | T §6.1 |

### Role

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `ROL-01` | **Pecking Order** | usage-based role rank within the position group | FND-06 | M §5 |
| `ROL-02` | Role shift | role change signal (≥ 10-point share move or rank change) | ROL-01 | M §5 |
| `ROL-03` | **Next Man Up** | who absorbs the work when a teammate is out (with/without splits) | rosters, FND-06 | C |
| `ROL-04` | Return ramp | expected role share in the 1–2 weeks after an absence | rosters, FND-06 history | C |

### Team and game environment

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `ENV-01` | **Projected Team Score** | expected team points from spread and total | `games.csv` | C |
| `ENV-02` | Blowout watch / Shootout watch | spread ≥ 10 / total ≥ 50 flags | ENV-01 | C |
| `ENV-03` | Tempo | neutral-situation seconds per play, plays per game | play-by-play | C |
| `ENV-04` | Pass lean | pass rate over expected | nflverse `pass_oe` | C |
| `ENV-05` | Finishing rate | red-zone TD rate; field goals per red-zone trip | play-by-play | C |
| `ENV-06` | Scheme DNA | team tendencies (exists, `FI-LEAGUE`) | FTN, play-by-play | existing |

### Matchup

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `MCH-01` | Defensive fingerprint | how often a defence creates each context (box, blitz, run direction, depth) | FTN, play-by-play | T §5 |
| `MCH-02` | Points allowed over expected | fantasy points a defence allows by position, against the Fated Points of the players it faced | FND-02 | C |
| `MCH-03` | **Matchup Edge** | context-weighted delta for this player against this defence | MCH-01, T §4 | T §5 |
| `MCH-04` | Specificity verdict | broad claim shown / suppressed / "mixed" (the curveball rule) | MCH-03 | T §5 |
| `MCH-05` | **Stream Score** (DST, K, QB) | one-week streaming value | ENV-01, MCH-02, sack and turnover rates | C |

### Outlook

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `OUT-01` | Provider projection | the league provider's number, **the main projection** | provider | existing |
| `OUT-02` | **Omen's Read** | evidence-based lean against the provider (role, Next Man Up, matchup, environment). Shown as evidence; never replaces OUT-01 without a founder decision after a season of results | ROL, ENV, MCH | V §8 |
| `OUT-03` | Rest-of-season outlook | weekly means for the remaining weeks, byes at 0 | OUT-01 | V §3 |
| `OUT-04` | **Floor / Ceiling** | 10th and 90th percentile outcome, plus boom and bust rate | history conditioned on position and projection | V §3, C |
| `OUT-05` | Playoff-weeks outlook | OUT-03 for the league's fantasy playoff weeks | OUT-03, league settings | V §3 |

### Value (trade value v3)

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `VAL-01` | League replacement level | best free agent per position in this league (formula fallback) | provider pool, rosters | V §3 |
| `VAL-02` | Value over replacement | weekly and rest-of-season | OUT-03, VAL-01 | V §3 |
| `VAL-03` | **Scarcity Meter** | startable supply against demand, and the tier cliff, per position in this league | VAL-01, rosters | V §4 |
| `VAL-04` | Lineup change | rest-of-season best-lineup points before against after, playoff-weighted | lineup solver | V §3 |
| `VAL-05` | **Crown Odds** | title and playoff odds, and their change from a trade | season sim | V §3, §5 |
| `VAL-06` | Their side | the other manager's Crown Odds change ("would they accept?") | VAL-05 | V §5 |
| `VAL-07` | Trade verdict | band from the VAL-05 change | VAL-05 | V §5 |
| `VAL-08` | **Horizon value** | dynasty future-season value | DYN-01..04 | V §6 |

### Trends

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `TRD-01` | Trend label: **True Sign** / **Echo** / **Mirage** | likely cause / correlation / coincidence | T §6 tests | T §6 |
| `TRD-02` | Event registry | teammate out, QB change, head-coach change, role shift, scheme shift | rosters, `games.csv`, ROL-02, ENV-06 | T §6.3 |

### Dynasty

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `DYN-01` | **Open Field** | vacated opportunity by team and position | rosters, FND-02 | M §6 |
| `DYN-02` | Room age | opportunity-weighted age of the position group | `players.csv` | M §6 |
| `DYN-03` | Draft capital | draft year, round and pick | `players.csv` | M §6 |
| `DYN-04` | Age curve | where a player sits against his position's historical peak and decline | history (after backfill) | C |

### Your fantasy team

| ID | Proposed name | What it measures | Inputs | Spec |
|---|---|---|---|---|
| `LGE-01` | Playoff odds | from the season sim | VAL-05 | V §3 |
| `LGE-02` | **Fortune** | luck meter: all-play record, points for against the weekly median | league results | C |
| `LGE-03` | Bye crunch | weeks where too many starters are off | rosters, schedule | C |
| `LGE-04` | Road ahead | schedule strength by position for the next 3 weeks and the fantasy playoffs | MCH-02, schedule | C |

### Position ratings (§3)

| ID | Proposed name | Group |
|---|---|---|
| `RAT-QB` `RAT-RB` `RAT-WR` `RAT-TE` `RAT-K` | **Omen Grade** | individual skill positions and kickers |
| `RAT-DST` | **Omen Grade** | team defence (fantasy) |
| `RAT-OLP` `RAT-OLR` | **Omen Grade** | offensive line: pass protection, run blocking (unit) |
| `RAT-PR` `RAT-RD` `RAT-CVS` `RAT-CVD` | **Omen Grade** | pass rush, run defence, short coverage, deep coverage (unit) |
| `RAT-DL` `RAT-LB` `RAT-DB` | **Omen Grade** | individual defensive players (IDP leagues) |

## 3. Position ratings: "a QBR for every position group"

### 3.1 Principles (all groups)

- **Efficiency, not volume.** A rating measures how well a player or unit performs **per opportunity**.
  Volume is role (`ROL-01`), and fantasy value = role × efficiency × environment. Keeping them separate is
  what lets Omen say *why*.
- **Over expected and opponent-adjusted.** Each component is measured against expectation for the situation
  (FND-01, `cp`, `xyac`, expected yards per carry), then adjusted for the quality of opponents faced.
- **Shrunk.** Each component is pulled toward the position average by its stickiness (T §4). A rookie with
  two good games doesn't rate 99.
- **Predictive weights.** Component weights are fitted, on 2016–2025 history, to predict the **next** period's
  efficiency, not to describe the past. Stable components earn weight; noisy ones don't.
- **Scale 0–100.**
  - 50 = average qualified starter at that position that season.
  - Each 10 points ≈ one standard deviation of the fitted composite.
  - Qualification minimums are per group (e.g. QB ≥ 100 dropbacks).
  - Below the minimum, the rating is shown as "not enough snaps yet".
- **Every rating shows its components** ("QB Omen Grade 87: elite against the blitz, below average under
  pressure"), and FTN-based components are labelled and credited per T §2.

### 3.2 Components per group

| Rating | Components (all over expected, opponent-adjusted, shrunk) | Sources |
|---|---|---|
| **QB** | EPA per dropback (passes, scrambles, sacks); CPOE; sack-avoidance rate; turnover-worthy play rate (`is_interception_worthy`); rushing EPA; performance against blitz and with QB out of pocket | play-by-play, FTN |
| **RB** | rushing yards over expected per carry; rushing success rate; stuff avoidance (carries ≤ 0 yards); receiving EPA per target; goal-to-go conversion over expected; fumble rate | play-by-play, FTN (box count for context) |
| **WR** / **TE** | receiving EPA per target; catch rate over expected (`cp`); YAC over expected (`xyac_mean_yardage`); drop rate on catchable balls; contested-catch rate; first-down rate per target; target-earning rate (target share against role) | play-by-play, FTN |
| **K** | field goals made over expected by distance (an expected make-probability model by distance, roof and wind); extra-point rate | play-by-play, schedules |
| **DST** | EPA per play allowed; pressure rate (sacks + QB hits per dropback); takeaway rate; points allowed per drive | play-by-play |
| **OL pass pro** (unit) | sack rate and QB-hit rate allowed against the opponent pass rush's own rates; pressure context from FTN (rushers sent) | play-by-play, FTN |
| **OL run block** (unit) | team rushing success and yards over expected on designed runs; stuff rate allowed; adjusted for box count faced | play-by-play, FTN |
| **Pass rush** (unit) | sack and QB-hit rate generated against opponent protection; pressure with 4 rushers (no blitz) | play-by-play, FTN |
| **Run defence** (unit) | stuff rate; rushing yards over expected allowed | play-by-play |
| **Short / deep coverage** (unit) | EPA per dropback allowed on targets with air yards < 10 / ≥ 15, opponent-adjusted | play-by-play |
| **DL / LB / DB** (IDP) | per team defensive play: tackles, tackles for loss, sacks and half-sacks, QB hits, passes defended, interceptions, forced fumbles; weighted by IDP scoring relevance | play-by-play player-id columns |

**Data limits, stated so nobody expects them:**
- **Individual coverage:** play-by-play doesn't name the defender in coverage.
- **Individual offensive linemen:** not credited in any admitted source.
- **Routes run:** no licensed source.
- **IDP rates:** per team defensive play, not per snap. In-season snap counts are pending their rights review.

So the OL and coverage ratings are **unit** ratings, and the IDP ratings measure production per team play.

**Columns confirmed in the live 2026 play-by-play (2026-10-10):** `sack_player_id`, `half_sack_1_player_id`,
`qb_hit_1_player_id`, `solo_tackle_1_player_id`, `assist_tackle_1_player_id`, `tackle_for_loss_1_player_id`,
`pass_defense_1_player_id`, `interception_player_id`, `forced_fumble_player_1_player_id`, `kick_distance`,
`field_goal_result`, `extra_point_result`, `qb_epa`, `success`, `first_down`.

### 3.3 Proof before shipping

For each rating, the report shows:
- **Year-over-year stability.** Target: correlation ≥ 0.4 for QB, RB, WR, TE and DST.
- **Predictive value.** This season's rating should predict next season's efficiency better than last season's
  raw efficiency alone.
- **Face-validity table.** The top and bottom 10 at each position for 2025, for the founder to read.

A rating that fails stability ships only as "beta" or not at all.

## 4. How the pieces depend on each other (build order)

```text
FND (M1) ──► ROL ──► OUT-02, TRD (T1) ──► MCH ──► RAT (R1)
   │                                        │
   └────────► VAL (V0 solver ► V1 sim) ◄────┘ ──► LGE ──► VAL-08 / DYN-04 (after backfill)
```

1. M1 (fantasy metrics)
2. V0 (lineup solver), in parallel, since it unblocks trade value and has no data dependency
3. T1 (trend evidence)
4. R1 (ratings)
5. V1 (Crown Odds)
6. C items
7. dynasty layers after the 1999+ backfill

## 5. Draft foundations (later: in-season late or offseason; not built now)

The founder asked for the foundations a future draft tool would need, without going deep. Product rule 8
(`Direction/map.md`): the draft tool is a 2027 feature and is never named in the app, store metadata,
onboarding or navigation. These are internal stat definitions only.

| ID | Working name | What it measures | Reuses | Open question |
|---|---|---|---|---|
| `DRF-01` | Season value over replacement | full-season value by league size, slots and scoring | VAL-01/02 logic on season outlooks | which season projection (provider preseason or Omen-built) |
| `DRF-02` | Tiers | natural breaks in DRF-01 within each position | DRF-01 | none |
| `DRF-03` | Average draft position | where players are being drafted | — | **needs its own source-rights review** (the 2026-08-24 review: ADP requires one); `Direction/context.md` says a Slops-built ADP |
| `DRF-04` | Value against ADP | DRF-01 rank against DRF-03 rank (bargains and reaches) | DRF-01, DRF-03 | depends on DRF-03 |
| `DRF-05` | Rookie outlook | draft capital, landing-spot Open Field, room age | DYN-01..03 | no college stats source is admitted |
| `DRF-06` | Season schedule strength | full-season Road ahead | LGE-04 | none |

Everything here reuses registry stats, so building the in-season stats now is also the draft groundwork.

## 6. Open decisions (the only things that could change definitions later)

| ID | Decision | Options | Default until decided |
|---|---|---|---|
| D-NAMES | stat names | **decided 2026-10-10:** approved as working names; copy review before release | — |
| D-RATING-FAMILY | position ratings naming | **decided 2026-10-10:** one family tied to Omen; working name "Omen Grade" (alternatives: Omen Score, Omen Mark, OmenRank) | "Omen Grade" |
| D-CROWN | show title-odds change as a number, or only as bands and words | **decided 2026-10-10:** a number may be shown ("title contention can have a number attached"). Call confidence stays a band (fact 16). | — |
| D-IDP | build IDP ratings in R1, or later | **decided 2026-10-10:** build IDP in R1 | — |
