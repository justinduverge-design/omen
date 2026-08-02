# B2-D Canonical Omen Context and Capability Contract v1

**Status:** Founder-priority implementation contract for GitHub issue #162
**Date:** 2026-07-21
**Owner:** Backend / canonical `POST /api/omen/mvp-move`
**Scope:** Selected-context correctness, provider capability truth, and the acceptance sequence for live Start/Sit, Waiver, and Trade selection.

## Decision

`POST /api/omen/mvp-move` remains the only proactive recommendation endpoint. A live request may select only a decision type whose required inputs are verified live for the authenticated user's selected context:

- `start_sit`
- `waiver_pickup`
- `trade_suggestion`

The server, not provider priority or a native client, owns context selection and eligibility. It must not choose the first usable Yahoo, Sleeper, or ESPN connection when the request names another context.

## Request contract

The live request gains this optional, forward-compatible field:

```json
{
  "context_id": "opaque platform_connections UUID"
}
```

- `context_id` identifies one active connection row owned by the authenticated user. It is not a credential and is never a provider token, ESPN cookie, or user identifier.
- The server queries it with both `id = context_id` and `user_id = authenticated user`. An absent, inactive, or foreign row returns the existing safe no-advice/recovery envelope; it must never fall back to another connection.
- The provider adapter then verifies that its normalized `team_key` matches the selected connection's stored team identity where one exists. A mismatch returns an opaque `context_mismatch` recovery/error envelope with `recommendation: null`.
- With no `context_id`, compatibility behavior is preserved temporarily: the server's existing default-selection policy may run. Native personalized surfaces must supply `context_id` once the safe context-list/provider-state contract exposes it.
- The response continues to echo only safe `platform`, `league`, and `team` summaries. It must never echo `context_id`, raw provider responses, token identifiers, cookies, or Vault identifiers.

## Deterministic selection

For one verified context, the engine computes candidates in this order of operations, not priority:

1. Build the selected team's normalized roster and verified league settings.
2. Build only provider capabilities that are available and live for that exact context.
3. Generate candidates for supported types.
4. Reject candidates with missing, mock, stub, stale, or cross-context inputs.
5. Choose the highest `decision_score`; use a documented stable tie-break order only after equal numeric scores.
6. If no eligible candidate remains, return an honest `empty` or provider-capability no-advice envelope. Do not substitute a different type merely to fill the screen.

Every selected recommendation carries `type`, move, why-it-matters, risk, confidence, and `signals` labels. The selected `league.id` and `team.id` are the verified context used for every input.

## Provider capability matrix — source audit, 2026-07-21

| Provider | Selected roster / Start-Sit | Live waiver pool | Opponent rosters / personalized trade | B2-D status |
| --- | --- | --- | --- | --- |
| Yahoo | Existing normalized roster fetch is live. | `getAvailablePlayers()` plus waiver normalization exists; player projections may be absent, so a recommendation requires sufficient live evidence and cannot use the optimizer mock fallback. | League standings exists, but this audit found no normalized opponent-roster trade candidate source. | Start/Sit and a guarded Yahoo-waiver slice may proceed after context tests. Trade is unavailable. |
| Sleeper | Existing adapter builds the authenticated user's normalized roster with league settings and projections. | Live normalized free-agent/waiver pool is available for evidence-backed candidates. | `fetchSleeperLeagueRosters()` returns a sanitized all-team surface; a deterministic one-for-one evaluator requires both optimized lineups to improve and applies the existing VORP fairness guard. | Start/Sit, waiver, and trade are live for the selected Sleeper context; public drafted-league proof is recorded without a league, user, or manager identifier. |
| ESPN | Existing adapter builds the selected authenticated roster using server-side credentials and optional team ID. | No normalized free-agent/waiver-pool capability exists. | Adapter exposes standings but no normalized opponent-roster trade candidate surface. | Start/Sit only; waiver/trade unavailable pending provider feasibility and dedicated adapter work. |

This matrix is source evidence, not a claim of real-account production verification. Real-account capability proof remains required before any provider is called production-ready for a new decision type.

## Acceptance matrix and PR order

| Slice | Required acceptance evidence | Allowed result |
| --- | --- | --- |
| B2-D1 context | Multi-league tests prove an owned requested `context_id` drives the adapter call and response; foreign, inactive, missing, and adapter/team mismatch contexts produce no advice; legacy no-context behavior remains covered. | Context-safe Start/Sit only. |
| B2-D2 Yahoo waiver | Live Yahoo roster + live available-player pool + usable evidence produce one `waiver_pickup`; unavailable/empty/insufficient inputs return no advice and never the optimizer mock fixture. Selected context drives both calls. | Yahoo-only guarded waiver. |
| B2-D3 trade capability | Per-provider adapter contract proves selected roster, opponent roster, league settings, and deterministic candidate inputs. Missing any input returns an explicit unavailable state. | No trade recommendation before proof. |
| B2-D4 selector | Unit tests cover deterministic Start/Sit/Waiver/Trade candidate ranking, stable ties, and no fallback when the winning candidate's required live signal is missing. | Canonical route selects only honest live candidates. |
| B2-D5 native handoff | Native/API contract renders each returned type, all signal labels, selected context, empty/unavailable/recovery states, and no mock-as-live state. | UI integration only after the backend slices are proven. |

## Non-goals and gates

- No SQL/schema migration, credentials, provider configuration, packages, deployment, production data mutation, or store work.
- The public user-initiated Trade Analyzer remains separate.
- `GET /api/optimizer/waiver` currently has a mock fallback and is not evidence that canonical live Omen may use one.
- ESPN remains subject to the approved native/provider feasibility rules.
- Any new provider-state/context-list response must expose opaque safe identifiers only and needs its own M0-BE contract and privacy review.
