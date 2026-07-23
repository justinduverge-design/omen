# Omen Native Backend State Contract v1 (M0-BE)

**Status:** Active implementation contract
**Date:** 2026-07-19 (M0-BE-0 execution plan reconciled 2026-07-23)
**Owner:** Codex / backend lane
**Scope:** The four backend requirements surfaced by approved M0c. This contract and its acceptance matrix are authored once before the four small implementation PRs.

## Purpose

Give both native clients one safe, honest API/state boundary for connection and Omen readiness. This contract does not create native UI, change provider credentials, or authorize production changes.

## Shared Rules

- `GET /api/dashboard/summary` is the one app-shell readiness source for `tools.omen_of_the_week.status`.
- `ready` means an active provider connection has the provider-specific context required for the canonical `POST /api/omen/mvp-move` route to attempt a live recommendation. It does not promise a recommendation; the POST may return `success`, `empty`, or a safe recovery state.
- `pending_live_engine` means an active connection exists but lacks the provider-specific context needed for a safe live attempt. It is not a generic provider failure.
- `off_season` supersedes `ready` only after usable context exists. `needs_platform` applies when there is no active connection.
- Provider state and errors are opaque and safe. Responses, logs, tests, screenshots, and handoffs must never contain OAuth tokens, provider cookies, Vault secret identifiers, or raw provider error text.

## F2 — Omen Readiness Truth

### Provider eligibility

| Provider | `ready` requires | `pending_live_engine` when active but missing |
| --- | --- | --- |
| Yahoo | non-expired OAuth secret and a non-placeholder league ID | OAuth secret, valid token, or league ID |
| Sleeper | username and a non-placeholder league ID | username or league ID |
| ESPN | ESPN secret reference, SWID secret reference, and a non-placeholder league ID | either secret reference or league ID |

An active connection for any provider that meets its row is eligible for `ready`. The MVP service chooses its normal provider priority and owns post-attempt recovery; clients must not infer a different readiness definition.

### Workflow tree

1. Native app fetches `GET /api/dashboard/summary` after authenticated session restoration.
2. Backend classifies active connections through the shared readiness rule.
3. If none are active, return `needs_platform`; if active context is incomplete, return `pending_live_engine`.
4. If context is usable and the NFL calendar is off-season, return `off_season`; otherwise return `ready`.
5. Native calls `POST /api/omen/mvp-move` only for `ready`; it renders the returned success, empty, or recovery state honestly.

| Branch | Condition | Result | Owner |
| --- | --- | --- | --- |
| No connection | No active platform row | `needs_platform` | Backend |
| Incomplete connection | Active row lacks required provider context | `pending_live_engine` | Backend |
| Off-season | Usable context and shared NFL calendar is off-season | `off_season` | Backend |
| Attemptable | Usable context in season | `ready` | Backend + native client |
| Provider recovery | Canonical POST cannot complete after a `ready` attempt | Existing safe MVP recovery envelope | Backend + native client |

## Acceptance Matrix

