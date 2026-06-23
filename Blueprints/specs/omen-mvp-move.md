# Omen of the Week / MVP Move Spec

## Purpose

Omen of the Week / MVP Move is the main Omen event.

It should identify the highest-value fantasy football action for the user right now and explain it clearly.

## Included Decision Types

- Start/Sit recommendation
- Waiver pickup recommendation
- Trade suggestion
- Matchup-based player recommendation
- Risk/reward explanation
- Confidence score

## Current Product Rule

Start/Sit lives inside Omen / MVP Move.

Waiver logic lives inside Omen / MVP Move unless Justin explicitly separates it later.

## Required Platforms

Yahoo, Sleeper, and ESPN all matter.

ESPN is essential but risky. Omen / MVP Move needs recovery playbooks for ESPN connection failure, expired cookies, missing league context, and unclear user state.

## Output Standard

Users need plain-English reasoning, not heavy math.

A good recommendation should say:

1. The move
2. Why it matters
3. The risk
4. The confidence level
5. What data was used

## Launch Boundary

Mock data is acceptable for frontend integration only when clearly labeled.

Do not present mock or incomplete data as live fantasy advice.

## Backend Contract

Endpoint:

`POST /api/omen/mvp-move`

Purpose:

Return the single highest-value fantasy football action for the user's selected platform, league, team, and week.

Decision types:

- `start_sit`
- `waiver_pickup`
- `trade_suggestion`
- `matchup_note`

## Request Shape

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
  "use_mock_data": false
}
```

Fields:

- `platform`: `yahoo`, `sleeper`, or `espn`.
- `league_id`: platform league id or league key.
- `team_id`: platform team id when required. Backend may infer it when only one team is available.
- `season`: NFL season year.
- `week`: NFL week.
- `scoring_format`: `ppr`, `half_ppr`, or `standard`.
- `decision_scope`: optional decision types to consider.
- `include_signals`: optional signal toggles.
- `use_mock_data`: allowed for local/dev UI integration only.

## Response Shape

All responses use the same envelope.

Frontend should branch on `state` first.

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
  "signals": {},
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

## Live and Stub Signal Flags

Signal status values:

- `live`: real data from a connected platform or configured provider.
- `stub`: deterministic placeholder used to keep the contract stable.
- `mock`: fake data requested for local/dev UI work.
- `unavailable`: requested signal cannot be used because the connection, provider, or config is missing.

Signal object shape:

```json
{
  "status": "live",
  "used": true,
  "source": "platform_adapter",
  "message": "Roster imported from the connected platform."
}
```

Initial signal map:

| Signal | Initial Status | Source | Notes |
|---|---|---|---|
| `roster` | `live` when connected | platform adapter | Yahoo, Sleeper, or ESPN normalized roster |
| `projections` | `stub` | internal stub | live projection provider is not finalized |
| `weather` | `live` or `stub` | OpenWeatherMap or fallback | live when `OPENWEATHER_API_KEY` is configured |
| `travel_home_away` | `live` | ESPN scoreboard | home/away context |
| `game_time_tv` | `live` | ESPN scoreboard | kickoff and slate context |
| `matchup_dvp` | `stub` | pending Sportradar | next MVP Move intelligence session |
| `waivers` | `stub` | platform or mock pool | live pool wiring is platform-dependent |
| `llm_reasoning` | `stub` until wired | Ollama/Gemma or template | keep explanation plain-English either way |

## Confidence Score

Confidence is required on every success or empty response.

```json
{
  "score": 74,
  "label": "medium_high",
  "rationale": "The projection gap is clear, but matchup data is still stubbed."
}
```

Rules:

- `score` is an integer from `0` to `100`.
- `label` is `low`, `medium`, `medium_high`, or `high`.
- `rationale` explains the score in plain English.

## Risk Level

Risk is required on every recommendation.

```json
{
  "level": "medium",
  "reasons": [
    "Player A has a stronger role but a less stable matchup signal.",
    "Matchup DvP is not live yet."
  ]
}
```

Rules:

- `level` is `low`, `medium`, or `high`.
- `reasons` are short user-facing strings.

## Plain-English Explanation

Each recommendation should explain:

- what move to make
- why it matters
- what the risk is
- how confident Omen is
- what data was used

Response field:

```json
{
  "summary": "Your best move is to start Player A over Player B.",
  "why_it_matters": "Player A projects for a better weekly role and gives you a higher expected point total.",
  "risk": "The recommendation carries medium risk because one matchup signal is still stubbed.",
  "confidence": "Confidence is 74 out of 100.",
  "data_used": ["connected roster", "weekly projections", "home/away context"]
}
```

## Platform Disconnected State

Use this when the selected platform is not connected.

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
      "message": "Connect Sleeper before Omen can read your roster.",
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

## ESPN Reauth and Recovery States

ESPN is essential but risky. Treat ESPN failures as recoverable product states, not generic errors.

States:

- `espn_reauth_required`: ESPN cookies are missing, expired, invalid, or rejected.
- `espn_league_context_missing`: ESPN auth is present, but the requested league or team cannot be found.
- `espn_import_blocked`: ESPN returned a blocked, private, or unexpected response.
- `espn_recovery_needed`: backend cannot determine whether the issue is auth, league access, or an ESPN response change.

Response shape:

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
      "message": "Your ESPN connection needs fresh cookies before Omen can read this league.",
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

## Empty State

Use this when Omen has enough data but no move clears the recommendation threshold.

```json
{
  "state": "empty",
  "feature": "omen_mvp_move",
  "mode": "live",
  "recommendation": null,
  "explanation": {
    "summary": "No move clears the recommendation threshold this week.",
    "why_it_matters": "Your current lineup is close enough to the available alternatives that Omen should not force a move.",
    "risk": "Forcing a marginal move could create more downside than upside.",
    "confidence": "Confidence is 68 out of 100 that standing pat is reasonable.",
    "data_used": ["connected roster", "weekly projections"]
  },
  "signals": {},
  "warnings": []
}
```

## Error State

Use this when the backend fails unexpectedly after request validation.

```json
{
  "state": "error",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "error": {
    "code": "omen_generation_failed",
    "message": "Omen could not generate an MVP Move right now.",
    "retryable": true
  },
  "signals": {},
  "warnings": []
}
```

## Frontend Contract Notes

Frontend should:

- branch on `state` before rendering recommendation content
- show `confidence.score` and `confidence.label`
- show `risk.level` and `risk.reasons`
- show plain-English explanation fields directly
- label mock or stubbed advice clearly
- show platform connection recovery when `state` is `platform_disconnected`
- show ESPN-specific recovery UI for `espn_*` states
