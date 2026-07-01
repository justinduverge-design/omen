# Yahoo Lazy Sync Security Evidence

## Scope

Authenticated Yahoo live draft discovery/state routes:

```text
GET /api/yahoo/draft?leagueKey=...
GET /api/yahoo/draft/:draftId
GET /api/yahoo/draft/:draftId/state?since=...
```

## Sources Reviewed

- `Blueprints/done/security-done.md`
- `Direction/facts-of-record.md`
- `src/routes/yahoo.js`
- `src/services/yahoo.js`
- `src/services/yahooAuth.js`
- `src/adapters/yahoo.js`
- `src/services/yahooDraft.js`
- `test/yahooDraftRoute.test.js`
- `test/yahooDraftService.test.js`
- `test/yahooAdapter.test.js`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Auth remains server-enforced | All Yahoo draft routes use the existing `requireAuth` middleware. | `src/routes/yahoo.js` | confirmed |
| Existing OAuth path is reused | Draft routes rely on `getAuthenticatedYahooClient()` and the existing refreshed token flow rather than introducing a second Yahoo credential path. | `src/services/yahooAuth.js`, `src/routes/yahoo.js` | confirmed |
| Connected-league scope fails closed | Requests are restricted to the authenticated user's connected Yahoo `league_id`; mismatches return `404 yahoo_draft_not_found`. | `src/routes/yahoo.js`, `test/yahooDraftRoute.test.js` | confirmed |
| Tokens do not leave the server | Public responses contain only normalized draft metadata, picks, cursors, and polling hints; no access token, refresh token, secret id, or raw Yahoo body is serialized. | `src/routes/yahoo.js`, `src/services/yahooAuth.js` | confirmed |
| Cache scope is safe | The short debounce cache is keyed by authenticated `userId` + `leagueKey`, not by bearer token or raw OAuth material. | `src/routes/yahoo.js` | confirmed |
| Provider uncertainty is explicit | Nullable `user_draft_slot` and `slot_to_roster_id` are allowed instead of manufacturing a draft order. | `src/services/yahooDraft.js`, `src/adapters/yahoo.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Draft picks and slot order | low user-context data | Yahoo provider -> normalized route response | Returned only for the authenticated connected league. |
| Polling hints | low | server-generated | No credential or provider-risk content. |
| Synthetic `draft_id` (`yahoo:<leagueKey>`) | low internal contract id | server-generated | Avoids overstating provider-native draft identity. |
| Yahoo OAuth access/refresh tokens | secret | Vault -> server-only Yahoo client | Never returned, logged, or echoed. |

## Consent and User Expectations

Users who connect Yahoo already expect Omen to read league context for personalized fantasy features. This change stays inside that expectation and does not add sharing, export, or third-party disclosure.

## Access and RBAC Notes

No new table, RLS policy, admin mutation, or privileged action. The routes remain additive behavior on top of the current authenticated Yahoo connection path.

## External Systems

- Yahoo Fantasy Sports API over the existing OAuth-backed client.

## Gaps and Unknowns

- Yahoo's deep nested response shape can drift.
- Some optional settings fields may be unavailable and correctly remain null/zero in the contract.
- Real-account production Yahoo draft smoke was not run in this task.

## Approval Required

No new approval is required for the local contract implementation itself. Any later deploy or real-account production smoke remains Justin-gated.

## Recommended Next Safe Step

Frontend work can consume the new `/api/yahoo/draft*` routes directly and should treat null slot/order metadata as unavailable rather than as a route failure.
