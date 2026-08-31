# Omen vs the bar — audit, map, and strategy

**Date:** 2026-08-30 · live API probes and device runs 2026-08-31T03:06–03:25Z
**Scope source:** `Direction/product/2026-08-30-the-bar-omen-has-not-met.md`

**Founder rulings that shaped this pass:**
- Scope: *"audit and create a map and strategy… what are all the cheap wins we can have and what are the expensive ones we need to have for production. I want a really contemporary app, it should feel new and elite."*
- Fourth lens (Fact-Checker): **approved, and retroactive.**
- R7: *"i dont know what i meant i was rambling in speech to text."* → not guessed. See §8.
- R1 Yahoo: **scope, do not build.**
- Interaction directive: *"more drop down menus or swipe for the next widget type of actions on the pages."*

**Status:** findings + map + strategy. **No code changed.** Nothing here is implemented.

**How this pass was run.** Both apps were **built and driven**, not read.
- **iOS:** built Debug from source (Xcode 26.6), verified the built `Info.plist` carries
  `OMEN_API_BASE_URL = https://slopssaloon.com` (**not** the `example.invalid` fallback), installed
  to iPhone 16 sim (iOS 26.5), Build 4 / v0.1.0. Every screen opened, fields typed into.
- **Android:** `OMEN_DEBUG_API_BASE_URL=https://slopssaloon.com ./gradlew :app:installDebug`,
  medium_phone AVD (API 36), typed one character at a time per the known `adb input text` trap.
- **Web:** live `slopssaloon.com`, real requests, network bodies read.

---

## 0. The two headlines

### Headline 1 — iOS Trade is unusable after one player. It is in the founder's hands right now.

**Add one player to a trade, and no text field on the iOS Trade screen will ever accept focus
again.** Not the send field, not the receive field. Compare stays permanently disabled. The
trade can never be completed.

**Four reproductions**, including one from a cold app relaunch. Scrolling does not recover it.
Tapping twice does not recover it. **Android does not have this bug.**

This is in **Build 4** — the build on the founder's phone, the build he said Trade "worked" in.
It rendered. It cannot be finished.

Every prior pass missed it for the reason this session was called: **nobody added a second
player.** `F-BAR-12`.

### Headline 2 — The web app is the dishonest one. Native is ahead of it.

The product doc treats web as the parity target — native as "a reduced version of the web Trade
Analyzer." That premise is **backwards.**

Live, on slopssaloon.com: the server returns `verdict_state: "insufficient_data"` with
`evaluability.reason: "missing_projections"`, and the page displays the word **`neutral`** —
lowercase, a raw machine token, standing in for the one state the four-value vocabulary exists
to protect. Native reads `verdict_state` correctly and says *"Omen can't call this one."*

**Chasing parity-to-web would be a regression in three places**, and two of the requirements the
doc lists as "web has it, native doesn't" describe controls that do nothing. `F-BAR-01`,
`F-BAR-02`.

---

## 1. The fourth lens

Approved and retroactive. Its rule: trust no comment, no doc, no status line, no prior finding;
diff what each surface *claims* against what the system *does*, and diff surfaces against each
other.

It raised **six** of the twenty findings below, and five of those six were invisible to the
other three lenses, because the other lenses start by believing the document.

**Retroactive sweep:** one more Yahoo-shaped falsehood found in the record — `F-BAR-09`.

---

## 2. Findings

Ordered by cost of reversal, then severity. Every one was proved by running the thing.

---

### `F-BAR-12` — iOS Trade: after one player is added, no field regains focus **[BETA-BLOCKING]**

**Lens:** Veteran · **Reversibility:** afternoon · **Platform:** iOS only

**Reproduction (4×, one from cold launch):**
1. Try Demo → Trade
2. Tap "You send" field → type `Hill` → suggestions appear → tap *Tyreek Hill* → row added ✓
3. Tap "You receive" field → type `Bijan` → **nothing. Placeholder unchanged.**
4. Tap it again → type again → **nothing.**
5. Tap the *send* field instead → type → **nothing.**
6. Scroll, then tap → **nothing.**

Compare stays disabled forever. Helper text reads *"Add a player you'd receive."* — correct, and
unreachable.

**Android, identical steps: works.** Receive field focuses, accepts text, autocompletes, adds.

**Root-cause hypothesis (stated as hypothesis, not fact — not yet proven in a debugger):**
`OmenTradeScreen` carries `.onTapGesture { focusedField = nil }` on the ScrollView, added for
`F-DEV-01` (the keyboard trap the founder found), and every `onAdd` path also sets
`focusedField = nil`. Once `@FocusState` has been cleared programmatically, the container's tap
gesture appears to consume subsequent taps before a `TextField` can become first responder.

**If that hypothesis holds, the fix for `F-DEV-01` created this defect** — which is exactly the
class this session was convened to catch, and it shipped in the same build as the fix.

---

### `F-BAR-13` — The suggestion list renders **above** the input and is unbounded **[both platforms]**

**Lens:** Veteran + Hotshot · **Reversibility:** afternoon

The picker is placed between the section label and the field, not under it. Typing a common
surname pushes the field you are typing in **off the bottom of the screen**.

Observed: `Hill` returns 10+ rows on both platforms. On Android with the keyboard up, **the input
field is entirely off-screen** — you cannot see what you typed. On iOS the list runs behind the
floating tab bar.

The code comment says: *"The picker sits directly under the field it belongs to."* **It sits
above it.** Fact-Checker: comment vs. reality.

---

### `F-BAR-14` — Android: a suggestion row is visually identical to an added player **[BETA-BLOCKING]**

**Lens:** Veteran · **Reversibility:** afternoon · **Platform:** Android

Same card, same fill, same typography, same slot. The **only** difference is that a committed
player carries a "Remove" link.

Observed live: "Bijan Robinson · RB · ATL" rendered under **You receive** looking exactly like
the committed "Tyreek Hill" row above it — while **Compare stayed disabled** and the helper text
still read *"Add a player you'd receive."*

The user sees a player on the receive side, a dead Compare button, and copy telling them to add
the player that is visibly already there. **Three surfaces disagreeing about one piece of state.**

---

### `F-BAR-15` — Demo mode claims a live provider connection, with a sync time **[both platforms]**

**Lens:** Fact-Checker + Veteran · **Reversibility:** afternoon

In demo, the platforms strip renders:

> **Sleeper** · Connected · **4m ago**

No mock label, no demo qualifier. There is no connection and there was no sync. The context
strip directly above it *is* labelled ("Demo Slate (mock league)") — so the screen labels one
fabrication and not the other.

`OmenCommandCenterScreen`'s own doc comment says:

> *"This composition never selects a 'connected' fixture on its own — exposing demo-connected
> provider claims to a real user would violate facts-of-record #7."*

**The screen does the exact thing its own comment says it must not do.** Facts of record #7:
*mock data is always labelled.*

---

### `F-BAR-01` — Web Trade substitutes `neutral` for `insufficient_data` **[WEEK-1-BLOCKING]**

**Lens:** Fact-Checker (raised), Veteran (owns A2 — no state substituted)

`frontend/src/pages/TradeAnalyzer.jsx:388-389` renders `{result.verdict}` — the **v1** field —
and never reads `verdict_state`, `evaluability`, or `analysis_context.unavailable_reason`.

**Live proof**, Jefferson for Robinson:

| Server said | Page showed |
|---|---|
| `verdict_state: "insufficient_data"` | `neutral` |
| `evaluability.reason: "missing_projections"` | *(nothing)* |
| `missing_projection_count: 2` of 2 | *(nothing)* |

Three defects in one line: **state substitution**, **a raw enum printed as user copy**, and
**`evaluability` never read.**

And `TradeAnalyzer.jsx:726` gates the entire result panel on `result.verdict` — so the day the
server drops the v1 field (additive-safe by its own rules), **web Trade returns "No result
returned" for every query.** Native survives that. Web does not.

---

### `F-BAR-03` — Native prints a confident analysis directly beneath "Omen can't call this one"

**Lens:** Veteran · **Reversibility:** afternoon

`OmenTradeVerdictCard` renders `result.explanation` **unconditionally** — guarded only by
`!isEmpty`. Only `net_value` is correctly gated behind `evaluability.isEvaluable`.

The live server returns, in the **same payload** as `insufficient_data`:

> *"This trade is neutral because the model sees roughly equal long-term value in both players.
> The key factor is the uncertain futures of Jefferson and Robinson…"*

So the card reads: **"Omen can't call this one"** → *"no projection for 2 of these players, so it
won't force a verdict"* → *and then a paragraph making the call.*

Worse in the off-season: `scarcity_analysis` currently grades **Justin Jefferson as
"replaceable-tier", VORP −8**, because there is nothing to grade him against.

**Not reachable in demo** (demo short-circuits to *"Sign in to compare a real offer"*), so this
is proved from the live API response plus the unconditional render — **not photographed**. It
needs one signed-in run to close.

---

### `F-BAR-02` — The web "Deal shape" control does nothing **[dead affordance]**

**Lens:** Fact-Checker / Scrappy · **Reversibility:** afternoon

`buildTradePayload({ send, receive, scoringFormat })` — `dealShape` is not a parameter and not in
the payload. `grep -rn "deal_shape" src/` → **zero** backend hits.

**Live:** `POST /api/trade/compare` with `deal_shape: "multi_team"` → `200`, no echo, no
validation complaint, byte-identical analysis. The control's only effect is swapping its own
description paragraph.

**This corrects the product doc.** R4 reads *"Web has `deal_shape` two_team / multi_team; native
has neither."* Web has a **segmented control**, not the capability. **Neither platform has
multi-team deals** — and one of them tells the user it does.

---

### `F-BAR-16` — Content collides with system chrome and the app's own tab bar **[iOS]**

**Lens:** Veteran + Hotshot · **Reversibility:** afternoon

Scrolling Command Center, card text runs **under the status bar and the Dynamic Island** —
"Demo deadline · Wed 3:00 AM" and player rows render behind the clock, clipped and unreadable.
At the bottom, Ledger rows render **behind the floating tab capsule**.

