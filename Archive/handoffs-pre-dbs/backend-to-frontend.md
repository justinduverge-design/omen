# Backend to Frontend Handoff

## Current Project Snapshot - 2026-05-18

Corvus is in Phase 4 locally: live Omen polish plus platform reconnection flow.

Completed local backend contracts:

- `GET /api/session`
- `GET /api/dashboard/summary`
- `POST /api/draft-assistant/recommendations`
- `GET /api/optimizer/waiver`

Frontend wiring completed locally by Claude Code:

- `ProtectedRoute.jsx` checks `GET /api/session` after Supabase session resolution.
- `Football.jsx` uses `GET /api/dashboard/summary` for platform/tool state.
- `DraftAssistant.jsx` calls `POST /api/draft-assistant/recommendations` and relies on server `is_mock`.
- Trade Analyzer and Start/Sit use shared error/empty states.
- Omen of the Week handles null live Yahoo delta values.

Verification:

- Backend `npm test`: 139 tests / 0 failures.
- Frontend `npm run build`: passed after 3A/3B/3C wiring.
- Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.

Next frontend-safe integration targets:

- Wire `WaiverWire.jsx` to `GET /api/optimizer/waiver` without a platform selector.
- Add live Omen attribution such as `Live · Yahoo` when `mode === "live"` and `is_mock === false`.
- Add Yahoo token-expired/re-auth recovery UI.
- Revisit landing page CTA now that usable tools exist locally.
- Fix Start/Sit signal rendering for string weights (`high | medium | low`).

---

## Feature: Phase 4/5 Contract Gap Resolution

### Status

Implemented locally by Codex on 2026-05-19.

Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.

### Dashboard Summary Token Expired Status

`GET /api/dashboard/summary`

When an active Yahoo connection has an expired stored OAuth access token, the Yahoo platform object now returns:

```json
{
  "platforms": {
    "yahoo": {
      "connected": false,
      "league_id": "449.l.123",
      "status": "token_expired"
    }
  }
}
```

Normal connected Yahoo responses still omit `status` and keep:

```json
{
  "connected": true,
  "league_id": "449.l.123"
}
```

Frontend guidance: read `summary.platforms.yahoo.status === "token_expired"` for the reconnect banner. This detection is based on stored `token_expires_at` metadata. A remotely revoked token can still first surface from a Yahoo route as a `401` until the stored connection state is refreshed.

### Omen Root Scoring Format

`GET /api/omen-of-the-week`

Mock, live empty, and live recommendation responses now include root:

```json
{
  "season": 2026,
  "week": 1,
  "scoring_format": "PPR"
}
```

Current value is `"PPR"` because Omen v1 does not yet accept a user scoring-format override.

### ADP Response Shape Confirmed

`GET /api/draft-assistant/adp?format=half-ppr&teams=12`

Confirmed fields:

- root `is_mock`
- root `format`
- root `teams`
- `sources.ffc.players`
- `sources.yahoo.players`
- `sources.mfl.players`

Mock ADP remains clearly labeled with `is_mock: true`.

### Start/Sit Signal Weights Confirmed

`POST /api/start-sit`

Confirmed `signals[].weight` is string-based:

```json
{
  "label": "Projection edge",
  "value": "+3.5 pts",
  "weight": "high"
}
```

Allowed values remain `high`, `medium`, and `low`.

### Verification

Targeted backend tests passed:

```text
node --test test/dashboardSummary.test.js test/systemRoutes.test.js test/omen.test.js test/draftAssistantAdpRoute.test.js test/optimizer.test.js
```

Result: 23 tests / 0 failures.

---

## Feature: Draft Assistant ADP Ingestion

### Status

Implemented locally by Codex on 2026-05-19.

Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.

Mock-first behavior is active locally. Non-production environments or missing Redis return clearly labeled mock ADP data with five fictional/example players per source.

### Endpoint: Draft Assistant ADP

`GET /api/draft-assistant/adp?format=half-ppr&teams=12`

Auth required: no.

Bearer token behavior: optional. In production live mode, a valid connected Yahoo user token lets the Yahoo source refresh/fetch live Yahoo ADP. Without a usable Yahoo OAuth token, the Yahoo source may remain empty until cache is populated; FFC and MFL do not require auth.

Query parameters:

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `format` | `half-ppr`, `half_ppr`, `ppr`, `standard` | no | Defaults to `half-ppr`; response normalizes `half_ppr` to `half-ppr` |
| `teams` | integer 1-20 | no | Defaults to `12` |

Live response shape:

```json
{
  "is_mock": false,
  "format": "half-ppr",
  "teams": 12,
  "sources": {
    "ffc": {
      "fetched_at": "2026-05-19T00:00:00.000Z",
      "attribution": "Fantasy Football Calculator",
      "attribution_url": "https://fantasyfootballcalculator.com",
      "players": [
        {
          "name": "Player Name",
          "position": "RB",
          "team": "BUF",
          "adp": 14.2,
          "player_id": "ffc_123"
        }
      ]
    },
    "yahoo": {
      "fetched_at": "2026-05-19T00:00:00.000Z",
      "attribution": "Yahoo ADP",
      "players": [
        {
          "name": "Player Name",
          "position": "WR",
          "team": "KC",
          "adp": 22.7,
          "player_id": "yahoo_449.p.123"
        }
      ]
    },
    "mfl": {
      "fetched_at": "2026-05-19T00:00:00.000Z",
      "attribution": "MyFantasyLeague",
      "players": [
        {
          "name": "Player Name",
          "position": "QB",
          "team": "DAL",
          "adp": 48.1,
          "player_id": "mfl_12345"
        }
      ]
    }
  }
}
```

