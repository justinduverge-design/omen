# The bar Omen has not met

**Date:** 2026-08-30, end of the beta-cut session
**Source:** the founder, on a real device, minutes after installing Build 4
**Status:** product direction — nothing here is a defect report, and nothing here is scheduled yet

## The founder's own framing, kept because the wording matters

> "We got Omen up to beta. Like, we know we can make a beta app. That's cool… Now we need to make
> sure that it is **Omen** that is on beta. The one that we're making. Valor Ventures should be
> absolutely proud of this. The app that we currently have right now is **a bit of the
> imagination in which we used to create this app. It's not there. It's not beating the bar.**"

And the product's north star, restated by him unprompted:

> "That's the whole point of this app. It's supposed to be a **centralized place to get all of
> your info, one stop shop for fantasy advice, and it's free and ahead of the curve.**"

**Read the distinction carefully.** Tonight proved a *capability*: this team can take a native app
from broken to signed, uploaded, reviewed and installed on a real phone in one session. That is
worth keeping. It is not the same as proving the *product*. Shipping a beta and shipping Omen are
two different achievements, and only the first one happened.

## What he found, with the code checked behind each item

Nothing below is taken on faith. Each was verified in source before being written down.

### 1. Command Center is one long scroll

> "Command Center is, like, one big scroll. Shouldn't it just be, like, a dropdown that you get to
> choose which one you wanna see?"

He half-retracted this mid-sentence — *"Okay. I lied… Command Center is not like every other
page"* — and then restated it anyway. **Take the restatement, not the retraction.** The instinct
that survives a self-correction is usually the real one.

The screen stacks matchup hero → provider rows → waiver watch → ledger → league pulse in a single
vertical run. Confirmed on both platforms during the sweep: reaching League Pulse takes roughly
five full swipes.

### 2. The team selector should move up and slim down

> "Move the team selector up, make it a little skinnier."

`OmenContextStrip` currently sits below the greeting and takes a full card's height for one team
name and a Switch control.

### 3. Platform colours are missing exactly where he was looking — **verified**

> "When you're switching teams, like, Sleeper should be blue. ESPN should be red. Yahoo should be
> purple… if you look at the web app, little things like that aren't consistent here on the phone."

**He is right, and the inconsistency is precisely on the screen he was on.** `OmenPlatformBadge`
exists on native, carries the correct per-platform chip colours, and is used on the Command
Center. But `OmenLeagueSwitcherSheet` labels its platform groups with plain secondary-grey text:

```swift
Text(platformDisplayName(group.platform).uppercased())
    .omenTextStyle(OmenTypography.label)
    .foregroundStyle(OmenColor.textSecondary)
```

So the one screen whose entire job is *telling platforms apart* is the one screen that renders
them identically. The component to fix it already exists; it simply was not used. Android has the
same shape.

### 4. Trade should know your league — and the data is **already being fetched and discarded**

> "When we are trying to trade, you should be able to pick a player from your league, and see his
> players real quick… I just wanna trade with somebody in my league that I know. Maybe that's
> definitely not on the web app, but that should be on the phone app."

He is right that this is not a web-parity item. **It is a new capability — and it is far closer
than it looks.**

`Blueprints/specs/b2d3-live-trade-capability-sleeper-v1.md` already specifies it, and records
this:

> `fetchSleeperRoster` fetches every roster **and every user** in the league on every call… It
> returns both arrays, then normalizes only the requesting user's roster. **The opponent data is
> already in hand and already discarded.**

So for Sleeper: no new endpoint, no new credential, no founder gate. The league-mate picker he
just asked for is mostly a matter of *keeping* data the adapter already throws away.

The spec also carries the rule that makes the feature honest rather than a fleece generator:
**only suggest a trade where both teams' projected starting lineups improve.** A trade the other
manager would never accept is not a move; it is a fantasy.

Yahoo and ESPN have no opponent-roster source, so this ships Sleeper-first and says so.

### 5. Native Trade is a reduced version of the web Trade Analyzer

Separate from #4, and this one is straight parity. The web page has, and native does not:

| Web Trade Analyzer | Native |
|---|---|
| Scoring selector (PPR / Half-PPR / Standard) | absent — always standard unless a league is bound |
| Deal shape (two-team / multi-team) | absent |
| Position dropdown + manual projected points | absent |
| VORP value and per-side totals | absent — verdict only |

Tonight's work took native Trade from **broken** to **working**. It did not take it to **equal**,
and the founder was allowed to believe otherwise. That was the reporting failure of the session.

### 6. Yahoo — ~~externally blocked~~ **WRONG. Native was stale. Corrected and fixed.**

> "You can't connect to Yahoo leagues. What the heck is going on?"

**The first version of this section was wrong, and the founder caught it:**

