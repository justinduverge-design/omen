# B2-D3 Live Trade Capability — Sleeper v1

**Status:** Implementation plan for the trade half of GitHub issue #162
**Date:** 2026-08-01
**Owner:** Backend / canonical `POST /api/omen/mvp-move`
**Parent contract:** `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md` — selected-context verification, deterministic selection, and envelope rules are inherited from it and are not restated here.
**Sibling spec:** `Blueprints/specs/b2d-live-waiver-pool-sleeper-espn-v1.md` — same provider-split shape, same three-state season handling.
**Scope:** The opponent-roster surface and candidate evaluator for `trade_suggestion` on Sleeper.

## Decision

`trade_suggestion` is the last of the three decision types with no provider capability. `buildTradeCandidate()` (`src/services/omen.js:908`) returns `available: false` with `no_provider_capability` — correctly declared, never faked. B2-D4's selector already holds its slot and its tie-break position.

The capability matrix in the parent contract records, for all three providers, "no normalized opponent-roster trade candidate source." **For Sleeper that understates what the adapter already has.** `fetchSleeperRoster` (`src/adapters/sleeper.js:248`) fetches every roster and every user in the league on every call:

```js
const [rosters, users] = await Promise.all([
  getJson(`${BASE}/league/${leagueId}/rosters`),
  getJson(`${BASE}/league/${leagueId}/users`),
]);
```

It returns both arrays, then normalizes only the requesting user's roster. **The opponent data is already in hand and already discarded.** So B2-D3 for Sleeper needs no new endpoint, no new request shape, no credential, and no founder gate.

That splits trade by provider exactly as waiver was split:

| Provider | Trade status | Gate |
|---|---|---|
| Sleeper | buildable + live-verifiable now | none |
| Yahoo | unavailable | no normalized opponent-roster source; Yahoo API reapproval (external) |
| ESPN | unavailable | standings only, no opponent-roster surface; founder-gated cookies |

Yahoo and ESPN stay honestly unavailable, unchanged. This spec does not touch them.

## Verification basis — Sleeper

Established by the waiver work and re-confirmed by source inspection 2026-08-01:

| Input | Where it already comes from |
|---|---|
| Every team's roster | `GET /league/{id}/rosters` — already fetched in `fetchSleeperRoster` |
| Every team's owner | `GET /league/{id}/users` — already fetched in `fetchSleeperRoster` |
| Player metadata + fantasy eligibility | `fetchSleeperPlayers()`, cached (`PLAYERS_TTL_S`) |
| Weekly projections | `fetchSleeperProjections()`, cached (`PROJECTIONS_TTL_S`) |
| League roster slots + scoring | `fetchSleeperLeague()` — `roster_positions`, `scoring_settings` |
| League state (`pre_draft` / drafted) | `fetchSleeperLeague()` → `status`, proven necessary by waiver S3 |

No credentials. Every call is a public GET, same as the waiver pool.

## The valuation problem — read before implementing

Start/sit compares two projections. Waiver compares a pickup against the starter it replaces. **Trade is two-sided, and that changes what "good" means.**

A recommendation that only maximizes the user's gain is a fleece. It will not be accepted, so it is not a *move* — it is a fantasy. Issue #162 requires evidence-backed advice, and "your opponent would have to be asleep" is not evidence.

**Rule: only suggest a trade where both teams' projected starting lineup improves.** This is computable entirely from data already listed above:

1. Compute each team's optimal starting lineup under `roster_positions`, scored by weekly projection.
2. For a candidate 1-for-1 swap, recompute both teams' optimal lineups post-swap.
3. Keep the candidate only if **both** deltas are strictly positive.

Positional surplus makes this real rather than theoretical: a manager starting three RB-eligible players in two RB slots gains nothing from the third, while a manager with no startable TE gains a lot from one. The same swap can raise both lineups. That is the entire basis for suggesting it.

**`decisionScore` is the user's own lineup delta, in expected points gained this week** — the same unit `start_sit` and `waiver_pickup` already use (`src/services/omen.js:887`). The opponent's delta gates the suggestion but must never inflate the score; the selector ranks moves by what the *user* gains.

