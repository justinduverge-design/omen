# 2026-07-04 — Canonical Off-Season Signal Code Review

Scope: working-tree diff on branch `codex/canonical-offseason-signal`.

Base: local parent branch `codex/phase1-14-deploy-logo-verification`; no push, merge, deploy, package edit, migration, env edit, or production mutation performed.

Files reviewed:

- `src/services/nflSchedule.js`
- `src/routes/dashboard.js`
- `src/routes/league.js`
- `test/nflSchedule.test.js`
- `test/dashboardSummary.test.js`
- `test/leagueStandingsRoute.test.js`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/handoffs/frontend-to-backend.md`

Verdict: PASS — mergeable after Justin's normal commit/push/PR gate. No P0 or P1 findings.

## Findings

No P0/P1 findings.

## Review Notes

- Contract and correctness: `src/services/nflSchedule.js:25` centralizes the raw season/week calculation and `src/services/nflSchedule.js:54` exposes the off-season predicate. This keeps dashboard and standings on one calendar rule.
- Dashboard precedence: `src/routes/dashboard.js:220` keeps the existing no-platform, pending-live-engine, and subscription gates ahead of the new `off_season` status, so disconnected or unsubscribed users do not get misleading seasonal copy.
- Standings behavior: `src/routes/league.js:192` returns the normal empty `league-standings.v1` envelope before provider adapter calls only when the shared helper says the app is off-season. The existing in-season provider error handling remains below it.
- Security and privacy: no new auth path, credential read, provider token/cookie logging, SQL, RLS, secret, env, telemetry, or external sharing boundary was added. The off-season standings path reduces provider calls instead of adding new ones.
- Simplicity: the change reuses the existing date math instead of adding provider probes, new route parameters, new response fields, or a new dependency.

## Verification Evidence

- RED focused run failed for the expected reasons: missing `isOffSeason`, dashboard `ready` instead of `off_season`, and standings `502` instead of empty success.
- GREEN focused run: `node --test test/nflSchedule.test.js test/dashboardSummary.test.js test/leagueStandingsRoute.test.js` -> 28/28.
- Full backend suite: `npm test` -> 407/407.
- Dependency audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Frontend build: `npm --prefix frontend run build` -> clean with existing warnings (`.env` `NODE_ENV`, duplicate `className` in `Header.jsx`, Vite chunk size).
- Final diff check: `git diff --check` -> clean, with only the existing CRLF normalization warnings on `Direction/agent_inbox.md` and `Direction/current_sprint.md`.

## Test Gaps / Residual Risk

- Off-season detection is calendar-based and intentionally does not follow the exact NFL schedule release, bye-week edge cases, or provider-specific availability.
- The frontend still needs to render `tools.omen_of_the_week.status === "off_season"` before calling live Omen.
- No production smoke or canary was run because this branch was not pushed, merged, or deployed.

## Actions Not Taken

- Did not add a dependency or provider API call.
- Did not change subscription, auth, Supabase, ESPN/Yahoo/Sleeper credential handling, logs, package files, migrations, or deployment workflow.
- Did not commit, push, open a PR, merge, or deploy.
