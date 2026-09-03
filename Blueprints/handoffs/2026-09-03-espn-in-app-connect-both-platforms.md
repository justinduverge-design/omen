# Handoff — ESPN connects from a phone, on both platforms

**Date:** 2026-09-03
**Session:** Claude Code, founder-directed, single sitting
**Commits:** `b2f348a` → `8e9ae4e` on `main` (plus `feat/espn-in-app-connect`)
**Headline:** a real iPhone signed in to ESPN inside Omen and connected a real league, with no
computer involved. Android is at parity in code and on an emulator.

---

## The finding the whole session turned on

`WKHTTPCookieStore` **does** return HttpOnly cookie values to the app — including a cookie set by
a real server over a real navigation. Measured, iOS 26.5 simulator,
`OmenIOSTests/HttpOnlyCookieSpikeTests.swift`.

That **disproves** `Direction/reviews/2026-07-07-espn-ios-cookie-sync-research.md` §C, which
inferred the opposite from WebKit test fixtures and closed by recommending exactly this spike
"before any real scope is committed". It went unrun for two months while the plan rested on the
guess. The 2026-08-15 real-iPhone finding that Safari **extensions** cannot read HttpOnly is a
different API and remains true — the two were conflated, and that is what made ESPN-on-iPhone look
impossible all summer.

**The spike's first run said "not readable" and was wrong.** A `WKWebsiteDataStore` drops cookie
writes until a `WKWebView` is attached, so every read came back empty. Only the control test
caught it. Without that control this session would have filed a confident false negative
confirming what everyone already believed. Both platforms' spikes carry a control for this reason.

Android's equivalent (`HttpOnlyCookieSpikeTest.kt`, emulator) was run **before** any Android port
code was written, for the same reason.

---

## What shipped

**W1-A, both platforms.** Consent → ESPN's own sign-in in an app-controlled WebView → ESPN reports
the account's leagues → the user picks one → connected. ESPN availability flips `UseWeb` →
`Available` on iOS and Android.

**League discovery.** New route `POST /api/platforms/espn/leagues` over ESPN's fan API
(`fan.api.espn.com/apis/v2/fans/{SWID}`) — the endpoint ESPN's own site uses to render "My Teams",
and the only one that answers "which leagues does this user play in". It **stores nothing**; only
the user's pick reaches `/espn/connect`. This departs from W1-A's "no new backend", which predated
discovery being in scope.

**Account → Connected leagues, with disconnect.** Closes a promise the app had been making
falsely: the ESPN consent screen has said "you can disconnect it any time in Account" since it
shipped, and Account had no disconnect. `DELETE /api/platforms/:platform` had shipped months
earlier with no client ever calling it.

**Deletion phrase `DELETE MY OMEN DATA` → `delete`**, case-insensitive and trimmed. The server
still accepts the legacy phrase deliberately, with a test saying not to tidy it away.

**Light-mode fix.** `ConnectView`/`SignInView` hardcoded a near-black tile, so provider names
rendered dark-on-dark and were invisible in light mode on a real phone.

---

## What is NOT done, and must not be assumed

1. **W1-A's "zero emitted bytes" clause is unmet on both platforms.** `espn_s2`/`SWID` must be
   proved absent from every emitted byte outside the single connect request — "by provoking a real
   failure and searching the bytes, not by review". This is the remaining gate on calling W1-A
   done.
2. **Android has never run against a real ESPN account.** Fixtures and a cookie spike only.
3. **`entryId` / `entry.name` are unconfirmed** in ESPN's own client bundle. Team names in the
   picker are the likeliest thing to come back blank. Cosmetic; the league id is verified.
4. **Guideline 5.2.2 exposure now sits on the whole listing.** A reviewer sees a third-party login
   inside the app and Omen has no authorization to show. Founder accepted this on 2026-09-02 with
   the finding in front of him; it is not re-litigated here, only stated.
5. **No CI runs Android unit tests** — queued as `W1-ANDROID-CI`.

---

## Method notes worth keeping

**Three ESPN entry URLs were guessed from markup and all three failed on a real device.**
`/football/team` serves "Invalid league ID" with no `leagueId`; `/football/welcome` is ESPN's
new-user signup pitch; `www.espn.com/fantasy` buries the sign-in in a hamburger. ESPN's fantasy
pages are client-rendered, so grepping their HTML proves nothing. **The fix was to stop depending
on landing anywhere**: a league-id field the user can always fill, which is what
`extension/popup.html` has had since it shipped. The fancy version was built first and the one
that works was skipped.

**When markup evidence ran out, ESPN's own production bundle settled it.** `cdn1.espn.net/kona/…/
static/commons/main-*.js` contains the fan-API call keyed by `fan.swid`, `metaData.entry.groups[0]`,
`groupName`, `gameId`, `seasonId` — and `t.groupId = Math.abs(t.groupId)`, which exposed **two real
defects** in the parser: league ids can be negative, and the `typeId === 9` filter was invented
(that number appears nowhere in ESPN's client; the only `9:` is a CSS parser). If it were wrong it
would have emptied every user's league list while looking exactly like an account with no leagues.

**Two bugs hid behind an undeployed route.** The picker never appeared on device because
`POST /api/platforms/espn/leagues` existed only locally — production 404'd and the client fell back
to manual entry, which looked identical to "the old flow". Deploying it then exposed a second bug
the fallback had been masking: the sign-in sheet is bound to `state == .espnSigningIn`, so a
**successful** discovery dismissed the sheet and the dismissal handler cancelled the flow. The
founder's description — "red flash, then Nothing was connected" — was the entire diagnosis.

**A pre-existing red gate blocked the first deploy.** `nativeMobileScaffold.test.js` asserted a
`WelcomeView` that `5936142` had deleted; that commit sat unpushed on local `main`, so CI had never
seen it. It would have failed on any push. Both it and the Android CI gap are the same shape: a
check nobody runs is a check that does not exist.

---

## Pre-existing failures, unchanged by this session

- **iOS `PrimitiveEnforcementTests`** — raw `Button(` in `SignInView.swift` / `ConnectView.swift`,
  byte-identical to HEAD. Its own doctrine makes allowlisting a design-steward decision, not a
  build fix.
- **Android `core:designsystem` `PrimitiveEnforcementTest`** — same shape, see `W1-ANDROID-CI`.
- `check-sprint-staleness.js` reports `A4` and `B2-D3-S2` stale. Untouched here.

## Verification at close

957 backend · 398 iOS unit (1 pre-existing failure) · 238 Android unit (1 pre-existing failure) ·
21 new Android + 3 Android instrumented · frontend build clean · `check-kickoff-drift.js` and
`check-sprint-staleness.js` pass · iOS installed on device `00008120-001A284E02C0201E`, Android
APK installed on `medium_phone`.
