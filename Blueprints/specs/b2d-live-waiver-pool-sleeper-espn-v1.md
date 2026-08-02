# B2-D Live Waiver Pool — Sleeper and ESPN v1

**Status:** Implementation plan for the waiver half of GitHub issue #162
**Date:** 2026-07-26
**Owner:** Backend / canonical `POST /api/omen/mvp-move`
**Parent contract:** `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md` — selected-context verification, deterministic selection, and envelope rules are inherited from it and are not restated here.
**Scope:** The available-player pool for `waiver_pickup` on Sleeper and ESPN.

## Decision

Yahoo waiver shipped fixture-verified in PR #211 and is parked on Yahoo Fantasy API reapproval. That gate is provider-specific. **Sleeper is not gated by it** and has genuine live capability proof. ESPN progressed from this research-first plan through locally verified E1/E2 code and drafted-league E3 provider proof; publication and deployment remain separate.

This produces the honest three-row capability matrix issue #162 asks for without waiting on Yahoo:

| Provider | Waiver status | Gate |
|---|---|---|
| Sleeper | built + provider-proven | none |
| Yahoo | fixture-verified (PR #211) | Yahoo API reapproval (external) |
| ESPN | locally built + drafted-league provider-proven | E1/E2 stack must still be published, reviewed, merged, and deployed |

## Verification basis — Sleeper

Probed against the live public API 2026-07-26:

| Endpoint | Result |
|---|---|
| `GET /v1/state/nfl` | `season_type: "off"`, `week: 0`, `season_start_date: null` |
| `GET /projections/nfl/2026/1` | 200, **3,293 entries with real `pts_ppr`** |
| `GET /v1/players/nfl` | 200, 12,201 players / 9,395 active / **3,222 active skill**, 13.9 MB, ~1 s |
| League rosters | already live — Sleeper start/sit runs through `src/services/omen.js:889` |

Two findings worth recording:

1. **The projections endpoint 400s without query params.** A bare `GET /projections/nfl/{season}/{week}` fails. It requires `season_type=regular` and repeated `position[]` values — which `fetchSleeperProjections()` (`src/adapters/sleeper.js:356`) already sends. Anyone probing by hand will wrongly conclude the data is missing.
2. **Off-season does not mean no data.** 2026 week 1 projections already exist during `week: 0`. An earlier assumption that the off-season blocks waiver work was wrong.

Sleeper uses **no credentials** — every call is a public GET. The only `token` reference in the adapter is Redis cache configuration.

## Phase S — Sleeper

### S1 · Available-pool adapter function

Add `fetchSleeperAvailablePlayers(leagueId, week, season)` to `src/adapters/sleeper.js`.

Pool = `fetchSleeperPlayers()` filtered to `active === true` and **fantasy-eligible at** `{QB, RB, WR, TE, K, DEF}`, minus the union of `players`, `starters`, `reserve`, and `taxi` across every roster from `GET /league/{id}/rosters`, joined to `fetchSleeperProjections()` on `player_id` for `pts_ppr`.

All three fetchers already exist and are cached (`PLAYERS_TTL_S`, `PROJECTIONS_TTL_S`), so this adds no new network shape and no new dependency.

**Eligibility, not primary position** (corrected during implementation): Sleeper lists fullbacks as `position: "FB"` with `fantasy_positions: ["RB"]`. A primary-position filter withheld 74 active rosterable players, 4 of them projected. `eligiblePositions()` decides. The same rule correctly drops players listed at a skill position with no fantasy eligibility. Net +71 at live scale.

**All four roster arrays are unioned**, not just `players` — and a roster row without a usable array is treated as unknown-but-owned. A smaller pool loses an opportunity; the reverse offers a player the user cannot add, presented as live advice.

**Done when:** returns a projection-ranked pool for a real league; a league with every skill player rostered returns an empty pool rather than an error; unknown league id returns the adapter's existing safe failure; unit tests cover full/partial/empty pools.

### S2 · Engine wiring

Extend `src/services/omen.js` so `waiver_pickup` is reachable for Sleeper, mirroring the guard shape PR #211 established for Yahoo:

- only after selected-context validation per the parent contract;
- only when no `start_sit` swap is available;
- only with a real OUT/IR starter on the selected roster (Sleeper exposes `injury_status` and `status` on the player record) and a real same-position available player;
- empty or failed availability returns no recommendation.

**Done when:** deterministic selection tests cover pick / no-pick / empty-pool / no-injured-starter; a live-mode test proves no mock or fixture pool can reach a live response; opaque provider errors and raw responses stay out of the envelope and logs.

### S3 · Live capability proof — 🟡 partially proven 2026-07-26

Run S1 + S2 against a real Sleeper league and capture a sanitized capability-matrix row.

**Done when:** the matrix reads **Sleeper: live** with evidence that names no league id, user id, or username in a way that identifies a real person.

#### Attempt 1 — 2026-07-26, founder-provided league

An end-to-end `fetchSleeperAvailablePlayers` call against a real 12-team PPR league succeeded: **719 ms, 3,293 pool, 533 projected, nulls sorted strictly last, normalized shape intact**, ranking topped by Josh Allen 23.79 / Burrow 23.78 / Hurts 21.90 / Mahomes 21.36.

That cross-checks S1's eligibility fix exactly: the earlier pre-fix live run produced 529 projected, and the four recovered players are the four projected fullbacks. 529 + 4 = 533.

**It does not close S3.** The league status is `pre_draft`. All 12 rosters return `players: []` with `starters: ["0" × 10]` — placeholder slots, no real players. The union of rostered ids across all 12 teams is `{"0"}`, and `"0"` is not a player in `/players/nfl`, so nothing is subtracted.

**The roster subtraction — S1's stated primary correctness risk — remains unproven.** Returning all 3,293 eligible players is the *correct* answer for an undrafted league, which is precisely why this run cannot distinguish a working subtraction from a broken one.

**To close S3:** a Sleeper league with `status` of `in_season` (or any drafted league with populated rosters). The check is that players held by every team, including rival teams, are absent from the pool.

### S4 · Off-season honesty — ✅ decided 2026-07-26

Projections for 2026 week 1 exist, but `/state/nfl` reports `week: 0`. A July waiver recommendation is computable but not actionable.

Two acceptable resolutions:

- **(a)** Sleeper waiver goes live and routes to the existing off-season DecisionBrief state surface (one of the 8 shipped in M1-P P3) until the season opens.
- **(b)** Sleeper waiver stays dark until week 1 and the capability matrix records it as season-gated rather than unavailable.

Either way, preseason projections must be labeled as estimates and never presented with in-season confidence.

**Founder decision 2026-07-26: (a) — live-but-off-season.** Sleeper waiver ships live and routes to the existing off-season DecisionBrief state surface until the season opens. Preseason projections are labeled as estimates.

**S3 surfaced a third state that (a) must also handle: `pre_draft`.** A league that has not drafted has no rosters at all, so a waiver recommendation is not merely off-season — it is meaningless. `GET /v1/league/{id}` exposes `status`, and `pre_draft` must route to its own honest surface rather than the off-season one. An undrafted league where the pool correctly returns every eligible player is the exact case where a naive implementation would present 3,293 "available" players as though they were waiver opportunities.

S2 must therefore branch on three states, not two: in-season, off-season (drafted, between weeks), and pre-draft (no rosters exist).

## Phase E — ESPN

**ESPN was not probed.** Verifying it requires a real user's live `espn_s2` and `SWID` cookies. Agents do not handle those, so everything below is inferred from code inspection and must be treated as unproven.

### E0 · Feasibility spike — founder-gated, no code

Confirm that ESPN's `kona_player_info` view plus an `x-fantasy-filter` header returns a usable free-agent pool for an authenticated league.

Two concrete gaps in the current adapter:

- `src/adapters/espn.js` requests only `mRoster`, `mTeam`, `mSettings`, `mMatchup`. The free-agent view is not among them.
- `makeEspnHeaders()` (`src/adapters/espn.js:268`) has no `x-fantasy-filter` support, and `doEspnRequest` has no shape for a JSON-encoded filter header. This is a new request shape, not a new parameter.

**Output:** a go/no-go with the observed response shape and any rate-limit or pagination behavior. Not an implementation.

**Done when:** the spike answers whether a live ESPN free-agent pool is obtainable within the existing cookie flow, and whether it survives ESPN's redirect behavior documented in `Direction/reviews/2026-07-07-espn-ios-cookie-sync-research.md`.

### E1–E3 · Mirror S1–S3 — blocked on E0

E1 additionally requires adding `x-fantasy-filter` header support to `doEspnRequest`. Do not begin E1 before E0 returns go.

### ESPN standing constraint

Cookie values never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow. Per `Direction/facts-of-record.md` #6 this is absolute and applies to every artifact this phase produces, including spike notes.

## Sequencing

1. **S0** — ✅ merged 2026-07-26 (PR #214). Projection mapping fix; a prerequisite discovered during S1.
2. **S1** — ✅ built (PR #215). Available pool derived and ranked.
3. **S4** — ✅ decided 2026-07-26: live-but-off-season, plus a distinct `pre_draft` state.
4. **S2** — next. Engine wiring, branching on three states.
5. **S3** — 🟡 partially proven. Needs a drafted league to test roster subtraction.
6. **E0** — founder-gated spike; blocks all of Phase E.
7. **Yahoo** — parked on external reapproval; no agent action available.

**Deploy is separately blocked.** The GitHub Actions billing hold (until ~2026-08-01) means merged work cannot reach production. S0 is on `main` but live Sleeper start/sit still ranks every player at zero until a deploy is possible.

## Non-goals

- No provider credentials, secrets, schema changes, migrations, deploy, or production-data mutation.
- No new dependency, paid data source, or cloud spend.
- No competing recommendation endpoint. `POST /api/omen/mvp-move` stays canonical and `POST /api/optimizer/mvp-move` stays retired.
- No trade intelligence — that is a separate half of issue #162.
- No native wiring. This is backend capability only.
- No claim that a fixture-verified provider is live.

## Acceptance evidence

- Unit tests for pool construction: full, partial, empty, and unknown-league cases.
- Deterministic selection tests proving waiver is chosen only when start/sit is unavailable and the injured-starter + same-position conditions hold.
- A live-mode test proving no mock or fixture pool can surface as live advice.
- A provider capability matrix with a row per provider and its gate.
- A handoff documenting data sources, unsupported cases, and release order.
