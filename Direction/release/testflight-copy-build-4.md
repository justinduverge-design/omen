# TestFlight copy — Build 4

**Two different audiences read two different fields. Do not merge them.**

| Field | Who reads it | What it must say |
|---|---|---|
| **Beta App Description** | your cousins | connect your real league |
| **App Review Information / Notes** | Apple's reviewer | tap Try Demo |

Getting this backwards is not cosmetic. Apple's reviewer has no Sleeper or ESPN account and
"Sign-in required" is unchecked, so **the reviewer path must stay Demo Mode** — the earlier plan
to remove the Try Demo button would have failed Beta App Review for exactly this reason.

---

## 1. Beta App Description → paste this

> Omen reads your fantasy football league and tells you the one move that matters this week.
>
> Connect your real league — Sleeper or ESPN — and Omen uses your actual roster, your scoring
> settings and your matchup. That is the version worth testing. There is a demo league in here
> too, but it is sample data and it will not tell you anything about your team.
>
> What's in this build:
>
> • **Command Center** — your live matchup, standings, and what Omen has recommended so far
> • **Omen of the Week** — the single start/sit call, with the reasoning and a confidence score
> • **Trade** — search any NFL player and compare an offer against your league's settings
> • **League** — standings, your playoff position, and where the cut line sits
>
> **One honest caveat.** The NFL regular season has not started yet, so there are no player
> projections to work from. Omen will say so plainly rather than guessing — you will see "not
> enough data" in places, and that is the app being straight with you, not broken. Once games
> begin the same screens fill in with real numbers. Connecting your league now is still worth
> doing: standings, your matchup and your roster all work today.
>
> If something looks wrong, tell me exactly what you tapped and what you expected. That is the
> most useful thing you can send.

**Why the caveat is in there.** Facts-of-record #10: the 2026 season floor clears **2026-09-05**.
Testers this week *will* hit `insufficient_data` on Omen and on Trade verdicts. Saying so up
front turns a "your app is broken" text into a "yeah, that's expected" — and not saying it would
be the same dishonesty the whole honest-state doctrine exists to prevent.

**What is deliberately absent:** any mention of Draft Assistant or the 2027 draft. Store and
listing metadata is excluded from the 2026-08-14 amendment (facts-of-record #9) — Apple and
Google expect listing copy to describe what the app does today, and advertising an unreleased
feature risks a rejection.

---

## 2. What to Test → paste this

> Please connect your own league rather than using the demo.
>
> 1. Sign in (Apple, Discord, or email), then connect Sleeper or ESPN
> 2. Check the Command Center — is the team, record, and matchup actually yours?
> 3. Open League — are the standings right, and is your playoff position correct?
> 4. Open Trade, type a player's name, and pick one from the list that appears. Add a player to
>    each side and tap Compare
> 5. If you have more than one league, tap Switch and try picking a different one
>
> Tell me anything that shows the wrong team, the wrong numbers, or a screen you cannot get out
> of.

**Item 5 is there on purpose.** Cross-provider switching is the one thing that has been fixed at
the database level today and has had the least real-world use. Two testers with both a Sleeper
and an ESPN league would be worth more than ten with one each.

---

## 3. App Review Information → **leave the Demo Mode instruction exactly as it is**

Do not edit this field. It is what lets Apple's reviewer in without an account, and changing it
is what would put the build at risk of rejection.
