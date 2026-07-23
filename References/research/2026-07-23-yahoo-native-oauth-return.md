# Yahoo Native OAuth Return Research

## Question

How can Omen return a completed Yahoo OAuth connection to native apps without changing Yahoo credentials or leaking authorization artifacts?

## Recommendation

Keep the registered HTTPS Omen callback as Yahoo's `redirect_uri`, complete the server-side code exchange there, and redirect only a verified server-stored native intent to `com.slopssaloon.omen://auth/callback?status=connected|cancelled`.

Do not pass a custom redirect URL, authorization code, OAuth state, token, league, or user identifier through the deep link.

## Evidence

- Yahoo's authorization-code guide requires the same complete `redirect_uri` during authorization and exchange: https://developer.yahoo.com/oauth2/guide/flows_authcode/
- Yahoo documents `error=access_denied` at the registered callback when a person denies consent: https://developer.yahoo.com/oauth2/guide/openid_connect/troubleshooting.html

## Scope limits

No provider credential, redirect-URI registration, schema, deployment, or production action is authorized. Invalid, expired, and duplicate state fails closed without a deep-link redirect.
