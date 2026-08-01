# M0-BE-3 Yahoo Mobile OAuth Return Research

**Date:** 2026-07-25
**Scope:** Verify the already-merged Yahoo mobile-return boundary against current primary OAuth guidance. No provider-console, credential, environment, database, deployment, or production action was taken.

## Primary sources

1. [RFC 8252 — OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252.html), sections 4–7 and 8.1.
2. [Yahoo OAuth 2.0 authorization-code flow](https://developer.yahoo.com/oauth2/guide/flows_authcode/). The page was not retrievable from this execution environment; it remains the provider reference to check before any Yahoo-console change.

## Source-backed constraints

- RFC 8252 requires native authorization to use an external user agent, normally the browser.
- A private-use URI scheme can return control to a native app. `com.slopssaloon.omen` uses reverse-domain naming.
- A public native client must use PKCE. The current Omen route is a server-held confidential-client exchange: Yahoo returns to the registered HTTPS server callback, and only the server sends the fixed, artifact-free completion status to the app. Do not reinterpret this as permission to move the Yahoo code exchange into the native client.

## Runtime reconciliation

- `src/routes/yahoo.js` binds `native_return: true` to the stored OAuth transaction and ignores caller-supplied redirect URLs.
- The callback validates state, platform, and expiry before a native redirect; it consumes the stored transaction on success or verified cancellation.
- The only native destinations are `com.slopssaloon.omen://auth/callback?status=connected` and `...?status=cancelled`. Authorization code, state, token, league, and user data do not appear in the deep link.
- Web callback behavior remains on the existing `/account/connect` redirects.

## Remaining human gate

An authorized owner must verify the registered Yahoo HTTPS callback exactly matches the server callback configured by Omen, then perform a real-device browser-to-app return. That is provider-console and device evidence, not something this source review can infer.