Mock response shape:

```json
{
  "is_mock": true,
  "format": "half-ppr",
  "teams": 12,
  "note": "Mock ADP data - live ADP ingestion requires production Redis and source availability.",
  "sources": {
    "ffc": {
      "fetched_at": "2026-05-19T00:00:00.000Z",
      "attribution": "Fantasy Football Calculator",
      "attribution_url": "https://fantasyfootballcalculator.com",
      "players": [
        {
          "name": "Sample RB1",
          "position": "RB",
          "team": "EXA",
          "adp": 8.2,
          "player_id": "ffc_mock_1"
        }
      ]
    },
    "yahoo": {
      "fetched_at": "2026-05-19T00:00:00.000Z",
      "attribution": "Yahoo ADP",
      "players": [
        {
          "name": "Sample RB1",
          "position": "RB",
          "team": "EXA",
          "adp": 8.2,
          "player_id": "yahoo_mock_1"
        }
      ]
    },
    "mfl": {
      "fetched_at": "2026-05-19T00:00:00.000Z",
      "attribution": "MyFantasyLeague",
      "players": [
        {
          "name": "Sample RB1",
          "position": "RB",
          "team": "EXA",
          "adp": 8.2,
          "player_id": "mfl_mock_1"
        }
      ]
    }
  }
}
```

Every source returns five mock players in mock mode. The mock player names are intentionally shared across FFC, Yahoo, and MFL so local ADP chips can exact-match Draft Assistant mock recommendations. Player objects intentionally use fictional/example names and only expose:

```json
{
  "name": "string",
  "position": "string",
  "team": "string",
  "adp": 14.2,
  "player_id": "string"
}
```

### Source Behavior

FFC:

- Server fetches `https://fantasyfootballcalculator.com/api/v1/adp/{format}?teams={teams}&year={year}`.
- Supported formats: `half-ppr`, `ppr`, `standard`.
- Numeric values are used as returned.
- Cache key: `adp:ffc:{format}:{teams}:{year}`.
- Cache TTL: 23 hours.
- Attribution is included in the API response as required.

Yahoo:

- Uses the existing Yahoo OAuth adapter and authenticated Yahoo client when a bearer token maps to a connected Yahoo account.
- Fetches and caches the season game key via `games;game_codes=nfl;seasons={year}`.
- Fetches Phase 1 player coverage only: top 200 player keys, paged at 25 players per page.
- Enforces the Yahoo hard limit of max 25 player keys per `draft_analysis` request.
- Parses Yahoo numeric strings with `parseFloat()`.
- Cache key: `adp:yahoo:{year}`.
- Game key cache: `adp:yahoo:game_key:{year}`.
- Cache TTL: 6 hours for ADP, 180 days for season game key.
- OAuth scope note: current Yahoo OAuth requests `openid fspt-r`; Yahoo ADP/game/player calls need Yahoo Fantasy Sports read scope (`fspt-r`). No cookie-based Yahoo auth is used.

MFL:

- Server-side only. Frontend should never call or display MFL API URLs.
- Fetches public ADP and player-details exports from `api.myfantasyleague.com`.
- Joins ADP rows to MFL player details by MFL internal player id.
- Parses string numeric values with `parseFloat()` / `parseInt()` where applicable.
- Cache key: `adp:mfl:{teams}:{year}`.
- Cache TTL: 24 hours.

### Error And Fallback Behavior

- Invalid `format`: `400 { "error": "format must be one of ppr, half-ppr, standard" }`
- Invalid `teams`: `400 { "error": "teams must be an integer between 1 and 20" }`
- Non-production env: returns mock response with `is_mock: true`.
- Missing Redis: returns mock response with `is_mock: true`.
- Live source/cache failure: returns mock response with `is_mock: true`.

### Files

- `src/routes/draftAssistant.js`
- `src/services/adp.js`
- `src/services/yahoo.js`
- `test/adpService.test.js`
- `test/draftAssistantAdpRoute.test.js`
- `test/draftAssistant.test.js`

### Frontend Usage

```js
apiFetch("/api/draft-assistant/adp?format=half-ppr&teams=12");
```

Use top-level `is_mock` as the source of truth for mock labeling. Do not present mock ADP as live draft data.

---

## Feature: Omen of the Week MVP Backend Contracts

### Status

Mock endpoint ready. Live Yahoo roster-backed lineup-swap path ready locally.

Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.

These endpoints are intentionally frontend-safe so Claude can build the Omen UI without waiting on every fantasy platform integration. Authenticated live-mode requests now return either stable empty states or a live Yahoo lineup-swap recommendation when normalized roster data produces a lineup edge.

---

## Feature: Corvus App Backbone Endpoints

### Status

Implemented locally by Codex on 2026-05-18.

Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.

Verification: `npm test` passes with 139 tests / 0 failures.

### Endpoint: Session Shell

`GET /api/session`

Auth required: no. Bearer token accepted when present.

Behavior:

- No bearer token: returns unauthenticated shell.
- Valid bearer token: returns authenticated user id/email.
- Invalid or expired bearer token: returns unauthenticated shell, not `401`.

Unauthenticated response:

```json
{
  "authenticated": false,
  "user": null,
  "contract_version": "session.v1"
}
```

Authenticated response:

```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "contract_version": "session.v1"
}
```

### Endpoint: Dashboard Summary

`GET /api/dashboard/summary`

