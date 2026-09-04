# Multi-league follows, the Command Center league carousel, and projected points

**Date:** 2026-09-03
**Runtime:** Claude (Opus 5), founder-directed session
**Scope:** backend + iOS + Android. Both platforms shipped together, per the standing M4 rule.

---

## What the founder asked for

Three things, in his words:

1. **Multiselect on the provider league pickers** — "you should be able to bring in multiple
   leagues from those providers and store them for our users."
2. **A Command Center league widget** — "the switcher and the matchups should mash up… matchups
   can be a widget, and it will go through your teams. Above matchups, we could have a button
   for ESPN, Yahoo, and Sleeper… and we can have an all button next to it." Ordering:
   "most at least" by league count, "alphabetical order every time" on a tie.
3. **Kill the Command Center headline** — "I don't like this week's move is ready" — and
   **start displaying projected points**, and "tie the leagues into these pages. Give it life."

Copy direction chosen in session: the **scouting-report** family, not military.

---

## The constraint that shaped the work

`platform_connections` holds **one row per `(user_id, platform)` with a single `league_id`.**
That shape encodes an assumption the product no longer holds — that a user plays in exactly one
league per platform. Storing a *set* needs a new table, and per **facts-of-record #8** authoring
SQL and applying it are distinct acts.

So the work split cleanly:

- everything that does **not** need storage shipped and is green;
- the storage half is authored, rehearsable, and **waiting on the founder's gate**.

The pleasant surprise: much less needed storage than expected. See "ESPN discovery" below.

---

## Backend

### `sql/2026-09-03_multi_league_follows_review.sql` — REVIEW ONLY, NOT APPLIED

New `public.league_follows` table: one row per `(user, platform, league)`, carrying a per-league
`team_id`, display labels captured at follow time, and a nullable `sort_order`.

Deliberately **not** a widening of `platform_connections`: the credential columns
(`espn_secret_id`, `swid_secret_id`, `token_secret_id`, `platform_user_id`) are per-ACCOUNT
facts, and a row per league would duplicate the Vault pointers alongside them. One account, many
leagues, is a join — so it gets a join table. `platform_connections` keeps owning "is this
provider connected, and with what credentials"; `league_follows` owns "and which of its leagues
does the user follow". Additive, reversible, RLS read-own, rollback and backfill both in-file.

**The gate:** approval → staging → verification → production. There is still no staging
environment (one Supabase project, one branch), which is the same situation the 2026-08-26
migration hit; that one was rehearsed in-transaction against production and rolled back before
being applied for real. Same approach available here, on the founder's word.

### ESPN league discovery — the unlock, and it needed no schema change

`espnLeagues()` in `src/routes/leagues.js` reported `discovery: "bound_only"` with the comment
"ESPN does not expose a league list to Omen." That was true of `lm-api-reads`, which can only
answer about a league you already name. It was **never true of the fan API** — the endpoint
ESPN's own site uses to render "My Teams" — which W1-A had already wired up for the connect flow
as `POST /platforms/espn/leagues`, taking cookies straight from the sign-in web view.

The same call works against the cookies already in Vault. So ESPN now reports `discovery: "full"`
with **per-league `team_id`s**, which matters because `platform_connections.espn_team_id` can
only ever describe one league. Falls back to the bound league (and the old notice, reworded to
stop asserting something false) when discovery cannot run.

### `GET /api/league/overview?leagueId=` now serves any league the user has

`selectConnections` filtered on `row.league_id`, so a request for any league but the bound one
404'd. That was the row shape leaking into the API, not a provider limit: credentials are
per-account and the adapters can read any league the account belongs to. `candidatesForRequest`
widens the lookup — **only** when the ordinary one found nothing and a league was named, so the
common path costs no extra provider call — and confirms ownership with the provider before
serving. `/api/league/standings` takes the same widening. New shared module:
`src/services/leagueDiscovery.js`.

### `POST /api/leagues/follows` → `league-follows.v1`

The multiselect write. Per-platform replace. Verifies every submitted id in **one** discovery
call; a single id the account does not play in rejects the whole set **with nothing written**.
Reports `follow_persistence` so a client can tell "saved" from "accepted but not stored yet".

### Group ordering

`orderPlatformsByFollowCount` in `src/services/leagueFollows.js` is the **single authority** for
the founder's rule: most leagues first, ties alphabetical. Both clients render that order and
neither re-sorts — a future change to the rule is one edit, not three. Providers with zero
leagues keep a stable alphabetical tail rather than disappearing; the chip row still renders them.

**Evidence:** `npm test` — **967 passing, 0 failing.** 10 new cases in
`test/leaguesDirectoryRoute.test.js` cover ESPN full discovery, the ordering rule, the tie-break,
`is_followed` defaulting, the follows write, the all-or-nothing rejection, the unpersisted-but-
accepted path, ESPN multi-follow, and a no-cookie-in-the-response assertion.