The scroll view has no top or bottom safe-area inset for either. It is the single cheapest thing
standing between this screen and looking finished.

---

### `F-BAR-17` — The Welcome screen is a different design on each platform **[parity]**

**Lens:** Hotshot · **Reversibility:** afternoon

| | iOS | Android |
|---|---|---|
| Title | vertically centred | top-left |
| Buttons | pinned to the bottom, centred | immediately under subtitle, left-aligned |
| **Order** | **Get started**, then Try Demo | **Try Demo**, then Get started |

**The primary action order is inverted on screen one.** Not a theme artifact — reproduced in
both light and dark on Android. On iOS, roughly **80% of the screen is empty**: title at 40%
height, buttons at 88%, nothing in between, no mark, no proof of what the app does.

---

### `F-BAR-18` — Android light mode is undesigned **[brand]**

**Lens:** Hotshot · **Reversibility:** afternoon

The emulator's default (light) renders Omen on a **near-white background**: brand gold reads as
**brown/olive**, the "Try Demo" outline nearly vanishes, and the primary "Get started" button is
a muddy dark block.

Switching the emulator to dark (`cmd uimode night yes`) restores the intended look — so the dark
theme is correct and **light mode is a real, separate, unstyled state**, not a broken theme.
`page-system.md` makes light/dark parity a contract.

**iOS light mode was not tested.** Flagged in §9.

---

### `F-BAR-19` — The iOS tab bar uses system blue, not brand gold **[brand]**

**Lens:** Hotshot · **Reversibility:** afternoon

Selected-tab icon and label render in **iOS system blue**. Android renders the same tab in
**brand gold**. The accent colour of the most persistent chrome in the app differs by platform,
and iOS is the one that is off-brand.

---

### `F-BAR-20` — League and Command Center disagree about whether a demo league exists

**Lens:** Fact-Checker · **Reversibility:** afternoon

Same session, same demo user, two tabs:

- **Command Center:** Demo Titans 6–1, live score 64.8–58.1, "3rd of 12 · In a playoff spot",
  a demo waiver recommendation, two ledger rows.
- **League:** *"Demo mode shows no live league. Sign in with a connected league to see your own."*

Both are internally honest. **Together they contradict each other.** A tester who taps League
after Command Center is told the league he was just reading does not exist.

---

### `F-BAR-21` — iOS drops position and team from the added-player row; Android shows them

**Lens:** Scrappy · **Reversibility:** afternoon

The picker shows "Justin Jefferson / WR · MIN" and `TradePlayer` keeps `position` and `team`. The
**iOS** committed row renders **name only**. The **Android** row renders **"Bijan Robinson / RB ·
ATL"**.

**R3 ("I want there to be the positions") is already half-satisfied on Android and absent on
iOS** — from data both clients already hold. The inversion is worth noting on its own: the
platforms are not diverging in one direction.

---

### `F-BAR-22` — iOS Sign in: the email field did not accept focus or text **[UNCONFIRMED — highest-priority re-test]**

**Lens:** Veteran · **Reversibility:** afternoon

Tapped the Email field, typed 18 characters — placeholder unchanged. Repeated with a second
string — unchanged. Tapping "Continue with email" with an empty field produced **no error, no
message, nothing at all.**

**Controls run:** "Back" on the same screen worked immediately (so taps land and the coordinate
mapping is right), and the identical `OmenTextField` component typed fine on Trade minutes later.

**Why it is still marked unconfirmed:** the Sign in field is wrapped in `OmenFormField` and the
Trade field is not, so the two are not the same composition. If `F-BAR-12`'s hypothesis is right,
these may share a root cause.

**If this reproduces, email sign-in is unreachable on iOS** — which would make it beta-blocking.
It is the single most important thing to re-test first.

---

### `F-BAR-06` — Provider colour absent in the switcher, both platforms *(confirms the doc)*

**Lens:** Veteran · **Reversibility:** afternoon

- iOS `OmenLeagueSwitcherSheet.swift`, `platformSection`: `.foregroundStyle(OmenColor.textSecondary)`
- Android `OmenLeagueSwitcherSheet.kt:156-159`: `color = OmenTheme.color.textSecondary`

**And the component demonstrably works.** Photographed on Command Center, both platforms:
**SLEEPER blue, YAHOO purple, ESPN red**, correct and legible. The switcher is the only surface
that opts out.

**Not photographed in the switcher** — demo has one mock league, so the platform-grouped list
never renders. Source-verified only.

---

### `F-BAR-07` — R2 confirmed on device: league context on Command Center and nowhere else

**Lens:** Veteran · **Reversibility:** afternoon

Photographed: the context strip renders on Command Center (both platforms). **Omen, Trade and
League show nothing.** Trade even says *"Standard scoring. Connect a league to use your own
settings."* while a demo league is active and named on the previous tab.

Complete non-test, non-gallery call-site list: `OmenCommandCenterScreen.swift:62`,
`OmenCommandCenterScreen.kt:109`. That is the entire set.

---

### `F-BAR-08` — Yahoo attribution renders on exactly one screen **[contractual]**

**Lens:** Fact-Checker · **Reversibility:** contract (a signed agreement)

`omenShowsYahooAttribution` is correct — it asks whether Yahoo data can reach the app at all.
Its **only** call sites are `OmenHelpSupportView.swift:160` and `OmenHelpSupportScreen.kt:163`.

A web-connected Yahoo league is read by Command Center, League, Trade and the switcher — all of
which can **display Yahoo Fantasy Information with no attribution.** The agreement (executed
2026-08-20) requires it wherever that data appears.

Web gets this right: `frontend/src/components/layout/Footer.jsx:29`, global chrome, every page.

**The predicate was fixed and the surfaces it feeds were never re-derived** — the same shape as
the original bug.

---

### `F-BAR-09` — `agent_inbox.md` says the season floor cleared. The live API disagrees.

**Lens:** Fact-Checker (retroactive sweep) · **Reversibility:** afternoon

`Direction/agent_inbox.md`: *"**Season floor cleared 2026-08-26:** F6-F8 are runnable"*

**Live**, `GET /api/system/current-week`, 2026-08-31T03:06Z:

```json
{"season":2026,"week":1,"season_type":"regular","is_off_season":true,"raw_week":0}
```

`facts-of-record.md` #10 says it clears **2026-09-05** and carries a ⚠️ warning that this exact
claim was written once before and withdrawn. **It was withdrawn in the facts file and left
standing in the inbox** — the file agents read to pick work. Fact #11's own post-mortem names
this failure: *"a correction was written where it was discovered rather than everywhere it was
asserted."*

Note also `season_type: "regular"` nine days before kickoff, from the same clamp. **`is_off_season`
is the only field telling the truth.**

---

### `F-BAR-04` — A complete Waiver Analysis API exists and no client calls it

**Lens:** Scrappy · **Reversibility:** afternoon · **This is the R7 answer**

`GET /api/waivers/analysis`:
- **Route:** `src/routes/waivers.js:156` — auth, week validation, connection resolution, typed
  error bodies (`no_usable_league`, `<platform>_reconnect_required`, `provider_unavailable`) each
  with an `action`.
- **Service:** `src/services/waiverAnalysis.js` — versioned envelope with `best_move`, `cost`,
  `evidence[]`, `alternatives[]`, `availability_state`, `deadline`, off-season suppression.
- **Tests:** `test/waiverAnalysisRoute.test.js` · **Mounted:** `src/server.js:257-260`
- **Callers across `frontend/src`, `mobile/ios`, `mobile/android`: none.**

Meanwhile Command Center's Waiver Watch shows `availabilityUnknown` for real users, because it
reads `dashboard-summary.v1`, which carries a tool *status* and no opportunities.