### Reconciling with the existing `tradeValue.js`

`src/services/tradeValue.js` already exists and already values trades — `playerValue`, `sideValue`, `compareTrade`, built on VORP and replacement-level adjusted projections (`src/services/vorp.js`). It is explicitly *"Pure functions only: no API calls, no Supabase, no auth."* **Do not duplicate it, and do not silently ignore it.**

They answer different questions, and both are needed:

| | `tradeValue.js` (VORP) | Lineup delta (this spec) |
|---|---|---|
| Unit | season-long asset value over replacement | expected points gained **this week** |
| Answers | "is this trade fair?" | "does my starting lineup get better?" |
| Fits `decisionScore` | ✗ wrong unit | ✓ required unit |

`decisionScore` **must** be the weekly lineup delta — the selector compares it directly against `start_sit` and `waiver_pickup` scores, which are weekly points (`src/services/omen.js:887`). VORP cannot fill that slot without making the three types incomparable.

But weekly delta alone is exploitable in the other direction: a swap can raise both lineups this week while the user gives away a far more valuable long-term asset. **Use `compareTrade` as a fairness guard, not as the score** — reject candidates where the user's VORP side-value loss is materially worse than the weekly gain justifies. Record the threshold as a named constant with a written rationale, not a magic number.

Note `tradeValue.js` carries its own `primaryPosition`, distinct from the adapter's `eligiblePositions`. Waiver S1 proved primary-position filtering is wrong for roster eligibility (the fullback case, 74 withheld players). Use `eligiblePositions` for *what may fill a slot*; `tradeValue`'s own notion stays internal to valuation.

**The public Trade Analyzer route stays separate** per the parent contract's non-goals. Sharing a pure valuation module is not the same as sharing the feature — no route, response shape, or user-facing surface is shared.

### Honesty constraints

- **Never fabricate an opponent, roster, asset, or value.** #162 states this directly. If any of the six inputs above is missing, return unavailable.
- **A suggestion is not a prediction of acceptance.** Copy must not imply the opponent has agreed or is likely to. Both-sides-improve is the floor for *proposing*, not a forecast.
- Preseason projections are estimates and carry no in-season confidence — the S4 ruling applies here unchanged.
- Keep opaque provider errors and raw payloads out of the envelope and the logs.

## Phase T — Sleeper

### T1 · Normalized opponent-roster surface

Add `fetchSleeperLeagueRosters(leagueId, week, season)` to `src/adapters/sleeper.js`, exported alongside `fetchSleeperAvailablePlayers`.

Returns every team in the league as a normalized record: opaque team identity (`roster_id` plus display name via `sleeperTeamName`), the team's players normalized through the existing `normalizePlayer` path, and the league's `roster_positions`.

Reuse, do not duplicate: `normalizePlayer`, `eligiblePositions`, `projectionFor`, and `sleeperTeamName` all exist. This function is an aggregation over data `fetchSleeperRoster` already retrieves — implement it so a single league fetch serves both the user's roster and the opponent set rather than issuing the pair of requests twice.

**Never expose a real person's identity.** Sleeper `users` carries `display_name` and `avatar`. The surface returns league-scoped team identity only; no username, user id, or avatar leaves the adapter. This mirrors the sanitization the waiver evidence already requires.

**Done when:** returns every team for a real drafted league with populated, projection-joined rosters; a `pre_draft` league returns teams with empty rosters rather than an error; unknown league id returns the adapter's existing safe failure; unit tests cover full / partial / empty roster arrays and the four-array union (`players`, `starters`, `reserve`, `taxi`) exactly as S1 established.

### T2 · Optimal-lineup evaluator

Add a pure function that, given a normalized roster and `roster_positions`, returns the projected optimal starting lineup and its total.

Must honor multi-eligibility and flex: Sleeper `roster_positions` includes `FLEX`, `SUPER_FLEX`, `REC_FLEX`, and `IDP` variants, and `eligiblePositions()` already decides what may fill a slot. Fill constrained slots before flex slots, or a flex slot will consume a player a dedicated slot needed.

