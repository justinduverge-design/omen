# M0-BE Shared Contract Security and RBAC Review

## Scope

Review the M0-BE-0 contract and its three follow-on backend briefs: provider-state API, request-id idempotency, and Yahoo mobile-aware return. This is a documentation review only; no credential, provider, schema, deployment, or production system was inspected or changed.

## Sources Reviewed

- `AGENTS.md` and `AGENT.md`
- `Direction/facts-of-record.md`
- `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`
- `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/api-routes.md`
- `src/routes/platforms.js`, `src/routes/yahoo.js`, and their focused tests

## Risk Review

| Artifact | Risk | RBAC / privacy finding | Required gate | Recommendation |
| --- | --- | --- | --- | --- |
| M0-BE-1 provider-state API | Medium | An additive authenticated response can accidentally expose raw provider errors, secret identifiers, or credentials. | Contract tests must assert opaque codes and prohibited-field absence. | Build as a narrow additive route; retain existing `/api/platforms` semantics. |
| M0-BE-2 request-id idempotency | High | Replay handling affects connection mutations and can create duplicate or cross-user effects if not bound to the authenticated user. | Per-user request binding, bounded lifetime, duplicate/retry tests, and no schema change without approval. | Inventory existing upserts first; use the smallest server-side replay mechanism that proves safe semantics. |
| M0-BE-3 Yahoo mobile return | High | OAuth callback/deep-link handling can become an open redirect or leak code/state/token material. | Current primary-source OAuth research, server-bound return intent, invalid/expired/duplicate callback tests. | Preserve web compatibility and fail closed; do not add arbitrary `return_to` input. |

## Confirmed Controls

| Control | Evidence | Confidence |
| --- | --- | --- |
| Omen readiness source is singular | `src/services/omenReadiness.js` and the M0-BE state contract | Confirmed |
| Current platform status is authenticated | `src/routes/platforms.js` uses `requireAuth` | Confirmed |
| ESPN secrets are treated as sensitive | platform route comments and Sentry/body-log protections | Confirmed |
| Yahoo callback consumes server-side OAuth state | `src/routes/yahoo.js` verifies then deletes `oauth_state` | Confirmed |

## Approval Gates

- No secret, token, cookie, OAuth code/state, or Vault identifier may enter client responses, logs, screenshots, tests, or handoffs.
- No database schema, provider credential, store configuration, deploy, or production action is authorized by M0-BE-0.
- ESPN has no approved native store path; it remains outside M0-BE-2 implementation scope.
- Any new persistent replay store or non-compatible public response meaning requires Justin's separate approval before implementation.

## Next Safe Step

Implement M0-BE-1 as an additive authenticated provider-state route with focused contract tests. Do not start M0-BE-2 or M0-BE-3 until M0-BE-1's exact response contract is reviewed.
