# Plan A0: credential writes onto redo step 02 — security and privacy evidence

**Date:** 2026-10-03. **Audience:** founder review and Codex. **Skill:** `security-privacy-evidence`.

## Scope

The four server paths that write provider credentials now call the step 02 functions in
`sql/2026-10-01-redo/02_connection_credentials.up.sql` when they exist, and keep today's code when
they do not:

| Path | File | Step 02 function |
|---|---|---|
| ESPN connect | `src/routes/platforms.js` (`POST /espn/connect`) | `connection_store_espn` |
| Disconnect (any provider) | `src/routes/platforms.js` (`DELETE /:platform`) | `connection_revoke` |
| Yahoo token store after OAuth | `src/services/yahooAuth.js` (`persistYahooTokens`) | `connection_store_yahoo` |
| Yahoo refresh | `src/services/yahooAuth.js` (`getAuthenticatedYahooClient`) | `connection_rotate_yahoo` |

Shared module: `src/services/connectionStore.js`. Out of scope: account deletion (plan A1), and the
unused Vault helpers in `src/omen_api_v2.js`, whose routes are retired.

## Sources reviewed

- `sql/2026-10-01-redo/02_connection_credentials.up.sql` and `10_account_erasure.up.sql`
- `Blueprints/handoffs/2026-10-01-database-redo.md` (V1, V1b and the race checks)
- `Direction/reviews/2026-10-02-codex-action-plans.md` (A0, Codex #514)
- The changed files and their tests: `test/connectionStore.test.js`, `test/platforms.test.js`, `test/yahooAuth.test.js`

## Confirmed evidence

| Control / claim | Evidence | Source | Confidence |
|---|---|---|---|
| Once step 02 is applied, a secret and its connection row change in one transaction, under the per-(user, provider) advisory lock that `account_erase()` also takes | Each function's body; `concurrency-check.sh` races 1–3 (handoff) | step 02/10 SQL; handoff | confirmed |
| Disconnect no longer reports success while stranding a secret | `connection_revoke` raises if any pointed-at secret is missing; route test expects 500, the row kept, and no Vault deletes | `platforms.test.js` | confirmed |
| Concurrent Yahoo refreshes do not race the provider or overwrite each other | Within a process, one Yahoo exchange per user at a time, shared by concurrent callers (Codex, #525). Across processes, a compare-and-swap on the `token_expires_at` the request read, so the loser writes nothing; and an exchange that fails because another process already rotated the token uses the stored token | `yahooAuth.test.js` | confirmed (unit); the SQL was verified in V1 |
| Cookie and token values never appear in errors or logs from the new module | Errors carry the function name and Postgres code only; the fallback warning carries the function name only; tested with a sentinel secret | `connectionStore.test.js` | confirmed |
| A disconnect failure does not log Vault secret ids | Route test checks both the logs and the response body | `platforms.test.js` | confirmed |
| A misspelled argument cannot silently disable the new path | A test parses the SQL signatures and compares them with the argument names the module sends | `connectionStore.test.js` | confirmed |
| Behaviour is unchanged until step 02 is applied | The fakes return `PGRST202`, as production does today; the legacy tests still pass | test fakes | confirmed |
| Only the server can call these functions | `EXECUTE` is granted to `service_role` only, and revoked from `public`, `anon` and `authenticated` | step 02 SQL; V1 | confirmed |

## Data classification

| Data type | Sensitivity | Flow | Notes |
|---|---|---|---|
| ESPN `espn_s2` and SWID cookies | Secret (fact #6) | App → API → RPC argument → Vault | Same exposure as the existing `vault_create_secret` RPC. Production does not log bound parameters (pgaudit `none`, read 2026-10-01) |
| Yahoo access and refresh tokens | Secret | Yahoo → API → RPC argument → Vault | As above |
| User id, platform, league id | Internal | API → `platform_connections` | Unchanged |

## Consent and user expectations

There is no new data and no new use. Disconnect becomes stricter: if any secret cannot be deleted,
the user now sees a failure instead of a false "disconnected", and can retry.

## Access and RBAC notes

`service_role` can already read Vault directly (Supabase's default, found by V1). The functions add
atomicity, not access control. Protection of the stored cookies still rests on only the server
holding the service key (sprint items S1 and S2).

## Gaps and unknowns

- The functions have never been called through PostgREST. Every V1 run called them in SQL, so
  named-argument resolution through the REST layer has not been exercised on real Supabase. The
  signature test guards the names, but not PostgREST's resolution. **Next check:** after step 02 is
  applied, an ESPN reconnect on the founder's device, then confirm the "Step 02 function not present"
  warning has stopped.
- The fallback warning is logged once per function per process. The runbook's verify step for
  step 02 must look for its absence after the deploy that follows the apply.

- Two **processes** can still exchange the same refresh token at once (the API and cron containers;
  cron does not refresh Yahoo tokens while Tuesday scoring is off). If Yahoo revokes the old token,
  the loser's exchange fails, re-reads, and uses the token the winner stored. If both exchanges
  succeed with different refresh tokens, the compare-and-swap keeps the first one. Whether Yahoo
  then honours it is Yahoo's behaviour and is not verified here.

## Approval required

Applying step 02 in production is a separate founder-approved order. This change only makes the
server ready for it.

## Recommended next safe step

Merge after the Codex review. Deploy before plan A1, so both are live before steps 05 and 10.
