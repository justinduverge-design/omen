# Handoff — 2026-08-18 — matchupService.js: nflverse URL, season_type, CSV-quoting fixes

**Not deployed.** Branch `claude/matchupservice-nflverse-fix`, not yet pushed. Full account: `Direction/reviews/2026-08-18-matchupservice-nflverse-fix.md`.

## Verdict

Two real, independent bugs found and fixed in `matchupService.js` (DvP matchup context), both verified against the live nflverse file, not fixtures alone. Prompted directly by a founder question pushing on whether the earlier cron-only fix (`A5-NflversePath`, 2026-08-15) could really be trusted — it couldn't, fully; this file was missed.

## Files changed

- **Changed:** `src/services/matchupService.js` — corrected the nflverse URL to the same path the cron already proved (`stats_player_week_<season>.csv` under the `stats_player` tag); added `season_type` to required columns and filtered the DvP average to `REG` only; replaced naive `line.split(",")` with a proper quote-aware CSV line parser (ported from `src/omen_tuesday_cron.js`'s already-proven `parseCsvLine`).
- **Changed:** `test/matchupService.test.js` — updated existing fixtures for the new column shape and URL; added three tests (POST-row exclusion, quoted-comma parsing regression matching the real file's exact shape, fail-closed on missing `season_type`).
- **Changed:** `Direction/known_issues.md` — new entry alongside the original `A5-NflversePath` entry, carrying forward the lesson: sweep for every other consumer of a pattern before calling a class of bug closed.
- **New:** `Direction/reviews/2026-08-18-matchupservice-nflverse-fix.md`, this handoff.

## RED / GREEN

- RED confirmed for real: ran the existing (unmodified) test suite against the fixed source before touching the tests — 2 of 7 failed exactly as expected (fixtures lacked the now-required `season_type` column).
- GREEN: 10/10 focused (`test/matchupService.test.js`), full backend suite **566/566**.
- **Real-data verification, not just mocked fixtures:** a direct call against the live file returned `null` after the URL fix alone (a real team/position/week that should have data) — that's what surfaced the second bug. Post-parser-fix, the same call returns a real, plausible result (SF vs. WR: 7.3 avg pts allowed, 41 samples, "tough").

## Skills

`slops-investigate` (the repo-wide sweep, and testing against the real file rather than stopping at green fixtures), `slops-tdd` (RED confirmed before fixture updates, three new regression tests). Procedure gap recorded in the review doc: the earlier `A5-NflversePath` closure should have swept for other consumers and didn't — worth making that a standing step.

## Branch / commit / PR / deploy status

Local commit on `claude/matchupservice-nflverse-fix` (branched from `main`), not yet pushed, no PR opened, nothing deployed.
