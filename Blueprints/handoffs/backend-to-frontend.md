# Backend To Frontend Handoff

## Purpose

Codex/backend writes completed or proposed backend contracts here.

Claude/frontend reads this file before wiring UI to backend behavior.

## Active Context

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit and waiver logic live inside Omen / MVP Move unless separated later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- User-facing reasoning should stay plain-English.

## Current Backend Notes

Date: 2026-05-23

Owner: Codex/backend

Feature: Omen of the Week / MVP Move

Status: Contract established for the Omen / MVP Move mock flow. Mock endpoint behavior is allowed for UI work when clearly labeled. Live recommendation quality depends on the signal flags returned by the backend.

Endpoint / contract:

`POST /api/omen/mvp-move`

Purpose:

Return the single highest-value fantasy football action for the user's selected platform, league, team, and week.

Decision types:

- `start_sit`
- `waiver_pickup`
- `trade_suggestion`
- `matchup_note`

Request shape:

```json
{
  "platform": "yahoo",
  "league_id": "414.l.12345",
  "team_id": "7",
  "season": 2026,
  "week": 8,
  "scoring_format": "ppr",
  "decision_scope": ["start_sit", "waiver_pickup", "trade_suggestion"],
  "include_signals": {
    "weather": true,
    "travel_home_away": true,
    "game_time_tv": true,
    "matchup_dvp": true,
    "llm_reasoning": true
  },
  "use_mock_data": false,
  "mock_state": "success"
}
```

Request fields:

- `platform`: `yahoo`, `sleeper`, or `espn`.
- `league_id`: platform league id or league key.
- `team_id`: platform team id when required. Backend may infer it when only one team is available.
- `season`: NFL season year.
- `week`: NFL week.
- `scoring_format`: `ppr`, `half_ppr`, or `standard`.
- `decision_scope`: optional list of decision types the frontend wants considered.
- `include_signals`: optional signal toggles. Backend may return `unavailable` for signals that are requested but not configured.
- `use_mock_data`: allowed for local/dev UI integration only. Production must not present mock advice as live.
- `mock_state`: optional local/dev selector for exercising contract states. Supported values are `success`, `empty`, `platform_disconnected`, `espn_reauth_required`, `espn_league_context_missing`, `espn_import_blocked`, `espn_recovery_needed`, and `error`.

Success response shape:

```json
{
  "state": "success",
  "feature": "omen_mvp_move",
  "mode": "hybrid",
  "request_id": "omen_req_123",
  "generated_at": "2026-05-23T16:00:00.000Z",
  "platform": {
    "name": "yahoo",
    "status": "connected",
    "recovery": null
  },
  "league": {
    "id": "414.l.12345",
    "name": "Example League",
    "season": 2026,
    "week": 8,
    "scoring_format": "ppr"
  },
  "team": {
    "id": "7",
    "name": "Example Team"
  },
  "signals": {
    "roster": {
      "status": "live",
      "used": true,
      "source": "platform_adapter",
      "message": "Roster imported from the connected platform."
    },
    "projections": {
      "status": "stub",
      "used": true,
      "source": "internal_stub",
      "message": "Projection provider is not finalized yet."
    },
    "weather": {
      "status": "live",
      "used": true,
      "source": "openweathermap",
      "message": "Live when OPENWEATHER_API_KEY is configured; stub fallback otherwise."
    },
    "travel_home_away": {
      "status": "live",
      "used": true,
      "source": "espn_scoreboard",
      "message": "Home/away context from ESPN scoreboard."
    },
    "game_time_tv": {
      "status": "live",
      "used": true,
      "source": "espn_scoreboard",
      "message": "Kickoff and slate context from ESPN scoreboard."
    },
    "matchup_dvp": {
      "status": "stub",
      "used": false,
      "source": "pending_nflverse_data",
      "message": "Matchup DvP is live from nflverse-data when enough trailing-week opponent data exists; stub fallback otherwise."
    },
    "waivers": {
      "status": "stub",
      "used": true,
      "source": "platform_or_mock_pool",
      "message": "Live waiver pool wiring is platform-dependent."
    },
    "llm_reasoning": {
      "status": "stub",
      "used": true,
      "source": "ollama_gemma_or_template",
      "message": "Plain-English explanation may be templated until Gemma is wired for this route."
    }
  },
  "recommendation": {
    "id": "omen_123",
    "type": "start_sit",
    "title": "Start Player A over Player B",
    "move": "Move Player A into your WR2 slot and bench Player B.",
    "primary_player": {
      "id": "player_a",
      "name": "Player A",
      "position": "WR",
      "team": "DAL"
    },
    "comparison_player": {
      "id": "player_b",
      "name": "Player B",
      "position": "WR",
      "team": "CHI"
    },
    "expected_value_delta": {
      "points": 4.2,
      "label": "meaningful"
    },
    "confidence": {
      "score": 74,
      "label": "medium_high",
      "rationale": "The projection gap is clear, but matchup data is still stubbed."
    },
    "risk": {
      "level": "medium",
      "reasons": [
        "Player A has a stronger role but a less stable matchup signal.",
        "Matchup DvP is not live yet."
      ]
    },
    "explanation": {
      "summary": "Your best move is to start Player A over Player B.",
      "why_it_matters": "Player A projects for a better weekly role and gives you a higher expected point total.",
      "risk": "The recommendation carries medium risk because one matchup signal is still stubbed.",
      "confidence": "Confidence is 74 out of 100.",
      "data_used": [
        "connected roster",
        "weekly projections",
        "home/away context",
        "game time context"
      ]
    }
  },
  "alternatives": [],
  "warnings": []
}
```

