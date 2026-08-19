# matchupService.js — nflverse URL, season_type, and CSV-quoting fixes

**Date:** 2026-08-18
**Author:** Claude
**Trigger:** founder question — "how can we be sure we actually have the right 2026 data?" — asked directly after the `A5-NflversePath` cron fix was explained. That question is what prompted checking beyond the cron, rather than taking the earlier fix's scope as complete.
**Verdict:** Two real, independent bugs found and fixed, both verified against the live file, not fixtures alone.

## Why this wasn't already covered by `A5-NflversePath`

The 2026-08-15 fix (`Direction/known_issues.md`) corrected `src/omen_tuesday_cron.js`'s nflverse URL. It did not sweep for other consumers. A repo-wide grep for every nflverse URL-construction site (not just the two already known going in) found exactly one more: `src/services/matchupService.js`, which powers DvP (Defense vs. Position) matchup context on Omen recommendations. It was never touched by the earlier fix and was still building the dead URL.

## Bug 1 — same retired path, different file

`matchupService.js` built `.../releases/download/player_stats/player_stats_<season>.csv` — the exact tag nflverse stopped updating after 2024. Confirmed 404 directly via `curl`, not assumed from the file's age. Fixed to `.../releases/download/stats_player/stats_player_week_<season>.csv`, the same corrected path the cron already proved live.

**A second gap came with it:** the file had no `season_type` handling at all — no column check, no filter. The corrected file mixes `REG` (weeks 1-18) and `POST` (weeks 19-22) rows in one CSV. Fixing only the URL would have started silently blending playoff games into what's supposed to be a regular-season defensive-tendency average — for the handful of teams that make deep playoff runs, this would skew DvP hardest on exactly the teams users most want good context on. Added `season_type` to the required-columns check and filter the average to `REG`, mirroring the cron's own `DEFAULT_SEASON_TYPE` precedent and rationale.

## Bug 2 — found only by testing against the real file, not fixtures

After both fixes above, a direct call against the live file (`getDvpContext({ position: 'WR', opponentTeam: 'SF', season: 2025, week: 10 })`) returned `null` — a real team, a real position, well past week 3 (the minimum sample). That shouldn't happen, and the fact that it did is what surfaced the second bug rather than letting a "looks done" state stand.

Root cause: `matchupService.js`'s `_parseCsv` used naive `line.split(",")`. The real nflverse file's `headshot_url` column is quoted and contains an unescaped comma of its own — nflverse ships Cloudinary transform parameters like `"https://.../upload/f_auto,q_auto/league/..."`. A naive split treats that internal comma as a field boundary, shifting every column after `headshot_url` — including `season`, `week`, `season_type`, `opponent_team`, and `fantasy_points` — off by one, for every single row. Confirmed directly by fetching the real file and inspecting a raw row, not inferred from the null result alone.

**This was never hypothetical or specific to matchupService's new URL** — the moment `matchupService.js` fetched any real nflverse player-stats file (old tag or new), this parsing bug would have silently misread every row. It just never got the chance to run against real data before now, because the URL always 404'd first.

The fix was not reinvented: `src/omen_tuesday_cron.js` already has a correct, quote-aware `parseCsvLine` (handles escaped `""`, toggles a `quoted` state, only splits on commas outside quotes) — already in production, already proven against this exact file shape. Ported the identical implementation into `matchupService.js` as `_parseCsvLine` rather than writing a new one, and rather than extracting a shared module — this is a scoped bug fix to one file, not a refactor of the already-stable cron; duplicating nine well-tested lines was the lower-risk choice than touching production scoring code to save it. Worth extracting into a shared utility if a third consumer ever needs it.

## Evidence

- `curl` confirmed the old URL genuinely 404s.
- Repo-wide grep confirmed exactly two nflverse URL-construction sites exist in the whole codebase (the cron, already fixed, and this file) — nothing else found.
- Direct inspection of the real CSV's header row confirmed every column `matchupService.js` needs is present in the corrected file, including `season_type`.
- Direct inspection of a raw data row confirmed the quoted-comma `headshot_url` shape that causes bug 2.
- 10/10 focused tests (`test/matchupService.test.js`), including three new ones: `season_type`/POST-row exclusion, the quoted-comma parsing regression (mirroring the real file's exact shape), and fail-closed behavior when `season_type` is absent from the schema.
- Full backend suite: **566/566** (was 565 before the POST-filter and missing-season_type tests were added mid-fix, 566 after the quote-handling test).
- **Real, non-fixture verification against the live file, post-fix:** `SF` allows `WR`s an average of `7.3` points across `41` real samples through week 9 of 2025 ("tough" label) — a plausible result, not `null`, not garbage.

## What this means for "how can we be sure about 2026"

The cron's URL construction is correctly parameterized by season and already proven against 2025's real file — no code change needed when 2026's file appears. `matchupService.js` now matches that same correctness. Both known consumers of nflverse data are now verified working against the *current* real file shape, including its quoting, not just its filename pattern. The honest remaining uncertainty is what it's always been: nflverse's own `stats_player_week_2026.csv` doesn't exist yet because the season hasn't started, and confirming it fits this exact shape genuinely can't happen until nflverse publishes it — that verification is owed once Week 1 data lands, not owable today.

## Skill receipt

```text
Task: matchupService.js nflverse URL/season_type/CSV-quoting fix
Change type: Bug fix (backend), data-integrity
Skills invoked: slops-investigate (repo-wide sweep for other nflverse consumers,
  live-file verification before and after the fix), slops-tdd (RED confirmed
  against old fixtures before updating them, three new regression tests)
Evidence: this file; Blueprints/handoffs/2026-08-18-matchupservice-nflverse-fix.md
Procedure gap found: the 2026-08-15 A5-NflversePath fix closed as complete
  without a repo-wide sweep for other consumers of the same broken pattern —
  now the second time this has happened (see the known_issues.md carry-forward
  note). Worth adding "grep for every other call site of a just-fixed URL/pattern"
  as a standing step before closing this class of fix, not just this once.
```