Auth required: yes, Supabase bearer token.

Purpose: authenticated app-shell summary for platform connection state and tool availability.

Response:

```json
{
  "contract_version": "dashboard-summary.v1",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "is_mock": false,
  "platforms": {
    "yahoo": { "connected": true, "league_id": "449.l.123" },
    "sleeper": { "connected": true, "username": "sleepy" },
    "espn": { "connected": false }
  },
  "tools": {
    "draft_assistant": { "available": true, "mode": "free", "status": "ready" },
    "omen_of_the_week": { "available": true, "mode": "live", "status": "ready" },
    "start_sit": { "available": true, "mode": "free", "status": "ready" },
    "trade_analyzer": { "available": true, "mode": "free", "status": "ready" },
    "waiver_wire": { "available": true, "mode": "pro", "status": "ready" }
  }
}
```

Status rules:

- `platforms.yahoo.status: "token_expired"` when an active Yahoo row has expired stored OAuth token metadata.
- `omen_of_the_week.status: "needs_platform"` when no active platform rows exist.
- `omen_of_the_week.status: "pending_live_engine"` when a platform is connected but no usable Yahoo league is linked.
- `omen_of_the_week.status: "ready"` when a usable Yahoo league is linked.
- `waiver_wire.status: "needs_platform"` without a usable Yahoo league.
- `waiver_wire.status: "needs_subscription"` with Yahoo linked but no Pro subscription.
- `waiver_wire.status: "ready"` with Yahoo linked and Pro subscription active.

### Endpoint: Draft Assistant Recommendations

`POST /api/draft-assistant/recommendations`

Auth required: no.

Confirmed frontend fetch path from `frontend/src/pages/DraftAssistant.jsx`:

```js
apiFetch('/api/draft-assistant/recommendations', {
  method: 'POST',
  body: {
    scoring_format: scoringFormat,
    draft_position: Number(draftPosition) || 5,
    round: Number(round) || 1,
    position_needs: [...needs],
  },
});
```

Mock-only response. `is_mock` is always `true` and `mode` is always `"mock"` until a live draft engine exists.

Response:

```json
{
  "feature": "draft_assistant",
  "status": "mock_ready",
  "mode": "mock",
  "is_mock": true,
  "contract_version": "draft-assistant-recommendations.v1",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "scoring_format": "ppr",
  "draft_position": 5,
  "round": 1,
  "position_needs": ["RB", "WR"],
  "note": "Mock recommendations — live Draft Assistant requires session + platform data.",
  "recommendations": [
    {
      "rank": 1,
      "name": "Sample RB1",
      "position": "RB",
      "team": "EXA",
      "player": { "name": "Sample RB1", "position": "RB", "team": "EXA" },
      "recommendation_type": "roster_fit",
      "headline": "Secure the sample lead back before the value tier breaks",
      "rationale": "Mock roster context shows RB as a selected need, so this example back gets the strongest VORP-adjusted fit.",
      "reasoning": [
        "Mock roster context shows RB as a selected need, so this example back gets the strongest VORP-adjusted fit."
      ],
      "confidence_score": 84,
      "risk_level": "low",
      "vorp_score": 18.6
    }
  ]
}
```

Frontend usage:

- Existing `DraftAssistant.jsx` can continue reading `recommendations`, `rank`, `player`, `recommendation_type`, `headline`, `reasoning`, `confidence_score`, and `risk_level`.
- Top-level `name`, `position`, `team`, `vorp_score`, and `rationale` are also included for the backend contract requested by Justin.
- Player names are intentionally fictional/example names.

### Endpoint: Waiver Wire Optimizer

`GET /api/optimizer/waiver?week={n}`

Auth required: yes, Supabase bearer token plus Pro subscription.

This is the new singular, platform-centric endpoint. It does not require `leagueKey`; it infers the first active usable Yahoo league from `platform_connections`.

Query parameters:

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `week` | integer 1-18 | no | Defaults to current roster week when omitted |
| `scoringFormat` | `ppr`, `half_ppr`, `standard` | no | Defaults to `ppr` |

Live response:

```json
{
  "week": 3,
  "platform": "yahoo",
  "pool_size": 50,
  "is_mock": false,
  "recommendations": [
    {
      "name": "Player Name",
      "position": "RB",
      "team": "BUF",
      "projected_points": 12.4,
      "vorp_delta": 4.1,
      "reason": "Adds RB depth against your weakest starter baseline with a +4.10 VORP edge.",
      "available": true
    }
  ],
  "generated_at": "2026-05-18T00:00:00.000Z"
}
```

Mock fallback response:

```json
{
  "week": 3,
  "platform": "yahoo",
  "pool_size": 0,
  "is_mock": true,
  "note": "Player availability API not connected. Returning mock waiver candidates for UI integration.",
  "recommendations": [
    {
      "name": "Mock RB Pickup",
      "position": "RB",
      "team": "EXA",
      "projected_points": 11,
      "vorp_delta": 3.5,
      "reason": "Mock: high-volume back in a favorable matchup. Addresses your weakest roster spot.",
      "available": true
    }
  ],
  "generated_at": "2026-05-18T00:00:00.000Z"
}
```

Error responses:

- `400` invalid week: `{ "error": "week must be between 1 and 18" }`
- `400` no usable Yahoo league: `{ "error": "Yahoo league connection required" }`
- `401` missing/invalid bearer token: handled by `requireAuth`
- `401` Yahoo token expired: `{ "error": "Yahoo token expired - re-authenticate" }`
- `402` no Pro subscription: handled by `requireSubscription`