Signal status values:

- `live`: real data from a connected platform or configured provider.
- `stub`: deterministic placeholder used to keep the contract stable.
- `mock`: fake data requested for local/dev UI work.
- `unavailable`: requested signal cannot be used because the connection, provider, or config is missing.

Confidence score:

- `score`: integer from `0` to `100`.
- `label`: `low`, `medium`, `medium_high`, or `high`.
- `rationale`: plain-English reason for the score.

Risk level:

- `level`: `low`, `medium`, or `high`.
- `reasons`: short user-facing reasons.

State handling:

Frontend should branch on `state` first, then use `platform.status`, `platform.recovery`, and `signals`.

Empty state:

```json
{
  "state": "empty",
  "feature": "omen_mvp_move",
  "mode": "live",
  "recommendation": null,
  "explanation": {
    "summary": "No move clears the recommendation threshold this week.",
    "why_it_matters": "Your current lineup is close enough to the available alternatives that Corvus should not force a move.",
    "risk": "Forcing a marginal move could create more downside than upside.",
    "confidence": "Confidence is 68 out of 100 that standing pat is reasonable.",
    "data_used": ["connected roster", "weekly projections"]
  },
  "signals": {},
  "warnings": []
}
```

Platform disconnected state:

```json
{
  "state": "platform_disconnected",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "platform": {
    "name": "sleeper",
    "status": "disconnected",
    "recovery": {
      "code": "connect_platform",
      "message": "Connect Sleeper before Corvus can read your roster.",
      "cta": "Connect Sleeper"
    }
  },
  "signals": {
    "roster": {
      "status": "unavailable",
      "used": false,
      "source": "platform_adapter",
      "message": "No connected roster is available."
    }
  }
}
```

ESPN reauth and recovery states:

- `espn_reauth_required`: ESPN cookies are missing, expired, invalid, or rejected. Ask the user to reconnect ESPN with fresh `ESPN_S2` and `SWID` cookies.
- `espn_league_context_missing`: ESPN auth is present, but the requested league or team cannot be found. Ask the user to select or re-import the league.
- `espn_import_blocked`: ESPN returned a blocked, private, or unexpected response. Ask the user to retry, reconnect, or verify league access.
- `espn_recovery_needed`: backend cannot determine whether the issue is auth, league access, or an ESPN response change. Show recovery guidance and allow retry.

ESPN recovery response shape:

```json
{
  "state": "espn_reauth_required",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "platform": {
    "name": "espn",
    "status": "reauth_required",
    "recovery": {
      "code": "refresh_espn_cookies",
      "message": "Your ESPN connection needs fresh cookies before Corvus can read this league.",
      "cta": "Reconnect ESPN",
      "fields_needed": ["ESPN_S2", "SWID"]
    }
  },
  "signals": {
    "roster": {
      "status": "unavailable",
      "used": false,
      "source": "espn_adapter",
      "message": "ESPN roster import is blocked until reauthorization succeeds."
    }
  }
}
```

Error state:

```json
{
  "state": "error",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "error": {
    "code": "omen_generation_failed",
    "message": "Corvus could not generate an MVP Move right now.",
    "retryable": true
  },
  "signals": {},
  "warnings": []
}
```

Mock vs live data:

