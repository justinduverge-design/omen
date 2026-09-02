# 2026-09-01 — Onboarding repair: session refresh, native Yahoo, honest gate states

**Branch:** `fix/onboarding-session-and-yahoo`
**Trigger:** beta users could not get in. One tester picked Yahoo on an iPhone and was told to
find a desktop. Others signed in and were returned to onboarding.

## What was actually wrong

Three independent defects, all confirmed in code before any change.

### 1. Native never refreshed its access token

`AuthRepository.refresh()` shipped fully implemented and **was never called from anywhere in
`App/` or the Android app**. Every view model read the stored access token raw and sent it as-is.
A Supabase access token lives one hour, so the first request after that hour returned 401, the
view model called `onRefreshFailed()`, and a user who signed in that morning was handed the
re-auth screen. `SessionManager.restore()` compounded it at launch by marking any expired session
`NeedsReauth` on the spot — which, after the first hour, is every cold launch.

The onboarding-connection contract §6 already said refresh was automatic. It was not.

### 2. Native Yahoo was a dead affordance

`ConnectProvider.yahoo` returned `.useWeb` on iOS and, worse, `OnHold` on Android with the reason
"paused while we wait on Yahoo to restore our data access" — **four days after the entitlement was
restored on 2026-08-28**. Android was describing a state the system had already left.

The server half has existed since PR #191: `POST /api/yahoo/auth` accepts `native_return: true`,
and its callback redirects to `com.slopssaloon.omen://auth/callback?status=connected|cancelled`
after validating and consuming the OAuth state server-side. `GET /api/yahoo/leagues` and
`POST /api/yahoo/league` complete the bind. The URL scheme was already registered. **The only
missing piece was the client browser round trip the contract §87 already specifies.**

### 3. Web read a failed check as "this user is new"

`syncOnboardingFromServer` returned a bare `false` for "no league connected" **and** for "the
request failed". `ProtectedRoute` read that `false` as a new user and redirected to
`/onboarding`. One flaky `/api/platforms` response therefore threw an established account back to
the first setup screen. `Onboarding.jsx` did the same to its own check, and its `step` was
`useState(0)`, so any remount dropped the user at screen one.

## What changed

| Area | Change |
| --- | --- |
| iOS + Android session | `SessionRefreshing` seam, refresh coalescing, 120s renewal leeway, `restoreRefreshing()` at launch, `authorized(_:)` wrapper that renews first and retries exactly once on a 401 |
| iOS + Android connect | Native Yahoo: system-browser OAuth → server-confirmed connection → league bind |
| Web gate | `resolveOnboardingStatus` → CONNECTED / NOT_CONNECTED / UNKNOWN; only NOT_CONNECTED redirects |
| Web onboarding | step in `sessionStorage`, auto-advance on `visibilitychange` + poll, distinct copy for "couldn't check" vs "nothing connected" |
| All three | Email sign-in gained resend + 60s cooldown + spam/Promotions prompt + a route to support |

### Two rules the new code enforces

1. **A network failure is never a signed-out user.** `SessionRefreshOutcome` has three cases, not
   two. `Unavailable` (offline) leaves the session intact; only `Rejected` — the server judging
   the refresh token and refusing it — ejects anyone. `authorized(_:)` resolves a transport
   failure to `Network`, never `Unauthorized`.
2. **`status=connected` is not proof.** Any app on the device can fire that deep link, and more
   usefully a user can approve in Yahoo while the token exchange fails behind them.
   `GET /api/yahoo/leagues` is the confirmation, because it can only answer once tokens are
   genuinely stored. That is also why there is no "I've connected" button for the user to press
   on Omen's behalf.

Refresh coalescing is not an optimisation. Supabase rotates the refresh token on every successful
refresh, so the Command Center's three parallel reads would otherwise race into a retired token
and sign out a user whose session was fine.

## Evidence

- iOS unit tests **351/351** (was 318).
- Android unit tests **222/222** (was 206); androidTest compiles.
- Backend + guard tests **929/929** (was 922); frontend builds clean.
- One pre-existing iOS UI-test failure,
  `testCommandCenterHelpAffordanceIsLabeledAndOpensItsExplanation`, was **verified failing on a
  clean checkout** and is untouched by this work. It is a real open bug: the Command Center help
  affordance does not present its explanation.

## Still open — these are not agent work