**And demo mode makes this vivid:** in demo, Waiver Watch shows a real recommendation ("Tyrone
Tracy Jr. · RB — Immediate help at RB during a thin Week 7") and a *"Review Omen's waiver
analysis →"* link. **Demo advertises a capability real users cannot get, while the backend that
would deliver it sits behind an unrouted door.**

---

### `F-BAR-05` — The Sleeper league-mate picker is a route away, not an integration away

**Lens:** Scrappy · **Reversibility:** contract (new route shape)

The doc says `fetchSleeperRoster` fetches every roster and user then discards opponents. **True**
(`src/adapters/sleeper.js:274-297`) — and it understates the position.

`fetchSleeperLeagueRosters` (`sleeper.js:574-613`) already returns, for **every team**:
- `roster_id` and a **privacy-safe** `team_name` via `sleeperLeagueTeamName` (`:315`), whose
  comment reads *"Trade candidates must never surface a manager's Sleeper display name,
  username, user id, or avatar"* — **the privacy review for this feature is already written into
  the adapter**;
- every player, normalized, with **projections merged** and starter/bench/IR/taxi slotting.

Only caller: `src/services/omen.js:977`. **No route exposes it.**

R4 on Sleeper needs one route, a picker on two clients, and the both-lineups-improve rule from
`b2d3-live-trade-capability-sleeper-v1.md`. No new provider call, no new credential, no founder
gate, and the hard privacy question already answered.

---

### `F-BAR-10` — Native discards half of every trade response

**Lens:** Scrappy · **Reversibility:** afternoon

Live `/api/trade/compare` returns 17 fields. `TradeCompare.swift` decodes **six**.

Served every call, deleted on decode by both native clients: `a_score`, `b_score`,
`combined_score`, `confidence`, `scarcity_analysis` (per-player VORP + tier + plain-English
summary), `depth_discounted`.

The doc lists *"VORP value and per-side totals"* as a **web feature**. It is an **API feature
both clients are already served** — web renders it, native drops it.

---

### `F-BAR-11` — Backend accepts scoring format and projected points; native sends neither

**Lens:** Scrappy · **Reversibility:** afternoon

`src/routes/trade.js:77-80` validates `scoring_format`. `:65-68, :238-240` accept per-player
`projected_points`. `:231` reads `position`.

`TradeOffer.requestBody` sends `send`, `receive`, and optionally `league_context`. **No
`scoring_format`.**

**R3 is not a backend item.** It is a control on a screen, over a contract that has always
accepted it.

---

### Smaller, verified, worth listing

| | Finding | Lens |
|---|---|---|
| `F-BAR-23` | iOS demo session does not survive an app relaunch — back to Welcome. A tester re-onboards every launch. | Veteran |
| `F-BAR-24` | iOS switcher sheet occupies ~50% height with a large black void below and no drag indicator. Reads unfinished. | Hotshot |
| `F-BAR-25` | iOS Welcome/Sign-in button widths hug their labels, so three stacked buttons have three different widths, left-aligned. Command Center's buttons are centred and equal. Two button layouts in consecutive screens. | Hotshot |
| `F-BAR-26` | Placeholder copy differs: iOS *"Player name"*, Android *"Add a player"*. | Fact-Checker |
| `F-BAR-27` | iOS League tab renders no screen title, unlike every other tab. | Hotshot |

---

## 3. What is genuinely good — do not break it

Stated because the strategy depends on knowing what already clears the bar.

- **The Omen tab is the elite bar, already met.** DEMO chip, `MOCK` label on the roster snapshot,
  confidence bar with a numeric value, LOW RISK badge, signal bullets, "Also considered" with a
  position chip. It is the one screen that looks like the product the founder described. **Every
  other screen should be measured against this one.**
- **Provider colours are correct and legible** where they are used — photographed on both
  platforms.
- **Honest states hold on native.** Four-value verdict vocabulary, gated `net_value`, named
  provider-failure reasons, demo/signed-out separation, glyph-not-colour selection cue,
  "Add at least one player to each side" naming the missing half.
- **Android's floating-bar → full-width tab bar** and iOS's floating capsule are both
  contemporary. The tab bar is not the navigation problem.
- **The both-platforms-together discipline held at the code level** on all eleven source
  findings. It did **not** hold at the behaviour level — which is the lesson of `F-BAR-12`.

---

## 4. Parity table — web vs iOS vs Android

**Bold** = verified on a running app this session. Plain = source-verified only.

| Surface | Web | iOS | Android |
|---|---|---|---|
| Trade — add 2+ players | **✓** | **✗ BLOCKED** `F-BAR-12` | **✓** |
| Trade — suggestion list placement | ✓ below | **✗ above, unbounded** | **✗ above, unbounded** |
| Trade — suggestion vs committed row distinct | ✓ | **✓** | **✗** `F-BAR-14` |
| Trade — position on committed row | ✓ | **✗** | **✓** |
| Trade — reads `verdict_state` | **✗** | ✓ | ✓ |
| Trade — reads `evaluability` | **✗** | ✓ | ✓ |
| Trade — gates `explanation` | n/a | ✗ | ✗ |
| Trade — scoring selector | **✓** | **✗** | **✗** |
| Trade — deal shape | **✗ inert control** | ✗ | ✗ |
| Trade — per-side totals / VORP | **✓** | ✗ | ✗ |
| Trade — share link | **✓** | ✗ | ✗ |
| Trade — QR | ✗ | ✗ | ✗ |
| Trade — league-mate picker | ✗ | ✗ | ✗ |
| League context on screen | ✗ | **Command Center only** | **Command Center only** |
| Provider colour — Command Center | ✓ | **✓** | **✓** |
| Provider colour — switcher | n/a | ✗ | ✗ |
| Yahoo attribution | **✓ global** | Help only | Help only |
| Demo connection labelled as mock | n/a | **✗** | **✗** |
| Waiver analysis surfaced | ✗ | ✗ | ✗ |
| Light mode designed | ✓ | untested | **✗** |
| Brand accent in tab bar | n/a | **✗ system blue** | **✓ gold** |
| Welcome layout / action order | n/a | **centred, bottom, Get started first** | **top, Try Demo first** |
| Yahoo connect | ✓ native | web detour | web detour |
| ESPN connect | ✓ | web detour | web detour |
| Sleeper connect | ✓ | ✓ | ✓ |

---

## 5. R1–R7, each with the check that proved it

| # | Requirement | Status | Proof |
|---|---|---|---|
| R1 | Native connect for every provider but ESPN | **PARTIAL** | Sleeper `.available`; Yahoo `.useWeb` (`ConnectFlow.swift:106-129` + Android mirror). Honest, not dead — not native. Scoped only, per ruling. |
| R2 | League context on every window | **ABSENT** (1 of 10) | Photographed on 4 tabs; complete call-site list. `F-BAR-07` |
| R3 | Positions in Trade | **PARTIAL — and split by platform** | Android shows position on the row, iOS does not; no position *control* anywhere; backend has always accepted it. `F-BAR-21`, `F-BAR-11` |
| R4 | Two- and three-team deals + real league-mate | **ABSENT everywhere** | No `deal_shape` in `src/`; web control inert (`F-BAR-02`); data + privacy layer ready (`F-BAR-05`) |
| R5 | Free-text player entry as fallback | **PRESENT — but see R3's blocker** | Typed and confirmed on both platforms. **On iOS it works exactly once** (`F-BAR-12`) |
| R6 | Share a trade | **PARTIAL** | `POST /api/trade/share` live, used by web; **no** share affordance in native; `grep -i qr` repo-wide returns nothing |
| R7 | "I need to be able to watch stuff" | **NO REQUIREMENT DEFINED** | Founder: *"i dont know what i meant."* Not guessed. §8 |

---

## 6. The map — cheap wins vs expensive necessities

### Tier 0 — stop-the-line (before anything else)

| # | Work | Finding |
|---|---|---|
| **0.1** | **iOS Trade focus loss.** Trade is the front door and it is broken after one tap. | `F-BAR-12` |
| **0.2** | **Re-test iOS email sign-in.** If it reproduces, it joins Tier 0; if not, close it. | `F-BAR-22` |
| **0.3** | **Android suggestion vs committed row.** Three surfaces disagreeing about one state. | `F-BAR-14` |

**Tier 0 is roughly one day and it is not optional.** Two of the three are in the founder's
current build.

### Tier A — cheap wins (an afternoon each; no contract change, no store risk)

| # | Work | Finding |
|---|---|---|
| A1 | Suggestion list below the field, height-capped, own scroll | `F-BAR-13` |
| A2 | Label the demo provider connection as mock (or stop claiming "Connected · 4m ago") | `F-BAR-15` |
| A3 | Safe-area insets top and bottom on Command Center | `F-BAR-16` |
| A4 | `OmenPlatformBadge` in the switcher, both platforms | `F-BAR-06` |
| A5 | Context strip on Omen, Trade, League — **closes R2** | `F-BAR-07` |
| A6 | Gate `explanation` on `evaluability.isEvaluable` | `F-BAR-03` |
| A7 | Web reads `verdict_state` + `evaluability` | `F-BAR-01` |
| A8 | Delete the inert web Deal shape control | `F-BAR-02` |
| A9 | Yahoo attribution into app chrome | `F-BAR-08` |
| A10 | iOS renders position/team on the committed row (match Android) — **closes half of R3** | `F-BAR-21` |
| A11 | Native decodes the per-side totals and scarcity it already receives | `F-BAR-10` |
| A12 | Brand accent on the iOS tab bar | `F-BAR-19` |
| A13 | One Welcome design, one action order, both platforms | `F-BAR-17` |
| A14 | Correct the `agent_inbox.md` season-floor line | `F-BAR-09` |

**Tier A closes R2 outright, kills two dead affordances, fixes the honesty inversion on web, and
closes a contractual gap.** None of it needs a decision from you.

### Tier B — medium (days; client work over backends that already exist)

| # | Work | Finding |
|---|---|---|
| B1 | **Waiver Watch → `GET /api/waivers/analysis`** — replaces a permanent shrug with a real answer | `F-BAR-04` |
| B2 | Trade scoring + position controls — **closes R3** | `F-BAR-11` |
| B3 | Native share + QR — **closes R6** | R6 |
| B4 | Android light mode, and an iOS light-mode audit | `F-BAR-18` |

### Tier C — expensive, and required for production

| # | Work | Why it cannot be cheap |
|---|---|---|
| C1 | **R4 league-mate picker (Sleeper)** | New route + contract + two clients + the both-lineups-improve rule. Data and privacy answer exist; the *shape* does not. Ships Sleeper-first and says so. |
| C2 | **R1 Yahoo native OAuth** | `ASWebAuthenticationSession` / Custom Tabs, callback, token exchange, both platforms. Browser plumbing exists for Supabase only. |
| C3 | **Command Center navigation + the swipe/dropdown directive** | §7. Design-system-level, hardest to reverse. |
| C4 | **Provider proof on real accounts** | Carried debt from 2026-08-29. Every provider path is fixture-proven; a wrong parser is indistinguishable from an empty provider. |
| C5 | **The 2026-09-05 in-season transition** | Every screen changes behaviour and **not one has been exercised in-season.** `F-BAR-03` is the first evidence that off-season output is actively misleading. |

**C5 has the nearest date and no champion.** Five days out. Nothing in this app has ever run
against a live NFL week.

---

## 7. "New and elite", and the swipe/dropdown directive

**Lens: Hotshot** — this section is about what we lock in.

Your two statements are one statement. *"Command Center is one big scroll — shouldn't it be a
dropdown that you choose which one you want to see?"* and *"more drop down menus or swipe for the
next widget."* Both say: **the app makes you travel to change one thing.**

Measured on device: Command Center is **three full swipes** end to end, and the greeting alone
eats ~35% of the first screen — eyebrow plus a four-line H1 before any content.

**This is a design-system decision, not a screen decision.** If swipe-between-widgets ships, it
ships as a locked component on both platforms — iOS `TabView(.page)` and Android
`HorizontalPager` must feel like one product, not two platform defaults. It amends
`component-lock-v1.md` and `omen-native-design-house-v1.md`, and it is the most
expensive-to-reverse choice in this document, because it becomes muscle memory.

Three constraints, each already demonstrated in this codebase:

1. **A horizontal pager inside a vertical scroll is a gesture conflict.** Command Center is a
   `ScrollView` on both platforms today, and `F-BAR-12` is already a gesture-collision defect on
   that exact screen family. This is not a hypothetical risk here.
2. **A swipe is not an accessible affordance on its own.** The switcher sheet already carries
   this lesson in a comment — which is why it has an explicit Done button. Any pager needs a
   visible, tappable equivalent.
3. **A dropdown that hides state is what this codebase spent a month learning not to ship.** If
   Waiver Watch collapses behind a selector, the user cannot see it has nothing to say — worse
   than the scroll, unless the selector itself carries state.

**Veteran contests, and should be heard:** a selector offering six sections, five of which lead
to honest-but-empty states, is a worse first ninety seconds than a scroll. **The navigation
change and `F-BAR-04` should land together.**

**Resolution under the reversibility rule:** navigation shape is expensive to unmake, so the
Hotshot owns the *shape* and owes a written brief. The Veteran owns the *sequence*, and the
sequence is **content before chrome.**

**And the cheapest "elite" win is not navigation at all.** It is `F-BAR-16` — text currently runs
under the Dynamic Island and behind the tab bar. No amount of swipe polish survives that.

---

## 8. R7 — what I did instead of guessing

You were dictating and do not know what you meant. Guessing would produce a feature nobody asked
for. Here is the ruling-ready version:

| Reading | Cost | What backs it today |
|---|---|---|
| **Waiver Watch** (unowned players worth adding) | **Tier B — client wiring only** | `GET /api/waivers/analysis`: built, tested, mounted, **uncalled**. Demo already renders the UI for it. |
| Watch my own roster | Tier B–C | Roster data flows; no alerting layer, no push |
| Watch live games / scores | **Tier C+** | No live feed. New data source and new contract |
| Watch a trade / matchup | Tier C | Needs C1 first |

**Recommendation: Waiver Watch.** Not because it is the best reading of the sentence — the
sentence has no best reading — but because the hard half is built and paid for, the demo already
shows the UI, and it removes a permanent shrug from the main screen. **Needs your ruling before
it is built.**

---

## 9. What this pass did **not** prove

**Never signed in.** Every device run was **demo mode**; every API probe was **unauthenticated**.
That gates a lot:

- **`F-BAR-03` was never photographed** — demo short-circuits Trade to *"Sign in to compare a real
  offer."* Proved from the live payload plus an unconditional render, not from a screen.
- **The switcher's platform-grouped list was never rendered** — demo has one mock league.
  `F-BAR-06` is source-verified only.
- **`GET /api/yahoo/access-probe` returned `401 Missing bearer token`.** So **this pass did not
  independently confirm the Yahoo entitlement is still live.** Facts-of-record #11 says it was
  live on 2026-08-28; that is a record, not a check. **After the two-day stale-Yahoo incident,
  this is the single most important unverified claim in the document.**
- `/api/dashboard/summary`, `/api/league/overview`, `/api/leagues` — auth-gated, unopened.

**Screens not opened on device:** Account, Help + Support, Connect, Sign-up/OTP beyond the first
field. **Four of ten.**

**Intersections not exercised:** signed-out × any screen; one-provider × multi-provider;
reconnect-required; bad network; rotation; background-and-restore; Dynamic Type; VoiceOver.
**iOS light mode was not tested at all** — `F-BAR-18` is Android-only evidence.

**Not run:** no test suite on either platform, no backend `npm test`, no Gradle
`--rerun-tasks`. Every test count quoted anywhere in this document is from existing records and
is **not re-verified**.

**Root causes are hypotheses.** `F-BAR-12` and `F-BAR-22` are reproduced but not debugged. The
gesture-collision explanation is the most probable reading of the source, not a proven trace.

**One device each.** iPhone 16 / iOS 26.5 and one API-36 emulator. No small screen, no older OS,
no tablet, **no physical device.**

**Retroactive sweep scope:** `agent_inbox.md`, `facts-of-record.md`, `context.md` and the product
doc were diffed against the live system. The **91 files in `Direction/reviews/`** and the whole
of `known_issues.md` were **not** swept. `F-BAR-09` came out of the four files that were checked.

**One claim was raised and withdrawn during this pass**, recorded so it is not re-derived later:
"Try Demo opens Sign in" — wrong. Taps near the Try Demo label were landing on Get started; a tap
lower in the button entered demo correctly. Whether that is a hit-area overlap or a ~2% harness
scaling error is **unresolved** and needs one check on a physical device.

---

## 10. Recommended order

1. **Tier 0** — one day. Two of the three are in the founder's current build.
2. **Tier A, all fourteen** — one commit per item, both platforms. Closes R2, half of R3, the
   web honesty inversion, the Yahoo contract gap, and every "this looks broken" defect.
3. **B1 — Waiver Watch wired**, pending the R7 ruling in §8.
4. **C5 — the in-season transition**, before 2026-09-05, because the date does not move.
5. **C1 — R4 league-mate picker.** The biggest product win, and closer than the doc says.
6. **C3 — navigation and the swipe/dropdown directive**, after §7's brief, after the sections
   have content.
7. **C2 — Yahoo native OAuth.** Real work, honest today, nobody locked out.

---

## 11. The standard

The discipline held where it was tested: on native, every state I could reach was honest, and the
Omen tab is genuinely the product you described.

But **honest is not the same as working**, and this pass found the gap between them. Trade is
honest about needing a second player and cannot accept one. Demo is honest about being a demo and
claims a live Sleeper connection. League is honest about having no demo league while Command
Center displays one.

**Web is where honesty itself lapsed** — in the one place you were told to look for parity.

The bar is *"a one-stop shop, free, and ahead of the curve."* Tier 0 makes the front door work.
Tier A closes the distance between what the design system says and what the screens do. Tier C is
the distance between a working app and Omen.

---

## 12. Founder rulings — 2026-08-31

Recorded verbatim where the wording carries the decision. These override the tiering above
wherever they conflict.

### R-01 — Command Center keeps the scroll. The navigation rework is **deferred, not rejected.**

> *"Keep the scroll we'll revise deeper later please document that"*

**Effect on the plan:** §7's swipe/dropdown work moves **out of Tier C** and becomes a named
deferred item. Tier A's fold work still lands — cut the four-line greeting, slim the context
strip, get the matchup hero above the fold, fix the safe-area collisions (`F-BAR-16`).

**Documented as deferred so it is a decision with a date on it, not a gap someone rediscovers:**
the founder's original complaint (*"shouldn't it just be a dropdown that you get to choose which
one you wanna see?"*) and the follow-up directive (*"more drop down menus or swipe for the next
widget"*) are both **still live product intent**. They are sequenced behind content, per §7's
Veteran argument — a selector over five empty sections is worse than a scroll. **Revisit once
`F-BAR-04` (Waiver Watch) and R-03 below have given the sections something to say.**

Nothing about this ruling reduces the priority of `F-BAR-16`. Text running under the Dynamic
Island is not a navigation question.

### R-02 — Trade does both. **Judging is the default.**

Free-text entry stays the landing state. The league-mate picker (`C1`/R4) is a prominent second
path, not the front door.

**Effect:** R5 is confirmed as the primary flow rather than the fallback — which inverts the
product doc's framing of it. `C1` stays Tier C and stays Sleeper-first, but it is now an
*addition* to Trade rather than a replacement for it. The both-lineups-improve rule from
`b2d3-live-trade-capability-sleeper-v1.md` still binds when it ships.

### R-03 — **The product thesis: Omen is league and team context. The code does not reflect that.**

> *"What's missing is that the code and the pages reaaaallllyyyy reflect that the whole point of
> omen is to display the league and team context."*

**This is the most important ruling in this document and it re-scopes the whole plan.**

The question asked which *tool* was missing — Start/Sit, optimizer, waivers, news. The answer was
that no tool is the gap. **The premise is.** Omen is not a collection of fantasy tools that
happen to read your league; it is a product **about** your league and your team, and the tools are
expressions of that.

**What this demotes.** The three uncalled backend routes — `/api/waivers/analysis`,
`/api/start-sit`, `/api/optimizer/lineup` — are **not** the answer to "one-stop shop" on their
own. Wiring them up as three more tabs would build exactly the thing this ruling says Omen isn't.
They remain real, cheap, and worth having (`F-BAR-04`, §6 B1), but they are now **in service of
the thesis, not a substitute for it.**

**What this promotes.** `F-BAR-07` (R2) stops being an afternoon of prop-threading in Tier A and
becomes **the organizing principle**. A context strip on four more screens is the *minimum*
reading of this ruling and almost certainly not what it means.

**What this reframes.** Several findings change severity under the thesis:

| Finding | Was | Is now |
|---|---|---|
| `F-BAR-07` — context on one screen of ten | Tier A cheap win | **The central defect.** The app does not know what it is about. |
| `F-BAR-11` — native never sends `scoring_format` | Tier A | Every native trade verdict is computed against **standard scoring, not your league**, while a league is connected and named one tab away. Thesis violation, not a missing control. |
| Trade's header copy — *"Standard scoring. Connect a league to use your own settings."* | not previously a finding | **Shown while a league IS connected and active.** The screen is denying the context the app is supposedly built on. |
| `F-BAR-20` — League tab denies the demo league Command Center is displaying | Tier A | The two screens disagree about **which league you are in** — the one fact the product exists to hold. |
| `F-BAR-06` — no provider colour in the switcher | Tier A | The switcher is the **context-selection surface**. It is the thesis's primary control. |

**Open question this ruling creates**, and the reason for the next round of questions: *"display
the league and team context"* has at least four readings, from a persistent strip through to
every number on every screen being league-scoped with an honest refusal when it can't be. The
readings differ by weeks of work. Asked in §13.

### R-04 — Light mode must be as good as dark.

**Effect:** `F-BAR-18` moves from Tier B into required design work. Both platforms get a properly
designed light palette with verified contrast — this is not a token swap; the current Android
light mode renders the brand gold as brown. **iOS light mode has still never been tested** (§9)
and must be audited before its scope can be estimated.

Dark-only was available and was explicitly declined. Do not re-propose it.

---

## 13. Founder rulings, round 2 — 2026-08-31

### R-05 — The thesis is the **literal** R2 reading: you always know which team and league you're in.

Chosen over the three deeper readings, including "every answer is league-scoped."

**Effect:** the context strip lands on all ten screens, correct on every one, **never contradicting
itself between tabs** — which makes `F-BAR-20` (League denying the league Command Center is
showing) part of this work, not a separate cleanup. `F-BAR-11` (native never sends
`scoring_format`) stays a real defect but is **not** promoted to thesis-level; it is governed by
R-07 below instead.

This is materially cheaper than §12's R-03 note assumed. **R-03's "weeks not days" framing applies
to the reading that was *not* chosen.** Corrected here rather than left standing.

### R-06 — Command Center shows up to three teams.

> *"maybe in command center we can show one team in each provider or up to 3 teams from one provider?"*

Read as: Command Center is **not** strictly single-league. It surfaces up to **three** teams —
either one per provider (Sleeper / Yahoo / ESPN) or up to three from a single provider — while
every other screen stays scoped to the one active team.

**Open:** what a second and third team look like on that screen, and what happens at four or more.
Asked in §15.

### R-07 — When Omen can't apply your league's settings: say so plainly, and give the generic answer anyway, clearly marked.

Not a refusal. The Trade Analyzer stays usable signed-out and for non-Sleeper users. But
"Standard scoring — not your league's settings" is promoted **from grey fine print to a state you
cannot miss**.

Directly binds `F-BAR-11`: native must send `scoring_format`, and where it cannot personalize it
must say so at full volume rather than in `textTertiary` at the bottom of the card.

### R-08 — Team identity: **name and mark only. No repainting.**

Your team's name and an NFL team mark/abbreviation appear in the chrome. The palette stays
black-and-gold everywhere. `nflTeams.js` already carries the data.

The July 2026-07-12 removal **stands**. `team-theme-contract-v1.md` is not revived — and
`CLAUDE.md` still lists it as a live read-on-demand spec for a feature deleted seven weeks ago,
which is a doc fix in its own right.

---

## 14. External tester report — Rody, 2026-08-31 — **investigated, and the diagnosis was wrong**

**Reported:** *"not all players are there"* — Tetairoa McMillan (CAR) and Jaxson Dart (NYG) said
to be missing. Inference drawn: recent draft classes are absent from the player index.

**The index is complete.** Live `GET /api/players/search`:

```
q=McMillan  → sleeper:12526  Tetairoa McMillan  WR  CAR
q=Dart      → sleeper:12508  Jaxson Dart        QB  NYG
```

Both present, correct team, correct position. **No draft class is missing.** The inference was
reasonable and the underlying experience was real — the cause is three separate defects
underneath it.

### `F-BAR-28` — The web Trade form has **no player search at all** **[BETA-BLOCKING]**

`frontend/src/components/trade/` contains **one file: `README.md`.** Web never calls
`/api/players/search` — it is a **raw text box**. No autocomplete, no suggestions, no validation,
no "did you mean".

Native has full autocomplete (photographed working on both platforms this session). **The surface
Rody was using is the one without it.**

### `F-BAR-30` — Player search is exact-substring only

```
q="Ted McMillan"      → []
q="Jackson Dart"      → []
q="Tetairoa McMillan" → found
q="Jaxson Dart"       → found
```

`Ted` is not a substring of `Tetairoa`; `Jackson` is not a substring of `Jaxson`. **A user typing
a real NFL player's name the way people actually say it gets an empty result and concludes the
player isn't in the app.** Which is precisely what happened.

No fuzzy matching, no nickname table, no phonetic fallback, no "no results" copy that suggests a
correction. **The index is complete; the matcher is brittle and silent.**

### `F-BAR-29` — The engine scores players that **do not exist** **[BETA-BLOCKING — worst finding of the session]**

Live `POST /api/trade/compare`, with one misspelling and one invented name:

```json
send:    [{"name": "Ted McMillan",     "position": "WR"}]
receive: [{"name": "Zzzqx Notaplayer", "position": "RB"}]
```

**Response — 200:**

| Field | Value |
|---|---|
| `scarcity_analysis.send[0]` | `Ted McMillan` · **vorp −8** · **tier "replaceable"** |
| `scarcity_analysis.receive[0]` | `Zzzqx Notaplayer` · **vorp −6.5** · **tier "replaceable"** |
| `summary` | *"You are sending a replaceable-tier WR for a replaceable-tier RB."* |
| `net_value` | `1.5` |
| `confidence` | `"low"` |
| `explanation` | *"This trade is neutral because both players are relatively unproven. The model sees equal potential gains and losses, and the slight point advantage isn't enough to definitively favor either team."* |
| `verdict_state` | `insufficient_data` ✓ |
| `verdict` (v1) | `neutral` |

The server does emit `insufficient_data` and `missing_projection_count: 2` — **the honest signal
is there.** Every other field in the same payload then contradicts it: a name Omen has never seen
is assigned a value, a scarcity tier, a plain-English summary, and an LLM paragraph reasoning
about "both players."

**Chain it with `F-BAR-01`** — web renders `result.verdict`, so on the live site this comes out as
**"neutral"** with a VORP number beside it. **The web app will render fabricated analysis of an
imaginary player as a verdict, and offer a Share button under it.**

That is the mechanism behind Rody's report, and it is a strictly worse defect than the one he
described. A missing player is a gap. **A confident answer about a player who does not exist is a
lie, and it is the fastest possible way to lose a fantasy player's trust.**

### `F-BAR-31` — Every player currently has `projected_points: null`

Every row from `/api/players/search`, stars included, returns `projected_points: null`, and every
compare returns `missing_projections` for 100% of players.

**This is the real root of the PPR complaint.** Scoring format cannot change an answer when there
are no projections to score — so PPR, Half-PPR and Standard are currently indistinguishable
*on the server*, on top of `F-BAR-11` (native never sending the field at all).

**Not yet distinguishable from correct off-season suppression.** `is_off_season: true` and
`suppressLiveFootballData()` are in the path, and fact #10 says the floor clears **2026-09-05**.
Whether projections then appear — or whether the pipeline is empty — **cannot be determined from
outside and is unproven either way.** It is the highest-value thing to check on 2026-09-05, and
it should be checked deliberately rather than discovered.

### What this episode says about the method

Rody's report was **wrong in its diagnosis and right in its signal.** Taking "players are missing"
at face value would have sent someone to re-import a player index that is already complete, and
the three real defects would have survived it.

Trust nothing the code says about itself — **and nothing a bug report says about itself either.**
Reproduce the user's experience, not their explanation.

---

## 15. Founder rulings, round 3 — 2026-08-31

### R-09 — Native Trade must work. Queued properly, not jumped to the front.

> *"I was very clear that I wanted a native app from the beginning… if the native trade doesn't
> work in the native app, then it is wrong and it needs to be rectified right now. Well added it
> to the queue don't just jump it to the very beginning, but we need players. We need to be able
> to make the trade right on the app."*

**Two requirements, both native, both non-negotiable:**
1. **You can complete a trade in the app.** `F-BAR-12` (iOS focus death after one player) and
   `F-BAR-14` (Android suggestion/committed ambiguity) are the blockers. Tier 0 stands.
2. **Players are available in the app.** Native already has autocomplete; web never did
   (`F-BAR-28`). The gap is the matcher and the coverage, not the client.

**Explicitly NOT chosen:** a web-first fix. Web parity is not the goal and web is not the target
surface. `F-BAR-01` and `F-BAR-02` remain real and remain queued — the public site currently
renders invented analysis (`F-BAR-29`) — but they do not outrank native Trade.

**Sequencing instruction is explicit: queue it, don't reorder the whole plan around it.**

### R-10 — Unknown players: refuse to score. And it should not come up.

> *"Refuse to score, but it honestly should like not happen. We should know every player in every
> league like this is the NFL app so we need NFL players to be available on our fucking app"*

Two separate commitments:
- **Refuse.** No VORP, no tier, no summary, no LLM paragraph for a name Omen cannot resolve.
  `F-BAR-29` is a defect, not a degradation.
- **Coverage is a product requirement**, not a nice-to-have. See §16 for what is actually covered
  today — the answer is *most* leagues, not *every* league, and the gap is specific.

### R-11 — Command Center multi-team: **visual required before deciding.**

> *"Let me see it before I decide"*

Not a deferral — a request for options against the real data shape. Layout options owed before
this is settled.

### R-12 — Cap Command Center at three teams. The user picks which three.

Pinned in the switcher; Command Center shows exactly those. Predictable and user-controlled.
Rejected: showing all, and Omen choosing by urgency.

---

## 16. What "every NFL player" actually means today — measured

Answering R-10 with evidence rather than assumption. Source is `fetchSleeperPlayers` (Sleeper's
full NFL index), filtered by `src/services/playerSearch.js`.

### What IS covered

| | Verified |
|---|---|
| QB / RB / WR / TE | ✓ incl. 2025 draft class — `Tetairoa McMillan` (CAR), `Jaxson Dart` (NYG) |
| K | ✓ `Justin Tucker` |
| Team defenses (DEF/DST) | ✓ `San Francisco 49ers` → `sleeper:SF`, and "49ers" resolves |
| Free agents | ✓ returned with `team: "FA"` |

**For a standard redraft or PPR league, the index is complete.** Rody's specific claim is
disproven.

### What is NOT covered — and this is the real gap in R-10

`playerSearch.js:6` — `VALID_POSITIONS = new Set(["QB","RB","WR","TE","K","DEF"])`. Anything
else is dropped before matching.

| Probe | Result |
|---|---|
| `Micah Parsons` (LB) | `[]` |
| `Myles Garrett` (DL) | `[]` |
| `Sauce Gardner` (DB) | `[]` |
| `Trent Williams` (OT) | `[]` |

**Every individual defensive player is absent. Omen cannot name a single defensive player.**

So against *"we should know every player in every league"*: **IDP leagues are not supported, at
all, silently.** An IDP manager searching his own roster gets empty results and — exactly like
Rody — concludes the app doesn't have players. Offensive linemen are also absent, which is
correct for essentially every fantasy format and is not a gap.

`player.active === false` is also excluded, so retired players are unsearchable. Correct.

**This is a product decision, not a bug:** support IDP, or say plainly that Omen is a
standard-format app. What is *not* acceptable under R-10 is the third option we ship today —
silent empty results that read as "this player doesn't exist."

### `F-BAR-32` — The matcher has no fuzzy step and requires the whole query to match

`rankMatch()` (`playerSearch.js:137-152`) folds the query, then ranks: exact → name prefix →
compact-name prefix → token prefix → substring. **The entire query is matched as one string.**
There is no per-token matching across a name, no edit distance, no nickname table, no phonetic
fallback.

Consequences, all verified live:
- `"Ted McMillan"` → `[]` — because no fold of `tedmcmillan` occurs inside `tetairoamcmillan`.
- `"Jackson Dart"` → `[]` — `jackson` is not inside `jaxson`.
- `"Ted"` → returns **`Jesper Horsted`**, because `horsted` *contains* `ted`. So the matcher is
  simultaneously too strict on real names and too loose on substrings.

### `F-BAR-33` — Results are hard-capped at 10 and the cap is not disclosed

`DEFAULT_LIMIT = MAX_LIMIT = 10` (`playerSearch.js:3-4`); `limit` cannot be raised above 10 by any
caller. A common surname silently truncates with no "showing 10 of N" and no way to page. This is
also why the unbounded native suggestion list (`F-BAR-13`) tops out at ten rows.

### `F-BAR-31` refined — `projected_points` reads `pts_ppr` and is null for every player

`normalizeSourcePlayer()` takes `projected_points ?? projectedPoints ?? pts_ppr`. All null today.
So this is **not** a missing Omen pipeline — it is that the upstream field is empty in the cached
index right now. Still cannot distinguish correct off-season behaviour from a real data gap from
outside. **Check deliberately on 2026-09-05.**

---

## 17. Founder ruling R-13 — Command Center layout chosen — 2026-08-31

**Canvas:** `design/command-center/` (`Main.dc.html`, `OptionB.dc.html`, `OptionC.dc.html`,
`canvas.json`) → published design canvas.

### Chosen: Option A, revised — primary team + compact rows + a swipeable widget deck

> *"I prefer option a. But maybe we can use, like, the swipe for the other stuff that's in the
> command center, like the leak post [League Pulse] and stuff like that… maybe we can make the
> primary team just a tiny bit smaller so that we can fit in a third thing in there on the
> screen. even, like, your week, like, things like that. You know? We can make a little smaller."*

**Layout, settled:**
1. **One primary team** in full — provider chip, team, league, Switch, matchup, this week's move.
2. **Up to two other teams** as 52pt rows carrying provider, team, record, and whether anything
   needs attention. Tap to promote.
3. **A swipeable widget deck** below — League Pulse, the Ledger, Waiver Watch.
4. **Everything above the fold.** No scrolling to reach any of it.

**Density changes, both founder-directed:**
- Greeting drops **h1 32pt → h2 20pt**; eyebrow drops to 11pt `textTertiary`.
- Primary card tightened: scores 28 → 24pt; the move folded from its own block into one tappable row.

### This partially un-defers R-01, deliberately and narrowly

R-01 parked the Command Center navigation rework. R-13 brings back **only the swipe**, and moves
it from **widgets-as-navigation** to **a widget deck inside a screen that keeps its scroll**.

**Why the swipe belongs on widgets and not on teams** — the argument that decided it: the three
teams must be **comparable at a glance**, which is the entire reason for surfacing three (R-06).
A gesture that shows one team at a time defeats the requirement it exists to serve. Widgets carry
no such constraint — they are read one at a time regardless.

### Two conditions carried forward, unresolved by this ruling

1. **Gesture conflict is not removed by moving the swipe.** A horizontal pager inside a vertical
   `ScrollView` is the same class of defect as `F-BAR-12`. The deck must own its gesture
   explicitly on both platforms, and **the page dots are not an accessible affordance** — a tap
   route is required (the switcher sheet already carries this lesson in its own source comment).
2. **Content before chrome still binds.** Waiver Watch is `availabilityUnknown` today
   (`F-BAR-04`). Swiping to a permanent shrug is not an improvement. **The deck ships after the
   widgets have something to say**, not before.

### Open, recorded on the canvas rather than guessed

- Which widgets are in the deck, and in what order.
- Trade / Omen / League stay scoped to **one** team — the primary one. Needs confirming now that
  three appear on Command Center.
- **Off-season states.** No live scores until 2026-09-05; every card in this layout needs an
  honest pre-season form. This is `C5` arriving inside a design decision.
- Fewer than three teams: does the "other teams" section disappear, or invite connecting another?

### Note on the mockups

Built on tokens lifted from source (`OmenColor.swift`, `OmenTypography.swift`,
`OmenSpacing.swift`), not approximated. **They use the locked type families (Alegreya Sans /
Alegreya / DM Mono) rather than the system fallbacks the app renders today** — font acquisition
remains a separate unmade asset decision (`OmenTypography.swift` header). So the mockups show the
specified type, not Build 4's type. Team names and scores are placeholders.

---

## 18. Founder ruling R-14 — the deck is settled, and no page ships ahead of its data — 2026-08-31

### R-14a — Deck contents confirmed: **the Ledger, Waiver Watch, League Pulse.** Horizontal swipe stays.

("League Pulse" is the third — the standings / playoff-picture card.)

### R-14b — **The data feeding a page is part of the page.**

> *"I want to make sure that the things feeding these pages are real… when we go over to trade…
> we have to make sure that all the players are there, that the users can select between running
> back, wide receiver, quarterback… that they can add a different manager, a different owner to
> trade with, that they can just select from their league mates."*

**This is now a standing rule, not a preference.** A mockup is not a deliverable; a screen is done
when a real source fills it. It restates "content before chrome" from §7 and R-13 and generalises
it: **before any screen in this plan is built, its data source is named and its reality
verified.** A screen whose source does not exist yet is a screen that is not ready to build.

Applied below to everything currently designed.

### Command Center deck — data reality, traced in source

| Widget | Fed by | Real today? |
|---|---|---|
| **The Ledger** | `MovesRepository` → `GET /api/moves` → `moves-history.v1` (`CommandCenterViewModel.swift:160-168`) | ✅ **Real and wired**, both platforms, with honest loading and error states |
| **League Pulse** | `overview.leaguePulse` from `GET /api/league/overview` → `league-overview.v1` (`CommandCenterViewModel.swift:149`) | ✅ **Real and wired**; degrades to `.unavailable` honestly |
| **Waiver Watch** | **`dashboard-summary.v1` tool *status* only** — the contract carries no opportunities (`DashboardSummary.swift:117`, `:161-169`) | ❌ **Not real.** Renders `availabilityUnknown` permanently |

**Two of three are genuinely fed. The third is the permanent shrug**, and `GET
/api/waivers/analysis` — built, tested, mounted, uncalled (`F-BAR-04`) — is the source it should
have been reading all along. **Under R-14b the deck cannot ship until that is wired**, because
one of its three cards would be decoration.

### Trade — data reality for the four things named

| What the founder asked for | Fed by | Real today? |
|---|---|---|
| **All the players are there** | `GET /api/players/search` over Sleeper's full index | ✅ for QB/RB/WR/TE/K/DEF, 2025 class included. ❌ **no defensive players at all** (IDP, §16). ❌ matcher too brittle for typed names (`F-BAR-30`). ❌ silent 10-result cap (`F-BAR-33`) |
| **Select between RB / WR / QB** | Backend has always accepted per-player `position` (`trade.js:231`) | ⚠️ **Half.** Android renders position on the row, iOS drops it (`F-BAR-21`). **No position *control* on either platform.** Native also never sends `scoring_format` (`F-BAR-11`) |
| **Pick a league-mate / owner to trade with** | `fetchSleeperLeagueRosters` — every team, privacy-safe names, projections merged (`sleeper.js:574-613`) | ❌ **No route exposes it.** Data and privacy answer exist; the endpoint does not. Sleeper-only when built (`F-BAR-05`, `C1`) |
| **A verdict you can trust** | `POST /api/trade/compare` → `trade-compare.v2` | ⚠️ Contract is sound, delivery is not: **every offer returns `insufficient_data`** for want of projections (`F-BAR-31`), and it **scores players that do not exist** (`F-BAR-29`) |

### What R-14b changes about sequencing

Nothing in the map is re-ordered — R-09 still holds — but two gates are now explicit:

1. **The widget deck is blocked on `F-BAR-04`.** Not "should follow it" — blocked. A three-card
   deck with one dead card fails R-14b on its face.
2. **The Trade redesign is blocked on its sources**, in this order: unknown-player refusal and
   fuzzy matching (`F-BAR-29`, `F-BAR-30`) → position control (`F-BAR-11`, `F-BAR-21`) → the
   league-mate route (`F-BAR-05`). Designing the league-mate picker before the route exists would
   be exactly the mistake this ruling forbids.

**And the open question `F-BAR-31` sits under all of it:** with no projections, Trade cannot give
a real verdict to anyone, however well the page is built. That resolves — or doesn't — on
**2026-09-05**, and it is the single most important thing to check that day.

---

## 19. Founder rulings, round 4 — 2026-08-31

### R-15 — The deck ships with **two** widgets, and is built to take more.

> *"leave the deck with just those two, but leave the decking away where I can add more widgets
> to it… later on when we finish that waiver wire stuff, we're gonna add widgets. Or maybe we'll
> interchange widgets throughout."*

**Launch set: the Ledger, League Pulse.** Both are fed by real, wired sources (§18). Waiver Watch
joins when `F-BAR-04` is done.

**This dissolves the R-14b block on the deck** rather than violating it. The deck was blocked
because one of three cards was decoration; with a two-card launch set, every card on it is real.
The rule holds and the work is unblocked — the better outcome than either shipping a dead card or
waiting on the waiver route.

**Design consequence, and it is the load-bearing half of this ruling:** the deck is a **widget
container with an ordered, variable-length list of widget types**, not three hardcoded cards. It
must accept insertion, removal and re-ordering without a client release where possible. Page dots
derive from the list length, not a constant. **This is a Hotshot item — the contract shape is the
expensive-to-reverse part**, and getting it wrong means the next widget costs a redesign instead
of a config change.

### R-16 — **No individual defensive players.** Team Defense / Special Teams only.

> *"defensive players should not be on there. It should just be their defense. You know, their
> defense special teams."*

**The current filter is CORRECT and closes §16's open question.** `VALID_POSITIONS = ["QB", "RB",
"WR", "TE", "K", "DEF"]` (`playerSearch.js:6`) is the intended coverage, not a gap. **IDP is out
of scope for Omen.** D/ST units are present and resolve properly (`San Francisco 49ers` →
`sleeper:SF`, and "49ers" finds it).

**§16's "IDP leagues are not supported" is therefore not a defect** — it is the product
definition. Withdrawn as a finding.

**What survives from it, and it is small but real:** searching a defensive player returns
**silence**. `Von Miller` → `[]` in the probe below. Under R-16 that result is correct, but the
*presentation* is not — an empty result reads as "this player does not exist" rather than "Omen
covers team defenses, not individual defenders." **That is the same silent-empty-result defect as
`F-BAR-30`**, and it is fixed by the same work: say why there is nothing, instead of nothing.

### R-17 — **Every active player, every draft class.** Verified — this is already true.

> *"not just the twenty twenty five class. It should be all players. If someone was drafted in
> two thousand and someone was drafted in twenty twenty six… They're in the league. They should
> be in my app."*

**Measured live, 2026-08-31.** The index spans the full span of active players, not a recent
slice:

| Player | Sleeper id | Result |
|---|---|---|
| Aaron Rodgers | `96` | ✅ QB · PIT |
| Matthew Stafford | `421` | ✅ QB · LAR |
| Travis Kelce | `1466` | ✅ TE · KC |
| Davante Adams | `2133` | ✅ WR · LAR |
| Tyreek Hill | `3321` | ✅ WR |
| Cam Ward | `12522` | ✅ QB · TEN |
| Travis Hunter | `12530` | ✅ WR · JAX |
| Tetairoa McMillan | `12526` | ✅ WR · CAR |
| Von Miller | — | ✅ correctly absent per **R-16** (defensive) |

Sampling across the index surfaces ids up to **`14039`**, so the current draft class is present
too. The index refreshes on a **24-hour** TTL (`DEFAULT_CACHE_TTL_MS`, `playerSearch.js:5`).

**Conclusion: R-17 is already satisfied.** The requirement is met and needs no work — what needed
work was never coverage. It was the **matcher** (`F-BAR-30`), the **silent 10-result cap**
(`F-BAR-33`), the **missing web search entirely** (`F-BAR-28`), and the engine **scoring names it
cannot resolve** (`F-BAR-29`). Rody's report pointed at a real problem and named the wrong one;
this ruling closes the coverage question for good.

**One thing deliberately not asserted:** `Tyreek Hill` returns `team: "FA"`. That may be correct
roster movement or a stale team field — **not determined**, and not worth a claim either way
without a check against a second source. Flagged, not concluded.

---

## 20. `F-BAR-34` — Every player-search failure renders as "no results" **[BETA-BLOCKING]**

**Raised by:** the founder, 2026-08-31 — *"Players like Jackson Dart, Ted McMillan weren't on
there when I tried to check earlier."*
**Lens:** Veteran (owns A1 honest state, A7 absence never invented) · **Reversibility:** afternoon

### This supersedes §14's conclusion as the primary explanation

§14 attributed the founder's and Rody's reports to the brittle matcher (`F-BAR-30`) and the
missing web search (`F-BAR-28`). Both are real. **Neither is sufficient**, because the founder
reports checking and finding nothing — and he may well have typed the names correctly.

### The measured cause

`/api/players` sits behind `publicToolRateLimit` (`src/server.js:145`):

```js
windowMs: 60 * 1000,
limit:    30,
message:  { error: "Too many tool requests, please slow down.",
            code: "public_tool_rate_limited" }
