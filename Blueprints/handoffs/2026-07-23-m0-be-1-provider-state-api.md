# M0-BE-1 Provider-State API

## Outcome

Added authenticated `GET /api/platforms/state` as the additive `platform-provider-state.v1` native connection-state contract.

## Contract

For each Yahoo, Sleeper, and ESPN provider, the route emits only:

- `platform`
- persisted server-observable `state`
- `recovery_action`
- opaque `error_code`

Supported persisted states are `not_started`, `resolving_account`, `choosing_league`, `needs_reauth`, and `connected`. An unavailable metadata lookup returns a 503 `retryable_error` envelope. OAuth/browser in-flight stages are intentionally not inferred from a database row.

## Files Changed

- `src/routes/platforms.js`
- `test/platforms.test.js`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/frontend-to-backend.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/reviews/2026-07-23-m0-be-1-security-privacy-evidence.md`

## Evidence

- RED: `node --test test/platforms.test.js` failed because `/api/platforms/state` did not exist.
- GREEN: focused route suite passed 17/17, including missing auth, all stored-state branches, safe internal failure, and body/log secret absence.
- `git diff --check` passed.
- Broader quality evidence: frontend production build passed. Full `npm test` has one pre-existing native scaffold assertion failure after M4 Command Center integration; root `npm audit --audit-level=moderate` reports existing transitive advisories. Neither is caused or altered by this slice.

## Scope and Limits

No OAuth callback, provider credential, ESPN cookie, SQL/schema, deploy, native UI, or production action changed. M0-BE-2 remains the next slice.
