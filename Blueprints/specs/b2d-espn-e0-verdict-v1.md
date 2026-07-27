# B2-D · ESPN E0 Feasibility Spike — Verdict

**Run:** 2026-07-27, founder-authorized, founder's own authenticated browser session
**Protocol:** `Blueprints/specs/b2d-espn-e0-feasibility-spike-protocol-v1.md`
**Method:** Method 1 (browser console on the `fantasy.espn.com` origin). No cookie value was read, copied, transmitted, or stored at any point. The session was attached by the browser by origin.

## VERDICT: PARTIAL — E1 unblocked with one recorded extra step

Eleven of twelve observations are clean. **Observation 12 is unresolved**, and it is unresolvable on the leagues currently available — all three founder ESPN leagues are undrafted.

Per the protocol's decision rules, PARTIAL means E1 proceeds with the gap written down rather than assumed away.

## Observations

| # | Observation | Result |
|---|---|---|
| 1 | HTTP status | **200** |
| 2 | `res.type` | **`cors`** — not `opaqueredirect` |
| 3 | Round-trip time | **228 ms** at limit 50; **428 ms** at limit 500 |
| 4 | `players[]` at `limit: 50` | **50** |
| 5 | `x-total-count` header | **absent** (null) |
| 6 | Does `limit: 500` return more than 50? | **Yes — 500 returned** |
| 7 | Does `offset: 50` return a different set? | **Yes** — distinct leading player id |
| 8 | `player.eligibleSlots` present? | **Yes** |
| 9 | `player.injuryStatus` present? | **Yes** (`"ACTIVE"` on the sample) |
| 10 | Usable projection without a second request? | **Yes** — `stats[]` entry with `statSourceId: 1`, `statSplitTypeId: 1`, `scoringPeriodId: 1`, `seasonId: 2026`, `appliedTotal: 21.977` |
| 11 | Rate limit on 3 rapid re-runs? | **None observed** — 200/200/200 |
| 12 | Does `filterStatus` exclude rostered players? | **UNRESOLVED — see below** |

## The redirect question is settled

`res.type` came back `cors`, not `opaqueredirect`. The 2026-07-07 redirect problem that blocks `fantasy.espn.com/apis/v3/...` **does not affect** `lm-api-reads.fantasy.espn.com` for this view, with the two required headers already present in `makeEspnHeaders()`. This was the largest single risk to Phase E and it is now retired.

## Observation 12 — why it is unresolved

All three of the founder's ESPN leagues are undrafted:

| League | `latestScoringPeriod` | Teams joined | Teams with rosters | Total rostered players |
|---|---|---|---|---|
| A | 0 | 12 | 0 | **0** |
| B | 0 | 9 | 0 | **0** |
| C | 0 | 10 | 0 | **0** |

With zero rostered players league-wide, a filter that excludes rostered players and a filter that excludes nothing produce **identical output**. The run cannot distinguish them.

This is the same blind spot that left Sleeper S3 partially proven, for the same reason, discovered independently on a different provider. Worth noting as a pattern: **pre-season is structurally hostile to proving any roster-subtraction logic.**

Corroborating detail: the returned free agents carry `ownership.percentOwned` between **97.3 and 99.8**. In a drafted league those players would be universally rostered. Their presence is consistent with an undrafted league, not with a broken filter — but "consistent with" is not proof.

## Finding that changes the E1 design

**Every entry carries its own `onTeamId` and `status`.** Sample entry keys:

```
draftAuctionValue, droppedByEliminatedTeam, id, keeperValue, keeperValueFuture,
lineupLocked, onTeamId, player, ratings, rosterLocked, status, tradeLocked
```

All 50 returned entries had `onTeamId: 0` and `status: "FREEAGENT"`.

This means **E1 does not have to trust `filterStatus`.** It can verify per entry:

- `onTeamId === 0` → genuinely unrostered in this league
- `status === "FREEAGENT"` → ESPN's own classification

That is strictly stronger than Sleeper's approach. Sleeper has no server-side ownership flag at all, so S1 had to union four roster arrays and subtract client-side. ESPN hands us the answer per player — and gives us a second, independent field to cross-check it against.

**E1 must apply the `onTeamId` check regardless of what observation 12 eventually shows.** If `filterStatus` is reliable, the check is free. If it is not, the check is the thing that prevents offering a player another team already owns. Either way it is correct, and it removes observation 12 from the critical path.

## What E1 still needs

1. **`x-fantasy-filter` header support** in `makeEspnHeaders()` / `doEspnRequest` (`src/adapters/espn.js:268`, `:283`). Confirmed as a new request *shape*, not a new parameter. The existing no-query-logging posture (`path.split("?")[0]` at `:306`) must be preserved — the filter travels as a header, so nothing leaks via URL.
2. **`kona_player_info` view** added alongside the existing `mRoster` / `mTeam` / `mSettings` / `mMatchup`.
3. **Pagination**, since `x-total-count` is absent. Page at `limit: 500` until a short page returns. Do not assume a total.
4. **Projection extraction** from `stats[]` filtered to `statSourceId: 1` (projection, not actual) and the requested `scoringPeriodId`. `statSourceId: 0` is actuals and must never be presented as a projection.
5. **The `onTeamId !== 0` exclusion**, per above.

## Closing observation 12 later

Needs any ESPN league with populated rosters. The check is that players held by rival teams are absent from the pool — or, with the `onTeamId` guard in place, that no returned entry has a non-zero `onTeamId`.

Because the `onTeamId` guard makes the pool correct either way, **this is now a verification task, not a blocker.** It can close during the same drafted-league pass that closes Sleeper S3.

## Safety

- No `espn_s2` or `SWID` value was read, printed, logged, stored, or transmitted. Method 1 exists precisely so this line can be written truthfully.
- No league id, team name, or username appears in this document.
- All requests were read-only GETs against the founder's own account, with explicit authorization given in session on 2026-07-27.
- No writes, no roster changes, no transactions.

## Capability matrix

| Provider | Waiver status | Gate |
|---|---|---|
| Sleeper | built through S2; roster-subtraction proof pending a drafted league | none |
| Yahoo | fixture-verified (PR #211) | Yahoo API reapproval — external |
| ESPN | **feasible — free-agent pool obtainable, projections included, redirect risk retired** | E1 implementation; observation 12 verification |
