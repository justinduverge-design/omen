# ADR-004: Replace passport-yahoo-oauth2 with a request-free OAuth implementation

**Status:** Implemented
**Date:** 2026-05-11
**Implemented:** 2026-05-12
**Deciders:** Justin (Product Owner), Claude (Architect)

## Context

`passport-yahoo-oauth2 >=0.2.6` depends on the `request` npm package, which is
officially abandoned and carries 3 unresolved transitive vulnerabilities:

- `form-data <2.5.4` — unsafe random boundary generation (CRITICAL)
- `qs <6.14.1` — DoS via arrayLimit bypass (MODERATE)
- `tough-cookie <4.1.3` — prototype pollution (MODERATE)

Additionally, `passport-oauth` (a transitive dependency of passport-yahoo-oauth2)
ships its own nested `passport <0.6.0`, carrying a session regeneration vulnerability (MODERATE).

`npm audit fix` (non-breaking) makes no changes. The only non-breaking fix would be
a new release of `passport-yahoo-oauth2` that drops `request` — none exists.
`npm audit fix --force` would downgrade to `passport-yahoo-oauth2@0.2.5`, a breaking change
with unknown impact on the Yahoo OAuth flow.

These vulnerabilities are already present in production (predating commit 93c183d).
Real-world exploitability in Slops Saloon's context is low: all vulnerable code paths
run only during Yahoo OAuth token exchange, where URLs are hardcoded to Yahoo's servers
and inputs are not user-controlled. The CRITICAL severity labels reflect worst-case
generic scenarios, not Slops' specific attack surface.

## Decision

Replace `passport-yahoo-oauth2` and `passport-oauth` with a direct Yahoo OAuth 2.0
implementation using `axios` (already a project dependency). Yahoo's OAuth 2.0 endpoint
is standard RFC 6749 and does not require Passport.js middleware.

This eliminates the entire `request` dependency chain from the project.

## Options Considered

### Option A: npm audit fix --force (downgrade to passport-yahoo-oauth2@0.2.5)
- **Pros:** Fast
- **Cons:** Breaking change with unknown API impact; still depends on request; does not
  resolve form-data, qs, or tough-cookie findings; kicks the problem down the road

### Option B: Replace with custom Yahoo OAuth 2.0 using axios (chosen)
- **Pros:** Eliminates all 7 findings; uses an already-approved dependency (axios);
  clean slate — no legacy Passport.js middleware; more transparent, easier to audit
- **Cons:** Requires rewriting Yahoo OAuth callback handling; 1 dedicated session

### Option C: Accept risk indefinitely
- **Cons:** Vulnerabilities remain tracked and unresolved; creates compliance debt;
  CRITICAL labels create concern for any future security audit or investor review

## Implementation Notes

- Yahoo OAuth 2.0 docs: https://developer.yahoo.com/oauth2/guide/
- Token exchange uses standard POST /v1/oauth2/get_token with Basic Auth header
- Refresh token rotation is already handled in the existing Yahoo service layer
- Remove from package.json: `passport-yahoo-oauth2`, `passport-oauth`
  (audit whether top-level `passport` is still used elsewhere before removing it)
- New implementation: `src/middleware/yahooOAuth.js` using axios
- The interface exposed to `src/middleware/auth.js` and `src/routes/yahoo.js` remains
  unchanged — only the internal OAuth mechanism is replaced
- Estimated scope: ~60 lines of new code, removal of 2 packages

## Consequences

**Becomes easier:**
- `npm audit` returns 0 findings after implementation
- Yahoo OAuth flow is fully readable and auditable in one file
- No dependency on any Passport.js strategy package

**Becomes harder:**
- Nothing meaningful — Yahoo OAuth 2.0 is a well-documented, stable standard

**Will need to revisit:**
- Nothing — top-level `passport` was also fully removed (2026-05-12); no other strategies were in use

## Action Items

- [x] Codex: implement `src/middleware/yahooOAuth.js` using axios
- [x] Codex: remove passport-yahoo-oauth2, passport-oauth, and passport from package.json
- [x] Codex: run full test suite — 39/39 pass
- [x] Codex: run npm audit — 0 findings confirmed; 48 packages removed
- [ ] Justin: review and approve before merging to main
