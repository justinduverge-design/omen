# B2-D ESPN Waiver Pool — Implementation Contract v1

**Status:** E1 and E2 locally verified; E3 provider proof pending
**Parent:** B2-D canonical Omen engine / GitHub issue #162
**Evidence basis:** `b2d-espn-e0-verdict-v1.md` and `b2d-espn-observation-12-resolution-protocol-v1.md`

## Goal

Make ESPN waiver recommendations eligible only when the selected ESPN context produces a normalized, projection-backed, ownership-verified free-agent pool. Never convert a missing or unsafe provider input into mock advice.

## Ordered slices

1. **B2-D-E1 — Adapter.** Add a pure normalized ESPN waiver-pool read in `src/adapters/espn.js` and fixture tests in `test/espnAdapter.test.js`.
2. **B2-D-E2 — Canonical wiring.** Call that adapter only for the selected ESPN context in `src/services/omen.js`; add service/route tests proving truthful live, unavailable, and selected-context behavior.
3. **B2-D-E3 — Provider proof.** Run the existing founder-executed drafted-league protocol and record sanitized aggregate proof only.

## E1 adapter requirements

- Use `kona_player_info` and send `x-fantasy-filter` as a request header, never in a logged URL.
- Request fantasy positions QB/RB/WR/TE/DST/K and status values `FREEAGENT` or `WAIVERS`.
- Page with `limit: 500` until the response page is short; do not assume `x-total-count` exists.
- Exclude every entry whose `onTeamId !== 0`; retain `status` as a cross-check rather than trusting the server filter alone.
- Extract only projected stats (`statSourceId: 1`) for the requested scoring period. Actual-stat rows (`statSourceId: 0`) are never projections.
- Return the existing normalized player fields expected by the Omen waiver evaluator, or an explicit unavailable/empty result. Never include ESPN cookies, raw provider payloads, league identifiers in logs, or cache keys derived from a cookie.

## E2 canonical requirements

- Preserve selected-context ownership validation before any provider call.
- Produce `waiver_pickup` only with eligible live ESPN roster and pool evidence; otherwise produce the existing honest unavailable/empty behavior.
- Do not modify the public Trade Analyzer, Yahoo/Sleeper behavior, SQL, dependencies, provider configuration, or mobile clients.

## E3 proof gate

The founder runs `b2d-espn-observation-12-resolution-protocol-v1.md` in a drafted ESPN league. The agent records counts/booleans only. No cookie, league ID, team name, username, or player list enters logs, source, or handoffs.

## Non-goals

No transaction, claim/drop action, trade surface, credential access, package install, migration, deployment, production setting, or mock fallback.
