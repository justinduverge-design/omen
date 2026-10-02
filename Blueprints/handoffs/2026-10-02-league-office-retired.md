# Handoff — League Office retired (2026-10-02)

## What happened

1. **Bug found.** `src/league_office_sync_worker.js:381` had a literal `\n` inside a comment, so
   `updateSeasonAccoladeLeaders(...)` was commented out and the two $100 season races never updated.
   The same mistake hid an ESPN actuals fix in #466.
2. **Founder retired the feature.** League Office was a personal bulletin for the Slops Saloon ESPN
   league, not part of Omen. The founder chose to delete it rather than fix it or the five open Codex
   findings on the worker (#441 ×2, #463 ×3).
3. **Code removed — #515** (merge `405f5988`, deployed 23:08 UTC). Worker and its 5-minute cron line,
   Run Now workflow, diagnose script, message service, League Office-only ESPN adapter functions,
   their tests, the weekly template. Trade's `fetchEspnLeagueRosters` is untouched.
4. **Tables dropped — #518** (migration `20261002231212`, 23:12 UTC). Founder approval in session:
   "drop it, its approved just drop it", choosing outright drop over archive-first. 29 rows
   discarded, no down migration. Evidence lives in `sql/applied/2026-10-02_drop_league_office.sql`.

## Verified

- `npm test` 1537 pass; deploy green; the worker's 23:10 tick did not run (last activity 23:05:02).
- Drop rehearsed on scratch Postgres 17: drops all seven; a second run refuses; a dependent view makes
  it abort with all seven intact.
- After the drop: 0 `league_office` relations, 8 public tables, `/api/health` ok, `/api/ready` 200.
- Redo `00b`, `00d` and the catalog fixture updated; the fixture equals a fresh read-only production
  read; `scripts/db/rehearse-redo.sh` passes steps 01-10 and full teardown.

## Kept

`test/sourceSyntax.test.js` now fails on any line comment whose literal `\n` hides code. It uses
`acorn` (new devDependency) to read comments, tries every combination of `\n` sites in the file's own
source type, and flags comments with more than 10 sites for a human.

## Open

- #515 merged before Codex reviewed its last two commits (a test-only fix and a merge of `main`).
  If Codex raises more guard edge cases, fix them in a small follow-up PR.
- Truth Gate still reports 1102 P0. The count is inherited (identical on `main` before this work) and
  none mention League Office, but under the close-out rule a P0 still blocks a clean close-out.
- The 2026-10-02 Codex review compilation (which listed the League Office findings) lives only in the
  `sharp-lamarr-3e114b` worktree, not on `main`. Its League Office table is now moot.