Mock behavior:

- If Yahoo available-player fetch throws a non-token error, the route returns mock fallback with `is_mock: true`.
- If Yahoo available-player normalization returns no players, the route returns mock fallback with `is_mock: true`.
- Live responses use `is_mock: false` and omit the `note` field.

### Environment Note

`.env.example` now documents:

```env
# Set to "true" to show the ESPN connection card in the frontend.
# Must also be passed as a Docker build arg via deploy.yml.
# Leave unset or set to "" to keep ESPN hidden.
VITE_ESPN_ENABLED=
```

---

### Endpoint: Health

`GET /api/health`

Auth required: no

Response:

```json
{
  "status": "ok",
  "service": "ssffmvp-api",
  "uptime": 12.34,
  "timestamp": "2026-05-18T00:00:00.000Z",
  "contract_version": "system-health.v1"
}
```

### Endpoint: Omen of the Week

`GET /api/omen-of-the-week`

Auth behavior:

- No auth: deterministic mock preview data.
- `?preview=mock`: deterministic mock preview data, even when an auth token is present.
- Bearer token present: validated live-mode response.

Status:

- Mock preview ready.
- Live empty-state shell ready.
- Live Yahoo roster-backed lineup-swap recommendations ready when the user has a usable Yahoo `league_id` and the optimizer finds an edge.
- Sleeper, ESPN, Yahoo placeholder league ids, and no-edge Yahoo rosters return `connected_platform_pending_live_engine`.

Response shape:

```json
{
  "feature": "omen_of_the_week",
  "status": "mock_ready",
  "mode": "mock",
  "is_mock": true,
  "contract_version": "2026-05-18.omen-mock.v1",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "season": 2026,
  "week": 1,
  "scoring_format": "PPR",
  "recommendation": {
    "id": "mock-omen-lineup-swap-001",
    "move_type": "lineup_swap",
    "priority": "high",
    "headline": "Start the higher-floor flex option",
    "summary": "The mock model prefers the safer flex play because the projected point edge is meaningful and the bench alternative carries more role volatility.",
    "confidence_score": 78,
    "confidence_label": "strong lean",
    "risk_level": "medium",
    "primary_action": {
      "type": "start_sit",
      "roster_slot": "FLEX",
      "start": {
        "player_key": "mock:wr-starter-candidate",
        "name": "Sample WR Starter",
        "position": "WR",
        "team": "EXA",
        "opponent": "OPP",
        "projected_points": 14.2,
        "status": "active"
      },
      "sit": {
        "player_key": "mock:rb-bench-candidate",
        "name": "Sample RB Bench",
        "position": "RB",
        "team": "SAM",
        "opponent": "DEF",
        "projected_points": 10.4,
        "status": "questionable"
      },
      "projected_points_delta": 3.8
    },
    "impact": {
      "projected_points_delta": 3.8,
      "win_probability_delta": 4.2,
      "floor_delta": 2.1,
      "ceiling_delta": -0.6
    },
    "reasoning": [
      "Projection edge favors the starter candidate by 3.8 points.",
      "The bench candidate is tagged questionable, so the floor is lower than the raw projection suggests.",
      "The recommendation is a disciplined weekly edge, not a guaranteed outcome."
    ],
    "evidence": [
      {
        "label": "Projection edge",
        "value": "+3.8 pts",
        "weight": "high"
      }
    ],
    "alternatives": [
      {
        "id": "mock-omen-waiver-001",
        "move_type": "waiver_pickup",
        "headline": "Monitor the top available RB depth add",
        "confidence_score": 61,
        "risk_level": "medium"
      }
    ],
    "disclaimer": "Mock data for frontend integration only. Do not present this as live fantasy advice."
  }
}
```

Frontend guidance:

- Treat `mode: "mock"` and `is_mock: true` as the source of truth for mock labeling.
- Treat `mode: "live"` and `is_mock: false` as the source of truth for live rendering.
- In live mode, `recommendation: null` is valid and should render the existing empty state.
- In live mode, non-null `recommendation` is real backend output; remove preview labeling.
- Use `recommendation.headline`, `summary`, `confidence_score`, `risk_level`, `primary_action`, `impact`, `reasoning`, `evidence`, and `alternatives`.
- Do not show the disclaimer as a scary warning in the main UI. It is a product safety note for integration.

Live empty response examples:

```json
{
  "feature": "omen_of_the_week",
  "status": "needs_platform_connection",
  "mode": "live",
  "is_mock": false,
  "contract_version": "2026-05-18.omen-live.v1",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "season": 2026,
  "week": null,
  "scoring_format": "PPR",
  "recommendation": null,
  "empty_state": {
    "code": "needs_platform_connection",
    "message": "Connect Yahoo, Sleeper, or ESPN before a personalized Omen can be generated.",
    "connected_platforms": []
  }
}
```

```json
{
  "feature": "omen_of_the_week",
  "status": "connected_platform_pending_live_engine",
  "mode": "live",
  "is_mock": false,
  "contract_version": "2026-05-18.omen-live.v1",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "season": 2026,
  "week": null,
  "scoring_format": "PPR",
  "recommendation": null,
  "empty_state": {
    "code": "connected_platform_pending_live_engine",
    "message": "A fantasy platform is connected, but live Omen v1 currently supports Yahoo roster-backed recommendations first.",
    "connected_platforms": [
      {
        "platform": "sleeper",
        "league_id": "league-1",
        "username": "sleepy"
      }
    ]
  }
}
```

