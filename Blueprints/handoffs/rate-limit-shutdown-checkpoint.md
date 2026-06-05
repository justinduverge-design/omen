# Rate-Limit Shutdown Checkpoint

Date: 2026-06-04
Session: ESPN adapter debugging — User-Agent fix, redirect following, root cause diagnosis
Layer: Layer 2 — Corvus product backend (espn adapter)

---

## Current Project State

- Corvus is live on Oracle VPS. Backend suite was 260/260 before this session.
- ESPN connect is still failing in production with "Those cookies were rejected by ESPN."
- Root cause is confirmed: `currentSeason()` returns 2026 but ESPN's 2026 season does not exist until August. All active user leagues are 2025. Every API call hits `/seasons/2026/...` and fails.
- The fix is written as a Codex prompt (below) but NOT yet applied or deployed.
- Worktree `claude/ecstatic-newton-f05326` contains all Session 8 frontend work plus Trade Analyzer Phase 2 and ConnectLeague copy polish. It is committed but NOT merged into main.
- Four backend contracts built in a prior session are pending merge+deploy: `POST /api/omen/feedback`, `GET /api/moves`, `GET /api/league/standings`, `PATCH /api/account/preferences`.
- Stripe webhook recovery fix built in a prior session is not deployed.

---

## Work Completed This Session

1. **ESPN adapter rewrite (commit `39bd012`)** — removed `espn-fantasy-football-api/node` which bundles its own axios and sends `User-Agent: axios/VERSION`; replaced with direct Node.js `https` calls using browser-like headers (Chrome UA, `Referer: https://fantasy.espn.com/`, `Accept-Language`).
2. **ESPN tests updated (commit `2c1dc6d`)** — `test/espnAdapter.test.js` mock now intercepts Node's `https` module instead of the removed library; 8/8 tests pass.
3. **Redirect following + scoringPeriodId (commit `e6fa2a8`)** — added `doEspnRequest()` that follows 301/302/307/308 redirects up to 3 hops; passes `scoringPeriodId` as a URL query param.
4. **Root cause identified** — `currentSeason()` = 2026; ESPN 2026 fantasy season not available until August; all active leagues are 2025 season data.
5. **Codex prompt written** — `activeSeason()` + `verifyLeagueAccess()` fix ready to hand to Codex (see Exact Next Prompt below).

---

## Files Changed

### Main branch (pushed)
- `src/adapters/espn.js` — library removed; `https` helper with browser headers; redirect following; scoringPeriodId in URL
- `test/espnAdapter.test.js` — mock updated to intercept `https`

### Worktree `claude/ecstatic-newton-f05326` (committed, NOT merged)
- `frontend/src/pages/ConnectLeague.jsx` — ESPN domain fix (`fantasy.espn.com`), FieldInput hint props, guide copy polish
- `frontend/src/pages/TradeAnalyzer.jsx` — Phase 2: scoring format pill toggle, ⇄ glyph, VORP tooltip, MockBanner footer
- `Blueprints/handoffs/frontend-to-backend.md` — status sync for requests 19/21/22/23
- All 17 frontend pages from Session 8

---

## Files Not Found

- No missing files encountered this session.

---

## What Was Not Done

- Codex prompt for `activeSeason()` + `verifyLeagueAccess()` not yet run or deployed — ESPN connect still broken in production
- Worktree `claude/ecstatic-newton-f05326` not merged
- Stripe webhook recovery not deployed
- Authenticated smokes for `PATCH /api/account/preferences` and `GET /api/moves` not run
- ConnectLeague guide still shows `espn.com` in production (fix is in worktree only)
- Logo SVG swap not done — waiting on asset

---

## Current Risks / Open Questions

1. **ESPN connect broken in production** — fix is written and locally tested but not deployed. Users who try ESPN connect will fail until Codex applies the `activeSeason()` + `verifyLeagueAccess()` prompt.
2. **Worktree not merged** — 17-page frontend session, Trade Analyzer Phase 2, and ConnectLeague copy polish are invisible to production. No data loss risk (committed at `ce14e4f`).
3. **Stripe webhook recovery** — failed `customer.subscription.created` event has not been resent and confirmed. Not deployed.
4. **Season detection boundary** — `activeSeason()` returns `getFullYear() - 1` from Jan–Jul. Verify behavior is correct when the 2026 season opens in August.
5. **ConnectLeague guide says espn.com in production** — users are directed to the wrong cookie domain until worktree merges.

---

## Recommended Next Step

Run the Codex prompt below first. It is the only thing blocking ESPN connect for real users. After it deploys and ESPN connect is confirmed working, merge the worktree, then deploy the Stripe webhook recovery.

---

## Exact Next Prompt For Justin

### Step 1 — Give this to Codex