Mock data is allowed for frontend integration only when `mode` is `mock` or a signal has `status: "mock"`. If any decision-critical signal is `stub`, the UI should present the result as a preview, not live fantasy advice.

Known limitations:

- Matchup DvP is conditionally live from nflverse-data when a success response has a usable opponent context and at least 3 trailing sample weeks; otherwise it remains stubbed.
- Projection source is not finalized in this contract.
- Waiver pool behavior may differ by platform.
- Gemma/Ollama reasoning may be templated until the backend route is wired.

Frontend action needed:

Verify the Omen / MVP Move screen against the `state` envelope, including `confidence.score`, `risk.level`, plain-English explanation fields, mock/stub/live/unavailable signal labels, and platform-specific recovery UI for disconnected and ESPN recovery states.

## Backend Hardening Pass

Date: 2026-05-24

Owner: Codex/backend

Feature: Backend security, cron, and deploy guardrails

Status: Completed for focused hardening scope. No frontend contract changes required.

What changed:

- Supabase RLS SQL now keeps Vault token secret identifiers out of authenticated client-readable `platform_connections` grants.
- Vault RPC grants are service-role only: create, decrypt, update, and delete.
- Backend schema SQL now includes columns currently used by platform connections, Omen scoring, GDPR export/delete, and Tuesday scoring.
- Legacy `corvus_agents.js` now parses and preserves math exports, while retired legacy HTTP routes fail closed with `410`.
- `corvus_tuesday_cron.js` now parses and is safety-gated. It will not score data unless `CORVUS_CRON_SCORING_ENABLED=true`.
- Cron Docker wiring now points at `src/corvus_tuesday_cron.js` and writes to the crond spool path the container actually uses.
- Deploy workflow now runs tests, audit, and both frontend builds before building/pushing deploy images.
- Probo evidence paths now point at current Corvus files.

Frontend action needed:

None for UI integration. Keep using the existing Omen / MVP Move response envelope. Treat Tuesday scoring/results UI as pending until backend explicitly enables and validates production scoring.

## UX/UI Build Backend Contract Audit

Date: 2026-05-24

Owner: Codex/backend

Feature: Sign In / Connect League / Manual Omen feasibility

Status: Audit complete. Frontend scaffold can start only after contract mismatches below are accepted or patched.

Auth redirect preservation:

- Recommended strategy: frontend-owned `localStorage` key `corvus.auth.next`.
- Before any Google, Apple, Discord, or email magic-link auth action, sanitize and store the intended relative path.
- Allowed destinations must be same-origin relative paths only, for example `/`, `/trade`, `/draft`, `/omen`, `/account/connect`, and `/football`.
- Reject external URLs, protocol-relative URLs, `/api/*`, paths over 256 chars, and unknown paths. Default to `/`.
- Supabase OAuth/magic-link redirects should return to `/login`; after `detectSessionInUrl` completes, `/login` reads and clears `corvus.auth.next`.
- If the sanitized destination is `/omen` and no league is connected, route to `/account/connect?next=/omen`.
- If the user skips league connection, route to the dashboard/app shell and show Omen as locked/disconnected. Do not show a generic Omen.
- Backend session state is not required for this redirect preservation. The backend still validates auth on protected API calls.

Auth provider status:

- Email magic link is wired in the current frontend through Supabase `signInWithOtp`.
- Google, Apple, and Discord are not wired in the current frontend code.
- Supabase dashboard/provider configuration cannot be confirmed from this repo without inspecting project settings/secrets. Treat Google, Apple, and Discord as pre-launch config checks.
- Discord likely needs a Discord developer app client id/secret configured in Supabase Auth before the UI can honestly claim it works.

Platform connection status:

- Existing endpoint: `GET /api/platforms/status`, auth required.
- Current response shape returns top-level `yahoo`, `sleeper`, `espn`, plus `connections`.
- Requested UX endpoint `GET /api/platforms` does not currently exist.
- Current shape does not include `manual`, league arrays, or selected league metadata.

Sleeper connection:

- Existing endpoint: `POST /api/platforms/sleeper/connect`, auth required.
- Current request shape is `{ "username": "string", "league_id": "string" }`.
- Current behavior validates the Sleeper username and stores the supplied league id.
- The requested flow `{ "sleeper_username": "string" } -> leagues[]` does not exist yet.
- Recommended backend addition: add a resolve step that fetches the Sleeper user and current-season leagues, then a select step that stores the chosen league id.

Yahoo connection:

- Existing start route: `GET /api/yahoo/auth`, auth required.
- Existing callback route: `GET /api/yahoo/callback`.
- Current frontend starts Yahoo via `window.location.href = "/api/yahoo/auth"`.
- Stage 1.5 follow-up fixed the callback destination: Yahoo now redirects to `/account/connect?connected=yahoo`.
- Current flow does not preserve full `?next=` through Yahoo OAuth yet.

ESPN connection:

- Existing endpoint: `POST /api/platforms/espn/connect`, auth required.
- Current request shape is `{ "espn_s2": "string", "swid": "string", "league_id": "string", "espn_team_id": "string | optional" }`.
- Current success response is `{ "connected": true }`.
- Current errors are not yet distinct enough for the guided UX. Invalid cookies, missing league, blocked import, and unknown failure should become separate safe codes before the final guided flow ships.
- ESPN cookie handling remains sensitive: never put cookie values, Vault ids, auth headers, or raw ESPN responses in URLs, logs, UI copy, or LLM payloads.

Manual Omen feasibility:

- Recommendation: Manual Omen should be limited, not full, unless Justin later accepts a stricter data-entry burden.
- Manual can realistically collect team name, season, week, scoring format, league size, lineup rules, current roster, starter/bench/IR slots, player names, positions, NFL teams, eligible positions, optional projections, optional injury/status, optional opponent team, and manually entered waiver candidates.
- Manual cannot reliably collect real platform waiver availability, transaction history, opponent roster/lineup, private league scoring quirks, actual roster constraints, league market context, or live platform lineup state.
- Start/sit is feasible with a completed roster, lineup rules, player teams, statuses, and projections or a public projection provider.
- Waiver pickup is not feasible unless the user manually enters a waiver candidate pool. Without that, Corvus must not claim a waiver move is available.
- Trade suggestion is limited to user-entered trade packages. Corvus cannot infer trading partners or market availability from manual data.
- Matchup notes are limited unless opponent team/player context is supplied or a public matchup signal is available.

Minimum Manual Omen checklist:

- Scoring format: `ppr`, `half_ppr`, or `standard`.
- Current NFL season and week.
- League size.
- Starting lineup rules, including position counts and FLEX/SUPER_FLEX behavior.
- Current roster with player name, position, eligible positions, selected slot, NFL team, and starter/bench/IR state.
- Projection source: user-entered projected points or backend-approved public projection source.
- Injury/status source: user-entered status or backend-approved public injury source.
- Decision scopes requested: start/sit, trade, matchup, or waiver.
- For waiver decisions: user-entered waiver candidate pool with names, positions, teams, and projected points/source labels.
- For matchup decisions: opponent NFL team for each relevant player, or a public schedule/matchup lookup source.

Manual data labels and confidence:

- Use `DataSourceLabel: manual` for user-entered roster, lineup, projections, statuses, and waiver candidates.
- Use `DataSourceLabel: public` for public schedule, injury, matchup, or weather data.
- Use `DataSourceLabel: unavailable` for any missing decision-critical signal.
- Suggested confidence cap: full manual checklist with projections/statuses maxes around `medium` / 68. Missing projections or status should cap at `low` / 55. Missing waiver pool should remove waiver recommendations entirely.

Session duration:

- Not confirmable from repository code. Supabase session lifetime depends on project Auth settings.

Frontend action needed:

- Do not build Manual entry form yet. Justin needs to decide whether limited Manual Omen ships, ships later, or stays locked.
- Treat `/api/platforms/status` as the real existing platform status endpoint until backend adds/aliases `GET /api/platforms`.
- Do not present Google, Apple, or Discord as working until frontend wiring and Supabase provider config are confirmed.
- Trade Analyzer backend conflict is now fixed in the Stage 1.5 pass: `POST /api/trade/compare` is public. Frontend route gating still needs to expose the free Trade Analyzer path without requiring sign-in before claiming the flow is launch-ready.

## Stage 1.5 Backend/UX Unblock Pass

Date: 2026-05-25

Owner: Codex/backend

Feature: Backend contract unblocks for Corvus clean UX/UI pass

Status: Completed focused backend pass. No full UI was built.

What changed:

- `POST /api/trade/compare` no longer requires Supabase auth. It remains payload-validated and capped at 10 players per side.
- `POST /api/omen/mvp-move` now fails closed for non-mock live requests that do not provide a real connected-league path. Explicit mock calls remain available for local contract previews through `use_mock_data: true` or `mock_state`.
- `GET /api/platforms` now exists as the UX-facing platform status contract. `GET /api/platforms/status` remains available for legacy callers.
- `POST /api/platforms/sleeper/resolve` now supports the username-first Sleeper flow and returns discovered current-season leagues.
- `POST /api/platforms/sleeper/connect` now accepts either `sleeper_username` or `username` and returns a richer connected response.
- `POST /api/platforms/espn/connect` now returns safe structured error codes for missing cookies, missing league id, and invalid/expired cookies. It still never echoes cookie values.

Trade Analyzer:

- Endpoint: `POST /api/trade/compare`
- Auth: none required.
- Request shape remains:

```json
{
  "send": [{ "name": "Bench RB", "position": "RB", "projected_points": 10 }],
  "receive": [{ "name": "Starter WR", "position": "WR", "projected_points": 14 }],
  "scoring_format": "ppr"
}
```

- Validation: `send` and `receive` must be non-empty arrays, each side is capped at 10 players, and `scoring_format` must be `ppr`, `half_ppr`, or `standard`.
- Remaining frontend gap: the free Trade Analyzer path must not live only behind a protected `/football` route.

Omen gating:

- Endpoint: `POST /api/omen/mvp-move`
- Explicit mock/dev preview remains supported with `use_mock_data: true` or `mock_state`.
- Non-mock live calls now return `409` until the live connected-league Omen path is wired.

Live-gated response shape:

```json
{
  "state": "error",
  "feature": "omen_mvp_move",
  "mode": "live",
  "platform": {
    "name": "sleeper",
    "status": "requires_connected_league",
    "recovery": {
      "code": "connect_league",
      "message": "Most Valuable Play requires sign-in and a connected league before Corvus can produce a real recommendation.",
      "cta": "Connect Your League"
    }
  },
  "league": null,
  "team": null,
  "signals": {
    "roster": {
      "status": "unavailable",
      "used": false,
      "source": "platform_adapter",
      "message": "No authenticated connected-league context was provided."
    }
  },
  "recommendation": null,
  "alternatives": [],
  "warnings": [],
  "error": {
    "code": "live_omen_requires_connected_league_context",
    "message": "Most Valuable Play requires connected league context. Use explicit mock mode only for local contract previews.",
    "retryable": false
  }
}
```

Frontend behavior:

- Do not show generic Omen advice from a non-mock call.
- If this error code appears, send the user to league connection or show Omen locked/disconnected.
- Mock Omen cards/screens must be visually labeled as previews, not live recommendations.

Platform status contract:

- Endpoint: `GET /api/platforms`
- Auth: Supabase user auth required.

Response shape:

```json
{
  "platforms": {
    "sleeper": {
      "platform": "sleeper",
      "status": "connected",
      "connected": true,
      "username": "sleepy",
      "leagues": [
        {
          "id": "league-1",
          "name": null,
          "season": null,
          "scoring_format": null,
          "team_id": null,
          "team_name": null,
          "selected": true
        }
      ]
    },
    "yahoo": {
      "platform": "yahoo",
      "status": "disconnected",
      "connected": false,
      "leagues": []
    },
    "espn": {
      "platform": "espn",
      "status": "disconnected",
      "connected": false,
      "leagues": []
    },
    "manual": {
      "platform": "manual",
      "status": "disconnected",
      "connected": false,
      "team_name": null,
      "leagues": []
    }
  }
}
```

Sleeper connection:

- Resolve endpoint: `POST /api/platforms/sleeper/resolve`
- Auth: required.
- Request:

```json
{
  "sleeper_username": "sleepy",
  "season": 2026
}
```

- Response:

```json
{
  "status": "resolved",
  "platform": "sleeper",
  "username": "sleepy",
  "sleeper_user_id": "sleeper-user-1",
  "season": 2026,
  "leagues": [
    {
      "id": "league-1",
      "name": "Example League",
      "season": 2026,
      "scoring_format": "ppr",
      "team_id": "7",
      "team_name": "Example Team"
    }
  ]
}
```

- Connect endpoint: `POST /api/platforms/sleeper/connect`
- Request:

```json
{
  "sleeper_username": "sleepy",
  "league_id": "league-1"
}
```

Yahoo connection gap:

- Existing start route remains `GET /api/yahoo/auth`.
- Existing callback remains `GET /api/yahoo/callback`.
- Callback behavior now redirects to `/account/connect?connected=yahoo`.
- Full `?next=` preservation through Yahoo OAuth is still not implemented. Frontend can claim the connect-screen return is fixed, but should not claim arbitrary return-to-Omen Yahoo OAuth yet.