Live success response example:

```json
{
  "feature": "omen_of_the_week",
  "status": "live",
  "mode": "live",
  "is_mock": false,
  "contract_version": "2026-05-18.omen-live.v1",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "season": 2026,
  "week": 4,
  "scoring_format": "PPR",
  "source": {
    "platform": "yahoo",
    "league_id": "449.l.123",
    "team_key": "449.l.123.t.7",
    "roster_source": "yahoo",
    "connected_platforms": [
      {
        "platform": "yahoo",
        "league_id": "449.l.123",
        "username": null
      }
    ]
  },
  "recommendation": {
    "id": "live-omen-lineup-swap-449.p.2",
    "move_type": "lineup_swap",
    "priority": "high",
    "headline": "Start Live Bench Edge over Risky Starter",
    "summary": "Start Live Bench Edge over Risky Starter in the FLEX slot. The optimizer sees a 5.25 point edge from the normalized Yahoo roster.",
    "confidence_score": 92,
    "confidence_label": "strong lean",
    "risk_level": "low",
    "primary_action": {
      "type": "start_sit",
      "roster_slot": "FLEX",
      "start": {
        "player_key": "449.p.2",
        "name": "Live Bench Edge",
        "position": "WR",
        "team": "SAM",
        "opponent": "DEF",
        "projected_points": 13.75,
        "status": "active"
      },
      "sit": {
        "player_key": "449.p.1",
        "name": "Risky Starter",
        "position": "RB",
        "team": "EXA",
        "opponent": "OPP",
        "projected_points": 10,
        "status": "questionable"
      },
      "projected_points_delta": 5.25
    },
    "impact": {
      "projected_points_delta": 5.25,
      "win_probability_delta": null,
      "floor_delta": null,
      "ceiling_delta": null
    },
    "reasoning": [
      "Live Bench Edge projects 5.25 pts higher than Risky Starter.",
      "Live Omen v1 uses normalized roster data and deterministic optimizer math before any LLM enhancement."
    ],
    "evidence": [
      {
        "label": "Projection edge",
        "value": "+5.25 pts",
        "weight": "high"
      },
      {
        "label": "Roster slot",
        "value": "FLEX",
        "weight": "medium"
      }
    ],
    "alternatives": [],
    "disclaimer": "Live Yahoo roster data. Projections and injury tags depend on the currently normalized platform payload."
  }
}
```

### Endpoint: Platform Status

`GET /api/platform-status`

Auth required: no

Purpose: public backend readiness and dependency status for the app shell.

This is not the user-specific platform connection endpoint. For connected Yahoo/Sleeper/ESPN account state, use the existing authenticated endpoint:

`GET /api/platforms/status`

That authenticated endpoint now returns both the legacy top-level shape and a `connections` wrapper:

```json
{
  "yahoo": {
    "connected": false,
    "platform": "yahoo"
  },
  "sleeper": {
    "connected": true,
    "platform": "sleeper",
    "username": "sleepy"
  },
  "espn": {
    "connected": false,
    "platform": "espn"
  },
  "connections": {
    "yahoo": {
      "connected": false,
      "platform": "yahoo"
    },
    "sleeper": {
      "connected": true,
      "platform": "sleeper",
      "username": "sleepy"
    },
    "espn": {
      "connected": false,
      "platform": "espn"
    }
  }
}
```

Response shape:

```json
{
  "status": "ok",
  "service": "ssffmvp-api",
  "mode": "contract_ready",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "contract_version": "platform-status.v1",
  "endpoints": {
    "health": {
      "method": "GET",
      "path": "/api/health",
      "auth_required": false,
      "status": "ready"
    },
    "omen_of_the_week": {
      "method": "GET",
      "path": "/api/omen-of-the-week",
      "auth_required": false,
      "status": "mock_ready"
    },
    "user_platform_connections": {
      "method": "GET",
      "path": "/api/platforms/status",
      "auth_required": true,
      "status": "ready"
    }
  },
  "platforms": {
    "yahoo": {
      "status": "adapter_ready",
      "auth": "oauth2",
      "normalized_roster": true
    },
    "sleeper": {
      "status": "adapter_ready",
      "auth": "username_lookup",
      "normalized_roster": true
    },
    "espn": {
      "status": "adapter_ready_feature_gated",
      "auth": "vault_encrypted_cookies",
      "normalized_roster": true
    }
  },
  "dependencies": {
    "supabase": {
      "status": "configured",
      "required": true
    },
    "redis": {
      "status": "configured",
      "required": false
    },
    "openweather": {
      "status": "not_configured",
      "required": false
    },
    "llm": {
      "status": "configured_private",
      "model": "gemma3:4b",
      "timeout_ms": 30000,
      "public_url_exposed": false,
      "note": "Ollama must remain private or firewall-restricted; this endpoint never returns LLM_BASE_URL."
    }
  }
}
```

### Environment Notes

No new required environment variables were added for the mock Omen endpoint or live Omen Yahoo mapping.

Updated `.env.example` to clarify:

- `LLM_BASE_URL` must point to a private or firewall-restricted Ollama path.
- The public mock Omen endpoint needs no secrets.

### Backend Notes

- The existing authenticated `GET /api/platforms/status` route remains backward-compatible and now also includes `connections`.
- The existing Pro-gated `POST /api/optimizer/mvp-move` route remains unchanged.
- The mock endpoint uses sample player names and must not be treated as live fantasy advice.
- Authenticated live-mode Omen does not return Vault secret IDs, cookies, LLM base URLs, or platform tokens.
- Live Omen v1 does not call Ollama directly; it uses deterministic roster optimizer math and remains CPU/LLM safe.
- Current verification: `npm test` passes with 139 tests / 0 failures.

