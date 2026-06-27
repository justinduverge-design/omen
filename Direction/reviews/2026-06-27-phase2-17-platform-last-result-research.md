# Phase 2.17 Platform Last-Result Research

## Research Question

How should Omen derive a connected fantasy platform team's most recent completed matchup result for the dashboard platform summary without exposing provider credentials or fabricating a win/loss?

## Layer

2-Omen.

## Constraints

- Free/open sources first.
- No package, env, SQL, migration, or production config changes.
- ESPN cookie values are never logged, displayed, echoed, or put in handoffs.
- Mock/live honesty: if a provider does not expose a safe completed matchup result, return `null`.

## Candidates Evaluated

### Sleeper Public API

- Availability: free public API.
- Auth required: none.
- Commercial ToS: already accepted as a founder risk for prior Sleeper work; this task does not expand beyond connected league reads.
- Pricing: free.
- Rate limits: no formal published quota; existing Omen Sleeper adapter has a process budget and Redis cache pattern.
- Data coverage: league rosters/users and weekly league matchups.
- Update frequency: provider live API.
- Technical complexity: easy.
- Maintenance risk: medium because rate/terms ambiguity remains.
- Score: 4/5.
- Notes: `GET /league/{league_id}/matchups/{week}` gives roster scores by `matchup_id`; comparing the connected user's roster against its opponent is enough for `W`/`L`. The fantasy matchup API does not provide an actual NFL kickoff timestamp, so `lastGameKickoff` remains `null`.

### Yahoo Fantasy Sports API

- Availability: official OAuth-backed Fantasy Sports API.
- Auth required: OAuth bearer token already stored via Vault in Omen.
- Commercial ToS: existing Omen Yahoo integration, no new credential class.
- Pricing: free with Yahoo access.
- Rate limits: not materially changed; one scoreboard lookup for previous week.
- Data coverage: league scoreboard/matchups and team points.
- Update frequency: provider live API.
- Technical complexity: medium because Yahoo JSON is deeply nested/positional.
- Maintenance risk: medium.
- Score: 4/5.
- Notes: `league/{league_key}/scoreboard;week={week}` is the lowest-scope source. Parser uses `winner_team_key` when present, otherwise compares points. Kickoff timestamp is not exposed by this fantasy matchup resource, so `lastGameKickoff` remains `null`.

### ESPN Fantasy v3 Private League API

- Availability: undocumented/private endpoint family already used by Omen's ESPN adapter.
- Auth required: ESPN cookies decrypted server-side from Vault.
- Commercial ToS: highest risk; do not expand response bodies, logging, or raw provider data.
- Pricing: free.
- Rate limits: unclear.
- Data coverage: league schedule/matchups via `mMatchup`.
- Update frequency: provider live API when cookies remain valid.
- Technical complexity: medium-hard due to undocumented schema drift.
- Maintenance risk: high.
- Score: 2/5.
- Notes: Reuse the existing `fantasy.espn.com/apis/v3/games/ffl/...` request path and only return normalized result fields. Do not log raw ESPN bodies or credential material. Kickoff timestamp is not present in the fantasy matchup schedule used here, so `lastGameKickoff` remains `null`.

## Ranked Summary

| Category | Winner | Runner-Up | Notes |
|---|---|---|---|
| Best open/free | Sleeper | Yahoo | Sleeper is easiest and public. |
| Best value | Yahoo | Sleeper | Yahoo is official and already OAuth-backed. |
| Best overall | Yahoo | Sleeper | ESPN remains compatibility-only/high-risk. |

## Actionable Recommendation

**Build against:** existing adapters only:

- Sleeper: `fetchSleeperMatchups()` + connected roster id.
- Yahoo: `YahooClient.getLeagueScoreboard()` + adapter parser.
- ESPN: existing v3 request helper with `mMatchup` + adapter parser.

**Skip:** any new third-party package, sports-data vendor, database table, cache layer, or client-side provider call.

**Phase 1 now:** Add `lastResult`, `lastGameId`, and `lastGameKickoff` to the existing `/api/dashboard/summary.platforms.*` shape. Fail closed to `null`.

**Phase 2 later:** If product needs a true NFL kickoff timestamp, add a separate schedule-source decision. Do not fake kickoff from fantasy matchup week.

## Implementation Notes for Codex

- Use previous regular-season week only; week 1 returns nulls because there is no prior matchup in the current season.
- Do provider lookup after the existing platform connection row check.
- Provider failures should warn with provider name only and should not fail the dashboard summary.
- ESPN response must not include raw cookie values, Vault ids, auth headers, or raw provider bodies.

## Approval Required

- No additional approval required for this additive, fail-closed contract.
- Any future ESPN scope expansion, paid provider, or production smoke using real cookies requires Justin approval.

## Sources Checked

- Sleeper API docs: https://docs.sleeper.com/
- Yahoo Fantasy Sports API guide: https://developer.yahoo.com/fantasysports/guide/
- Existing Omen ESPN adapter path: `src/adapters/espn.js`
- ESPN API community schema reference for private fantasy endpoint behavior: https://github.com/cwendt94/espn-api
