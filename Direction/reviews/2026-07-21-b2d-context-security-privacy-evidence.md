# B2-D Context Contract Security and Privacy Evidence

## Scope

Review the planned selected-context contract for issue #162 before implementation. Audience: backend and native handoff owners.

## Sources reviewed

- `src/services/omen.js`
- `src/adapters/sleeper.js`
- `src/adapters/espn.js`
- `src/services/yahoo.js`
- `sql/omen_rls_security.sql`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`

## Confirmed evidence

| Control / claim | Evidence | Confidence |
| --- | --- | --- |
| Platform connection has an opaque server row identifier. | `platform_connections.id` is a UUID primary key. | Confirmed |
| A connection can be ownership-verified server-side. | The row has `user_id`; the canonical route already authenticates before live generation. | Confirmed |
| ESPN credentials stay server-side in the current roster path. | The service decrypts stored secret references before calling the adapter; the live envelope exposes only safe summaries. | Confirmed |
| Current selection can pick a different connection than a user's intended league. | `pickLiveMvpConnection()` chooses provider priority and has no caller-selected context input. | Confirmed |
| Mock waiver output must not be reused as live Omen advice. | The legacy optimizer waiver route explicitly returns `is_mock: true` on failed/empty availability fetches; issue #162 forbids this for live canonical advice. | Confirmed |

## Data classification

| Data type | Sensitivity | Required handling |
| --- | --- | --- |
| `context_id` | Internal opaque identifier | Accept only with authenticated ownership verification; do not log or echo it. |
| Provider league/team identifiers | User-linked platform data | Return only safe summaries tied to the verified context. |
| Roster, availability, settings, opponent roster | Fantasy platform data | Use only for the selected owned context; label absence honestly. |
| OAuth tokens, ESPN cookies, Vault identifiers | Secret | Never include in request/response/logs/tests/screenshots. |

## Gaps and approval gates

- A safe context-list/provider-state response that gives native clients opaque selectable context identifiers is not yet implemented; it must be a separate M0-BE contract slice.
- Yahoo waiver projections may be incomplete. A live waiver recommendation requires a documented sufficient-evidence rule rather than a fabricated projection.
- Sleeper and ESPN waiver/trade capabilities need source-level adapter work and real-account verification before being eligible in the selector.

## Recommended next safe step

Implement B2-D1 with TDD: add owned `context_id` selection to the canonical route/service, then prove multi-league isolation and fail-closed invalid-context behavior before touching waiver or trade generation.