---

## Feature: Start/Sit with LLM Reasoning (Enhanced)

### Status

Implemented locally. Existing fields preserved.

The `POST /api/start-sit` endpoint exists and returns `winner`, `pointsDelta`, `recommendation`, `explanation`, and `signals`. The `explanation` field may be `null` when Gemma/Ollama is unavailable, but `signals` are always populated from deterministic math/status context.

### Endpoint: Start/Sit

`POST /api/start-sit`

Auth required: no (free feature, bearer token accepted but not enforced)

Request body:

```json
{
  "playerA": {
    "name": "Player Name",
    "position": "WR",
    "projected_points": 14.2,
    "status": "active"
  },
  "playerB": {
    "name": "Other Player",
    "position": "WR",
    "projected_points": 10.4,
    "status": "questionable"
  }
}
```

Required fields per player: `name` (non-empty string), `position` (non-empty string), `projected_points` (finite number). `status` is optional.

Response (LLM available):

```json
{
  "winner": "A",
  "pointsDelta": 3.8,
  "recommendation": "Start Player Name over Other Player",
  "explanation": "Player Name has a meaningful projection edge of 3.8 points and carries no injury risk. Other Player is listed as questionable, which introduces floor uncertainty that makes the safer play clear for this slot.",
  "signals": [
    {
      "label": "Projection edge",
      "value": "+3.8 pts",
      "weight": "high"
    },
    {
      "label": "Injury status",
      "value": "Other Player questionable",
      "weight": "medium"
    },
    {
      "label": "Matchup context",
      "value": "Derived from position and opponent data where available",
      "weight": "low"
    }
  ]
}
```

Response (LLM timeout or error — graceful fallback):

```json
{
  "winner": "A",
  "pointsDelta": 3.8,
  "recommendation": "Start Player Name over Other Player",
  "explanation": null,
  "signals": [
    {
      "label": "Projection edge",
      "value": "+3.8 pts",
      "weight": "high"
    }
  ]
}
```

Error responses:

- `400` — missing or invalid player fields. Response: `{ "error": "<field> must be a non-empty string" }` (existing validation is already in place)

### Field Definitions

| Field | Type | Notes |
|---|---|---|
| `winner` | `"A"` or `"B"` | Which player to start |
| `pointsDelta` | number | Absolute projected point difference, rounded to 2 decimal places |
| `recommendation` | string | Human-readable action string |
| `explanation` | string or null | LLM-narrated reasoning. `null` only when LLM times out or errors. Never an empty string — either a full sentence or `null`. |
| `signals` | array | Ordered list of factors that influenced the recommendation. Populated even on fallback (use math-derived signals if LLM is unavailable). |

### Signal Object Shape

```json
{
  "label": "string",
  "value": "string",
  "weight": "high | medium | low"
}
```

At minimum, always include the `Projection edge` signal. Injury status signals should appear whenever `status` is not null and not `"active"`. Matchup context is optional and should be omitted if no matchup data is available.

### Implementation Notes for Codex

- LLM timeout is currently hardcoded at `LLM_TIMEOUT_MS = 8000` in `src/routes/startSit.js`. Do not lower this without discussion.
- The `explainSafely()` wrapper handles timeout and clears the timer after fast LLM/null responses.
- `llm.explainStartSit()` remains the explanation integration point.
- `signals` are populated with at minimum the projection edge, derived from `pointsDelta` already computed by `comparePlayers()`.
- Do not expose the Ollama base URL in any response.

### Frontend Notes

- `StartSit.jsx` already calls this endpoint. The `explanation` display is likely already wired but may show nothing when `explanation` is null. Add a graceful fallback: if `explanation` is null, show a short static copy string such as "Reasoning unavailable — recommendation based on projected points."
- Render `signals` as a supporting evidence list beneath the recommendation. Each signal maps to `label`, `value`, and a visual `weight` indicator (high/medium/low badge or icon).
- Do not block the recommendation UI on `explanation`. Show the winner and `recommendation` string immediately; render explanation and signals as a secondary section that can be empty.

---

## Feature: Waiver Wire Optimization

### Status

Implemented locally. Existing plural endpoint remains at `GET /api/optimizer/waivers` (Pro-gated, leagueKey-based). The new singular endpoint `GET /api/optimizer/waiver` is a simpler, account-aware path for the frontend waiver UI. It wires Yahoo `getAvailablePlayers()` and VORP delta logic, with a clearly labeled mock fallback when the Yahoo availability pool is unavailable or empty.

### Endpoint: Waiver Wire Optimizer

`GET /api/optimizer/waiver?week={n}`

Auth required: yes — bearer token required. Returns `401` if missing or invalid. Returns `402` if user does not have a Pro subscription.

Query parameters:

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `week` | integer 1–18 | no | Defaults to current week if omitted |

No `leagueKey` or `platform` query parameter. The backend should infer the active Yahoo league from the authenticated user's connected account.

Response (success):

```json
{
  "week": 14,
  "platform": "yahoo",
  "pool_size": 50,
  "is_mock": false,
  "recommendations": [
    {
      "name": "Player Name",
      "position": "RB",
      "team": "BUF",
      "projected_points": 12.4,
      "vorp_delta": 4.1,
      "reason": "Fills your weakest roster position by projected VORP. Starting RB2 is on IR.",
      "available": true
    },
    {
      "name": "Second Player",
      "position": "WR",
      "team": "KC",
      "projected_points": 10.8,
      "vorp_delta": 2.9,
      "reason": "Slot receiver with volume upside in a high-total game. Upgrades your WR3.",
      "available": true
    }
  ],
  "generated_at": "2026-05-18T00:00:00.000Z"
}
```

