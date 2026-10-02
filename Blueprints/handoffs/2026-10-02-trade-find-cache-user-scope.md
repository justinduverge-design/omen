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

## Close-out status: DONE (was blocked)

Truth Gate first failed with **1102 P0**, all inherited: 1096 from the six sibling
`slops-saloon/omen-*` worktrees (duplicate page ids) and 6 in `omen` itself. A P0 blocks close-out, so
#516 was first recorded as BLOCKED. Cleared the same day, founder-approved: the one sibling with
unpushed work (T4) was saved as #519, all six worktrees were removed, and the last 3 P0s were fixed
(two partly-superseded banners, one citation of a report that was never committed). Truth Gate:
PASS, 0 P0. Valor Brain: 5/5 valid.

## Procedure receipt

- **Invoked by name:** `security-privacy-evidence` →
  `Direction/reviews/2026-10-02-trade-find-cache-security-privacy-evidence.md`.
- **Followed by hand, not invoked:** `slops-tdd` (regression test red on `main`, green with the fix);
  `slops-git-flow` (explicit-path commits, one branch per PR).
- **Considered and skipped:** `slops-code-review` and `rbac-risk-review` (Codex's automated PR review
  was used; no findings on #516); `slops-investigate` (cause already known from the Codex finding).
- **Evidence:** PR #516 (`e7677303`); `test/tradeFindRoute.test.js`; `npm test` 1541 pass, 0 fail; CI
  green on the head commit; gate runs as above.
- **Procedure gap:** the first close-out (#517 as first opened) marked `security-privacy-evidence` not
  applicable and recorded the work as done despite the P0s. Codex caught both.
- **Open:** whether any cross-account read actually happened is unknown. Needs a founder-gated
  production log review (see the evidence note).

## Review

Codex reacted 👍 to #516 with no inline comments. CI: all four checks green on the head commit.

## Watch for

- **#514 conflict: resolved.** #514 merged after #516 (`9889c820`) and kept the "fixed in #516" rows
  in `Direction/reviews/2026-10-02-codex-review-compilation.md`.
- **Adapter caches keyed by league, not user** (`ssff:espn:scoring:*`, `ssff:espn:lastresult:*`,
  `ssff:yahoo:lastresult:*`). Safe today because league ids come from the caller's stored connection.
  A new route that passes a request-supplied league id to them would reopen the same leak.

## Next

The compilation's "Live in production today" table still has open security and privacy items:
#295 (Yahoo 500s return raw internal errors), #296 (`/access-probe` open to any Yahoo user), #353
and #355 (vendor text and error objects reaching logs), #56 (Sleeper draft access trusts the saved
league id).
