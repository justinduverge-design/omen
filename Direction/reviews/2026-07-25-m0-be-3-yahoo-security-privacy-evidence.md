# M0-BE-3 Yahoo Mobile Return Security and Privacy Evidence

## Scope

Internal implementation reconciliation for the already-merged Yahoo mobile OAuth return. Audience: Omen backend and native-client handoff owners.

## Sources Reviewed

- `src/routes/yahoo.js`
- `src/middleware/yahooOAuth.js`
- `test/yahooAuthRoute.test.js`
- `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`
- [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html)

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Native return is server-bound | The authenticated start records fixed native intent in the OAuth transaction, not a caller-provided redirect. | `src/routes/yahoo.js` | confirmed |
| Artifact-free app return | Completion uses fixed `status=connected` or `status=cancelled`; tests assert code and state are absent. | `src/routes/yahoo.js`, `test/yahooAuthRoute.test.js` | confirmed |
| Invalid callback fails closed | Invalid, expired, and duplicate state returns HTTP 400 without a deep-link redirect. | `test/yahooAuthRoute.test.js` | confirmed |
| Web compatibility remains | Non-native callback completion remains the existing account-connect redirect. | `src/routes/yahoo.js`, `test/yahooAuthRoute.test.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| OAuth authorization code and state | secret / security-sensitive | Yahoo HTTPS callback | Kept server-side; not sent in app deep link. |
| Yahoo tokens | secret | Server token exchange and persistence | Not read, logged, or documented in this review. |
| Completion status | low sensitivity | Fixed native deep link | Contains only `connected` or `cancelled`. |

## Consent and User Expectations

The user authenticates and consents in the external browser. A denial returns them to the app with `cancelled`, rather than implying a successful connection.

## Access and RBAC Notes

Starting OAuth requires existing authenticated Omen access. The server owns state validation and token exchange; the native client receives only a completion status.

## External Systems

Yahoo is the authorization provider. Its registered callback configuration was not read or changed.

## Gaps and Unknowns

- The provider-console callback allowlist and real-device scheme registration need authorized human verification.
- The Yahoo provider guide could not be retrieved in this environment; no Yahoo-console behavior was inferred from it.

## Approval Required

Provider-console edits, credentials, app registration changes, real-account/device testing, deployment, and production verification each require their own authorization.

## Recommended Next Safe Step

After authorization, verify the Yahoo registered HTTPS callback and complete one real-device external-browser return; record status-only evidence without codes, states, or tokens.
