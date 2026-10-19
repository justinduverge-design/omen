# Build 12 connection test plan

**Written:** 2026-10-18, from code and production settings on `build-12/integration`.
**Run by:** the founder on the iPhone, with Claude watching server logs and the app's `[omen-timing]` lines.
Claude never types a credential.

## What signing out does, and why it is not enough

- **Sign out** (`SessionManager.signOut`) clears the Omen session on the phone only. Provider links stay on the
  server, so signing back in restores every league without running any connect code. Sign-out tests sign-in, not
  connections.
- **Disconnect** (Account → Connections → Disconnect, `DELETE /api/platforms/:platform`) deletes the stored ESPN
  cookies or Yahoo tokens from Vault and the `platform_connections` row. League memberships (follows, the active
  league) cascade away with it. Move history and the Ledger are keyed to the user and stay.
- So the real test is: disconnect a provider, reconnect it, and check the leagues come back usable.

## Production settings that change what we see (read 2026-10-18)

| Setting | Value | Effect on this test |
|---|---|---|
| `YAHOO_ENABLED` | true | Yahoo connect is offered |
| `SIGHT_ENABLED` / `SIGHT_VERSION` | true / v2 | Reconnected leagues get Sight within about 300 ms |
| `LEAGUE_TRANSACTIONS_YAHOO`, ESPN equivalent | unset (off) | League activity shows unavailable for Yahoo and ESPN; Sleeper is live |
| Credential health cron | every 6 h | A refused login is deleted and the connection marked needs-reconnect |

## Order

1. **Sign-in first.** Sign out, then sign back in with email code. Pass: lands on the desk; no reconnect prompt.
2. **Sleeper** (no credential; lowest risk). Disconnect → Connect → username → pick league.
   States: `resolvingAccount` → `choosingLeague` → `validatingConnection` → `connected`.
3. **Yahoo** (OAuth in the system browser). Disconnect → Connect → Yahoo sign-in → return to app → pick league.
   States: `startingYahooAuthorization` → `awaitingYahooReturn` → `confirmingYahooConnection` → `choosingYahooLeague`
   → `bindingYahooLeague` → `yahooConnected`. Server: `/api/yahoo/auth`, `/callback`, `/leagues`, `/league`.
4. **ESPN** (in-app ESPN sign-in; the Rhody first-login path). Disconnect → Connect → consent → ESPN sign-in →
   leagues found → pick one. States: `espnConsent` → `espnSigningIn` → `discoveringEspnLeagues` →
   `choosingEspnLeague` → `validatingEspnConnection` → `espnConnected`. Server: `/api/platforms/espn/leagues`,
   `/api/platforms/espn/connect`. Cookie values must never appear in any log.

## Pass, per provider

- Every league on the account is offered, and the picked league becomes active.
- Desk, Start/Sit, Waivers, League and Find a Trade answer for that league. Yahoo Build a Trade shows your own side
  (fixed today, commit 2930b114).
- `api/leagues` lists the league with the right team; the warm reads come back in under 1 s.
- Failure states show the named copy (`usernameNotFound`, `espnSessionUnreadable`, `providerUnavailable`, ...),
  never a generic error, and Cancel always returns to a usable screen.

## Watched while it runs

- `docker logs -f omen_api` on KVM1, filtered to connect routes and errors.
- Device console `[omen-timing]` lines for each connect request and screen.
- Afterwards: re-run `scripts/probe-provider-leagues.js` for the account. Every team readable, projections present.