```

**Verified live, 2026-08-31** — 34 consecutive searches: **30 × `200`, then `429`**, body exactly
as above.

Three properties combine into the defect:

1. **The bucket is shared** across `/api/players`, `/api/trade`, `/api/demo` and
   `/api/draft-assistant` (`server.js:135,145,153,295`) — searching *and* comparing draw from the
   same 30.
2. **The bucket is per IP.** Two testers on one network share it. The founder and Rody testing
   together halve it.
3. **The client swallows the failure.** `TradeViewModel.search()`:

   ```swift
   } else {
       // A failed lookup leaves the field usable: the user can still type a name
       // and press Add. Autocomplete is an accelerator, never a gate.
       self.suggestions = []
   }
   ```

   `.failure` is not destructured. **429, 503, decode error and genuine no-match all render as the
   same empty list** — no message, no retry, no distinction.

### Why this produces exactly the reported experience

Typing "Tetairoa McMillan" is ~17 keystrokes; at a 250 ms debounce a normal typist fires several
requests per name. Trying a handful of players across two fields, with Compares interleaved,
reaches 30/minute easily. From that point every search returns empty **and looks precisely like a
player who is not in the database.**

**The user's conclusion — "this app doesn't have the players" — is the only reasonable reading of
what the screen shows.** Two different people reached it independently. That is the definition of
a state that lies.

It also explains why the defect did not reproduce in this session's device testing: driving the
app by hand fired perhaps six searches total, nowhere near the limit.

### The generalisable failure

The comment is right that autocomplete should never gate the field. **It draws the wrong
conclusion from it** — "don't block the user" was implemented as "say nothing", and silence about
a failure is not a neutral state. It is a claim: *there are no such players.*

This is `F-BAR-29`'s twin at the other end of the same screen — one invents an answer it does not
have, the other invents an absence it has not verified. Both violate A7 (absence is never
invented).

### The fix, and it is small

1. **Destructure the failure.** Distinguish no-match from `429` / network / server error.
2. **Say which.** *"Too many searches just now — try again in a moment"* is a state. An empty list
   is not.
3. **Reconsider the shared bucket.** A debounced type-ahead and a Compare should not draw from
   one 30/minute allowance; type-ahead is inherently chattier and deserves its own, higher limit
   (`O4`'s lesson applies — derive the limit from the traffic shape, don't pick one).
4. Fix the same swallow on Android.

**Tier 0.** It is cheap, it is the direct cause of the only two external reports Omen has ever
received, and it makes every other player-search fix unverifiable until it lands — you cannot
tell whether a search returned nothing because the matcher failed or because the bucket was
empty.

### Correction to the record

§14 stated the diagnosis as matcher + missing web search. **That was incomplete.** The full
account is: on web there is no search at all (`F-BAR-28`); on native, a mistyped name returns
nothing (`F-BAR-30`); and on either, **a correctly typed name returns nothing once the shared
30/minute bucket is empty (`F-BAR-34`)** — with no way for the user to tell the three apart.

---

## 21. `F-BAR-12` — CORRECTED, and still unfixed — 2026-08-31

### The original finding was wrong about the trigger

§2 said: *"after adding one player, no text field on the iOS Trade screen will ever accept focus
again."* **The causal claim is false.** It was inferred from a test order — send field first,
receive field second — and never controlled for.

**Measured:** on a completely fresh Trade screen, **with no players added at all**, the receive
field does not focus. It never could.

**Corrected statement:** *on iOS Trade, the FIRST text field focuses and types normally. Every
focusable after it is dead. Adding a player is irrelevant.*

Proved by swapping the two sections' order: with "You receive" rendered first, **the bug moved to
"You send."** It follows **position**, not the side.

Severity is unchanged — a trade still cannot be completed — but the shape is different, and the
difference matters: this is not a state-corruption bug, it is a container refusing focus.

### Six hypotheses tested and eliminated

Each was a separate build, install and hand-driven run on iPhone 16 / iOS 26.5.

| # | Hypothesis | Change made | Result |
|---|---|---|---|
| 1 | The container-wide `.onTapGesture { focusedField = nil }` (added for F-DEV-01) swallows taps | removed it | **still broken** |
| 2 | Doubly-bound `@FocusState` — `.focused($focusedField, equals:)` applied outside an `OmenTextField` that already binds focus internally | added a `focus:` parameter to `OmenTextField`, one binding per field | **still broken** |
| 3 | The two sections share a structural identity because both come from one `@ViewBuilder` function | added `.id(side)` | **still broken** |
| 4 | `OmenTextField` itself is at fault | dropped a **raw `TextField`** into third position | **also dead** — so the component is exonerated |
| 5 | The keyboard toolbar (`ToolbarItemGroup(placement: .keyboard)`, the F-DEV-01 Done button) | removed it | **still broken** |
| 6 | `.scrollDismissesKeyboard(.interactively)` | removed it | **still broken** |

**Hypothesis 4 is the most informative.** A plain SwiftUI `TextField`, with no Omen code
anywhere near it, is equally unfocusable in third position. **The fault is in the container, not
in the design system.**

### What is now known, and what is still open

**Known:**
- Exactly one focusable per screen works, and it is whichever renders first.
- Not caused by: the tap gesture, the focus bindings, view identity, `OmenTextField`, the
  keyboard toolbar, or scroll-dismiss.
- Android is unaffected — verified again this session.
- The same signature appears on **Sign in** (`F-BAR-22`): the top control works, the email field
  and the button below it do not. **These are very likely one defect, not two** — which would
  make the blast radius every multi-field screen in the app, not just Trade.

**Still open — the remaining suspects, in order:**
1. The parent `TabView` in `CommandCenterView` (iOS 26's floating tab bar changed focus and
   safe-area behaviour).
2. `ScrollView` + `VStack` + `.frame(maxWidth: .infinity, alignment: .leading)` interaction.
3. An iOS 26.5 SwiftUI regression, which would need a minimal reproduction outside this app.

**Next step, and it should be the first thing done:** build the smallest possible reproduction —
a `TabView` containing a `ScrollView` with two `TextField`s and nothing else — and bisect from
there. That is a ten-minute test that any of the six builds above would have been better spent
on. Chasing plausible causes in a large view without a minimal repro was the wrong method, and it
cost six build-test cycles.

### Nothing was committed

All code changes were **reverted**; the working tree is clean at `fix/tier-0-trade-and-search`.
Two of the six changes are defensible on their own merits — removing the redundant tap gesture,
and the `focus:` parameter that eliminates an undefined double binding — **but neither fixes
anything observable, and shipping unverified changes is the failure mode this whole session
exists to end.** They are recorded here as proposals, not landed as fixes.

**Status: `F-BAR-12` remains open and remains Tier 0.** Trade still cannot be completed on iOS.

---

## 22. `F-BAR-12` / `F-BAR-22` — WITHDRAWN. The defect does not exist. — 2026-08-31 (session 3)

### The finding was a measurement artifact, twice corrected and still wrong

§2 claimed Trade broke after adding a player. §21 corrected that to "the first focusable works,
every focusable after it is dead — it follows position." **Both are false.** There is no focus
defect on iOS.

**Measured, on the current `main` build, iPhone 16 / iOS 26.5 simulator, real API base URL
verified in the built `Info.plist`:**

- Tapped the **receive** field first, on a fresh Trade screen: it focused (gold ring) and typed.
- Typed "Mahomes": live autocomplete returned **Patrick Mahomes · QB · KC**.
- Tapped the **send** field: focus moved, typed "Jefferson", four rows returned.
- Committed Justin Jefferson, committed Mahomes, **Compare enabled and fired**, and the screen
  rendered the honest `Demo mode` surface.
- Sign in: the email field focused and accepted `founder@omen.test` on the **first** tap.

A trade can be completed on iOS. It could be completed before this session started; no code
change was required to make that true.

### What actually produced the false finding

**Screenshot pixels were converted to tap points with the wrong scale factor.** The panel
reports a 393×852pt coordinate space; the screenshots come back 922×1918px. The correct scale is
≈2.346 px/pt in both axes. Using 1918/852 ≈ 2.251 for the vertical axis instead makes every
computed tap land ~4% high on the page — which, at the y-offsets where the second and third
controls sit, is 20–35pt low in absolute terms: **inside the gap between two controls.**

The taps were landing on nothing. Every "dead field" was an unhit field.

This is why the bug appeared to "follow position": the error is proportional to y, so the
further down the screen a control sits, the more reliably the tap misses it. And it is why
swapping the two Trade sections appeared to move the bug — the error follows the *position*, not
the view.

### How it was caught, and why the earlier eliminations were worthless

A minimal reproduction — a `TabView` containing a `ScrollView` containing two `TextField`s and
nothing else, compiled standalone with `swiftc`, no Omen code — **worked perfectly on the first
try.** That single ten-minute test eliminated all three of §21's remaining suspects at once
(the parent `TabView`, the `ScrollView`/`VStack`/`frame` interaction, and a SwiftUI 26.5
regression). It should have been the first thing anyone did.

The instrument was then calibrated directly: a build that renders the tap location it actually
receives. Tapping (196, 342) reported `x=196 y=342` — proving the tap *coordinates* were exact,
and therefore that the fault was in the px→pt arithmetic used to choose them, not in delivery.
A six-field probe then focused and typed in **f4 first, then f2**, out of order, with no
stickiness whatsoever.

§21's six eliminated hypotheses were all **true negatives reached by a broken instrument**. They
were correct conclusions ("still broken") drawn from a test that could not have shown anything
else. Six builds were spent proving that a mis-aimed tap does not focus a text field.

### Status

| Finding | Old status | New status |
|---|---|---|
| `F-BAR-12` | BETA-BLOCKING, Tier 0.1 | **WITHDRAWN — not a defect.** No code change. |
| `F-BAR-22` | UNCONFIRMED, highest-priority re-test | **WITHDRAWN — not a defect.** Email field focuses and types on first tap. |

**What this does not settle.** The founder's original on-device report stands as a report. This
session tested a simulator, not the founder's hardware, and simulator input is not touch input.
What is disproved is the **diagnosis** — there is no container-level focus fault in the code, and
`OmenTextField`, `omenFocusRing`, the tap gesture, the keyboard toolbar and the `TabView` are all
exonerated by direct measurement. If the founder still cannot complete a trade on his own device,
that is a **new** investigation with no code suspect carried over from this one, and it needs a
device log rather than another hypothesis.

**Method note, and it is the whole lesson of three sessions:** *calibrate the instrument before
trusting a negative result.* "The app did not respond" is a claim about the app **and** about the
test harness, and the second half was never checked. Trust nothing that reports on itself — the
test rig included.

---

## 23. `F-BAR-34` — FIXED and verified live, both platforms — 2026-08-31 (session 3)

Every player-search failure rendered as "no results". `TradeViewModel.search()` funnelled every
`.failure` into `suggestions = []` on **both** platforms, which is pixel-identical on screen to a
successful search that found nothing.

**Confirmed live against production** before writing any code: `/api/players/search` serves 27
requests then returns `429` for the rest of the minute, on a bucket shared per-IP with
`/api/trade`, `/api/demo` and `/api/draft-assistant`. A user typing two player names can hit it.

### The fix

`suggestions: [PlayerSearchResult]` is replaced on both platforms by a five-case `SearchState`:
`idle` · `searching` · `results` · `empty(query)` · `failed(error)`. `suggestions` survives as a
**derived** accessor that reads only from `.results`, so no caller can reconstruct the old
conflation. `429` gets its own title and copy — "Too many searches" — rather than being folded
into the generic server message, and **every** failure message still names the manual path
("type the full name and press Add"), because autocomplete is an accelerator, never a gate.

### Verified on running apps, not just compiled

| State | iOS (iPhone 16 / 26.5) | Android (emulator-5554) |
|---|---|---|
| `results` | "Jefferson" → 4 rows | "Jefferson" → 4 rows |
| `empty` | "No player matches “JeffersonZqxwvp”" | "No player matches “Zqxwvp”" |
| `failed(429)` | "Too many searches" + wait-a-minute copy | "Too many searches" + wait-a-minute copy |

The `429` state was reproduced by deliberately exhausting the live bucket with 45 curl requests
from the same IP, then searching in the app — i.e. the exact condition behind the only two
external bug reports Omen has ever had.

**Tests:** 8 new on each platform (`TradeSearchStateTests.swift`, `TradeSearchStateTest.kt`),
including one that asserts `failed(429) != empty(query)` directly. iOS 316 tests, 0 failures
(was 308). Android 190 tests across 24 classes, 0 failures.

**Note on the iOS test count:** the new test file had to be registered in `project.pbxproj` by
hand. The first run reported `** TEST SUCCEEDED **` with the new file silently **not compiled**
— the iOS twin of the `BUILD SUCCESSFUL in 1s` trap. Count the tests; do not read the banner.

### One adjacent fix, called out separately

The iOS suggestion row called `onAdd?(player.name, side)`, discarding position, team and id —
directly contradicting the doc comment above it and leaving `onAddResult` dead code. It now calls
`onAddResult?(player, side)`, matching Android and the documented intent. A name-only player
resolves to `position: "UNK"` server-side and falls out of scarcity and tier, so this was a real
scoring defect, not a cosmetic one. It is **not** part of `F-BAR-34` and is recorded here so it
is not mistaken for one.

---

## 24. Tier 0.1 / 0.2 production deployment — VERIFIED — 2026-08-31 (session 4)

Commits `1f156fc` and `a2e3e3e` were pushed to `main` and deployed by GitHub Actions run
`33442658013`. Quality, image build/push, KVM1 restart, `/api/health`, SPA-logo verification and
the public-route visual canary all passed.

Independent production proof after the workflow—not the workflow reporting on itself:

- `/api/health` → `200`, `service: omen-api`.
- `/api/players/search?q=jefferson` → four canonical rows and
  `RateLimit-Policy: 300;w=60`.
- `/api/players/search?q=Zqxwvp` → `[]`.
- `/api/trade/compare` → its own `RateLimit-Policy: 120;w=60`, proving search no longer spends
  the same prefix bucket.

The production Trade probe also directly reproduced `F-BAR-29`: a manually supplied real name
was still scored as `position: UNK` and assigned a `starter` tier. That became the next pull
rather than being hidden by the successful deployment.

## 25. `F-BAR-29` / `F-BAR-30` — FIXED locally, awaiting deployment proof — 2026-08-31

### Unknown players can no longer reach scoring

Trade now resolves every submitted player against the same canonical Sleeper NFL index used by
autocomplete **before** league-context work, recommendation math, scarcity/VORP/tiering, sharing,
or the LLM explainer. Resolution accepts a real provider-scoped id or one exact folded name.

Any unknown or ambiguous identity returns `422 trade_unresolved_players` with the side, index,
typed name and up to three suggestions. The response contains no verdict, VORP, tier, scarcity
analysis, summary, share payload, or explanation. A source outage returns `503
player_resolution_unavailable`; it never falls through to invented analysis.

A regression test spies on the explainer and proves it is called zero times for an unknown name.
It also asserts the forbidden fields are absent from the response—not null, absent.

### Fuzzy matching is suggestion-only

If exact/substring search returns nothing, the backend performs a bounded Damerau-Levenshtein
fallback over a cheap candidate shortlist. `Ted McMillan` suggests Tetairoa McMillan; `Jackson
Dart` suggests Jaxson Dart. Fuzzy rows add `match_type: fuzzy`; exact rows are byte-compatible
with the prior contract. Both native apps render an all-fuzzy set under **Did you mean?** and
require a deliberate tap. A fuzzy result is never silently promoted to identity.

Performance was measured after implementation rather than inferred: the initial fuzzy path took
15–21ms because it allocated edit-distance matrices across all ~11.4k players. After candidate
shortlisting (same token count, matching initials, plausible lengths), it measures 1.9–2.6ms.
At the deployed 300/min/IP ceiling, an entire minute of fuzzy misses consumes under 0.8s CPU
(~1.3% of one core); normal exact traffic remains around 0.1%.

**Local evidence:** backend 922/922; iOS unit 318/318; Android 192/192. Running-app and live API
verification remain required after deployment; this section must not be promoted to production
verified from local evidence alone.
