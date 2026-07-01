# Win-Streak Summary Contract Security Evidence

## Scope

Backend-only additive dashboard summary field for connected Sleeper, Yahoo, and ESPN platform rows:
`platforms.<provider>.currentWinStreak`.

## Sources Reviewed

- `Direction/facts-of-record.md`
- `Blueprints/done/security-done.md`
- `src/routes/dashboard.js`
- `src/adapters/sleeper.js`
- `src/adapters/yahoo.js`
- `src/adapters/espn.js`
- `src/services/yahooAuth.js`
- `src/services/espnAuth.js`
- `test/dashboardSummary.test.js`
- `test/sleeperAdapter.test.js`
- `test/yahooAdapter.test.js`
- `test/espnAdapter.test.js`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| No new endpoint or auth boundary | Existing `GET /api/dashboard/summary` remains behind `requireAuth`; the streak field is additive only. | `src/routes/dashboard.js` | confirmed |
| No new secret storage or credential flow | Yahoo and ESPN streak enrichment reuse the existing Vault-backed credential factories and adapter families. No env, SQL, or package change was introduced. | `src/services/yahooAuth.js`, `src/services/espnAuth.js` | confirmed |
| ESPN cookies are not exposed | ESPN enrichment returns only a normalized streak integer or `null`; no cookie, Vault id, auth header, or raw provider body is serialized. | `src/adapters/espn.js`, `src/routes/dashboard.js` | confirmed |
| Fail-closed semantics preserve honesty | Losses and ties normalize to `0`; unavailable, ambiguous, or unsafe provider history returns `null` instead of a guessed streak. | adapter helpers and tests | confirmed |
| Provider failures do not break dashboard summary | Provider history lookup errors are isolated so the summary stays usable and the streak field remains `null`. | `src/routes/dashboard.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Current win-streak integer | low user-context data | Provider adapter -> dashboard summary | Additive display hint for post-win UI rewards. |
| Historical fantasy matchup outcomes | low user-context data | Provider adapter internal parsing only | Used server-side to count safe consecutive wins; raw history is not returned. |
| Yahoo OAuth token | secret | Vault -> server-only Yahoo client | Not returned. |
| ESPN cookies | secret / high risk | Vault -> server-only ESPN adapter | Not returned, logged, or echoed. |
| Sleeper public league history | low public/provider data | Sleeper public API -> server adapter | Reduced to normalized streak integer or `null`. |

## Consent and User Expectations

Users who connect Sleeper, Yahoo, or ESPN already expect Omen to read league and matchup context for dashboard and recommendation features. This change stays inside that same connected-platform expectation and does not introduce sharing, export, or third-party disclosure.

## Access and RBAC Notes

No new table, RLS policy, admin workflow, or privileged mutation. Dashboard summary remains authenticated per user; provider access is derived from that user's existing platform connection rows.

## External Systems

- Sleeper public API.
- Yahoo Fantasy Sports API via existing OAuth.
- ESPN fantasy API via the existing cookie-backed adapter.

## Gaps and Unknowns

- ESPN's private API schema can drift and may limit older-history availability.
- Some provider histories can be incomplete or ambiguous, which correctly returns `null` instead of a guessed streak.
- Real-account ESPN production smoke was not run in this task.

## Approval Required

No new approval is required for this additive backend field. Any future production deploy or real-account ESPN smoke remains Justin-gated.

## Recommended Next Safe Step

Frontend Phase 2.19 can consume `currentWinStreak` directly and should treat `null` as unavailable and `0` as no active streak.
