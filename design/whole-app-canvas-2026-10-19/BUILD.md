# Build sheet: canvas to native screens

Read this before touching a screen. The order: **this sheet, then the artboard, then the contract named in its row.**
The canvas is a proposal until the founder approves it, and these frames have been reviewed in conversation
(2026-10-19). If a frame and this sheet disagree, stop and flag it.

## Decisions already made (founder, 2026-10-19)

- **Accent:** brass stays. The verdigris and bone study is kept for the record only (`*Verdigris*`, `*Bone*`). Do not build it.
- **Appearance:** dark is the default. Light mode ships too, with neutral near-white, not beige
  (`DeskLight`, `OmenCallLight`). Account → Appearance offers Dark / Light / Match iPhone.
- **Team colours:** a later theme pack. Not this build.
- **Tabs:** Desk · Omen · Trade · League. Ledger is reached from the Desk; Account from the switcher sheet.
- **Sign in:** Apple, Google, Discord and email (passkeys keep their existing offer sheet).
- **Leftovers:** any component on a live screen with no frame here is removed. List each removal in the PR.

## Sight and the warehouse on every screen (founder, 2026-10-19: "they were made for this")

Omen's own read (wire key `sight`, always shown as **Omen's read**, never "Sight") and the warehouse's
evidence are what make Omen more than a provider mirror. Every screen that shows a player shows them.

- **Server side, already sent:**
  - `sightEnrichment.js` attaches `sight` (points, grade, drivers, authority receipt, crosswind) to every
    player object in Start/Sit, Waivers, Trade Find/Compare and League rosters.
  - The decision brief carries the authority receipt and football-intelligence signals.
- **Shared app pieces:**
  - Decode `sight` once, as `OmenDecision.Player.OmenRead`, and reuse it in every contract.
  - One `OmenReadTag` component: Omen's points, then the provider's points, then a crosswind mark when
    the gap clears the threshold.
- **Where it shows:**
  - **Omen call** and **argument:** the Leading read card (already built), crosswind, drivers as
    portents, and the receipt from `authority`.
  - **Waivers:** each add and drop shows Omen's read beside the provider projection. "Omen rates
    strong" is the reason a drop is refused.
  - **Trade Find and verdict:** each player on both sides shows Omen's read. The lineup gain says
    which read led.
  - **League Needs:** "who needs what you have" ranks by Omen's read.
  - **Warehouse evidence:** usage share, role change, injuries, Vegas and weather appear as portents
    wherever the server sends them. Missing evidence is fog, never zero.
- **Omen screen, founder notes (2026-10-19), to apply when that screen is built:**
  - **Real numbers, not only projections.** Each player in the call shows actual points this season,
    the last few games, and usage (snaps, targets, carries, red-zone share) from the warehouse,
    beside the projections.
  - **"What moved this call" is Omen's read.** Show the `sight` drivers as named factors with their
    point effect (role change, matchup, Vegas, weather). This is what the read and the warehouse are for.
  - **"What Omen couldn't read" only when it is true.** Audit every limitation line against today's
    reads. Remove those the warehouse now covers, and show a fog line only for data actually missing
    in this response.
- **Rule:** the app never picks a winner itself. The server's `authority.state` decides
  `provider_leads`, `omen_leads` or `unresolved_tie`.

## Tokens

The same roles in both modes. Map them onto `DesignSystem/OmenColor.swift` by role, and add the light values. Never put a hex value in a screen.

| Role | Dark | Light |
|---|---|---|
| ground | `#1F1F1D` | `#F6F6F4` |
| surface (card) | `#2A2A27` | `#FFFFFF` |
| surface raised / control | `#343431` | `#ECECE9` |
| selected / chip | `#3F3F3B` | `#E2E2DE` |
| hairline | `#3A3A36` | `#E0E0DC` |
| text 1 / 2 / 3 | `#F5F0E8` / `#BDB5A9` / `#A79E90` | `#161614` / `#4A4A46` / `#6B6B66` |
| accent (fill, marks) | `#C4933B` | `#9A6A16` |
| accent text | `#D8A648` | `#8A5E10` |
| text on accent | `#14140F` | `#FFFFFF` |
| hero top lip | `rgba(196,147,59,.34)` | `rgba(154,106,22,.35)` |
| crest | gradient `#4a3a15→#33270e` | gradient `#F3E6CC→#EAD8B2` |

- **Type:** Wix Madefor Display for headings and numbers, Wix Madefor Text for everything else. Screen titles 26–30, hero verdict 30, body 13–15, labels 10 with 0.13–0.2em tracking. All of it must scale with Dynamic Type. The 61 audit findings close here.
- **Tab bar:** a floating capsule, 16 pt from the sides and 24 pt from the bottom, on system Liquid Glass (`.glassEffect`) with an opaque fallback under Reduce Transparency. The selected item is a brass tint, not a blur.
- **Safe area:** frames show the Dynamic Island only. Never draw a status bar.

## Frame → screen → data

