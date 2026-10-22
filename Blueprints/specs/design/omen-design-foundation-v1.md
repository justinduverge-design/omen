# Omen design foundation v1

**Status:** APPROVED by the founder, 2026-10-21 ("I LOVE IT"), with every frame in `design/foundation-v1-canvas/` (canvas version 28). This is the design authority for Build 12.
**Revision 2 folds in:** the Codex review (handoff, commit `31c5ae63`) and the Gemini Android review
(`Direction/reviews/2026-10-21-omen-design-foundation-v1-android-review.md`). What was taken, changed or
left is in § 12.
**Replaces, once approved:** every earlier canvas as a design source (§ 10).
**Source of truth for screens:** the redesign canvas, exported into the repo at
`design/foundation-v1-canvas/` at each approved revision (§ 10). The live working copy is
https://claude.ai/artifact/Ft9GK2vot2kPbqf5ha78sC, which only the founder's account can open, so the
repo export is what agents and checks read. A screen with no frame in the export is not designed.

## 1. Why this exists

Build 12's screens were built one at a time against canvases that disagreed, so every screen used the
same card and the app did not hang together (founder, 2026-10-21: "they don't tie into one another… very
cookie cutter"). This page is the foundation the screens sit on, the same way the warehouse was built
before the reads that use it. Screens follow it; a screen that needs something it does not cover changes
this page first.

## 2. What Omen feels like

- **One answer, then the proof.** Every screen leads with what to do or what is true, in one sentence a
  fan would say out loud. Numbers and reasons sit under it.
- **Omen's conclusion leads; numbers keep their names.** The call, the grade and the reasons are Omen's,
  and they come first. Every forecast number carries its source ("Omen 13.4 · ESPN 10.6"). Which number
  is set larger follows the server's recorded forecast-authority result (facts-of-record, amended
  2026-10-16): the source that has earned the lead for that position, scoring and horizon. Where the
  server says the read is unresolved, neither is enlarged. The app never picks a winner itself.
  Ordinary stats (yards per catch, targets, snaps) follow as support.
- **The plumbing stays backstage, limits that change the answer do not.** Optional details that are
  missing are simply left out; a missing number is never shown as zero or as a sentence. Weights,
  coverage and source vintages live in "See the full argument". But when missing or stale information
  changes the recommendation or what the user can do (an opponent roster that could not be read, a
  stale lineup, an unknown lock, an unresolved read), one short plain sentence sits beside what it
  affects: "Reconnect Yahoo to check this trade." Demo data always says Demo.
- **A utility, not a feed.** Like Apple Sports: fast, quiet, no articles, no ads, nothing to scroll past.
- **Each screen has its own shape.** A scoreboard looks like a scoreboard, a trade like two sides, a
  player like a player card. Screens belong together through shared type, spacing, controls and
  behaviour, not through one repeated card.

## 3. Navigation model