---

## Clients (iOS + Android at parity)

### The league carousel

`OmenLeagueCarousel` + `LeagueCarouselViewModel` on both platforms. Provider filter chips
(All · then each provider with a followed league, in the server's order) over a swipeable stack
of matchup cards, one per followed league. **The swipe is the switch:** the page you rest on
becomes the league Omen uses, written through `POST /api/leagues/active`, no-op'd on the
already-active page, and committed on `settledPage` / `onChange` rather than mid-drag so
dragging across five pages does not fire five provider writes.

It **replaces** the context strip and the single Matchup Hero on Command Center — those were the
two halves it merges. Passing `carousel: nil` keeps the old composition verbatim, which is what
every fixture, preview and screenshot scenario does.

Deliberate choices worth knowing:
- pages are keyed by `platform:leagueId`, never index, so a chip change cannot swap a page's
  contents under the user;
- each page loads its own overview lazily and **caches**, so swiping back costs nothing;
- the page indicator is "2 of 5", not dots — dots stop being countable past about four, and a
  user with five leagues is exactly who this is for;
- a page that fails says so **on its own card**; one dead provider does not blank the widget;
- it opens on the **active** league, not page one, so it cannot disagree with the Ledger and the
  Omen call beneath it.

### Multiselect pickers

All three connect pickers (Sleeper, Yahoo, ESPN) now toggle instead of committing on first tap.
Confirm binds the **first ticked league in list order** as active — the only ordering rule that
needs no explanation on screen — then follows all of them. The follow call runs *after* the
connect, never instead of it: a followed league on a provider with no stored credentials is a
row pointing at something Omen cannot read.

When the server reports `follow_persistence: "unavailable"`, the picker says so
("Only the first league will stick for now") rather than claiming a save that did not happen.

### Greeting

`"This week's move is ready."` → **`"Your week is scouted."`**, and the whole five-line family
moved with it. The old line was a status announcement about Omen at the top of a page whose job
is now to be a Small Council of short reads (facts-of-record #16); the new family is all about
the same subject — how much of your week Omen has been able to read — so the headline stays
coherent as the status changes underneath it.

### Projected points

`projected` has been in `league-overview.v1` since it shipped and **nothing read it.** Before
kickoff every hero showed an em dash on both sides — the one moment a projection is the only
number that exists. Now:

- **pregame**: the projection is the score, suffixed `proj` so it can never read as points
  already earned;
- **live**: real points lead, and the projected finish rides the centre rule (both sides or
  neither — "119.6–" invites the reader to fill in the blank);
- **final**: points only.

Also fixed a quiet lie: the live "what to watch" line computed the margin from `points` — the
current score — and labelled it **"Projected within…"**. It now uses the projected margin, and
falls back to `"Within X points right now."` when there is no projection.

**Evidence:** iOS **418 tests, 1 failure** (pre-existing, see below); Android **`:app:testDebugUnitTest` green** on a `--rerun-tasks` run. New twinned test files `LeagueCarouselTests.swift` / `LeagueCarouselTest.kt` pin the ordering and filtering rules on both platforms so they cannot drift.

**Visual:** verified on iPhone 17 Pro simulator via Try Demo — new greeting renders, "Your
Leagues" carousel renders with the labelled demo page, projected finish shows on the centre rule.

---

## Open items for the founder

1. **Apply the migration, or don't.** `sql/2026-09-03_multi_league_follows_review.sql` is the
   gate. Until it is applied, multiselect **accepts and verifies but does not persist** — every
   discovered league counts as followed, which is honest and is what the app did before, and the
   picker discloses it. Nothing claims a save that did not happen.
2. **`OmenChipTone.neutral` / `Neutral` needs design sign-off.** Added on both platforms for the
   "All" chip, which must not borrow a platform's colour — an All chip tinted Sleeper-green reads
   as a fourth Sleeper filter. Additive; no existing tone or call site changed. Flagged rather
   than treated as settled.
3. **The multi-page swipe is unverified on a real account.** Demo runs one mock league, so the
   simulator can only prove the single-page path. Swiping across several real leagues, and the
   commit-on-settle write, need a founder-device run with a multi-league account.
4. **Pre-existing red, not from this session:** `PrimitiveEnforcementTests` fails on `main` —
   `SignInView.swift` and `ConnectView.swift` use raw SwiftUI `Button(` instead of `OmenButton`
   (27 and 9 occurrences on `HEAD`, allowlist empty). Spun off as its own task.

## Not done

- The switcher **sheet** still exists alongside the carousel. It is now the secondary path
  (Account still opens it) and was deliberately left working rather than removed in the same
  change that introduced its replacement.
- No Android instrumented (`androidTest`) coverage for the carousel — the new tests are unit
  tests on the ordering and filtering rules, which is where drift between platforms would show.

---

# Addendum — 2026-09-04: the founder's Command Center sketch

A hand-drawn Command Center layout, worked through and built the same session. What it asked
for, and what it turned up.

## What the sketch specified

1. **`+ Add League`** above the provider chips.
2. **Chips** `ESPN · Yahoo · Sleeper` (the earlier `All` chip was kept; it was not drawn but was
   asked for the previous session, and the row is now `All · providers · + League`).
3. **The matchup card as a table** — two team rows with `PROJ` and `SCORE` as separate columns,
   both visible at once.
4. **Two swipes, not one.** The matchup box switches between teams (already built); the box
   below it switches between **the other widgets** — Waiver Watch, the Ledger, League Pulse.
5. **"Approved sayings for page"** — the headline moves to *Game Plan* language.
6. Margin notes: "whatever team the user chooses, that's the league reflected on the app"
   (confirms the swipe-commits-active-league behaviour already built), and "maybe we can create
   a small widget of the following pages that lets the user pick other teams" — **not built**,
   see Not done.

## The bug this uncovered

**`getCurrentNflWeekContext()` reports the wrong NFL week on the Saturday, Sunday and Monday of
every game week.** It anchors on a fixed `Date.UTC(season, 8, 5)`, whose weekday moves each
year; in 2026 September 5 is a Saturday, so the week turns over then. Sunday 2026-09-13 is the
Sunday of **NFL Week 1** and it reports **week 2** — the two days most people open a fantasy app.

The headline names the week, so it could not use that number. `getNflGameWeek()` was added
beside it: Tuesday-anchored (derived from Labor Day + 1, so it needs no edit each season), read
in **America/New_York** because a phone in Los Angeles at 9pm Monday is still on Monday in the
league's week, and returning `week: null` off-season rather than clamping to 1.

**The global function was deliberately not changed.** It feeds Tuesday scoring, the Omen engine,
waiver analysis and every provider matchup read, and we are days from Week 1 — a wrong week
number in scoring rewrites Ledger history. `test/nflSchedule.test.js` pins the disagreement on
purpose, with a note to delete that assertion rather than "fix" it once the reconciliation
lands. Tracked as its own task.

## The headline, and where it still needs you

Founder direction: **rotate the copy through the game week.** Tuesday prepares the plan,
Wednesday has it ready, Thursday through Monday is game mode. Driven by `game_week` on
`dashboard-summary.v1` — from the server, never the device.

| When | Line |
| --- | --- |
| Tue | Preparing your Week 3 game plan. |
| Wed | Your Week 3 game plan is ready. |
| Thu | Week 3 is live. Thursday night is on. |
| Fri | Week 3 in progress. Lineups still open. |
| Sat | Week 3 in progress. Lineups lock tomorrow. |
| Sun | Sunday. Week 3 is in play. |
| Mon | Monday night closes out Week 3. |

**The live-window lines are a first draft, not a settled set** — the founder asked to workshop
them. They live in one function per platform (`gameWeekLine`) so a rewrite is one edit.

Two rules hold regardless of the wording:
- **Status beats the calendar.** A disconnected user is never told "Sunday, Week 3 is in play";
  that is a claim about a week Omen cannot see for them.
- **No week number, no week in the copy.** Off-season and older servers fall back to
  "Your game plan is ready." rather than inventing one — the same class of error as the clamped
  `week: 1` that once made the off-season look like Week 1.

## Also built

- **PROJ / SCORE columns** on `OmenMatchupHero`, both platforms. Pregame fills PROJ and shows an
  em dash for SCORE (never `0.0`); live fills both; final drops the projection. The centre rule
  used to restate the same two projections three lines away, so with columns present it now
  says the phase (`Live score`, `Not started`) instead.
- Fixed a **facts-of-record #21 violation** found in passing: the score used
  `design: .monospaced` — a mono family — where the rule is `.monospacedDigit()` on the normal
  face. DM Mono is retired app-wide and must not come back to fix column alignment.
- **`+ League` chip** trailing the provider filters, opening the existing connect sheet.
- **`OmenWidgetPager`** — Waiver / Ledger / Pulse as one paged widget with a **labelled tab
  row**, not dots. Paging buys ~two screens of vertical space and costs discoverability; naming
  all three at once keeps the two that are hidden *known*. Tabs are also the control, so it
  works for someone who never swipes. Each page scrolls internally rather than clipping, and
  "See all →" / "League →" ride along so neither section is stranded.
- **`optIntOrNull` promoted to `JsonExt.kt`** on Android and its three private copies deleted —
  that file's own doc comment warns about exactly this drift.

**Evidence:** backend **973/973**; iOS **425 tests, 1 pre-existing failure**; Android unit suite
green. Visually verified on iPhone 17 Pro simulator through Try Demo — headline, PROJ/SCORE
columns, chip row, and the widget pager switching by both tap and swipe.

## Still open

1. **Workshop the live-window lines** (above). Tuesday and Wednesday match the founder's own
   words; Thursday–Monday are mine.
2. **The week-anchor reconciliation** — founder call, scoring blast radius.
3. **The team picker on Omen / Trade / League** — the sketch's left-margin note. Not built; it
   is a separate slice and the Command Center work stood on its own.
4. Everything still open from the main handoff above: the `league_follows` migration gate, the
   `neutral` chip tone sign-off, and the multi-page swipe on a real multi-league account.

---

# Addendum 2 — 2026-09-04: the horizontal provider row, and the team picker

Founder, on the previous build: *"you still have Sleeper, Yahoo and ESPN going down on three
columns. It should just be horizontal, like in my sketch… the icons displayed under should
represent the leagues that are connected. If they don't have that, then it doesn't pop up."*

## What that was actually pointing at

`OmenPlatformCompactStrip` — the three stacked rows above the matchup, one per provider,
reporting `Connected` / `Disconnected`. It listed all three unconditionally, so a user with one
connection spent two rows of the fold reading the word "Disconnected" about products they do
not use, and none of it was a control.

**It is now suppressed whenever the carousel is present.** The carousel's chip row answers the
same question better: it names only providers the user actually has, horizontally, and each chip
*filters* rather than merely reporting.

What the strip also carried, and where it went:
- **last sync / reconnect-required** → the affected league's own carousel page, which already
  says so on its own card when it cannot read;
- **connect / manage** → the `+ League` chip and Account, which is where the ESPN consent copy
  already tells users to go to disconnect.

The stacked strip is kept for the `carousel == nil` path, which is every fixture, preview and
screenshot scenario.

## Layout now matches the sketch, top to bottom

`Command Center` header → **chips** (`All · providers · + League`) → **Matchup** → the card →
**Waiver · Ledger · Pulse** tabs → the widget. The chips moved *above* the Matchup heading
rather than sitting inside a "Your Leagues" section of their own, because they are the screen's
provider row — the thing the strip used to be — and the matchup is what they act on.

## The matchup swipe was already built

Worth recording, because it looked missing and was not: swiping the matchup through connected
leagues, with the rested-on page becoming the active league via `POST /api/leagues/active`, has
worked since the first addendum. **It is invisible in demo, which has one league** — every
screenshot to date was that single static card. The founder has multiple real leagues and will
verify the swipe on device, so multi-league demo fixtures were deliberately NOT built.

## The team picker

`OmenTeamPicker`, on Omen / Trade / League. One horizontal row of the user's teams; tap to make
one active. The sketch's left-margin note: *"maybe we can create a small widget of the following
pages that lets the user pick other teams."*

Three decisions worth knowing:

- **It shares Command Center's `LeagueCarouselViewModel`.** Enumerating leagues makes live
  provider calls, so a picker with its own view model would pay for the directory three more
  times — once per tab — and could disagree with Command Center about which league is active
  while it did. One instance means the directory is already loaded, the tap costs exactly one
  write, and there is only ever one answer to "which league is active".
- **It is a row of chips, not a carousel.** The carousel swipes because its pages carry a whole
  matchup each; these screens want a glance and a tap. Same commit underneath, different
  gesture, because the screens ask different things of the user.
- **One league renders nothing.** A row with a single chip is a control that can only confirm
  what the screen already says.

`commitSelection()` was refactored into `commit(_ page:)` so both surfaces share one
implementation — two would eventually disagree about what happens on failure, and the failure
path is the one that matters. Switching on any tab reloads **every** personalized surface, not
just the visible one: a user who switches on Trade and then taps League must not find the old
team there.

**Evidence:** backend **973/973**; iOS **429 tests, 1 pre-existing failure**; Android unit suite
green. Four new twinned cases per platform cover the commit path — no-op on the active league,
the successful write returning the server's `refresh` list, a failed write returning `nil` so
the caller does not refresh onto a stale context, and the one-league rule. Layout verified on
the iPhone 17 Pro simulator.

## Still open, unchanged from Addendum 1

The `league_follows` migration gate, the `neutral` chip tone design sign-off, the live-window
copy workshop, and the NFL week-anchor reconciliation. Plus: **the multi-league swipe and the
team picker are both unverified on a real multi-league account** — that is the founder's next
device run.

