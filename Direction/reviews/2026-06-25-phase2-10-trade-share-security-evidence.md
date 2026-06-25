# Phase 2.10 Trade Share Security Evidence

## Scope

Security/privacy evidence for public Trade Analyzer share routes:

- `POST /api/trade/share`
- `GET /api/trade/share/:hash`

Audience: internal Omen handoff and Security Done evidence.

## Sources Reviewed

- `Direction/facts-of-record.md`
- `Direction/current_sprint.md`
- `Blueprints/definition-of-done.md`
- `Blueprints/done/security-done.md`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `src/routes/trade.js`
- `src/services/tradeShareStore.js`
- `test/tradeShareRoute.test.js`
- `deploy/hostinger/ENV-INVENTORY.md`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Share routes are public and do not require auth | Routes mount under existing `/api/trade` public route and do not call `requireAuth` | `src/server.js`, `src/routes/trade.js` | confirmed |
| Share routes do not read platform credentials | No Yahoo/Sleeper/ESPN adapter, Vault, Supabase, or auth service is called | `src/routes/trade.js`, `src/services/tradeShareStore.js` | confirmed |
| ESPN cookie values are not accepted as structured fields | Recursive key scan rejects `cookie`, `espn_s2`, `swid`, `token`, `secret`, `authorization`, and `password` before storage | `src/routes/trade.js`, `test/tradeShareRoute.test.js` | confirmed |
| Public snapshot payload is bounded | Requests over 16 KB return `413 trade_share_payload_too_large` | `src/routes/trade.js`, `test/tradeShareRoute.test.js` | confirmed |
| Hashes are unguessable enough for share links | Hashes come from `crypto.randomUUID()` and reads require UUID v4 shape | `src/routes/trade.js`, `test/tradeShareRoute.test.js` | confirmed |
| Production storage is not silently in-memory | Default store uses Redis only when `REDIS_URL` and `REDIS_TOKEN` exist; production without Redis returns `503 trade_share_storage_unavailable` | `src/services/tradeShareStore.js` | confirmed |
| No new dependency risk | Uses already-installed `@upstash/redis` and Node `crypto`; no package files changed | `package.json`, `src/services/tradeShareStore.js` | confirmed |
| Rate limiting applies | Routes stay under `/api/trade`, which is mounted with `publicToolRateLimit` | `src/server.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Player names, positions, teams, projected points, status | Low to moderate | User-submitted public Trade Analyzer input | Stored in public share snapshot by design |
| Trade verdict/math fields | Low | Server recomputes via `compareTrade()` | Public analysis snapshot; not live provider data |
| Share hash | Moderate | `crypto.randomUUID()` | Public bearer-style link; anyone with hash can read |
| Redis URL/token | Secret | Existing environment variables | Not read, printed, changed, or documented with values |
| ESPN/Yahoo/Sleeper credentials | Secret | Not part of this flow | Structured credential-like keys are rejected |

## Consent and User Expectations

Creating a share link makes the submitted Trade Analyzer snapshot public to anyone with the hash. The backend does not infer consent from connected platforms because this route accepts only explicit public Trade Analyzer input and never reads connected league data.

Frontend should label this as a public share action when it adds the UI. Backend contract is documented in `Blueprints/handoffs/backend-to-frontend.md`.

## Access and RBAC Notes

- No authenticated user boundary exists for share reads or writes.
- The share hash is the access boundary.
- No admin or service-role action is introduced.
- No Supabase RLS review is needed because no Supabase table/query path is added.

## External Systems

- Upstash Redis stores JSON snapshots with a 30-day TTL in production when configured.
- Redis credentials remain in environment only; values were not inspected.
- No provider APIs, LLM service, Sentry configuration, Stripe, or Supabase writes are involved.

## Gaps and Unknowns

- There is no delete/revoke endpoint for a public share hash in this phase.
- There is no server-rendered OG image yet; frontend Phase 2.10 remains blocked until it consumes these routes.
- The recursive sensitive-key scan blocks structured credential fields but cannot prove arbitrary free-text strings never contain sensitive text. The route avoids arbitrary result/explanation storage to reduce that risk.

## Approval Required

- Deploy remains Justin-gated.
- Any future Supabase-backed durable share table, revoke endpoint, or retention policy change requires separate approval.

## Recommended Next Safe Step

Frontend can build the Trade share card against `trade-share.v1`, treating the hash page as public and retryable when storage returns `503`.