| Rule | Detail |
|---|---|
| Four tabs | Desk · Omen · Trade · League. Stable on every tab root. |
| Route map | Desk pushes Player, Waivers (when the week's call is an add), Ledger and Account. Omen pushes Player, the full argument and Ledger. Trade's root is the **Trade chooser**, which pushes Find a trade, Trade builder and Judge an offer. League pushes Player and Waivers. Ledger pushes a Ledger receipt. Account pushes Support. |
| Push for depth | Deeper screens are pushed and keep their tab's history. Every pushed screen has a back control. **iOS:** chevron plus the name of where it goes, in the accent, 44pt, plus left-edge swipe. **Android (paused, iOS first):** Material back arrow in the top bar plus system predictive back. |
| Tab bar | Stays visible on browsing pushes (Player, Waivers, Ledger, receipt, Account). Hidden only inside a focused task that has its own bottom action: Trade builder and the Support form. |
| Sheets for quick choices | The team switcher, a verdict, a report form and a confirmation are sheets: grabber, drag to dismiss, a visible Close or Done, and one obvious primary action. A sheet never pushes a third level. Closing a sheet with unsaved input asks first. |
| Browsing vs picking players | In a list you browse (Desk, League, Ledger, Omen call), tapping a player opens the Player page. In a list you pick from (Trade builder), tapping the row adds or removes the player, and a separate info control, at least 44pt, opens the Player page. Opening a player never changes a trade. Back from Player returns to the same list with picks intact; from a verdict sheet it returns to the sheet. |
| Team context on every tab | The Desk has the full Team Rolodex. The roots of Omen, Trade and League show a compact team control in the header ("ESPN · Titans ▾") that names the active team and opens the switcher sheet. Long-pressing the Desk tab also opens it, as a shortcut, not the only way in. |
| One way to Account | The avatar at top right of the Desk. Account holds Help and Support. This replaces the 2026-09-18 header rule (help plus account on every screen) and removes the floating report pill from the Desk. The Omen call and the verdict sheet keep a quiet "Report this" link at the foot. |
| Nothing is a dead end | Every empty, error or reconnect state names one action that gets the user out. |

## 4. Switching teams

The front team decides what every tab shows, so the switch has rules:

1. **When it commits.** When a Rolodex card settles, or a team is chosen in the switcher sheet. Not
   mid-flick.
2. **While the next team loads.** The new team's name shows at once; its sections show their loading
   outline. Nothing from the previous team ever sits under the new team's name.
3. **Late answers.** A response for a team that is no longer in front is dropped.
4. **Drafts.** A trade being built stays with the team it was built for. Coming back to that team brings
   it back; the builder never carries players into another league.
5. **Reconnect.** A team that needs signing in again stays in the Rolodex, says so on its own card, and
   the other teams keep working.

## 5. Shared patterns (build once, use everywhere)

Each pattern is one component in `DesignSystem/`. A screen composes these; it does not draw its own.

| Pattern | What it is | Where |
|---|---|---|
| **Team Rolodex** | A horizontal stack of team cards at the top of the Desk. The next card peeks at the trailing edge, and a count ("1 of 3") plus dots say there are more, so the stack does not rely on colour. Each card: provider, league, both scores, both records, players left, the matchup bar (§ 6), one line from Omen. A team that needs signing in again shows that on its own card. Haptic tick on settle. | Desk |
| **Pinned score** | Scrolling the Desk past the front card shrinks it into a slim bar with both scores, pinned below the top safe area. Flicking is off on the slim bar; tapping it scrolls back to the top. | Desk |
| **Omen read block** | The forecast numbers with their sources (emphasis per § 2), the Omen grade ring, then up to three reasons the server returned, each with its point effect. Never invent a reason or imply the reasons add up to the whole number. | Player, Omen call, Trade |
| **Player row** | Built from one set of parts in three variants. **Browse:** position, name, team, the one number that matters on that screen. **Compare:** both forecasts with sources. **Pick:** check control, then name, then an info control. A grade ring only where the grade helps that decision. | Desk, Trade, League, Waivers, Ledger |
| **Start / sit pair** | The two players side by side; the one to start outlined in the accent. Stacks vertically at large text sizes. | Omen call, Waivers (add / drop) |
| **Trade builder** | Partner, then **You send** and **You get** trays, then a roster toggle (yours / theirs) with pick rows, then a bottom dock. Players who cannot be traded (game started, provider lock) show a quiet lock instead of a check. Two teams by default; "Add a third team" appears only when the league's capability says three-team trades work. | Trade |
| **Verdict sheet** | One sentence ("Both of you win this"), each side's lineup change per week, the catch, then **Adjust** and **Open in ESPN** (or Yahoo, Sleeper). Omen hands the trade over; it never sends it, so nothing says "Sent" because the provider opened. "I sent it" is the user's own mark, recorded as theirs. | Trade |
| **Player badge** | A rounded square in the player's NFL team colours with his jersey number and position. No player photos: there is no free, lawful source (research 2026-10-21: SportsDataIO licenses USA Today headshots for a fee; Sportradar images are media-only; other APIs give image links without image rights). Founder, 2026-10-21: badges now. Team colours come from the existing team palette; text colour is chosen per team for contrast. | Every player row, Player header |
| *Later: illustrated player avatars* | Founder idea, 2026-10-21: drawn avatars that look like each player, helmet on. Not now. Before it starts: a drawing that resembles a real player still uses his likeness, so it needs the same rights check as photos (NFLPA group licensing). | — |
| **Team crest** | The fantasy team's own logo when the provider sends one (Sleeper avatars, ESPN and Yahoo uploaded team logos): the user's own league content shown back to them. Otherwise a monogram of the team name. | Rolodex, switcher, League standings, trade partner |
| **Provider mark** | The provider's name and its colour (ESPN red, Yahoo purple, Sleeper blue) as a dot or tag. No provider logos (founder, 2026-10-21). | Rolodex, switcher, Account, Connect |
| **Account avatar** | Initials for now. A photo is a later decision: Sign in with Apple never shares one. | Desk, Account |
| **Stat grid** | Two columns of number over label, on one surface, hairline-split. | Player |
| **Section header** | Display-face title in sentence case, optional quiet count or link at right. No uppercase micro-labels as section titles. | Every screen |
| **Back control** | Per platform, § 3. | Every pushed screen |
| **State block** | One component, four meanings with their own words and actions: **hold** (Omen checked and nothing beats your lineup), **nothing worth doing** (no move clears the bar), **not enough to go on** (inputs missing, name the one that matters and how to fix it), **failed** (the request broke, retry). Never present a failed read as "nothing worth doing". | Every screen |

Every control has pressed, selected, working, done and failed looks. Input is acknowledged on the spot;
"done" only shows when the server confirmed it.

## 6. Numbers have jobs

| Number | What it means | How it shows |
|---|---|---|
| Forecast points | This week's expected points, by a named source and the league's scoring | "13.4" with "Omen" or "ESPN" beside it |
| Actual points | What happened | Plain number, in the past tense ("scored 16.2") |
| Omen grade | 0–100 at his position. The window and comparison group are the server's (`sight.grade`); write them down here before the Player page explains them | Ring with the number inside; the scale is explained once on the Player page |
| Confidence | How far the reads agree | A word: Strong, Lean. Never a percentage |
| Risk | How bad the downside is | Low, Medium, High |
| Matchup bar | **Until the server sends win probability:** each side's share of combined projected points, labelled "Projected points" beside the bar and in VoiceOver. 120 vs 100 is 55% of the points, not a 55% chance to win | Bar on the Rolodex card |

Missing is never zero.

## 7. Visual rules

- **Colour, by token, never a raw hex.**

  | Role | Token | Dark | Light |
  |---|---|---|---|
  | Ground | `OmenColor.bg` | `#1F1F1D` | `#F6F6F4` |
  | Surface | `OmenColor.surface1` | `#2A2A27` | `#FFFFFF` |
  | Raised / control | `OmenColor.surface2` | `#343431` | `#ECECE9` |
  | Selected | `OmenColor.surface3` | `#3F3F3B` | `#E2E2DE` |
  | Hairline | `OmenColor.borderSubtle` | `#3A3A36` | `#E0E0DC` |
  | Text 1 / 2 / 3 | `textPrimary` / `textSecondary` / `textTertiary` | `#F5F0E8` / `#BDB5A9` / `#A79E90` | `#161614` / `#4A4A46` / `#6B6B66` |
  | Accent fill, rings, lip | `OmenColor.accent` | `#C4933B` | `#8A5E10` |
  | Accent text | `OmenColor.accentHover` | `#D8A648` | `#9A6A16` |
  | Text on accent | `OmenColor.textOnAccent` | `#14140F` | `#FFFFFF` |
  | Green words ("Needs WR") | `OmenColor.omenChip` | `#4FAE81` | `#1A5C3E` |

  The accent is the only chrome accent and means "Omen's pick / act here". Green is only ever words,
  never a fill. The grade ring is an accent stroke over a hairline track.
- **Type roles** (both platforms change in lockstep; today's tokens differ and get updated with the
  first screen that uses them):

  | Role | Size | Face |
  |---|---|---|
  | `heroNumber` | 44 | Display ExtraBold, tabular |
  | `screenTitle` | 30 | Display ExtraBold |
  | `sectionHeader` | 19 | Display Bold, sentence case |
  | `body` | 15 | Text Regular |
  | `quiet` | 12–13 | Text Regular / Medium |
  | `eyebrow` | 11 | Text SemiBold, uppercase, tracked: the one place uppercase is allowed, above a title |

  Everything scales with Dynamic Type. At the largest sizes, side-by-side pairs stack, numbers keep
  their labels, and long team names wrap rather than push actions off screen.
- **Surfaces earn their place.** Page background by default. A surface only for the one thing a screen is
  about (the front Rolodex card, the Omen read, the verdict). Lists sit on the page with hairlines.
- **The accent lip.** The one surface that holds Omen's answer gets a thin accent top edge. One per
  screen.
- **Motion.** 150–250ms, only to show a state change (card coming forward, tray filling, sheet rising).
  Reduce Motion removes movement; the state change still shows.
- **Accessibility.** 44pt minimum targets, including the info control and sheet Close. VoiceOver order
  follows reading order. 4.5:1 text. Nothing is told apart by colour alone.

## 8. Every screen and its job

Frame states, kept separate: **framed** → **founder-approved** → **built** → **simulator-checked** →
**on the founder's phone**. Seeing a frame is not approving it, and an approved frame is not a working
screen.

| Screen | Job, in one line | Frame | Route |
|---|---|---|---|
| Desk | Am I winning, in every league, and what needs me? | Framed (Main, Rolodex) | Desk tab root |
| Omen call | The one move this week and why. | Framed (Main; OmenTradeCall when the move is a trade) | Omen tab root |
| Full argument | Every input, source and limit behind the call. | Framed (FullArgument) | Pushed from Omen call |
| Player | Who this player is this week, then his real numbers. | Framed (Main) | Pushed from any browse list |
| Trade chooser | What Omen found, or build or judge your own. | Framed (TradeChooser) | Trade tab root |
| Find a trade | One trade at a time that helps both sides. | Framed (FindTrade) | Pushed from chooser |
| Trade builder | Pick from both rosters and judge it. | Framed (Main) | Pushed from chooser, Player, Find |
| Judge an offer | Enter a trade someone sent and get the verdict. | Framed (JudgeOffer) | Pushed from chooser |
| Trade verdict | Does this make both lineups better? | Framed (Main, Sheets) | Sheet over builder or judge |
| Trade share | Send Omen's read to the group chat; team names off by default. | Framed (TradeShare) | Sheet from the verdict |
| Three-team trade | Who sends what to whom, each lineup's gain, the hand-off checklist. | Framed (ThreeTeam) | Builder, when the league allows three teams |
| League | Where I stand and who needs what I have. | Framed (Main) | League tab root |
| Waivers | The one add worth making, and what it replaces. | Framed (Waivers) | Pushed from Desk, League |
| Ledger | Was Omen right? | Framed (Ledger) | Pushed from Desk, Omen call |
| Ledger receipt | One call, what happened, against what. | Framed (LedgerReceipt) | Pushed from Ledger |
| Account | Leagues, appearance, help, sign out. | Framed (Account) | Pushed from Desk avatar |
| Privacy and your data | What Omen keeps and never keeps; export; delete. | Framed (AccountPages) | Pushed from Account |
| About and data sources | Where every number comes from. | Framed (AccountPages) | Pushed from Account |
| Delete account | Type delete to confirm. | Framed (AccountPages) | Sheet from Privacy |
| How Omen makes a call | The plain-English explainer. | Framed (AccountPages) | Pushed from Account |
| Support / report | Tell the founder. | Framed (Main, Sheets) | Pushed from Account; report sheet from any screen's "Report this" |
| Team switcher | All my teams as a list. | Framed (Main, Sheets) | Sheet from team control or Desk tab long-press |
| Passkey offer | Face ID next time. | Framed (SystemSheets) | Sheet after first sign-in |
| Forced update | This build is too old to read leagues. | Framed (SystemSheets) | Launch, when the server says so |
| Welcome | What Omen is, and get in. | Framed (Welcome) | First launch |
| Email code | Six digits, autofill, resend. | Framed (EmailCode) | Pushed from Welcome |
| Connect a league | Sleeper, ESPN or Yahoo, honestly explained. | Framed (Connect) | After sign-in, and from Account |
| League pick | Which of your leagues to follow, per provider, with ESPN discovery steps. | Framed (LeaguePick) | After a provider connects |
| Desk, no league | Connect to start, with a ghost of the Desk. | Framed (Edges) | Desk tab root with no league |
| Demo | The whole app on a sample league, labelled Demo everywhere. | Framed (Edges: label and sample card) | Welcome and Connect |
| Rosters unreadable | Omen cannot see the other teams; the one fix and what still works. | Framed (Edges) | Trade, when the roster read fails |
| Connect failed | Why, try again, add by league ID. | Framed (Edges) | Connect |
| States | Hold, nothing worth doing, not enough to go on, failed; loading; reconnect; offline. | Framed (States: loading, hold, reconnect, offline) | Every screen |

Every capability that works in the app today keeps a row here. Removing one is a stated decision, not
an omission.

## 9. Data the designs need

| Need | Screen | State |
|---|---|---|
| The swing matchup (one player, the coverage he faces, why it decides the game) | Desk | Not built. Needs scheme and coverage reads from the warehouse. Not shown until real. |
| Win probability per matchup | Rolodex bar | Not sent. The bar shows labelled projected-points share until it is (§ 6). |
| Forecast-authority result per number | Omen read block | Sent as `authority.state` on Omen's read. The app renders it, never decides it. |
| Waiver bid guidance ("two teams likely to bid") | Waivers | Not sent. The bid line shows only when the server sends one. |
| Ledger per-week contested record | Ledger strip | Contested record exists (#702); per-week split not checked. |
| "I made the move" | Omen call, Ledger | `POST /api/omen/feedback` already writes `followed`. Still needed: the app calling it, targeting the exact league and call, and a reply that confirms the Ledger write (today the route can say `recorded: true` when its league-scoped Ledger write was skipped). Follow-through stays self-reported. Until confirmed, the app says "Noted", not "Saved to your Ledger". |
| Starter vs bench per player | Desk "Your team" | Not in the roster read. |
| Tradeable / locked per player | Trade builder | ESPN and Yahoo locks are read (#701); check they reach the roster route. |
| Three-team capability | Trade builder | `trade-capabilities.v1` carries it. |
| Jersey numbers per player | Player badge | Check the roster and player index carry them (nflverse rosters do). |
| Fantasy team logo or avatar per team | Team crest | Sleeper `avatar`; ESPN and Yahoo team logo fields; confirm each adapter keeps them. |
| Better suggestion sentences ("lacks realness") | Omen call, Trade | Server writes the sentences; a separate copy and scoring pass. |

## 10. One design source

1. **Export first.** Each approved canvas revision is exported to `design/foundation-v1-canvas/` with
   its frame list and the date it was approved. The spec names the export, not only the link.
2. **Carry over, then retire.** Before the old sources go, every contract, token and state they hold is
   either moved here or listed as retired on purpose. Then they are deleted and every reference to them
   is repointed, in one PR. Git history keeps them. Retiring:
   - `design/app-rework-canvas/`
   - `design/command-center/`
   - `design/honest-states/`
   - `design/native-visual-lock-2026-09-13/` (its coverage manifest is repointed)
   - `design/whole-app-canvas-2026-10-19/` (its BUILD.md token table and data table are in § 7 and § 9)

## 11. How a screen gets built, and in what order

1. The screen's frame is founder-approved and in the repo export.
2. It is composed only from § 5 patterns; a new pattern is added here first.
3. Built, captured in dark and light on iPhone 17 Pro and SE, compared to the frame.
4. Fresh-agent review, then on the founder's phone.

**One build, not waves** (founder, 2026-10-21: two waves would drift apart). Order inside it:
1. Tokens, type roles and every § 5 pattern, built and reviewed before any screen, then frozen.
2. Every screen in § 8, each passing the same gate: matches its frame in dark and light on iPhone 17 Pro
   and SE, every reachable state shown, accessibility audit clean, composed only from § 5.
3. A fresh review agent per screen, checking it against its frame and the gate.
4. A whole-app pass with every screenshot side by side, looking for drift between screens.
5. Progress is ticked in a file in the repo, so a new session resumes with the rules, not a summary.
Build 12 ships when the whole app passes.

## 12. Review record (revision 2)

| Point | From | Taken? |
|---|---|---|
| Canvas link unreadable by agents and CI; export into the repo | Codex, Gemini | Yes, § 10 and header |
| Omen's number cannot always lead; follow the recorded forecast-authority result | Codex | Yes, § 2. Conflicted with facts-of-record (2026-10-16); the founder's "show the Omen stats" is met by Omen's conclusion, grade and reasons leading |
| Show a limitation that changes the answer, hide the rest | Codex | Yes, § 2 |
| Rules for switching teams (commit, loading, late answers, drafts) | Codex | Yes, § 4 |
| Team control on every tab root; long-press only a shortcut | Codex, Gemini | Yes, § 3 |
| Browsing vs picking players need different taps | Codex | Yes, § 3 and § 5 |
| Trade is a handoff: "Open in ESPN", never "Send" | Codex | Yes, § 5 |
| `followed` is already written by `/api/omen/feedback`; the reply needs to confirm the Ledger write | Codex | Yes, § 9. Revision 1 was wrong |
| Route map; Waivers and Ledger had no parent | Codex, Gemini | Yes, § 3 and § 8 |
| Separate framed / approved / built / checked / on device | Codex | Yes, § 8 |
| Keep the tab bar on browsing pushes | Codex | Yes, § 3. Hidden only in Trade builder and Support |
| Matchup bar must not look like win probability | Codex | Yes, § 6 |
| Numbers each have a defined job; grade ring is not confidence | Codex | Yes, § 6 |
| Tokens by name with light values; light brass as raw hex fails contrast | Gemini | Yes, § 7. Gemini's light values (`#F1EDE4`, `#7A5C1E`) are older than the current `OmenColor`; the table uses today's tokens |
| Type role table with exact sizes | Gemini | Yes, § 7 |
| Supersede the 2026-09-18 header rule and the Desk report pill | Gemini | Yes, § 3 |
| Android back, predictive back, "below the safe area" not "the island" | Gemini | Yes, § 3 and § 5. Android is paused (founder, 2026-09-30); the rule is recorded for when it resumes |
| Rolodex peek and count; pinned bar does not flick | Gemini | Yes, § 5 |
| Locked players and three-team in the builder | Gemini | Yes, § 5 |
| Four distinct state meanings | Codex | Yes, § 5 |
| Split into Build 12 and Build 13 waves | Gemini | Reversed by the founder: one build, § 11 |
| "Desk" over "Command" for 2.0x font scale | Gemini | Kept |
