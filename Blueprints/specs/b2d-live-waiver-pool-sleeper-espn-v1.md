# B2-D Live Waiver Pool — Sleeper and ESPN v1

**Status:** Implementation plan for the waiver half of GitHub issue #162
**Date:** 2026-07-26
**Owner:** Backend / canonical `POST /api/omen/mvp-move`
**Parent contract:** `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md` — selected-context verification, deterministic selection, and envelope rules are inherited from it and are not restated here.
**Scope:** The available-player pool for `waiver_pickup` on Sleeper and ESPN.

## Decision

Yahoo waiver shipped fixture-verified in PR #211 and is parked on Yahoo Fantasy API reapproval. That gate is provider-specific. **Sleeper is not gated by it** and can produce genuine live capability proof today. ESPN is neither gated nor proven — it is unverified, and is scoped here as research-first.

This produces the honest three-row capability matrix issue #162 asks for without waiting on Yahoo:

| Provider | Waiver status | Gate |
|---|---|---|
| Sleeper | buildable + live-verifiable now | none |
| Yahoo | fixture-verified (PR #211) | Yahoo API reapproval (external) |
| ESPN | unverified | feasibility spike, founder-gated |

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

Pool = `fetchSleeperPlayers()` filtered to `active === true` and `position ∈ {QB, RB, WR, TE, K, DEF}`, minus the union of `players[]` across every roster from `GET /league/{id}/rosters`, joined to `fetchSleeperProjections()` on `player_id` for `pts_ppr`.

All three fetchers already exist and are cached (`PLAYERS_TTL_S`, `PROJECTIONS_TTL_S`), so this adds no new network shape and no new dependency.

**Done when:** returns a projection-ranked pool for a real league; a league with every skill player rostered returns an empty pool rather than an error; unknown league id returns the adapter's existing safe failure; unit tests cover full/partial/empty pools.

### S2 · Engine wiring

Extend `src/services/omen.js` so `waiver_pickup` is reachable for Sleeper, mirroring the guard shape PR #211 established for Yahoo:

- only after selected-context validation per the parent contract;
- only when no `start_sit` swap is available;
- only with a real OUT/IR starter on the selected roster (Sleeper exposes `injury_status` and `status` on the player record) and a real same-position available player;
- empty or failed availability returns no recommendation.

**Done when:** deterministic selection tests cover pick / no-pick / empty-pool / no-injured-starter; a live-mode test proves no mock or fixture pool can reach a live response; opaque provider errors and raw responses stay out of the envelope and logs.

### S3 · Live capability proof

Run S1 + S2 against a real Sleeper league and capture a sanitized capability-matrix row.

**Done when:** the matrix reads **Sleeper: live** with evidence that names no league id, user id, or username in a way that identifies a real person.

### S4 · Off-season honesty — founder decision required

Projections for 2026 week 1 exist, but `/state/nfl` reports `week: 0`. A July waiver recommendation is computable but not actionable.

Two acceptable resolutions:

- **(a)** Sleeper waiver goes live and routes to the existing off-season DecisionBrief state surface (one of the 8 shipped in M1-P P3) until the season opens.
- **(b)** Sleeper waiver stays dark until week 1 and the capability matrix records it as season-gated rather than unavailable.

Either way, preseason projections must be labeled as estimates and never presented with in-season confidence.

**This is a product call, not a technical one. Do not pick (a) or (b) unilaterally.**

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

1. **S1 → S2 → S3** — unblocked today.
2. **S4** — founder decision; can be answered in parallel, needed before S3 closes.
3. **E0** — founder-gated spike; blocks all of Phase E.
4. **Yahoo** — parked on external reapproval; no agent action available.

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
