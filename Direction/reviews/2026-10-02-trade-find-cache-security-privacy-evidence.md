# Trade-finder cache: per-user isolation (#516) — security and privacy evidence

**Date:** 2026-10-02. **Audience:** founder review, internal. **Skill:** `security-privacy-evidence`.
Not a legal or compliance claim.

## Scope

The roster-bundle cache behind `GET /api/trade/find`: who could read an entry before #516, and who can
read one after. The fix itself is in PR #516 (`e7677303`). The reasoning is in
`Direction/decision_log.md` 2026-10-02.

## Sources Reviewed

- `src/routes/trade.js`: `tradeFindCacheKey`, the `/find` handler, `readEspnRosters`, `readYahooRosters`
- `src/services/tradeFindCacheStore.js`: key prefix `omen:trade_find:`, 15-minute TTL
- `src/services/responseCache.js`: compared, as the other response cache
- `test/tradeFindRoute.test.js`: the regression test
- `Direction/reviews/2026-10-02-codex-review-compilation.md`: Codex finding on #474

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Before #516, the cache was read before any provider authorization | The `/find` handler called `tradeFindCache.read(cacheKey)` before `ROSTER_READERS[platform]`, and the key was `${platform}:${leagueId}:${week}` | `src/routes/trade.js` on `f8b09b84` | confirmed |
| The provider read is the only league-ownership check on this route | `readEspnRosters`/`readYahooRosters` use the caller's own stored credentials (`getAuthenticatedEspnCredentials`, `getAuthenticatedYahooClient`). The route has no separate membership check | `src/routes/trade.js` | confirmed |
| After #516, each entry is readable only by the user who wrote it | Key is `${userId}:${platform}:${leagueId}:${week}`; `userId` comes from `authenticate(req.headers.authorization)`, never from the request query | `src/routes/trade.js` `tradeFindCacheKey` | confirmed |
| A second user misses and goes through their own provider authorization | Two-user test: B gets `provider_reauth_required`, no candidates, no cache field. Fails on `main` before the fix | `test/tradeFindRoute.test.js` | confirmed |
| The route requires sign-in | 401 `trade_find_auth_required` without a user | `src/routes/trade.js` | confirmed |
| Old unscoped entries are not readable by the new code and expire | New code never builds the old key shape; TTL `DEFAULT_FIND_CACHE_TTL_SECONDS` = 15 min | `src/services/tradeFindCacheStore.js` | confirmed |
| `responseCache` already isolates per user | Key `omen:rc:v1:{userId}:{epoch}:…` | `src/services/responseCache.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Every team's roster in an ESPN or Yahoo league (player ids, names, positions, projections) | Medium: league data the provider shows only to league members (private leagues) | Provider read → Redis `omen:trade_find:*` → `/find` response | This is what was exposed across accounts |
| Team names | Low to medium: chosen by league members and can contain a real name | Same flow | No owner emails, provider user ids or credentials are in the bundle |
| Sleeper league rosters | Low: Sleeper leagues are public | Same flow | Scoped per user too, for a uniform rule |
| ESPN `espn_s2`/`SWID`, Yahoo tokens | High | Read from storage per request, **never written to this cache** | Unchanged by #516 |

## Consent and User Expectations

A user who connects a private league expects its rosters to be seen only by people the provider lets
in. Before #516, someone outside the league could see them by knowing or guessing the league id while
a member's entry was warm (up to 15 minutes after a member used the trade finder). After #516, Omen
matches the provider's boundary on this route.

## Access and RBAC Notes

- Who could exploit it: any signed-in Omen user who knew a league id. No admin or provider access needed.
- Who can read an entry now: only the user who wrote it, under their own `user.id`.
- Not changed: provider credential handling, RLS, database, admin routes.

## External Systems

- **Upstash Redis:** holds the entries. Old entries stay until TTL; they are not deleted.
- **ESPN, Yahoo:** the authorization source. No change to how they are called.

## Gaps and Unknowns

- **Whether anyone actually read another user's entry is unknown.** That needs a production log review
  of `/api/trade/find` requests, matching league ids to the requesting user's connections. **Requires
  authorized human verification**; not done here.
- **When `/find` was first deployed to production, and so how long the exposure lasted**, is not
  confirmed from source. `inferred`: added on the T2 branch on 2026-09-27.
- **Adapter caches keyed by league, not user** (`ssff:espn:scoring:*`, `ssff:espn:lastresult:*`,
  `ssff:yahoo:lastresult:*`). `inferred` safe today: callers pass league ids from the user's stored
  connection. A route that passes a request-supplied league id to them would reopen the same leak.

## Approval Required

- The founder decides whether the log review is needed, and whether a confirmed cross-account read
  would need user notification. This note makes no notification or legal judgment.

## Recommended Next Safe Step

A read-only production log check of `/api/trade/find` between first deploy and the #516 deploy, done
by the founder or under a founder-approved order.
