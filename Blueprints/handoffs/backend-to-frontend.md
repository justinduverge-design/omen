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