> "Yahoo restored our API. That's live. That's ready to go. What is going on? That should have
> been documented. That happened Friday."

He is right. Yahoo granted the Fantasy Sports entitlement for app `ZcZJXm8V` on **2026-08-28**.
`src/config/index.js` records the live probe — 200 on `/game/nfl` and `/users;use_login=1/games`,
where every call had 403'd since 2026-08-13. `YAHOO_ENABLED=true` on `omen_api` and `omen_cron`.
The web gate `YAHOO_CONNECTIONS_ENABLED` is `true`. There is a handoff doc and a commit,
`feat(yahoo): entitlement granted — re-enable Yahoo connections`.

**It was documented. Native just never got the message** — both clients still hardcoded *"paused
while we wait on Yahoo to restore our data access."* Backend live, web live, native blocking, for
two days.

**How the wrong claim got written down:** the native comment was read and reported as current
fact, without checking the backend or the git history. That is the same failure recorded in
`F-DEV-02` earlier the same night — a comment asserting a state the system had already left —
committed while holding the note about it.

**Fixed** (`F-DEV-06`, on `main`): Yahoo is now `useWeb` on both platforms, matching ESPN. Not
`available`, because Yahoo connects by OAuth and native has browser plumbing only for Supabase
sign-in; `available` would render a dead button. Web connect works today and every native surface
reads the resulting connection.

**A contractual catch came with it.** `omenShowsYahooAttribution` was gated on `== .available`.
Since a web-connected Yahoo account *is* read natively, the app can display Yahoo data while
showing no Yahoo button — so that gate would have shipped Yahoo Fantasy Information with **no
attribution**, which the Yahoo API Access and Use Agreement (executed 2026-08-20) requires
wherever it appears. The gate now asks whether Yahoo data can reach the app at all.

**Corrected beta scope:** Sleeper testers get the full product. **Yahoo and ESPN testers connect
once in a browser, then the app works.** Nobody is locked out.

## The founder's requirements for the next build

Given verbatim, with the verified state of each beside it. **These are requirements, not
suggestions.**

| # | Requirement | Verified state today |
|---|---|---|
| R1 | *"connect to every app other than ESPN through their phone"* | Sleeper ✅ native. **Yahoo ❌** — now `useWeb`; needs native OAuth wired to `ASWebAuthenticationSession` / Custom Tabs, both of which already exist for Supabase sign-in. ESPN stays web **by his explicit exemption**. |
| R2 | *"see league context on every window, on everything"* | **Command Center only.** `OmenContextStrip` renders on no other screen — Omen, Trade and League show nothing. |
| R3 | *"for trades, I want there to be the positions"* | Web has a position dropdown; native has none. |
| R4 | *"choose between two teams in your leagues or three teams"* | Web has `deal_shape` two_team / multi_team; native has neither. The league-mate picker is specced in `b2d3-live-trade-capability-sleeper-v1.md`, and `fetchSleeperRoster` **already fetches every roster and every user, then discards the opponents.** |
| R5 | *"type in players in case… if you want that instead, sure"* | Native already does this. **Keep it** — it becomes the fallback, not the only path. |
| R6 | *"send those QR codes or whatever"* | Backend has `POST /api/trade/share` → `trade-share.v1`, a 30-day public hash, plus an OG SVG for link cards. **Native has no share affordance at all, and no QR exists anywhere.** QR is genuinely new. |
| R7 | *"I need to be able to watch stuff"* | **Ambiguous — do not guess.** Read as Waiver Watch, which renders on Command Center as `availabilityUnknown` because `dashboard-summary.v1` carries no opportunities. Confirm before building. |

The through-line in R1, R2 and R4 is one complaint, not three: **the app does not act like it
knows what league you are in.**

## The honest summary

Omen today is a working three-tab app with a thin Trade, a switcher that does not look like the
rest of the product, one provider fully supported, one provider gated behind a browser detour,
and one provider unavailable. Every individual state in it is honest — that discipline held all
session and is worth keeping.

But honest is the floor, not the bar. The founder's bar is *"a one-stop shop, free, and ahead of
the curve,"* and the distance between those two sentences is this document.

## Suggested order, by his own priorities

1. **Platform colours in the switcher** — the component exists; smallest possible gap between what
   the design system says and what the screen does
2. **Context strip up and slimmer** — the founder's most concrete layout ask
3. **Command Center section navigation** — replaces the long scroll
4. **Trade league-mate picker (Sleeper)** — the biggest product win, and the data is already
   being fetched
5. **Trade web parity** — scoring, deal shape, value breakdown
6. **Yahoo** — carry as a named external dependency; re-check, do not build against

Items 1–3 are design-system work against specs that already exist. Item 4 has a written spec and
an adapter that already holds the data. **None of this is speculative; all of it is deferred.**