| Frame | Native screen today | Data (contract) | What changes |
|---|---|---|---|
| `Shell` | `OmenLeagueSwitcherSheet`, `OmenLeagueSwitcherBar` | `league-directory.v1` + `dashboard-summary.v1` scores | Group by provider. Each row shows its live score and status, and an expired login shows "Sign in again". "Connect a league" and "Account" sit at the bottom of the sheet. |
| `Desk` | `OmenCommandDeskScreen` (`OmenDeskScreens.swift`), `OmenLeagueCarousel` | `dashboard-summary.v1`, `league-overview.v1`, `waiver-analysis.v2`, `trade-find.v1`, `moves-history.v2` | Headline "Up in N of M". Paged live matchup cards, one per followed team. The one move links to Omen. "Needs you" merges waiver, trade and reconnect. The Ledger link moves to the foot. |
| `DeskNoLeague` | `OmenNoLeagueScreen` | `session.v1` | Ghost outline of the desk, then Connect and demo. |
| `OmenCall` | `OmenDecisionScreen` | `omen-decision-brief.v3` (via `/api/omen/mvp-move`) | Order: verdict, then swap, then band, expected, risk, then leading read and counsel. The write-up state line comes from `signals.llm_reasoning`. **Backend gap:** "I made the move / Not this week" needs a follow-through write. `moves-history.v2` already reads `followed`, but no route sets it. Add one before wiring these buttons. |
| `OmenEvidence` | `OmenEvidenceScreen` | same brief: authority receipt, drivers, crosswind, fog | Sections in lock-v2 order. Never label anything "Sight". |
| `OmenHold` | `OmenDecisionScreen` hold and no-move states | brief with no recommendation, closest alternatives | Confident hold. Shows the closest calls it passed on and when Omen looks again. |
| `TradeMode` | `OmenTradeScreen` | `trade-capabilities.v1`, `trade-saved-queue.v1` | Three entries: Find, Build, Judge an offer (the old "Type"). Saved trades with a stale-roster state. |
| `TradeFind` | `OmenTradeFindReviewScreen` | `trade-find.v1` (`search_funnel`, `empty_reason`) | Both sides, then both lineups' gain per week, then the catch, then the funnel line. Empty: one message per `empty_reason` (states board). |
| `TradeBuild` | `OmenTradeBuildScreen`, `OmenTradeRosterScreen`, `TradePartnerPicker` | roster route, `players-search.v1` | Send and get trays at the top; a roster segmented by side; locked players show disabled with "Locked · game started". |
| `TradeVerdict` | `OmenTradeVerdictScreen`, `OmenTradeShareScreen` | `trade-compare.v2`, `trade-share.v1` | Verdict sentence, both sides × three horizons (week, next 4, season), the catch, then propose and share. |
| `League` | `OmenLeagueScreen` / `OmenLeagueTableScreen` (`OmenScoutScreens.swift`) | `league-overview.v1`, `league-transactions.v1` | Headline from standings. Table / Needs / Activity segments, a playoff line, "who needs what you have" linking to Find. |
| `Waivers` | `OmenLeagueWireScreen` | `waiver-analysis.v2` | Verdict-style headline, add/drop swap, bid when FAAB, why, the never-suggest rule at the foot. |
| `Ledger` | `OmenLedgerScreen`, `OmenLedgerDetailScreen` | `moves-history.v2`, `move-detail.v1` | Contested record headline and a week strip. Three provenances look different: checked, your word, unknown. Trades show three horizons. |
| `Welcome` | `SignInView` (first screen) | `session.v1` | Wordmark, then the promise, then a sample call card. Apple full width, Google and Discord in two columns, email outlined, demo link. |
| `EmailCode` | `SignInView` OTP step, `OmenOtpCodeField` | Supabase OTP | Six cells with `one-time-code` autofill and a resend countdown. |
| `Connect` | `ConnectView` provider step | `platform-provider-state.v1` | Three providers, each with an honest one-liner, a "what Omen reads" disclosure, and the demo link. |
| `EspnConnect` | `ConnectView` ESPN discovery states (`ConnectViewModel`) | `/api/platforms/espn/leagues` `discovery_state`, `espn_nfl_league_count` | Visible steps. Follow what has been found; the rest join later. **Backend gap:** auto-follow of late-listed leagues does not exist yet. Until then, keep "Check again". League ID stays a last resort below the fold. |
| `Account` | `OmenAccountScreen`, `AccountView`, `DeleteAccountConfirmationView` | `session.v1`, `user-export.v2`, `user-delete.v1` | Grouped native list: sign-in methods, leagues per provider, Appearance, then sign out and delete. Delete goes through the native confirmation. |

States that have no frame of their own follow `StateBoard`: `OmenSwitchLoadingScreen`, `OmenConnectFailedScreen`, `OmenTradeNeedsContextScreen`, `OmenCommandQuietScreen`, unread, provider limit, stale and fog.

## Done for each screen (brief § Frame definition of done)

1. Matches its frame in dark and light on iPhone 17 Pro and SE sizes.
2. Every state on the states board that the screen can reach is implemented and reachable in screenshot scenarios.
3. `testAccessibilityAuditEveryTab` reports 0 issues for that tab, and VoiceOver order follows the visual order.
4. `screen/ready` signpost added; first useful paint within its latency class.
5. Leftover components removed and listed in the PR.
6. Fresh-agent review, then the founder sees it on the phone.