ESPN connection:

- Endpoint: `POST /api/platforms/espn/connect`
- Auth: required.
- Request:

```json
{
  "espn_s2": "cookie value",
  "swid": "{cookie value}",
  "league_id": "12345",
  "espn_team_id": "7"
}
```

- Safe error codes:
  - `espn_cookies_required`
  - `espn_league_id_required`
  - `espn_cookies_invalid`
- Remaining gap: blocked/private import and ambiguous ESPN response changes are still collapsed into invalid-cookie recovery until the ESPN adapter exposes more specific failure causes.

Auth redirect preservation:

- Backend session state is not required for the clean `?next=` strategy.
- Frontend should own the sanitized `corvus.auth.next` localStorage strategy documented above.
- OAuth provider config for Google, Apple, and Discord still cannot be confirmed from repository code. Email magic link remains the only provider observed as wired in the current frontend.

Manual Omen feasibility:

- Recommendation remains: Manual Omen should be locked or limited until Justin accepts the data-entry burden.
- Honest limited unlock requires scoring format, season/week, league size, lineup rules, complete roster, player teams/eligible slots/current slots, projections source, injury/status source, decision scope, and manually entered waiver candidates if waiver recommendations are in scope.
- Without the full checklist, Manual should be allowed for Trade Analyzer/manual comparison workflows only, not full Most Valuable Play.

Frontend action needed:

- Claude can build the sign-in/connect UI against these contracts without faking backend behavior.
- Keep Omen paid/locked until auth, payment tier, and connected-league context are all present.
- Expose the public Trade Analyzer route outside auth.
- Use the Sleeper resolve/select/connect sequence for the lowest-friction connection path.
- Treat Yahoo `?next=` and more granular ESPN recovery as follow-up backend gaps.

## Frontend Request Response

Date: 2026-05-25

Owner: Codex/backend

Feature: Responses to Claude frontend requests for onboarding, auth, draft, and ESPN flag

Status: Responded. One backend code change completed for Yahoo callback.

Claude worktree note:

- Claude's new UI files are currently in `.claude/worktrees/dreamy-ride-ab2778`, not the main checkout.
- That is a normal isolated Git worktree pattern for Claude Code, but those files are not active in the main app until merged/copied back.
- Backend responses below are written for the main Corvus repo.

Request 1 - Yahoo OAuth callback destination:

- Completed.
- `GET /api/yahoo/callback` now redirects to `/account/connect?connected=yahoo`.
- This is a hardcoded internal destination. The OAuth `state` token is still not used for user-controlled redirect paths.
- Full `?next=` round-trip through Yahoo OAuth remains a future enhancement.

Request 2 - Auth provider configuration confirmation:

- Repository code cannot confirm Supabase dashboard provider settings.
- Email magic link is the only provider already confirmed from repo code.
- Google, Apple, and Discord require Supabase Auth provider configuration checks in the Supabase dashboard before launch confidence.
- It is safe from a backend perspective for frontend to show provider buttons only if the UI handles Supabase errors inline and does not claim the providers are verified.
- Product recommendation: label or gate unverified providers before public launch unless Justin confirms the Supabase dashboard setup.

Request 3 - Draft Assistant endpoint auth status:

- Draft Assistant endpoints are public today.
- `POST /api/draft-assistant/recommendations` does not require auth.
- `GET /api/draft-assistant/adp` does not require auth.
- `GET /api/draft-assistant/adp` may optionally use an Authorization header to enrich Yahoo-backed ADP when available, but missing auth falls back gracefully.
- No backend change is needed for public `/draft`.

Request 4 - ESPN card build flag clarification:

- Backend endpoint exists: `POST /api/platforms/espn/connect`.
- Endpoint is usable for guided connection and now returns safe structured errors.
- ESPN is still fragile because it depends on user-copied ESPN cookies and ESPN response behavior.
- Production recommendation: keep `VITE_ESPN_ENABLED=false` unless Justin explicitly wants ESPN visible as a soft-launch guided connection.
- If enabled in production, UI copy should frame ESPN as guided/manual connection, not low-friction OAuth.

## Response Template

```text
Date:
Owner:
Feature:
Status:

Endpoint / contract:

Request shape:

Response shape:

State handling:

Mock vs live data:

Known limitations:

Frontend action needed:
```
