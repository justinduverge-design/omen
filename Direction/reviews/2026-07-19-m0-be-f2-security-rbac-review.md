# M0-BE F2 Security and RBAC Review

## Scope

Review the shared Omen readiness rule for `GET /api/dashboard/summary` and canonical `POST /api/omen/mvp-move` selection.

## Sources Reviewed

- `AGENT.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/done/security-done.md`
- `Direction/facts-of-record.md`
- `src/routes/dashboard.js`
- `src/services/omen.js`

## Review

| Artifact | Status/Risk | RBAC Risk | Overlap Risk | Approval Needed | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Shared eligibility helper | Medium | It reads connection metadata only; it must not decrypt or emit credentials. | Dashboard and MVP service previously carried separate eligibility logic. | No additional approval for a behavior-preserving consolidation. | Restrict it to metadata presence/expiry checks and reuse it in both call sites. |
| Dashboard status | Medium | Auth stays server-side; status must not reveal secret IDs or raw failures. | Native UI consumes it but must not derive a competing state. | No. | Keep four existing safe values and document their precedence. |
| Deferred provider work | High if activated | OAuth/deep-link, provider-state, idempotency, and ESPN handling touch high-risk boundaries. | Separate backend PRs prevent scope bleed. | Yes, per their scoped task gates. | Keep deferred from F2. |

## Verdict

F2 is safe to implement as a narrow backend refactor and regression-test pass. No secrets, provider calls, user data mutation, schema work, production action, or role-authority changes are in scope.
