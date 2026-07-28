# B2-D2 Yahoo Waiver Security and Privacy Evidence

## Scope

Internal evidence for the guarded Yahoo-only waiver fallback in `POST /api/omen/mvp-move`.

## Sources Reviewed

- `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md`
- `src/services/omen.js`
- `src/services/yahoo.js`
- `src/services/roster.js`
- `test/omenMvpLiveService.test.js`

## Confirmed Evidence

| Control / claim | Evidence | Confidence |
| --- | --- | --- |
| Selected context remains server-owned. | The canonical service filters active connections by authenticated owner and supplied opaque `context_id` before roster or waiver retrieval. | confirmed |
| Waiver data is selected-context-only. | The service passes the verified connection's `league_id` to both normalized roster retrieval and `getAvailablePlayers()`. | confirmed |
| Secrets stay server-side. | The live envelope includes safe provider, league, team, signals, and recommendation fields only; it does not echo OAuth tokens, Vault IDs, or `context_id`. | confirmed |
| Yahoo unavailability fails closed. | A failed availability request returns `state: empty`, `recommendation: null`, and `signals.waivers.status: unavailable`. | confirmed |
| Unneeded Yahoo pool access is avoided. | When the selected roster has no OUT/IR-like starter, the service returns the live empty envelope before `getAvailablePlayers()`; the focused test asserts no Yahoo waiver request occurred. | confirmed |
| Projection absence is not fabricated. | The waiver recommendation sets `expected_value_delta.points: null` and marks projections unavailable. | confirmed |
| Ancillary matchup data cannot upgrade the waiver claim. | Route-level matchup DvP enrichment skips `recommendation.type: "waiver_pickup"`. | confirmed |

## Data Classification

| Data type | Sensitivity | Handling |
| --- | --- | --- |
| `context_id` | Internal opaque identifier | Server-side ownership filter; not echoed or logged by this slice. |
| Yahoo league/team/player availability | User-linked fantasy-platform data | Retrieved only for the selected owned connection; response exposes safe recommendation summaries. |
| OAuth tokens and Vault IDs | Secret | Not read into the response, tests, docs, or logs. |

## Gaps and Approval Required

- Yahoo Fantasy API reapproval is required for real-account validation; no real provider request or credential inspection occurred in this slice.
- The basic Yahoo available-player response does not supply weekly projections; this slice must remain an availability-based injury replacement, not a point-delta ranking.
- No production/provider configuration action is authorized.

## Recommended Next Safe Step

After API access returns, validate one authorized Yahoo league end-to-end: selected context, roster retrieval, available-player retrieval, an eligible replacement, and a no-eligible-replacement result without exposing credentials.
