# Omen Native Backend State Contract v1 (M0-BE)

**Status:** Active implementation contract
**Date:** 2026-07-19
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

| Requirement / PR | Acceptance evidence | Status |
| --- | --- | --- |
| F2 — readiness truth | Dashboard tests cover no connection, incomplete Yahoo/Sleeper/ESPN, usable Yahoo/Sleeper/ESPN, and off-season precedence; dashboard and MVP selection share the Sleeper/ESPN eligibility rule. Yahoo preserves its existing live-route recovery selection. | This PR |
| 1 — Yahoo mobile return | Callback supports the registered deep link or approved mobile-aware handoff; cancel, deny, background, termination, and duplicate callback tests are safe and idempotent. | Deferred PR |
| 2 — provider-state API | Machine-readable M0a state mapping uses opaque error codes; no raw provider text, cookie, or token is exposed. | Deferred PR |
| 3 — connect idempotency | Client request ID prevents duplicate connect/validate effects across double-taps, retries, and resumes. | Deferred PR |

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
