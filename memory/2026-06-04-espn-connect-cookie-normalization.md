# ESPN Connect Cookie Normalization Debug Report

Date: 2026-06-04
Owner: Codex/backend

## Symptom

Justin was signed into the ESPN fantasy league page for league `2114292181`. The ESPN league API returned JSON in the same browser session, but Corvus `POST /api/platforms/espn/connect` showed the user-facing `espn_cookies_invalid` error.

## Root Cause

The backend accepted only raw cookie values and a raw numeric league id. Browser/devtools copy flows can produce `name=value` cookie pairs, trailing semicolons, URL-encoded SWID braces, or a full ESPN league URL. Corvus then sent malformed cookie headers to ESPN, making a valid browser session appear invalid.

## Fix

`src/routes/platforms.js` now normalizes ESPN connect inputs before validation and Vault storage:

- extracts `espn_s2` from raw values, `espn_s2=...`, or full cookie-header style text
- extracts and normalizes `SWID`, including `%7B...%7D` encoded braces
- accepts full ESPN league URLs or `leagueId=...` query fragments and stores only the league id
- continues to avoid logging or echoing ESPN cookie values

## Evidence

- Focused ESPN/platform tests: `node --test test/platforms.test.js test/espnAdapter.test.js test/leagueStandingsRoute.test.js` passed 29/29.
- Full backend suite: `npm test` passed 262/262.

## Regression Test

`test/platforms.test.js` includes `POST /api/platforms/espn/connect accepts copied cookie pairs and league URL`, covering copied `espn_s2=...`, encoded `SWID=%7B...%7D`, and full ESPN league URL input.

## Status

DONE_WITH_CONCERNS: Root cause is fixed locally and covered by tests. Production verification still requires deploy approval and a retry through the live Account connect form.
