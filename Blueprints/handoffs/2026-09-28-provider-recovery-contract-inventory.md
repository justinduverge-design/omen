# Provider recovery contract inventory

Status: source-backed inventory; no UI redesign, schema application, or production change.

This inventory records the recovery behavior that clients can rely on today. It separates the
provider-state endpoint from the league directory because they do not currently expose the same
state vocabulary. A client must use the contract for the endpoint it called and must not derive a
reconnect decision from a raw HTTP status or from secret-reference presence.

| Surface | Source-backed response states | Recovery action | Client meaning | Source / test |
| --- | --- | --- | --- | --- |
| `GET /api/platforms/state` (`platform-provider-state.v1`) | `not_started`, `resolving_account`, `choosing_league`, `needs_reauth`, `connected`; persisted health may additionally be `reconnect_required` or `temporarily_unavailable` | `start_connection`, `retry`, `choose_league`, `reauthenticate`, or `null` | Render the provider's explicit state and action. Do not infer from credentials or HTTP status. | `src/routes/platforms.js:providerState`; `test/platforms.test.js` |
| `GET /api/platforms/state` lookup failure | HTTP `503`, `state: retryable_error`, `recovery_action: retry`, opaque `error_code: provider_state_unavailable` | Retry | The state read failed; this is not proof that the provider is disconnected. | `src/routes/platforms.js`; `test/platforms.test.js` |
| `GET /api/leagues` (`league-directory.v1`) | `not_connected`, `connected`, `reconnect_required`, `temporarily_unavailable`; provider discovery may be `full` or `unavailable` | Reconnect for `reconnect_required`; retry for `temporarily_unavailable` or unavailable discovery | Degrade only the affected provider group. Preserve other provider groups and never turn a failed read into an empty account. | `src/routes/leagues.js`; `test/leaguesDirectoryRoute.test.js` |
| provider observation classifier | HTTP `401/403` → `reconnect_required`; `408/425/429/5xx` or timeout → `temporarily_unavailable`; other `4xx` → operation error with no credential eviction | Reauthenticate, retry later, or show operation error as appropriate | A malformed request (`400`) must not log the user out. Generation mismatch makes an observation stale. | `src/services/providerConnectionState.js`; `test/providerConnectionState.test.js` |

## Native/web recovery rules

- Native callers should prefer `platform-provider-state.v1` for connection-flow state and
  `league-directory.v1` for league listing. The existing frontend handoff that names
  `needs_reauth`/`retryable_error` is older than the persisted health vocabulary; this is a
  compatibility seam, not permission to rename responses in place.
- A `reconnect_required` response means the user should reconnect that provider. The reconnect
  flow must obtain fresh provider authorization/session material through the existing connection
  route. It must not display or copy cookies, tokens, Vault IDs, or raw provider errors.
- A `temporarily_unavailable` response means retry later. It must not evict credentials or force a
  reconnect. Preserve the last known account context while the retry is pending.
- `GET /api/leagues` may return one provider group as unavailable while other groups remain usable.
  A client must not interpret an unavailable group as “the user has no leagues.”
- A successful provider observation clears the temporary failure streak only when it is for the
  current credential generation. Older in-flight responses are ignored by the transition helper.

## Known gaps

1. `platform-provider-state.v1` and `league-directory.v1` need a future additive shared vocabulary
   or an explicit versioned mapping. This inventory intentionally does not silently change either
   endpoint.
2. Provider health columns are prepared but not yet applied to production. Until then, routes use
   the documented compatibility fallback for older rows.
3. Native and web clients still need endpoint-by-endpoint acceptance tests proving reconnect,
   retryable outage, partial directory failure, and stale-response behavior on real builds.

## Evidence boundary

This file describes repository behavior only. It does not claim device verification, production
deployment, provider-account mutation, database migration application, or compliance certification.
