# Device walk 2 — checklist (prepared 2026-10-11)

**Purpose:** Gates F and G of `Direction/2026-10-06-tuesday-beta-readiness.md`. Real phone, real account, real leagues,
production API. Nothing is "verified" without evidence from this walk.
**Compare against:** `Direction/2026-10-01-device-walk-1.md` (what was broken) and
`Direction/reviews/2026-10-10-screen-data-matrix.md` (where each screen's data comes from).

## Before you start

- **Server (verified 2026-10-11):** production API is on `FOOTBALL_DATA_MODE=warehouse` (Start/Sit usage is served by
  the football warehouse; Supabase no longer answers it). Warehouse holds 1999-2026. Backups, restore proof and maintenance
  are on timers.
- **The iOS app has not changed since the Oct 1 build** (no `mobile/` commit after #512). Every iOS finding from walk 1 is
  still open in code. Install whatever build you intend to ship; note its build number here: `__________`.
- **Config guard:** the build must have the real `Config/Local.xcconfig` (empty Supabase/API host fails the build since #512).
- **Tell me roughly what time you do each action** (to the minute). I match them to API logs afterwards.

## What to check, screen by screen

Mark each: OK / WRONG / MISSING / HONEST-UNAVAILABLE. Screenshot anything not OK. Voice memo is fine.

| Screen | Look for | New since walk 1 |
|---|---|---|
| Sign-in, Connect (ESPN, Yahoo, Sleeper) | all providers present; multi-league confirmation names every league (P1-4 was open) | memberships table (redo step 03) |
| Command Center | Waiver Watch pick agrees with League's waiver wire (P1-5); matchup score; quiet state wording ("Confident · Low risk" must be computed, not fixed) | waiver adds can carry a usage sentence in shadow/warehouse mode |
| Omen call (brief) | call, reason, risk, confidence **band** (never a percentage); the "Unable to build this recommendation" error (P0-1) must be gone | confidence can now be corroborated by recent usage (targets/carries) |
| Omen evidence | factor rows honest (WEATHER/REST are modelled or unavailable, not invented); no fabricated alternatives | none |
| Start/Sit | recent usage lines (targets, carries, red-zone work) present and plausible; **`snap_share` is intentionally blank** (snap rights review open); scoring line; incomplete state | **served from the warehouse now** |
| League table | cut line position (it was drawn under your own row), "Form · last 5" (no data), standings | none (iOS bugs open) |
| League waivers | wire list, claims process, Yahoo with no projections reads honestly | none |
| Ledger | rows read **Pending** (scoring held); one row per team-week; detail shows what it should | Ledger now on new tables; scoring dry run exists, still off |
| Trade | compare with players from **each provider**: ESPN and Yahoo roster players should resolve (previously a 422 "unresolved players"); no projection => honest "can't call this one"; Find-a-trade reachable? (founder decision still open) | ESPN/Yahoo identity via the warehouse crosswalk |
| Account / Help / Report pill | export, delete, report submits (503 on every report was P0 in walk 1) | beta reports on new tables |
| Anywhere | speed of tab switches and league switching (~2 s after #507); crashes; any "Omen sent something this version couldn't read" | none |

## Open questions I cannot answer from code (watch for them)

1. "Nothing to recommend" for a league where the engine finds a swap locally (walk 1, unreproduced).
2. Whether one-league-per-platform is really gone (the switcher lists 8 teams; can each get a call?).
3. Whether Command and League ever disagree about waivers or the matchup.
4. Does any screen show nflverse attribution? (It needs an "About / Data sources" line, CC BY 4.0.)

## After the walk

- Send me the screenshots/voice memo and the action times. I will read the API logs for those minutes (errors, slow
  requests, warehouse read failures), classify every difference, and update the Tuesday readiness file's Gates F and G
  with evidence rather than claims.
- If a screen shows a number you do not trust, note the player and the week; I can check it against the warehouse and
  the legacy path directly.

## Not in scope for this walk

Draft Assistant (2027, locked wording only), Android (paused), anything needing a store console.
