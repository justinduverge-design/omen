# 2026-07-04 — Rate-limit scope fix + Standings off-season triage

**Owner:** Claude Code / frontend-lean, pulled from `agent_inbox.md` Top-5 #1
**Source:** Two untriaged P1s from `Solutions/reports/2026-07-02-mobile-qa-omen.md` (Cowork mobile-QA audit)

## P1 #1 — Unhandled 429 leaks raw JSON to the screen — FIXED

**Root cause was not a frontend gap.** Every page that calls `GET /api/league/standings` or `GET /api/moves` (`Standings.jsx`, `LeagueStandings.jsx`, `Ledger.jsx`/`MoveHistory.jsx`) already catches errors via the shared `apiFetch()` client (`frontend/src/lib/api.js`) and renders a friendly "Couldn't load X / Try again" state — confirmed by reading all four call sites before touching anything.

The actual bug was in `src/server.js`: the general rate limiter (100 req/min, meant for API abuse protection) was mounted globally on every request — `app.use((req, res, next) => { if (req.path === "/api/health") return next(); return generalRateLimit(req, res, next); })` — **before** the `/api` routers, the static-asset middleware (`express.static`), and the SPA catch-all (`app.get("*", ...)`) were attached. That means every JS/CSS/image/font request and every hard-navigation page load counted against the same 100/min budget as API calls. A handful of full page loads (each pulling 5-15 static sub-requests) or the audit's 32-team-switch sweep could trip it easily — and when a full-page navigation gets rate-limited, the browser renders the raw `{"error":"Too many requests, please slow down."}` JSON as the entire document, since React never mounts to catch it. This explains both the `ATL__standings.png` and `ATL__ledger.png` screenshots in the audit.

**Fix:** scoped the middleware to `/api/*` only (`src/server.js`, the rate-limit block just above `app.use("/api", systemRoutes)`):

```js
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  if (req.path === "/api/health") return next();
  return generalRateLimit(req, res, next);
});
```

**Why touched despite `src/middleware/security.js` being flagged cautious in `decision_log.md`:** the actual mount point is in `src/server.js`, not `security.js` itself (the limiter object is only *defined* in `security.js`); Justin explicitly approved this specific fix before it was made (see decision log entry below).

**Verification (live, not just unit-level):** started the production-mode server locally (`node -r dotenv/config src/server.js`, port 3000, `frontend/dist` already built) via a new `.claude/launch.json` `backend` entry, then fired 150 rapid requests at a static asset and 150 at `/api/dashboard/summary` in the same window:

- Static asset (`/omen-horizontal-lockup-transparent.png`): **150/150 → 200**, zero 429s. Confirms static/SPA traffic is now fully exempt.
- `/api/dashboard/summary`: **first 100 → 401** (no auth, expected), **next 50 → 429**. Confirms the API rate limiter is still fully functional and correctly scoped — this is not a "disable rate limiting" fix, only a scoping fix.
- `/api/health` still bypasses (200) as before.

Full `npm test`: 402/402 (no regressions). `npm audit --audit-level=moderate`: 0. `git diff --check`: clean. Diff is a single isolated block in `src/server.js`; no other file's behavior changes.

**Not done:** no generic frontend API-error boundary was added, because it's unnecessary — every current call site already handles errors gracefully once the underlying cause (over-broad rate-limit scope) is fixed. If a future page adds a raw unguarded `apiFetch()` call without a `.catch()`, that would be a new gap, not a recurrence of this one.

## P1 #2 — League Standings fails to load for connected accounts — TRIAGED, NOT FIXED

**Confirmed which of the audit's two hypotheses is correct: it's option (b), a mislabeled off-season case, not a frontend copy bug and not (on current evidence) a genuine provider fetch bug** — though it can't be fully ruled out without live provider access.

`Standings.jsx` already has a distinct, well-written empty state for "no standings yet" (`No standings yet. / Standings will appear once the season begins.`) that's separate from its generic error state (`Couldn't load standings right now.`). The empty state only renders when the backend returns a *successful* response with `standings: []`. But `src/routes/league.js`'s `GET /standings` handler (lines 192-222) has no off-season detection anywhere — any exception thrown by the Yahoo/Sleeper/ESPN provider call (highly plausible in July, with no live matchups for any platform) falls through to the generic catch block and returns a 502 `league_standings_provider_failed`, which the frontend correctly renders as the *error* state, not the empty state. `getCurrentNflWeekContext()` (`src/services/nflSchedule.js`) has no off-season signal either — it clamps `week` to `[1, 18]` year-round and never returns a boolean the caller could use to short-circuit before calling the provider.

**This is not a quick isolated fix.** It's the same gap already flagged in `decision_log.md` / `Blueprints/handoffs/frontend-to-backend.md` (2026-06-25, Phase 1.10B) for the dashboard route's `omen_of_the_week.status`. Per Justin's direction, this has been written up as **one combined backend request** covering both call sites so a single canonical `off_season` signal gets built instead of two divergent ones — see the new entry in `Blueprints/handoffs/frontend-to-backend.md` ("Request — Canonical off-season signal for dashboard + league standings").

## Files changed

- `src/server.js` — rate-limit middleware scoped to `/api/*`
- `.claude/launch.json` — added `backend` dev-server entry (local verification tooling only, not deploy config)
- `Blueprints/handoffs/frontend-to-backend.md` — new combined off-season signal request
- `Direction/current_sprint.md`, `Direction/decision_log.md`, `Direction/agent_inbox.md`, `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md` — close-out bookkeeping

## Done docs

Feature Done (bugfix, gates 1/4/12/13/17/20 apply; 2/3/5/6/7/8/9/10/11/14/15/16/18/19 N/A — no new feature surface, no frontend change). Security-adjacent consideration documented above (rate limiting stayed functionally intact; verified live, not assumed).
