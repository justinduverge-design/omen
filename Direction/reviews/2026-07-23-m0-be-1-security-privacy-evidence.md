# M0-BE-1 Provider-State API Security and Privacy Evidence

## Scope

Evidence review for additive authenticated `GET /api/platforms/state`. The route derives safe provider-flow state from existing connection metadata; it does not call a provider, mutate a connection, read a secret value, or change schema/deploy configuration.

## Confirmed Evidence

| Control | Evidence | Confidence |
| --- | --- | --- |
| Authentication | Route uses existing `requireAuth`. | Confirmed |
| Minimal response | `src/routes/platforms.js` returns platform/state/recovery/error-code fields only. | Confirmed |
| Secret absence | Focused tests assert secret IDs and injected error text are absent from body and logs. | Confirmed |
| Fail-closed outage behavior | Lookup failure returns a generic 503 `retryable_error` envelope. | Confirmed |
| Existing-client compatibility | The new route does not alter `GET /api/platforms` or `/status`. | Confirmed |

## Data and Permission Boundary

The server reads existing connection row presence fields, including secret-reference presence, solely to derive state. Neither secret-reference values nor user/provider identifiers are returned. Native clients may render only the documented opaque code and recovery action.

## Limitations and Gates

- This does not prove provider OAuth/browser cancellation, app-resume, or real-device behavior.
- ESPN native connection remains outside scope.
- M0-BE-2 needs a separate request-id/replay security review before mutating connection semantics.
