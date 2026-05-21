# Spec: ESPN Recovery Playbook

## Status

Draft

## Decision

ESPN is essential for Corvus.

ESPN cookie/auth risk is accepted, but the app must include a recovery playbook for when ESPN breaks.

## Why This Exists

ESPN is a major fantasy platform.

Users will expect ESPN support.

Cookie-based or semi-private auth flows can expire, break, or require re-authentication.

Corvus needs a clear, user-safe flow for ESPN failure states.

## ESPN States

### 1. Not Connected

User has never connected ESPN.

UI message:

> Connect ESPN to unlock personalized Corvus recommendations.

### 2. Connected

ESPN data is available.

UI message:

> ESPN connected.

### 3. Session Expired

Stored cookies/session data no longer work.

UI message:

> Your ESPN session expired. Reconnect ESPN to restore your live data.

Action:
- Show reconnect button
- Do not show scary error
- Keep free/mock tools available

### 4. ESPN Temporarily Unavailable

ESPN changed behavior, endpoint failed, or cookies cannot refresh.

UI message:

> ESPN is temporarily unavailable. Corvus will keep your saved setup and use available fallback logic until ESPN is restored.

Action:
- Keep user account intact
- Keep Yahoo/Sleeper paths active
- Keep mock/preview states visible
- Log backend error safely

### 5. Unsupported League / Data Missing

ESPN connection works but needed roster/league data is missing.

UI message:

> Corvus connected to ESPN, but this league needs additional setup before personalized recommendations are available.

## Backend Rules

- Never expose cookies to frontend.
- Never log raw cookies.
- Never return secret values in API responses.
- Store cookie/session data securely.
- Return stable status codes/states the frontend can handle.

Recommended status values:

```json
{
  "platforms": {
    "espn": {
      "connected": false,
      "status": "token_expired"
    }
  }
}
```

Other possible statuses:

- `not_connected`
- `connected`
- `token_expired`
- `temporarily_unavailable`
- `unsupported_league`
- `needs_reconnect`

## Frontend Rules

- Show reconnect path when expired.
- Do not block the whole app if ESPN fails.
- Keep Trade Analyzer usable.
- Keep Draft Assistant usable if it can operate without ESPN.
- Keep Omen honest about data state.
- Explain failure in plain English.

## Support Playbook For Justin

When ESPN breaks:

1. Check if Yahoo/Sleeper still work.
2. Check backend logs for ESPN-specific failures.
3. Confirm whether all users are affected or only one user.
4. If one user, tell them to reconnect ESPN.
5. If all users, mark ESPN temporarily unavailable.
6. Keep app live using non-ESPN tools.
7. Do not expose internal errors to users.

## User Trust Rule

Never pretend ESPN data is live when it is not.

Always label fallback/mock states clearly.

## Open Questions

- What exact ESPN reconnect flow will V1 use?
- Can ESPN cookie renewal be made user-friendly?
- How often should the backend validate ESPN sessions?
- Should ESPN have a visible platform health indicator?
