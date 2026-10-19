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

## Results: founder's walk, 2026-10-18 (iPhone 15, instrumented Release build)

| Step | Result | Server timings |
|---|---|---|
| Sign out, sign in | Pass. Straight to the desk, all leagues kept, desk filled in about 3 s | leagues 1.08 s, overview 0.94 s, summary 1.29 s, waivers 1.65 s, Omen call 3.44 s |
| Sleeper | Pass. 3 of 3 leagues offered and followed | disconnect 0.43, resolve 0.22, connect 1.01, follows 0.31 s |
| Yahoo | Pass. Returned to Omen by itself; 2 of 2 leagues | auth 0.27, **callback 4.63 s**, leagues 0.86, bind 0.73, follows 0.63 s |
| ESPN | Pass. Moved on after sign-in by itself; 3 of 3 leagues | disconnect 0.34 s; connect routes are kept out of the access log by design |
| Afterwards | Probe: every team readable on all three providers | Yahoo 126/156, ESPN 185/185, Sleeper 182/191 projected |

Favourites came back after every reconnect.

**Found during the walk**

- Yahoo callback takes 4.6 s before returning to the app. It trades the code, stores the tokens, fetches every
  league and team from Yahoo, and clears the cache twice, all before redirecting. Then the app fetches the same
  leagues again. Fix: redirect once the tokens are stored, record memberships in the background, reuse the fetch.
- Omen's call waits on the AI write-up: four timeouts in a row opened its circuit breaker (1.25 s spent on a
  write-up that never arrived).
- The tester's "old ESPN journey" is the current app's manual League ID fallback. It shows when Omen's league lookup
  finds nothing or fails, which happens with a brand-new ESPN login. The founder's established account never hits it.
  The API container restarted 2026-10-19 00:15 UTC, so the tester's attempt is not in its logs; check the Vector copy.
