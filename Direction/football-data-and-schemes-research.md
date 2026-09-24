# Football data foundation — nflverse survey and scheme tracking

**Written:** 2026-09-24. **Status:** research complete, nothing built. Starting point for its
own conversation — this is not Tuesday-blocking work (see
`Direction/2026-09-29-tuesday-readiness.md` for that).

This document exists because a real research pass happened in a chat session and would have
been lost the moment that conversation ended. Every column list below was fetched live from
`nflverse-data`'s actual GitHub releases, not assumed from memory.

---

## 1. Current state — what's already ingested, and what it's for

`src/services/footballData/rawVault.js` pulls `stats_player`/`stats_team` (`stats_player_week_{season}.csv`)
from nflverse and vaults it as immutable raw CSV snapshots on the Omen Production filesystem.
**This exists for exactly one purpose: verifying Omen's own scoring math** (the A7B pipeline —
did the Ledger correctly grade a call as worked/didn't-work). Its columns are raw box-score
counts only. **There is no Postgres/SQL table for football facts anywhere in this repo** —
`sql/` has zero football-data schemas. Every read re-parses flat files at request time.

Do not touch this pipeline's purpose or its consumer (`footballDataFacts.js`, the scoring
reconciliation layer). Anything new below is additive, a second pipeline for a second
purpose — explaining recommendations, not grading them.

---

## 2. The full nflverse catalog, verified live 2026-09-24

24 release families exist. Every column list below is a real fetched header, not a guess:

| Family | Real columns (partial) | Coverage |
|---|---|---|
| `player_stats` | `target_share, air_yards_share, wopr, racr, dakota, pacr, fantasy_points, fantasy_points_ppr` | full history, updated in-season |
| `injuries` | `report_status, report_primary_injury, practice_status` | 2009+ |
| `ftn_charting` | `is_play_action, is_screen_pass, is_rpo, is_motion, n_blitzers, read_thrown, is_qb_out_of_pocket` | 2023+ only (charting service) |
| `snap_counts` | offense/defense/ST snaps and pct | multi-year |
| `depth_charts` | `pos_rank, pos_slot, pos_name` per team, dated snapshots | multi-year, frequent snapshots |
| `nextgen_stats` | `avg_separation, avg_cushion, avg_yac_above_expectation, avg_intended_air_yards` | 2016+ (passing/rushing/receiving splits) |
| `pfr_advstats` | `rushing_broken_tackles, receiving_drop_pct, receiving_rat` | 2018+ |
| `schedules` (`games.csv`) | `away_coach, home_coach, roof, surface, away_rest, home_rest, div_game` | 1999+ |
| `players`/`rosters`/`weekly_rosters` | `gsis_id, espn_id, yahoo_id, sleeper_id, pfr_id` **all in one row** | full history |
| `combine`, `draft_picks`, `contracts` | draft/dynasty valuation fields | — |
| `trades` | NFL front-office trades (not fantasy trades) | 2002+ |
| `officials`, `teams`, `espn_data` (QBR) | marginal for weekly decisions | — |

### Tiers, with reasoning

**Tier 1 — feeds Omen's reasoning directly:** `player_stats`, `injuries`, `ftn_charting`,
`snap_counts`, `depth_charts`, `nextgen_stats`.

**Tier 2 — real value, second wave:** `pfr_advstats` (compare against `nextgen_stats` before
pulling both — likely overlapping coverage), `schedules` (rest/divisional/roof context).

**Tier 3 — real data, not Omen's job today:** `combine`/`draft_picks`/`contracts` (Draft
Assistant is sidelined to 2027, fact-of-record #9 — correctly out of scope, not neglected).
`trades`, `officials`, `teams`, `espn_data` — genuinely marginal.

**Plumbing, needed before any Tier 1 content is usable across providers:** `players`/
`rosters` already solve the ESPN/Yahoo/Sleeper/nflverse player-ID crosswalk problem for
free — one row per player carries every platform's own ID. This has to exist before any
Tier 1 dataset can be joined against a real user's roster.

### Open question carried from the prior conversation, unresolved
Where does the normalized, queryable version of this live — a new schema in Supabase
(already the app's infra, already backed up) or self-hosted Postgres (matches "own your
infrastructure," but the Slops OS infra doc explicitly says not to stand up new
infrastructure just because a gap exists). Recommendation stated in-conversation was
Supabase now, self-host later only if volume genuinely justifies it — not yet confirmed by
the founder.

---

## 3. Scheme tracking — real ask, no shortcut exists

Founder's framing: track how offensive/defensive **schemes** travel with coaches between
teams — a scheme that worked at team A shows up working again when its coach moves to team
B. *"This stuff is a little important."*

**Checked directly: no nflverse release, or any other free source found during this pass,
publishes a "scheme" label.** Nobody hands you "this team runs Cover 3 / West Coast
offense" as structured open data — that's normally paywalled analyst commentary (Sharp
Football, PFF), not a CSV. **This is a derived/modeled problem, not an ingestion problem.**

### What already exists to build it from
- **Coach-to-team-to-season mapping already exists for free**, every season since 1999:
  `schedules`/`games.csv` has `away_coach`/`home_coach` on every game row.
- **Tactical fingerprint data already exists**: `pbp_participation` has `offense_formation`,
  `offense_personnel`, `defenders_in_box`, `defense_personnel` per play. `ftn_charting` adds
  motion rate, play-action rate, RPO rate, shotgun-vs-under-center — all 2023+.
- Putting these together over time, per coach, across team changes, is how you'd build a
  real "this coach's tendencies traveled with him" signal — legitimate, buildable, genuinely
  differentiated from anything a generic fantasy app does.

### What this needs before it's a build task, not a research task
1. **A literature check** — has anyone published an open methodology for NFL scheme
   classification from formation/personnel/tendency data (academic, hobbyist, or otherwise)?
   Not yet checked. Worth doing before inventing a classification scheme from scratch.
2. **A naming decision** — founder wants something "cool centered around schemes," not
   decided yet. Candidates to react to, not a final call: *Scheme DNA*, *Coaching Tree*,
   *System Signal*, *Scheme Print*.
3. **A scoping decision** — is v1 "flag when a coach with a known tendency joins a new team"
   (simple, coach-keyed lookup), or "continuously fingerprint every team's current tendencies
   and detect drift" (harder, ongoing classification)? These are very different builds.

---

## Explicitly not started

No ingestion code, no schema, no scheme-classification model. This is the complete state of
research as of 2026-09-24 — everything above is verified against real data, nothing below
this line has been designed yet.
