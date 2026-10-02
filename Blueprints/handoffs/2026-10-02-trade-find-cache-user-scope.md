# Handoff — trade-finder cache scoped to the user, 2026-10-02

**From:** Claude Code (backend). **To:** the founder, and whoever picks up the next Codex finding.

## What shipped

- **PR #516, merged** (`e7677303`). `GET /api/trade/find` read `tradeFindCache` before the provider
  roster read, and the key was `platform:league:week`. Any signed-in user who named another user's
  private ESPN/Yahoo league id got that user's cached roster bundle. The key now starts with the user
  id (`src/routes/trade.js`, `tradeFindCacheKey`). Reasoning: `Direction/decision_log.md` 2026-10-02.
- **Regression test:** `test/tradeFindRoute.test.js`, "never serves one user's cached ESPN league
  bundle to another user". Proven to fail on `main` before the fix. Full `npm test`: 1541 pass, 0 fail.
- **Contract fixture** `test/contracts/fixtures/trade-find.v1/unavailable.json` re-recorded: same
  shape, the new test is now the last "unavailable" response the recorder sees.
- **Tracking:** `Direction/reviews/2026-10-02-codex-review-compilation.md` was only on PR #514's branch.
  It was copied to `main` in #516, with the cache row marked fixed.

## Review

Codex reacted 👍 to #516 with no inline comments. CI: all four checks green on the head commit.

## Watch for

- **#514 will conflict** on `Direction/reviews/2026-10-02-codex-review-compilation.md` (both add it).
  Resolve by keeping the two "fixed in #516" rows and taking everything else from #514.
- **Adapter caches keyed by league, not user** (`ssff:espn:scoring:*`, `ssff:espn:lastresult:*`,
  `ssff:yahoo:lastresult:*`). Safe today because league ids come from the caller's stored connection.
  A new route that passes a request-supplied league id to them would reopen the same leak.

## Next

The compilation's "Live in production today" table still has open security and privacy items:
#295 (Yahoo 500s return raw internal errors), #296 (`/access-probe` open to any Yahoo user), #353
and #355 (vendor text and error objects reaching logs), #56 (Sleeper draft access trusts the saved
league id).
