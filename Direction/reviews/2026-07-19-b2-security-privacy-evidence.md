# B2 Security and Privacy Evidence

## Scope

Security/privacy evidence for B2 unified Omen recommendation-layer implementation.

## Sources Reviewed

- `src/routes/omen.js`
- `src/services/omen.js`
- `test/omenRoute.test.js`
- `test/omenMvpLiveRoute.test.js`
- `test/omenMvpLiveService.test.js`
- `Blueprints/specs/omen-mvp-move.md`
- `Blueprints/specs/b2-unified-omen-recommendation-layer.md`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Live Omen remains auth-gated. | Direct live POST still authenticates before off-season handling; missing auth returns `401`. | `src/routes/omen.js`, `test/omenRoute.test.js`, `test/omenMvpLiveRoute.test.js` | confirmed |
| Off-season direct POST avoids provider adapter calls. | B2 service test proves Yahoo roster, Sleeper, ESPN, Vault, and roster calls are empty when off-season is true. | `test/omenMvpLiveService.test.js` | confirmed |
| No provider secrets are exposed. | Recovery payloads contain field names only; ESPN cookie values, Vault ids, and bearer tokens are not added to responses. | `src/services/omen.js`, `test/omenMvpLiveService.test.js` | confirmed |
| Mock/live fallback remains explicit. | Non-mock live requests use auth/live path; mock/dev path is only `use_mock_data` or `mock_state`. | `src/routes/omen.js`, `test/omenRoute.test.js` | confirmed |
| No new persistence or schema path. | B2 does not add SQL, Supabase table writes, migrations, or production mutations. | Git diff | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Bearer token | secret | Request header to Supabase auth lookup | Not returned or logged by B2. |
| Fantasy platform credentials | secret | Existing server-side adapter/Vault paths | B2 off-season path avoids adapter/Vault calls. |
| League/team/player data | user/platform data | Existing live recommendation path | B2 adds field completeness only; no new raw provider response exposure. |
| NFL calendar status | public-ish operational data | `nflSchedule.isOffSeason()` | Used to suppress advice. |
| AI prompts/outputs | generated/user-derived data | Existing optional LLM enrichment | No new AI path added; off-season/recovery states are blocked. |

## Consent and User Expectations

Authenticated live recommendations still require a signed-in user and connected platform context when in season. Off-season direct POST now returns no advice, which better matches the dashboard expectation that live advice is paused outside the NFL regular season.

## Access and RBAC Notes

No admin path, role expansion, RLS change, or service-key query broadening was introduced.

## External Systems

No new external system is called. Existing Yahoo/Sleeper/ESPN and optional LLM paths are preserved.

## Gaps and Unknowns

- Real-account provider QA is still required before provider-depth launch claims.
- Production behavior is not live until the branch is pushed, merged, and deployed.

## Approval Required

Push, merge, deploy, production verification, SQL, provider credential changes, and analytics remain separately gated.

## Recommended Next Safe Step

After B2 merges and deploys, run a read-only production canary for `GET /api/dashboard/summary` and `POST /api/omen/mvp-move` auth boundaries before B4 migration claims.
