# Phase 2.17 — Platform `lastResult` field for post-win pulse

**Date:** 2026-06-29
**Agent:** Claude (Sonnet 4.6)
**Branch:** `claude/phase2-17-platform-last-result` (commits `29e1217`, `149668e`)
**Status:** Implementation complete, code-reviewed, tests green. **Not merged or deployed** — PR pending Justin's review.

## What shipped

`GET /api/dashboard/summary` now always carries `lastResult` (`"W"|"L"|"T"|null`), `lastGameId` (string|null), and `lastGameKickoff` (ISO8601|null) inside each of `platforms.yahoo` / `platforms.sleeper` / `platforms.espn`. Full contract: `Blueprints/handoffs/backend-to-frontend.md` Phase 2.17 section.

Scope decision made with Justin before building (see `Direction/decision_log.md` 2026-06-29): this is the user's **fantasy matchup** result, not their theme-selected real NFL team's game result — those are two different data sources and the sprint item's wording pointed at the former.

## Files changed

- `src/routes/dashboard.js` — `attachLastResult()`, `withTimeout()`, extended `getPlatformRows()` select
- `src/services/nflSchedule.js` — `getLastCompletedNflWeek()` (confirms against real ESPN scoreboard, not calendar math)
- `src/adapters/sleeper.js` — `fetchSleeperMatchups()`, `fetchSleeperLastMatchupResult()`
- `src/adapters/yahoo.js` — `fetchYahooLastMatchupResult()`
- `src/services/yahoo.js` — `YahooClient.getTeamMatchups()`
- `src/adapters/espn.js` — `fetchEspnLastMatchupResult()` + new Redis cache layer
- `test/dashboardSummary.test.js`, `test/nflSchedule.test.js`, `test/sleeperAdapter.test.js`, `test/yahooAdapter.test.js`, `test/espnAdapter.test.js`

## Verification

- Full backend suite: 368/369 (`npm test`). The one failure, `deploy workflow has a quality gate before image build` in `test/deployHardening.test.js`, is a pre-existing Windows CRLF line-ending issue — confirmed present with all Phase 2.17 changes stashed out, unrelated to this work.
- `npm audit --audit-level=moderate`: 0 vulnerabilities. No new dependencies — reuses `axios`, `@upstash/redis`, `https` already declared.
- `git diff --check`: clean.
- `slops-code-review` (inline self-review against the skill's lenses): found and fixed one P0 + two P1 before this commit — see below.

## slops-code-review findings (all resolved before merge-readiness)

- **P0, fixed:** an earlier draft's ESPN cache-key fallback embedded the raw SWID cookie in a Redis key when `espn_team_id` was unknown — persisting an ESPN credential in plaintext (violates `Blueprints/security-privacy.md` / `espnAuth.js`'s explicit rule). Fixed: caching is skipped entirely (always live-fetch) when `teamId` is unavailable. Regression test: `fetchEspnLastMatchupResult never caches when teamId is unknown (no SWID-keyed fallback)` in `test/espnAdapter.test.js`.
- **P1, fixed:** ESPN matchup results had no caching at all — every dashboard load for an ESPN user would hit live ESPN servers on this latency-watched route. Fixed: added 6h Redis caching by `leagueId:week:teamId`, mirroring Sleeper/Yahoo.
- **P1, fixed:** Yahoo's `fetch` and ESPN's `https.request` calls have no timeout — a hung upstream call would stall `/api/dashboard/summary` indefinitely. Fixed: `withTimeout()` wraps every platform lookup at 4s. Regression test: `times out a hung platform adapter instead of hanging the response` in `test/dashboardSummary.test.js`.
- **P2, not fixed (noted):** Sleeper's uncached path makes 3 sequential API calls (user lookup, roster lookup, matchups) per request; Yahoo makes 2. Acceptable reuse of existing adapter functions rather than building a parallel lighter-weight path; flagged as a future optimization, not blocking.

## Security

- ESPN credentials (`espn_s2`, `swid`) confirmed never logged or echoed — grepped the full diff, only flow through function parameters into the existing `fetchEspnApi`/`findUserTeam` calls.
- `Blueprints/done/security-done.md` gates: 1–2 N/A (no secrets touched, no production config), 3 N/A (no new table/RLS path — extended `SELECT` on already-selected `platform_connections` columns), 4 unchanged (`requireAuth` already gates `/summary`), 5 N/A, 6–7 verified above, 8 N/A (no new Sentry-capturing error path — failures stay caught and logged via `logger.warn`, never re-thrown), 9 done (this review), 10 done (0 new deps, audit clean), 11 N/A (no new data classification/retention/consent/sharing boundary — derived, transient, non-persisted field from existing credential flows), 12 see skill-usage-ledger.

## Skills

- **Invoked:** `slops-code-review` (inline self-review, see findings above).
- **Considered, N/A:** `anthropic-skills:pre-build-research` — this isn't a new external vendor choice, it's adding endpoints to platforms already integrated (Yahoo/Sleeper/ESPN); the API-shape investigation was done by direct source reading instead. `ui-ux-pro-max` / `slops-ui-ux-audit` / `slops-ux-copy` — N/A, no UI surface in this item (Frontend Phase 1.5d, separately queued and still blocked on its own frontend work, is the consumer). `slops-tdd` — tests were written alongside implementation per function rather than a strict red-green sequence; functionally equivalent (every new code path has a corresponding passing test) but not literally TDD-ordered.

## Environment note

Backend `node_modules` in this checkout was essentially empty before this session (only a stray leftover package) — `npm ci` was run with Justin's explicit approval to make the test suite runnable at all. No `package.json`/`package-lock.json` change.

## Limitations / disclosed gaps

- "Last completed week" assumes fantasy weeks line up with the standard NFL week boundary across all three platforms; non-standard league week schedules aren't specifically handled.
- No frontend consumer yet — Frontend Phase 1.5d remains separately blocked on its own UI work.
- This was not deployed or production-smoked — it's a branch + local verification only.

## Next recommended step

Justin reviews the diff/PR. Once approved: merge, deploy via the normal `main` workflow, then Phase 1.5d's backend blocker (`Backend Phase 2.17 [ ]` in `current_sprint.md:61`) can flip to `[x]`.