Bench, IR, and taxi players count zero toward the lineup total but remain tradeable assets.

**Pure and independently testable** — no network, no adapter import. This is the piece most likely to harbor a silent scoring bug, so it gets its own test file and RED-first tests.

**Done when:** unit tests cover a straightforward lineup, a flex-contended lineup, super-flex, a roster too small to fill every slot, a roster with unprojected (null) players, and a case proving greedy flex-first assignment is rejected.

### T3 · Candidate evaluator

Add `buildTradeCandidate` logic replacing the current `available: false` stub, following the guard shape B2-D2 and S2 established:

- only after selected-context validation per the parent contract;
- only when neither `start_sit` nor `waiver_pickup` produced a candidate — trade is the most disruptive move and the tie-break order already says so;
- only for a **drafted, in-season or off-season** league; `pre_draft` returns unavailable, since a league with no rosters cannot have a trade;
- enumerate 1-for-1 swaps between the user's roster and each opponent roster;
- keep only candidates where **both** lineup deltas are strictly positive;
- rank by the user's delta; on an exact tie prefer the smaller positional disruption;
- empty candidate set returns `no_candidate`, not a filler suggestion.

**Scope boundary: 1-for-1 only in v1.** Multi-player and multi-asset packages are a combinatorial jump and a separate slice. Say so in the response rather than implying the engine considered packages it did not.

**Complexity note.** Naively this is (user roster × every opponent player × two lineup solves). For a 12-team league with ~15-player rosters that is ~2,700 candidate swaps and ~5,400 lineup solves. Bound it before it reaches a request path: skip swaps between players with no shared eligibility, skip opponent players who are not in that opponent's optimal lineup *and* not projected above the user's worst starter, and evaluate positions of need first. If the bound is still too slow against a real league, record the measurement and split the optimization into its own slice rather than shipping a slow route.

**Done when:** deterministic selection tests cover suggest / no-suggest / both-sides-negative / one-side-negative / pre-draft / empty-opponent-set; a live-mode test proves no mock, fixture, or stub roster can reach a live response; the response names the specific players, both deltas, and the evidence labels the parent contract requires.

### T4 · Live capability proof

Run T1–T3 against a real **drafted** Sleeper league and capture a sanitized capability-matrix row.

**This is the same gate that left waiver S3 open.** The 2026-07-26 league was `pre_draft`, every roster returned `players: []`, and nothing could be proven about roster contents. A pre-draft league cannot prove trade either — it has no assets to trade. Waiver S3 was later closed against league `1387633793615036416` (120 held player ids, zero leaks), so a drafted league is available; use one with populated rosters.

**Done when:** the matrix reads **Sleeper: live** for trade, with evidence naming no league id, user id, or username in a way that identifies a real person, and recording the measured candidate count and evaluation time.

## Phase Y / Phase E — unchanged

Yahoo and ESPN remain **unavailable** for trade. Neither exposes a normalized opponent-roster candidate surface, and ESPN additionally needs founder-held `espn_s2` / `SWID` cookies that agents do not handle. Nothing in this spec changes their rows; `buildTradeCandidate` must continue returning `no_provider_capability` for both.

If ESPN's B2-D-E1 waiver work later lands an authenticated multi-roster read, that is the point to revisit ESPN trade — not before.

## Non-goals

- The public user-initiated **Trade Analyzer stays separate**, per the parent contract's non-goals. This slice is canonical-Omen only.
- No multi-player packages, draft picks, FAAB, or dynasty-value modeling in v1.
- No SQL, schema, credential, provider configuration, dependency, deployment, or store work.
- No native/UI work — that is B2-D5, and it comes after this is proven.

## Acceptance evidence for issue #162

Landing T1–T4 closes the third decision type and lets the capability matrix report all three honestly:

| Decision type | Sleeper | Yahoo | ESPN |
|---|---|---|---|
| `start_sit` | live | live | live |
| `waiver_pickup` | live | availability-only (guarded) | unavailable |
| `trade_suggestion` | **live after T4** | unavailable | unavailable |

Remaining for #162 after this: **B2-D5** native handoff, and ESPN's founder-gated capability work.