Top 5 players maximum. Ranked by `vorp_delta` descending. All returned players have `available: true`.

Response (mock mode — player availability API not yet wired):

Same shape as above with `"is_mock": true` and a `note` field:

```json
{
  "week": 14,
  "platform": "yahoo",
  "pool_size": 0,
  "is_mock": true,
  "note": "Player availability API not connected. Returning mock waiver candidates for UI integration.",
  "recommendations": [
    {
      "name": "Mock RB Pickup",
      "position": "RB",
      "team": "EXA",
      "projected_points": 11.0,
      "vorp_delta": 3.5,
      "reason": "Mock: high-volume back in a favorable matchup. Addresses your weakest roster spot.",
      "available": true
    }
  ],
  "generated_at": "2026-05-18T00:00:00.000Z"
}
```

Error responses:

- `400` — no usable linked Yahoo league. Response: `{ "error": "Yahoo league connection required" }`
- `400` — invalid `week`. Response: `{ "error": "week must be between 1 and 18" }`
- `401` — missing or invalid bearer token. Response: `{ "error": "Unauthorized" }`
- `402` — valid auth but no Pro subscription. Response: `{ "error": "Pro subscription required" }`
- `401` — platform token expired. Response: `{ "error": "Yahoo token expired - re-authenticate" }` (platform name varies)

### Player Object Shape

```json
{
  "name": "string",
  "position": "QB | RB | WR | TE | K | DEF",
  "team": "string (3-letter NFL team abbreviation)",
  "projected_points": "number (null if projection unavailable)",
  "vorp_delta": "number (positive = upgrade over current roster at position)",
  "reason": "string (one sentence explaining why this player was surfaced)",
  "available": true
}
```

`vorp_delta` is computed as: `player.projected_points - roster_baseline_at_position`. The roster baseline is the weakest starter at that position on the user's current roster. VORP v2 logic already exists — use it.

`projected_points` may be `null` when the platform API does not return projections (known Yahoo limitation documented in the existing `/waivers` route). When null, `vorp_delta` should be computed as `0 - roster_baseline`, which will still surface injured/OUT players as upgrade candidates.

### Dependencies

- VORP v2: done (existing `optimizer.findWaiverMoves()`)
- Platform adapters: Yahoo first for this endpoint; Sleeper/ESPN waiver pools remain future extensions.
- `getAvailablePlayers()` in the Yahoo client: call with `{ count: 50, sort: "AR" }` (existing call pattern in `src/routes/optimizer.js`)
- `rosterSvc.normalizeYahooWaivers()`: done
- Mock data: use when `getAvailablePlayers()` throws or returns empty

### Implementation Notes for Codex

- This endpoint is distinct from the existing `GET /api/optimizer/waivers` (which takes `leagueKey`). This new endpoint is platform-centric and does not require `leagueKey` — the authenticated user's linked platform account determines the league.
- Route path: `GET /api/optimizer/waiver` (singular, no `leagueKey` query param).
- If multiple leagues are linked for a platform, use the first active league or the one most recently accessed.
- Cap results at 5. Do not return more than 5 recommendations regardless of pool size.
- `is_mock: true` must be set whenever mock data is used. Never set `is_mock: false` on mock data.
- The `note` field is only present when `is_mock: true`. Omit it on live responses.
- Apply the same `requireAuth` and `requireSubscription` middleware chain as the existing optimizer routes.

### Frontend Notes

- Display results as a ranked pickup list: rank number, player name, position badge, team, projected points, VORP delta, and reason.
- Show `is_mock: true` as an inline label (e.g., "Preview — mock data") so users understand this is not live. Do not show it as a blocking error.
- If `projected_points` is null for a player, display "—" in the points column rather than 0.
- The waiver UI should be accessible from the dashboard and from the Omen of the Week view as a secondary recommendation path.
- Do not show `available: false` players. The API will not return them, but guard against it defensively.

---

### 6. Live Omen Engine — `getLiveOmenForUser()`

**Status:** completed locally by Codex on 2026-05-18.

**Files:**

- `src/services/omen.js`
- `test/omen.test.js`

#### Completed behavior

- No active platform rows -> `status: "needs_platform_connection"`, `recommendation: null`.
- Sleeper-only, ESPN-only, or Yahoo placeholder `league_id: "yahoo"` -> `status: "connected_platform_pending_live_engine"`, `recommendation: null`.
- Yahoo connection with usable `league_id` -> fetch authenticated Yahoo client, normalize roster, run `optimizer.evaluateLineup(roster)`.
- Yahoo roster with no optimizer edge -> `status: "connected_platform_pending_live_engine"`, `recommendation: null`, `week` copied from roster.
- Yahoo roster with a lineup swap -> `status: "live"`, `mode: "live"`, `is_mock: false`, `recommendation.move_type: "lineup_swap"`.

#### Actual mapping notes

`getAuthenticatedYahooClient(userId)` returns `{ client, accessToken }`, so the live Omen service uses the active `platform_connections.league_id` row as the Yahoo league key.

