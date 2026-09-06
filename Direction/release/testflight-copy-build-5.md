# TestFlight copy — Build 5 (0.1.0 (5))

**Supersedes `testflight-copy-build-4.md`.** Build 4 went to testers on 2026-08-30. Everything
below is the difference between what they have on their phones now and what Build 5 gives them.

**Two different audiences read two different fields. Do not merge them.** This has not changed:

| Field | Who reads it | What it must say |
|---|---|---|
| **Beta App Description** | your cousins | connect your real league |
| **App Review Information / Notes** | Apple's reviewer | tap Try Demo |

Apple's reviewer still has no Sleeper, ESPN or Yahoo account and "Sign-in required" is unchecked,
so **the reviewer path must stay Demo Mode**. Do not edit §3.

---

## ⚠️ Read before you upload

Two production faults are open in `Direction/known_issues.md` and both land on the surfaces this
build asks testers to hammer:

1. **`POST /api/omen/mvp-move` can hang forever and take the whole API down** (🔴 OPEN). That is
   the Omen of the Week tab. Production is currently serving a **rolled-back image** and
   *"the rollback is not sticky"* — the next `docker compose pull` reintroduces it.
2. **The API can be spun to 100% CPU by ordinary traffic** (🔴 OPEN), traced to `GET /api/leagues`
   or `POST /api/leagues/active` — which is the league switcher, and item 5 of "What to Test"
   below points every tester straight at it. The trigger measured was 28 requests in nine seconds
   from one phone.

Neither is a client bug, so neither is fixed by shipping Build 5 — but a tester who hits either
one sees *"Omen couldn't reach the server"* and cannot tell it apart from the app being broken.
**Founder call:** ship anyway and warn testers in the description, or hold the build until the
backend spin is found. The caveat paragraph in §1 assumes you ship; delete it if you hold.

---

## 1. What changed since Build 4 — the tester-facing list

Ordered by how likely a tester is to notice.

### Connecting a league

- **ESPN now connects on the phone.** In Build 4 the only ESPN path was "find a desktop, install
  Chrome, sideload an unpacked extension" — the one confirmed beta failure on record. You now sign
  in to ESPN inside the app. iPhone and Android.
- **Yahoo now connects on the phone**, natively, same as above. Yahoo was desktop-only in Build 4.
- **All three providers list every league you play in**, not just one. ESPN league discovery is
  new; previously ESPN could only show the single league you had bound.
- **Disconnect a platform** from Account, and delete your account (the confirmation phrase is now
  just "delete").

### Signing in

- **Onboarding was rebuilt** to the approved design.
- **Sign-in no longer signs you straight back out.** Expired sessions now renew instead of
  ejecting you to the login screen.
- **The email code screen has a way out** when the code never arrives.

### Once you're in

- **Command Center was rebuilt** to the founder's sketch, and it now swipes: one page per league.
- **The league switcher shows favourites**, and **shows your actual team name** on ESPN and Yahoo
  rows. Before this they showed the league title, or "Your team", where a team name belongs.
- **Waivers are league-aware.** Omen now knows whether your league runs FAAB, rolling waivers or
  free agency, and says so in its own words rather than assuming. Verified against three real ESPN
  leagues and two real Yahoo leagues.
- **Yahoo matchups** are read.
- **ESPN scoring is now exact** — computed from your league's own scoring rules rather than an
  assumed format — and ESPN's player projections, which it was sending all along, are now read.

### Fixes a tester would have felt

- Trade player search worked but could take production down; it is now bounded.
- The league carousel could turn one swipe into a runaway loop.
- Switching between two providers returned a 500.
- The Android carousel and its pager could disagree about which league you were on.
- Android showed the literal word "null" where data was missing.
- The NFL week now rolls over on Tuesday, in one place instead of two that disagreed on every
  Saturday, Sunday and Monday of the season.

### Not in this build, on purpose

Draft Assistant. It is cut from 1.0 and ships for the 2027 draft. Keep it out of the store
listing entirely (facts-of-record #9).

---

## 2. Beta App Description → paste this

> Omen reads your fantasy football league and tells you the one move that matters this week.
>
> Connect your real league — ESPN, Yahoo or Sleeper — and Omen uses your actual roster, your
> scoring settings and your matchup. That is the version worth testing. There is a demo league in
> here too, but it is sample data and it will not tell you anything about your team.
>
> **New in this build:** ESPN and Yahoo now connect right here on your phone. Last build, ESPN
> needed a desktop computer and a browser extension. That is gone. If you gave up on connecting
> last time, this is the build to try again.
>
> What's in this build:
>
> • **Command Center** — your live matchup, standings, and what Omen has recommended so far. Swipe
>   between leagues if you play in more than one
> • **Omen of the Week** — the single call that matters, with the reasoning and a confidence score
> • **Trade** — search any NFL player and compare an offer against your league's settings
> • **League** — standings, your playoff position, and ranked waiver pickups with the drop that
>   pays for each one
>
> **One honest caveat.** Week 1 does not kick off until Thursday, so there is very little played
> football to reason from yet. Omen will say "not enough data" rather than guess. That is the app
> being straight with you, not broken — the same screens fill in once games are played. Connecting
> now is still worth doing: your standings, roster, scoring settings and matchup all work today.
>
> If something looks wrong, tell me exactly what you tapped and what you expected. That is the
> most useful thing you can send.

**Why the caveat changed.** Build 4's version said the season had not started. The season floor
cleared 2026-09-05 and kickoff is 2026-09-10, so "no projections at all" is no longer true — ESPN
projections now read. "Nothing has been played yet" is.

---

## 3. What to Test → paste this

> Please connect your own league rather than using the demo.
>
> 1. Sign in (Apple, Discord, or email), then connect a league — **ESPN and Yahoo are the two I
>    most need tested**, because both are brand new on the phone this build. Sleeper too if you
>    have one
> 2. **If you have more than one league on the same provider, check they all showed up** — and
>    that each row shows *your team's name*, not the league's name
> 3. Command Center — is the team, record and matchup actually yours? Swipe sideways if you have
>    more than one league
> 4. Open League — are the standings right, is your playoff position correct, and do the waiver
>    pickups match how your league actually does waivers (FAAB bidding vs. waiver priority vs.
>    first-come free agency)?
> 5. Open Trade, type a player's name, pick one from the list, add a player to each side, tap
>    Compare
> 6. Tap Switch and move between leagues — including between two *different* providers if you have
>    them
>
> Tell me anything that shows the wrong team, the wrong numbers, or a screen you cannot get out
> of. If you see "Omen couldn't reach the server", that one is on me, not on you — but please tell
> me what you were doing when it happened, because that is exactly what I need to catch it.

**Items 1, 2 and 4 are the point of this round.** ESPN/Yahoo in-app connect, multi-league
discovery and the league-aware waiver read are the three things with real code behind them and
almost no real-world use. Item 6 stays from Build 4 for the same reason it was there: a tester
with two different providers is worth ten with one each.

---

## 4. App Review Information → **leave the Demo Mode instruction exactly as it is**

Do not edit this field. It is what lets Apple's reviewer in without an account, and changing it is
what would put the build at risk of rejection.

**One thing the reviewer may now see that they did not in Build 4:** a third-party (ESPN) sign-in
web view inside the app. Guideline 5.2.2 exposure on that was accepted by the founder on
2026-09-02 with the finding in front of him, and the prepared App Review answer is in the Wave 1
contract. Have it to hand; do not volunteer it.

---

## 5. Upload

Follow `Direction/release/ios-upload-runbook.md`. Version is **0.1.0 (5)**; Android is
**versionCode 5**, already bumped in the project files.
