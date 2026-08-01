# M0-BE-3 Yahoo Mobile Return Reconciliation — 2026-07-25

## Outcome

No runtime change was needed: the required Yahoo mobile-aware return was already merged into `main` in `dbafc66` (`feat(yahoo): add verified native oauth return`). Focused verification passed: `node --test test/yahooAuthRoute.test.js` — 9/9.

## Native client contract

Start the existing authenticated endpoint with:

```json
POST /api/yahoo/auth
{ "league_id": "optional", "native_return": true }
```

Open the returned Yahoo authorization URL in the system browser. After the server verifies the provider callback, clients receive exactly one of:

```text
com.slopssaloon.omen://auth/callback?status=connected
com.slopssaloon.omen://auth/callback?status=cancelled
```

Do not expect or parse an authorization code, OAuth state, token, league, or user identifier in that link. Invalid, expired, or duplicate state is an HTTP 400 callback result and must not trigger an app deep link. Existing web starts and callbacks remain compatible.

## Remaining gate

Before describing this as provider/device proven, an authorized owner must verify the Yahoo registered HTTPS callback and complete one real-device browser-to-app return. No console, credential, provider, database, deployment, or production action occurred here.

## Related evidence

- `References/research/2026-07-25-m0-be-3-yahoo-mobile-oauth-return.md`
- `Direction/reviews/2026-07-25-m0-be-3-yahoo-security-privacy-evidence.md`