1. **Email delivery is not diagnosable from this repo.** `RESEND_API_KEY` is used only by the
   waitlist route; auth mail goes through Supabase's own SMTP config. Check the failed addresses
   in Resend's **Emails** and **Suppressions** dashboards, confirm the sending domain is still
   verified, and add webhook monitoring for `email.delivered`, `email.bounced`, `email.failed`.
   The client-side half — resend, cooldown, spam guidance — is done.
2. **The sign-in mail says "Justin", not Omen.** That is the sender name in the Supabase
   dashboard (project `xyudxfhqejbwvjngiwhw` → Authentication → Emails → SMTP settings), not
   anything in this repo. Nothing here can set it.
3. **Real-device Yahoo proof.** The whole flow is covered with stubs on both platforms, but the
   actual browser round trip needs live Yahoo credentials on a phone. The connection contract
   already names this a human gate; do not call the provider path ready without it.
4. **ESPN untouched, on purpose.** It is sequenced behind `W1-GATE` / the first Beta App Review,
   and a separate session is working it. Nothing here touches ESPN.

## Repository hazard found in passing

`env.md` was sitting untracked at the repo root holding a **Supabase service key and the Yahoo
client secret**. `.gitignore` covered `.env` and `.env.*` but not that name, so any `git add .`
would have committed both. Fixed on `main` in `0819e62`; rotate those credentials if the file has
ever been shared or synced.


---

## Addendum — 2026-09-02, live verification and two more defects

### The refresh fix is proven in production, not just in tests

Supabase auth logs for the founder's account, Android, against the live API:

| Time (UTC) | Event |
| --- | --- |
| 01:58:54 | `/verify` **200** + `Login` — email code accepted |
| **02:34:39** | **`/token` 200 + `Login` — an access token silently renewed** |
| 02:51:16 | `/logout` 204, then `/user` 403 `Session not found` |

That `/token 200` is the whole point of this branch. It is the call that never happened before —
`AuthRepository.refresh()` was implemented and unreachable — and its absence is what ejected
every signed-in user after an hour.

The "Please sign in again" screen that followed the `/logout` is **correct**: a revoked refresh
token must be believed. Nothing in the Android app calls the network sign-out (`SessionManager.
signOut()` clears local storage only), so that logout came from another device.

### Open question worth chasing: sign-out is global

Supabase's default `signOut` scope revokes **every** session for the user, so signing out on the
web logs the phone out too. `ProtectedRoute` can trigger that automatically:

```js
apiFetch('/api/session').then((d) => { if (d?.authenticated === false) supabase.auth.signOut(); })
```

It only fires on an explicit `authenticated: false`, not on a network error, so it is much
narrower than the legal-acceptance bug fixed in 363c3f7 — but it is the same shape. If
`/api/session` ever answers `false` spuriously, one web tab signs the user out on every device
they own. Worth deciding deliberately: either scope that sign-out to `local`, or stop inferring
sign-out from a single server answer.

### ESPN reported a null league name to every client

`espnStandings()`/`espnOverview()` built envelopes with no `league_name` while Sleeper and Yahoo
supplied one. The name was never missing from ESPN — `mSettings` has always been requested and
has always carried it; it was never read. Fixed in `c988f15` via `buildLeagueContext`, same
single fetch.

On Android that null had been rendering as the literal word **"null"** under the team name,
because `org.json.optString` returns the string `"null"` for a JSON null. Three parsers had
grown a private `optStringOrNull` with the correct `isNull` check; seven had nothing, and 89 of
101 call sites were unguarded. Consolidated to one shared helper in `1987198`.

### A deliberate reversal, flagged for the design steward

`contextStrip` required platform + league name + team, or it rendered the **Empty** state. So a
missing league name did not blank one line — it told a connected user to "Choose a team". The
league name is now optional on `OmenContextStripState.Selected` and the line is omitted when
absent. Two iOS tests asserting the old rule were reversed with their reasoning recorded.

No strip state was added or removed; the registry's four locked states (Figma `25:2`) are intact.
**Making a rendered field optional is still a design-steward call**, and this addendum is the
record of it.

### Native Yahoo: proven up to Yahoo's own login

On Android, tapping Yahoo opened `login.yahoo.com` in a Chrome Custom Tab. That proves the server
returned an authorization URL (so `YAHOO_ENABLED=true` is live), the app opened the
**server-built** URL rather than one it composed, and Yahoo accepted the `redirect_uri` — the
console needs no change, because Yahoo only ever sees
`https://slopssaloon.com/api/yahoo/callback`. The remaining step is a human entering Yahoo
credentials; it was not performed.