```
Fix ESPN connect — wrong season year + add verifyLeagueAccess

Files to edit: src/adapters/espn.js, src/routes/platforms.js, test/espnAdapter.test.js
Do NOT touch: Stripe, Supabase migrations, auth, Docker, Nginx, deploy config, any other file.

Fix 1 — replace currentSeason() with activeSeason() in src/adapters/espn.js

The current currentSeason() returns new Date().getFullYear(). In June 2026 that is 2026,
but ESPN's 2026 fantasy season does not start until August. All active leagues are the 2025
season. Every API request hits /seasons/2026/... which does not exist, causing ESPN to return
an error that the validation code maps to cookie rejection.

Replace the function:

  function activeSeason() {
    const now = new Date();
    // ESPN seasons are named for the NFL year. New season data begins in August.
    return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  }

Replace the one call inside fetchEspnApi from currentSeason() to activeSeason().

---

Fix 2 — add verifyLeagueAccess to src/adapters/espn.js

Add this exported function after buildLeagueStandings:

  async function verifyLeagueAccess(leagueId, espn_s2, swid, espnTeamId) {
    const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam"]);
    const teams = data?.teams || [];
    const opts = espnTeamId != null ? { teamId: espnTeamId } : {};
    const team = findUserTeam(teams, swid, opts);
    if (!team) {
      const err = new Error("ESPN team not found in this league");
      err.status = 404;
      throw err;
    }
    return { team_id: teamId(team), team_name: teamName(team) };
  }

Add verifyLeagueAccess to module.exports.

---

Fix 3 — update validateEspnConnection in src/routes/platforms.js

  async function validateEspnConnection({ leagueId, espn_s2, swid, espnTeamId }) {
    try {
      await espnAdapter.verifyLeagueAccess(leagueId, espn_s2, swid, espnTeamId || null);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        status: error?.status || error?.response?.status || null,
        message: error?.message || "ESPN connection validation failed",
      };
    }
  }

---

Fix 4 — add safe diagnostic logging in doEspnRequest in src/adapters/espn.js

Add at top of file:
  const { logger } = require("../middleware/logging");

Inside doEspnRequest, after body is read, before the status checks:
  logger.info(`[espn] ${hostname}${path.split("?")[0]} -> HTTP ${res.statusCode}`);

NEVER log cookie values, the Cookie header, espn_s2 value, or SWID value.

---

Fix 5 — add two tests to test/espnAdapter.test.js

  test("verifyLeagueAccess returns team_id and team_name for a known team", async () => {
    const adapter = loadEspnAdapterWithTeams([
      { id: 9, ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Current Team" },
    ]);
    const result = await adapter.verifyLeagueAccess(
      "12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null
    );
    assert.equal(result.team_id, "9");
    assert.equal(result.team_name, "Current Team");
  });

  test("verifyLeagueAccess throws 404 when team not found", async () => {
    const adapter = loadEspnAdapterWithTeams([
      { id: 99, ownerId: "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", name: "Other Team" },
    ]);
    await assert.rejects(
      () => adapter.verifyLeagueAccess("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null),
      (err) => err.status === 404
    );
  });

---

After editing: run node --test test/espnAdapter.test.js and confirm all tests pass.
Commit message: fix(espn): use activeSeason() and verifyLeagueAccess for connect validation
Push through the normal GitHub Actions deploy path.
Security constraint: ESPN cookie values must never appear in any log output or API response.
```

---

### Step 2 — Give this to Claude after Codex deploys

```
Corvus ESPN connect fix (activeSeason + verifyLeagueAccess) was just deployed by Codex.

1. Retry ESPN connect at /account/connect with fresh cookies from fantasy.espn.com —
   use Firefox DevTools, Storage tab, Cookies, click https://fantasy.espn.com. Copy
   espn_s2 and SWID raw values. Confirm connection succeeds or report the exact new error.

2. If ESPN connect works: merge worktree claude/ecstatic-newton-f05326 into main and deploy.
   That worktree contains: all 17 Session 8 frontend pages (Ledger, Standings, etc.), Trade
   Analyzer Phase 2 (scoring format toggle, glyph, VORP tooltip, MockBanner), and
   ConnectLeague copy polish (fantasy.espn.com guide domain, hint text under cookie fields).
   Write a Codex merge prompt if needed.

3. After the worktree merge deploys: deploy the Stripe webhook recovery fix (built in a prior
   session, not yet deployed) and resend the failed customer.subscription.created event from
   the Stripe dashboard. Confirm 200 delivery.

Read Direction/current_sprint.md and Blueprints/handoffs/backend-to-frontend.md first.
Do not edit backend logic, database schema, auth, Stripe, Docker, Nginx, or deploy config
unless explicitly asked.
```
