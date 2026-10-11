# Omen call: league scope, HOLD call, ESPN trade (server side, 2026-10-11)

For the iOS lane. Server changes are additive within `omen-decision-brief.v3`; nothing a shipped client reads has changed meaning. Source of the problem: `Direction/2026-10-06-tuesday-beta-readiness.md` section 2b ("Omen call is not populated for every team").

## 1. Ask for a league, and see which one answered

`POST /api/omen/mvp-move` already accepted `context_id` in the JSON body. It now accepts any of these, in the **body or the query string** (body wins):

| Field | Meaning |
|---|---|
| `context_id` | the connection id the app already holds (unchanged) |
| `league_id` | the provider league id (Sleeper league id, ESPN league id, Yahoo league key) |
| `platform` | optional, `espn` / `sleeper` / `yahoo`; narrows `league_id`, or selects a platform on its own |

`league_id` may be any league the account plays in, not only the one bound on the connection row. The server asks the provider to confirm the league belongs to the account before serving it (same check the League overview uses). A requested league that is not the user's returns `state: "context_unavailable"` with `answered_for.matched = false`. It never falls back to a different league when one was asked for.

**iOS should send the picked league on every Omen call** (`league_id` + `platform`, or `context_id`). Sending nothing keeps the old behaviour: the account's selected league.

Every live response now carries:

```json
"answered_for": {
  "context_id": "…" | null,
  "platform": "espn", "league_id": "13338821", "team_id": "7",
  "selection": "requested" | "account_selected",
  "matched": true,
  "requested": { "context_id": null, "league_id": "13338821", "platform": "espn" }
}
```

Use it to fail safe: if `answered_for.league_id` is not the league on screen, do not render the call as that league's.

## 2. HOLD call (replaces "Nothing to recommend")

When no lineup swap, waiver pickup or trade clears the bar, the response is still `state: "empty"` (so a shipped client keeps its empty screen) and now also has:

```json
"call_kind": "hold",
"hold": {
  "kind": "hold",
  "headline": "Hold your lineup this week",
  "summary": "Hold your lineup. The best alternative Omen found does not beat what you already have by enough to be worth the risk.",
  "reasons": [ { "code": "best_swap_below_bar", "text": "Wes Receiver already projects 0.2 points above Ben Chwarmer (12 vs 11.8), so benching Wes Receiver would cost you." } ],
  "best_alternative": { "kind": "start_sit", "slot": "WR", "start": {"name": "…", "projected": 11.8}, "sit": {"name": "…", "projected": 12},
                        "delta": -0.2, "threshold": 0.5, "margin_to_threshold": 0.7, "why_not": "…" },
  "considered": [ { "kind": "start_sit|waiver_pickup|trade_suggestion",
                    "outcome": "below_threshold|none_found|unavailable|not_needed", "reason": "…optional code…", "detail": "…" } ],
  "projections": { "available": true, "players_with_projection": 14, "players_total": 16 },
  "threshold_points": 0.5
}
```

Rules the UI can rely on:
- Every number is one the engine computed (its own status-adjusted projections and its own 0.5-point lineup bar). `delta` is negative when the starter already projects higher.
- `best_alternative` is `null` when there is no eligible bench player or no projections. Do not invent a number in that case.
- `reasons` are ranked most decisive first; `considered` always lists the kinds that were weighed (`not_needed` for waivers when no starter is out).
- With no projections (Yahoo today) `projections.available` is `false`, the top reason code is `projections_unavailable`, `confidence` is null-banded and the `explanation` says Omen cannot rank a move. Render that as "Omen cannot rank a move for this league", not as a confident hold.
- A pre-draft league is not a hold; it keeps its existing `empty` explanation and has no `hold`.

`call_kind` is also set on a success (`start_sit`, `waiver_pickup`, `trade_suggestion`) so a client can branch on one field.

## 3. Trade as the Omen call, per provider

| Provider | Trade call | Why |
|---|---|---|
| Sleeper | yes (as before) | public league rosters carry projections |
| ESPN | **yes (new)** | `fetchEspnLeagueRosters` carries projections; starting slots read from the user's own lineup; missing display names filled from the warehouse identity crosswalk (#611, identity only, never a projection) |
| Yahoo | no, stated | Yahoo roster reads carry no projections. `hold.considered[trade_suggestion]` is `outcome: "unavailable"`, `reason: "projections_unavailable"`; no league-wide read is made |

A trade call is `recommendation.type = "trade_suggestion"` with `signals.trade_rosters.source` of `<platform>_league_rosters`. It is only chosen when a one-for-one improves both lineups and passes the VORP fairness guard (unchanged). Other `trade_suggestion` unavailable reasons (all in `hold.considered[].reason`): `rosters_unreadable`, `reauth_required`, `timed_out` (the extra read has a 1.5 s budget), `search_budget_exceeded`, `own_team_not_found`, `no_starting_slots`, `league_not_active`.

Still not built (iOS and product): the Omen tab renders start/sit only, and there is no path from a trade call into the Trade screens; Find a trade's entry point is a founder decision.

## Contract and tests

- Schema `test/contracts/schemas/omen-decision-brief.v3.schema.json` gained optional `call_kind`, `answered_for`, `hold`; lock updated with `node scripts/contracts.js lock` (no `--accept-breaking`).
- New fixtures `test/contracts/fixtures/omen-decision-brief.v3/empty_hold.json` and `empty_hold_noproj.json` (state `empty`). If the iOS contract test enumerates that directory, decode these too.
- Server tests: `test/omenHoldAndScope.test.js`, additions in `test/omenMvpLiveRoute.test.js` and `test/contractSchemas.test.js`.

## 4. Structured trade on a `trade_suggestion` call (additive)

`recommendation.trade` is now sent on every `trade_suggestion` call so iOS can stop parsing the `recommendation.move` sentence (`Offer X to TEAM for Y.`):

```json
"trade": {
  "partner_team_name": "South Stars",
  "partner_team_id": "other-roster" | null,
  "give":    [ { "name": "My RB",    "position": "RB", "player_key": "my-rb" | null } ],
  "receive": [ { "name": "Their WR", "position": "WR", "player_key": "their-wr" | null } ]
}
```

- Built from the same values as the sentence (`trade.opponent`, `trade.give`, `trade.receive`); nothing is invented. `partner_team_name` falls back to `"that team"` exactly as the sentence does.
- `partner_team_id` is the provider team/roster id as a string, or `null` when the provider row has none. `player_key` is `null` when the player has no key.
- Today `give` and `receive` hold one player each (one-for-one); they are arrays so packages can be added without a contract change. Render all entries.
- Optional and absent on `start_sit` / `waiver_pickup` / hold. Keep the sentence parse only as a fallback for older servers.
- Schema: `tradeStructure` in `test/contracts/schemas/omen-decision-brief.v3.schema.json`; lock extended without `--accept-breaking`.