| Requirement / PR | Contract acceptance | Deterministic evidence | Safety boundary | Status |
| --- | --- | --- | --- | --- |
| F2 — readiness truth | Dashboard returns `needs_platform`, `pending_live_engine`, `off_season`, or `ready` from the shared eligibility rule; native calls the MVP route only for `ready`. | `test/omenReadiness.test.js`, `test/dashboardSummary.test.js`, and live-MVP route/service tests cover no connection, incomplete and usable Yahoo/Sleeper/ESPN, plus off-season precedence. | No response adds a credential, secret reference, or raw provider error. | Complete; runtime authority is `src/services/omenReadiness.js`. |
| M0-BE-1 — safe provider-state API | Add an authenticated, additive machine-readable provider-state response that maps the M0a state machine and returns only documented opaque error codes. Existing `GET /api/platforms` callers remain compatible. | Route tests cover every documented state, an unknown/internal provider failure, missing auth, and an assertion that serialized bodies contain no token/cookie/Vault fields. | No raw provider text, OAuth state/verifier, ESPN cookie, or Vault identifier in the response/log fixture. | Completed 2026-07-23. |
| M0-BE-2 — request-id idempotency | Native Sleeper connect accepts an optional opaque 16–128-character `request_id`; a completed request is replayable for 10 minutes per authenticated user/request ID, and concurrent delivery is inert. Legacy callers without `request_id` remain compatible. | Route tests prove double-tap, retry after response loss, resumed duplicate request, in-progress duplicate, unavailable replay store, and distinct IDs. | No request ID may encode account, league, token, cookie, or provider data; no schema, deploy, or production mutation in this PR without a new approval. | Completed 2026-07-23; Yahoo remains M0-BE-3. |
| M0-BE-3 — Yahoo mobile-aware return | The approved Yahoo system-browser flow returns through `com.slopssaloon.omen://auth/callback` only after verified OAuth state; cancel/deny/expired/duplicate callbacks enter safe recovery. | `test/yahooAuthRoute.test.js` covers web compatibility, native intent, missing/invalid/expired state, deny/cancel, duplicate callback, and safe deep-link location. | Never put the OAuth code, state, token, league name, or user identifier in the deep link or error response. | Follows M0-BE-2; external OAuth/current-platform research is required before code. |

## Delivery Sequence and PR Briefs

The completed F2 slice is the first of the four small PRs. The remaining sequence is intentionally additive and is not a license to widen provider behavior.

1. **M0-BE-1 — Safe provider-state API.** Allowed files are `src/routes/platforms.js`, its focused tests, `Blueprints/api-routes.md`, and the two backend/frontend handoffs. Add `GET /api/platforms/state` rather than changing the meaning of `GET /api/platforms`. Its response must contain `contract_version`, provider name, M0a state, safe recovery action, and optional opaque error code. It must derive readiness from the existing F2 authority, not duplicate it. Do not touch Yahoo token exchange, ESPN cookie handling, SQL, or native UI.
2. **M0-BE-2 — Idempotent native connect/validate.** Before changing a route, inventory the durable effects of Yahoo auth start/callback and Sleeper connect. Define a replay record only if existing platform-connection upserts cannot provide correct replay semantics. Scope ESPN out of native mobile delivery until its approved store-safe path exists. Do not add a schema migration, new provider credential flow, or user-visible raw error.
3. **M0-BE-3 — Yahoo mobile-aware return.** First produce the current-primary-source research note required by the provider/OAuth boundary. Preserve the existing web callback as an explicit compatibility path. Bind any native return intent to the server-verified OAuth transaction; do not accept arbitrary redirect URLs or place authorization artifacts in the app deep link.

Each PR must update `Blueprints/handoffs/backend-to-frontend.md` with its exact request/response shape and test evidence. The execution record is `Blueprints/handoffs/2026-07-23-m0-be-shared-contract-matrix.md`.

## Security and RBAC Evidence

| Control | Evidence | Confidence |
| --- | --- | --- |
| Server-side auth remains required | Dashboard and live MVP routes retain existing auth middleware. | Confirmed |
| Credential exposure is prohibited | M0c and Security Done prohibit token, cookie, and secret exposure; F2 only uses stored-presence checks. | Confirmed |
| No external mutation | F2 reads connection metadata only; no OAuth, provider, schema, credential, deploy, or production mutation occurs. | Confirmed |
| Authority boundary | Codex owns the backend contract/tests; native clients consume status and do not infer provider readiness. | Confirmed |

## Approval Gates and Deferred Scope

- Yahoo deep-link return, provider-state API, and idempotent connection behavior remain separate PRs after F2.
- Native project scaffolding, app-store configuration, credentials, provider-cookie flows, schema changes, deployment, and real-account verification require their own approved gates.
- Any new response field or changed public meaning beyond this contract requires a frontend/backend handoff update before merge.
