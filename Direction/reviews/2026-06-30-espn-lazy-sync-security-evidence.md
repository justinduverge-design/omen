# ESPN Lazy Sync Security Evidence

## Scope

Authenticated ESPN live draft discovery/state routes:

```text
GET /api/espn/draft?leagueId=...
GET /api/espn/draft/:draftId
GET /api/espn/draft/:draftId/state?since=...
```

## Sources Reviewed

- `Blueprints/done/security-done.md`
- `Direction/facts-of-record.md`
- `src/routes/espn.js`
- `src/adapters/espn.js`
- `src/services/espnDraft.js`
- `test/espnDraftRoute.test.js`
- `test/espnDraftService.test.js`
- `test/espnAdapter.test.js`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Auth remains server-enforced | All three ESPN draft routes use the existing `requireAuth` middleware. | `src/routes/espn.js` | confirmed |
| No new secret storage or credential flow | The routes reuse the existing `platform_connections` row plus Vault decrypt flow for `espn_secret_id` and `swid_secret_id`. | `src/routes/espn.js` | confirmed |
| ESPN cookies never leave the server | Public responses contain only normalized draft metadata, pick data, cursors, and polling hints; no cookie, Vault id, auth header, or raw ESPN body is serialized. | `src/routes/espn.js`, `src/adapters/espn.js` | confirmed |
| Cross-league access fails closed | Draft requests are restricted to the authenticated user's connected ESPN league. Mismatched `leagueId` or synthetic `draftId` league returns `404 espn_draft_not_found`. | `src/routes/espn.js`, `test/espnDraftRoute.test.js` | confirmed |
| Cache scope is safe | The short debounce cache is keyed by authenticated `userId` + `leagueId`, not by raw cookie values or headers. | `src/routes/espn.js` | confirmed |
| Incomplete ESPN ownership/order metadata does not guess | `user_draft_slot` and `slot_to_roster_id` are nullable and stay fail-closed when ESPN does not safely expose order data. | `src/services/espnDraft.js`, `src/adapters/espn.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Draft picks and slot order | low user-context data | ESPN provider -> normalized route response | Returned only for the authenticated connected league. |
| `poll_after_seconds` / `debounce_ms` hints | low | server-generated | No credential or provider-risk content. |
| Synthetic `draft_id` (`espn:<leagueId>`) | low internal contract id | server-generated | Avoids implying a provider-issued public draft id. |
| ESPN cookies (`espn_s2`, `SWID`) | secret / high risk | Vault -> server-only adapter | Never returned, logged, or echoed. |

## Consent and User Expectations

Users who connect ESPN already expect Omen to read league context for connected features. This change stays inside that expectation and does not add sharing, export, or third-party disclosure.

## Access and RBAC Notes

No new table, RLS policy, admin action, or privileged mutation. The contract is additive on top of the existing authenticated ESPN connection path.

## External Systems

- ESPN fantasy v3 private/cookie-backed league endpoint family.

## Gaps and Unknowns

- ESPN's private draft payload can drift.
- Exact draft-order metadata is provider-dependent and may remain null.
- Real-account ESPN production smoke was not run in this task.

## Approval Required

No new approval is required for the local contract implementation itself. Any later production deploy or real-account ESPN smoke remains Justin-gated.

## Recommended Next Safe Step

Frontend work can consume the new `/api/espn/draft*` routes directly and should treat nullable slot metadata as unavailable, not as a failed request.