`optimizer.evaluateLineup(roster)` returns swaps shaped as `{ slot, from, to, delta, confidence, reasoning }`. The live Omen service resolves `from.player_key` and `to.player_key` back against `roster.slots.starters`, `roster.slots.bench`, and `roster.slots.ir` so the frontend gets richer `start` and `sit` player objects.

LLM/Ollama is not called in this live path yet. This keeps the endpoint fast, deterministic, private, and safe for Hostinger CPU-only inference. Future LLM enrichment can be layered behind the same contract.

#### Verification

`npm test` passes with 139 tests / 0 failures.

New tests cover:

- no platform connection
- Sleeper-only pending state
- Yahoo placeholder league id pending state
- Yahoo roster with no lineup edge
- Yahoo roster with live lineup-swap recommendation
- Yahoo auth error propagation for route-level `401`

---

### 7. Waiver Wire endpoint — GET /api/optimizer/waiver

**File:** `src/routes/optimizer.js` — add a new route alongside the existing `/lineup` and `/waivers` routes.

#### Route

```
GET /api/optimizer/waiver?week={n}
```

Auth: `requireAuth` + `requireSubscription` — already applied via `router.use()` at line 42. No additional middleware needed.

This route is distinct from `GET /api/optimizer/waivers` (which requires `leagueKey`). The new route is platform-centric: the user's linked Yahoo account determines the league. No `leagueKey` query param.

#### Week validation

Use the existing `parseWeek()` sentinel (defined at line 34 of optimizer.js):

```js
const wk = parseWeek(req.query.week);
// wk === null  → week omitted, use current (roster.week after fetch)
// wk === undefined → invalid integer → return 400
if (wk === undefined) {
  return res.status(400).json({ error: "week must be between 1 and 18" });
}
```

#### Call sequence

```js
// 1. Get Yahoo client (same pattern as /lineup and /waivers routes)
const { client: yahoo } = await getAuthenticatedYahooClient(req.user.id);
//   getAuthenticatedYahooClient currently returns { client, accessToken }.

// 2. Resolve active Yahoo league id from platform_connections.
//    Add a small helper or add a backward-compatible leagueId return to yahooAuth.js.
const leagueId = await resolveActiveYahooLeagueId(req.user.id);
if (!leagueId || leagueId === "yahoo") {
  return res.status(400).json({ error: "Yahoo league connection required" });
}

// 3. Fetch and normalize roster (for baseline VORP)
const cacheKey = `ssff:waiver:${req.user.id}:${leagueId}:${wk || "current"}`;
const roster   = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueId, wk, cacheKey);
//   rosterSvc already imported as require("../services/roster") (line 27)

// 4. Fetch available player pool via Yahoo client method
const rawWaivers = await yahoo.getAvailablePlayers(leagueId, { count: 50, sort: "AR" });
//   yahoo.getAvailablePlayers() exists at yahoo.js line 112
//   Same call pattern as the existing /waivers route (optimizer.js line 95)

// 5. Normalize waiver pool
const waiverPool = rosterSvc.normalizeYahooWaivers(rawWaivers);
//   already used in /waivers route (line 96)

// 6. Rank by VORP delta using vorpForPlayer()
const { vorpForPlayer } = require("../services/vorp");
//   vorpForPlayer(player, opts) exported at vorp.js line 148
//   opts: { scoringFormat: "ppr" } (default to ppr if not in query)

// 7. Compute vorp_delta for each waiver candidate
// roster_baseline_at_position = min adjustedProjection of starters at that position
// vorp_delta = vorpForPlayer(candidate, { scoringFormat }).vorp - baseline_vorp
// Sort descending by vorp_delta, take first 5
```

#### Mock fallback

If `yahoo.getAvailablePlayers()` throws or returns an empty array, return mock data with `is_mock: true`:

```js
{
  week:            roster.week,
  platform:        "yahoo",
  pool_size:       0,
  is_mock:         true,
  note:            "Player availability API not connected. Returning mock waiver candidates for UI integration.",
  recommendations: MOCK_WAIVER_CANDIDATES,  // define as a module-level const — 5 entries
  generated_at:    new Date().toISOString(),
}
```

Live response (`is_mock: false`) omits the `note` field. Never set `is_mock: false` on mock data.

#### Response shape (live)

```js
{
  week:            roster.week,
  platform:        "yahoo",
  pool_size:       waiverPool.length,
  is_mock:         false,
  recommendations: top5,   // array of player objects, max 5, sorted by vorp_delta desc
  generated_at:    new Date().toISOString(),
}
```

Each recommendation object:

```js
{
  name:             player.name,
  position:         player.position,
  team:             player.team,
  projected_points: player.projected_points ?? null,
  vorp_delta:       Number(vorp_delta.toFixed(2)),
  reason:           "<one sentence — position need + VORP edge>",
  available:        true,
}
```

`projected_points` may be `null` — the existing `/waivers` route already documents this Yahoo limitation (line 104–107 of optimizer.js). When null, `vorp_delta = 0 - baseline_vorp` (same existing pattern in `findWaiverMoves`).

#### Error handling

Follow the exact pattern from `/lineup` and `/waivers`:

```js
} catch (e) {
  if (e.message === "yahoo_token_expired") {
    return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
  }
  next(e);
}
```

#### Error responses

- `400` — invalid week: `{ "error": "week must be between 1 and 18" }` (from `parseWeek` sentinel)
- `401` — missing/invalid bearer token: handled by `requireAuth` middleware
- `402` — no Pro subscription: handled by `requireSubscription` middleware
- `401` — Yahoo token expired: `{ "error": "Yahoo token expired - re-authenticate" }`
