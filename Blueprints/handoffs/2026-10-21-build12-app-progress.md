# Build 12 app build — progress

**Branch:** `claude/build12-app` (from `main` at `7ab5c920`).
**Authority:** `Blueprints/specs/design/omen-design-foundation-v1.md` (approved 2026-10-21) and the frames
in `design/foundation-v1-canvas/`. Read both before touching a screen. A new session resumes from the
first unticked box below, with these rules, not from a conversation summary.
**Parked earlier work to reuse where it fits the spec:** `claude/build12-redesign` (trade builder, player
page, Omen call layout, desk team list). Reuse is allowed only if the result passes the gate.

## The gate (every screen, no exceptions)

A screen is done only when all of these hold, and the evidence is linked next to its box:

1. Matches its frame in dark and light, on iPhone 17 Pro and iPhone SE (screenshots in
   `output/screens/build12/`).
2. Every state the screen can reach is shown: loading, empty, error, reconnect, demo where relevant.
3. Composed only from the foundation patterns (spec § 5). No screen-level colours, fonts, spacing or
   hand-drawn controls. `PrimitiveEnforcementTests` passes.
4. Navigation matches the map (NavMap frame): its back control, swipe-back, sheet dismissal.
5. Accessibility audit clean: 44pt targets, Dynamic Type at the largest size, VoiceOver order, contrast.
6. A fresh review agent compared it to its frame and the spec and found no P0 or P1.
7. Unit tests and the screen's screenshot scenario pass.

## Rule: no parallel pieces (founder, 2026-10-21)

"You have to clean up the old shit. You can't just make up new shit." Every new piece either replaces an
old one (the old file is deleted when its last caller moves) or the old one is changed in place to become
the new one. Nothing old and new lives side by side at merge. The ledger below is the checklist; **the
build cannot open its PR while any row is not Deleted.** A screen's gate includes deleting every old piece
it was the last user of, in the same commit.

## Replacement ledger

| Old piece | Callers today | Becomes | Status |
|---|---|---|---|
| `OmenPlayerRow` (old) | Omen first call, decision brief, gallery | `OmenRosterRow`, then renamed `OmenPlayerRow` | **deleted; renamed** |
| `OmenDecisionBrief` | Omen non-success states | new Omen call + `OmenStateBlock` | **deleted** (data types moved to `App/Api/OmenCallModels.swift`) |
| `OmenConfidenceBar`, `OmenMetricStrip`, `OmenRiskPanel`, `OmenSignalList` | only `OmenDecisionBrief` and the gallery | `OmenFigure`, full argument rows | **deleted** |
| `OmenPlatformConnectionCard` | gallery only | `OmenProviderMark` + Account rows | open |
| `OmenStateSurface` | 18 files | `OmenStateBlock` | open |
| `OmenCard`, `OmenTappableCard` | 20 files | `OmenAnswerSurface`, plain page + hairlines | open |
| `OmenListRow` | 6 files | `OmenKeyValueRow`, `OmenRosterRow` | open |
| `OmenModalSheet` | 6 files | system sheet + `OmenSheetHeader` | open |
| `OmenScreenShell`, `OmenContextStrip`, `OmenLeagueSwitcherBar` | 5 / 3 / 3 files | page header + `OmenTeamControl` | open |
| `OmenTeamSwitcherSheet`, `OmenSwitchSheet` | 2 / 2 files | one switcher sheet on `OmenSheetHeader` | open |
| `OmenMatchupHero` view (state enum stays as data), carousel views | Desk | `OmenTeamRolodex`, `OmenPinnedScore` | carousel, widget pager, old desk host/screen, switch-loading, quiet and no-league screens **deleted**; `OmenMatchupHero` view still referenced by its tests, delete with them |
| `OmenTradeTabs`, `OmenTradePartnerChip`, old trade journey screens | Trade | trade chooser, builder, verdict sheet | open |
| `OmenReportPill` | 3 files | "Report this" link + report sheet | **deleted** |
| `OmenChip`, `OmenBadge`, `OmenPlatformBadge`, `OmenCanvasTextAction` | 3 / 4 / 3 / 3 files | `OmenProviderMark`, `OmenBarTextButton`, words | open |
| `OmenContextualHelpButton` (header "?") | 1 file | "How Omen makes a call" in Account (spec § 3) | open |
| `OmenEvidenceRow` | 3 files | `OmenKeyValueRow` | open |
| `OmenIconButton`, `OmenPlatformCompactRow`, `OmenProviderCard` | 5 / 1 / 1 files | keep only if a frame uses it; otherwise delete | open |
| `OmenConnectionStatusBadge` | connect / account | `OmenProviderMark` + status words on the row | open |
| `OmenConfirmationDialog` | delete, disconnect | system confirmation + `OmenSheetHeader` (Delete frame) | open |
| `OmenTradeControls.swift` (rest of file) | trade journey | trade builder pieces | open |
| `OmenAuthPrimaryButton`, `OmenFocusRing`, `OmenPicker`, `OmenTextField`, `OmenFormField`, `OmenOtpCodeField` | sign-in, forms | **kept on purpose**: form and sign-in controls the foundation does not replace; restyled only if a frame differs | kept |
| Old type roles (`display`, `h1`-`h3`, `call`, `scoreLead`, `scoreTrail`, `screenTitle`, `cardLead`, `name`, `bodySmall`, `label`) | many | foundation roles | open |
| `DesignSystemGalleryView` | debug | `FoundationGallery` | **deleted** |
| Old screen files each new screen replaces | per screen | listed per screen in the table below | open |

## Foundation (built and reviewed before any screen, then frozen)

- [x] Colour tokens match spec § 7 (dark and light), including `omenChip` for green words
- [x] Type roles: heroNumber, screenTitle, sectionHeader, body, quiet, eyebrow
- [x] Back control · section header · state block (hold, nothing worth doing, not enough, failed)
- [x] Player row (browse, compare, pick) · player badge (team colour, number, position)
- [x] Team crest · provider mark · account avatar (initials)
- [x] Omen read block · start/sit pair · stat grid · accent lip surface
- [x] Sheet chrome (grabber, Close/Done, unsaved-input confirm) · bottom dock
- [x] Team Rolodex · pinned score · team control ("ESPN · Titans ▾")
- [x] Foundation review by a fresh agent (6 P1, 7 P2, all fixed: authority emphasis, missing-number fallback, settle-only commit, locked-row contrast, uppercase eyebrows, grade ring track, scaled sizes, full provider names); **frozen 2026-10-21**. Evidence: `output/screens/build12/foundation/ios/{dark,light}/`. Unit tests 652, 0 failures.

## Screens

In the app: Desk · Omen call · Omen call (trade) · Full argument · Player · Trade chooser · Find a trade ·
Trade builder · Verdict sheet · Trade share · Three-team · Judge an offer · League · Waivers · Ledger ·
Ledger receipt · Account · Privacy and data · Data sources · Delete account · How Omen makes a call ·
Support / report · Team switcher

Getting in and edges: Welcome · Email code · Connect · League pick · Connect failed · Passkey offer ·
Forced update · Desk with no league · Demo · Rosters unreadable · States (loading, hold, reconnect, offline)

| Screen | Frame | Built | Gate 1-7 | Reviewer | Evidence |
|---|---|---|---|---|---|
| Desk | Main, States, Edges | `OmenDesk.swift` | 1-7 pass | fresh agent: 3 P1 fixed (mid-switch outline, switch error + retry, typed reauth), P2s fixed | `output/screens/build12/desk/`, `DeskUITests` (audit clean), 652 unit tests |
| Player | Main | `OmenPlayer.swift` | 1-7 pass | same review | `player.page` screenshots, audit clean |
| Omen call (+ trade call, hold, states) | Main, OmenTradeCall, States | `OmenCall.swift` | 1-7 pass | fresh agent: 3 P1 (hand-off now opens the provider's league; start/sit detail retry; account/help on Desk by spec) and P2s fixed | `output/screens/build12/omen/`, `OmenCallUITests` (audit clean), 637 unit tests |
| Full argument | FullArgument | `OmenCall.swift` | 1-7 pass | same review | `journey-j3.nominal.02-omen-evidence` |

## Whole-app pass

- [ ] Every screenshot side by side; drift between screens listed and fixed
- [ ] Remove the screens and components the new ones replace (list each in the PR)
- [ ] Fresh-agent review of the whole diff; PR; CI green; on the founder's phone

## Resume here (updated 2026-10-22)

- **Done and pushed:** foundation (frozen), Desk, Player. Branch `claude/build12-app` on origin.
- **Approval:** founder 2026-10-22, rebuild Omen, Trade and League the way the Desk was; push freely, no merge
  until all screens pass (decision log 2026-10-22).
- **Done 2026-10-22: the Omen call** (row above). Original plan kept for reference: Frames: `Main.dc.html` (Omen section), `OmenTradeCall.dc.html`,
  `FullArgument.dc.html`, `States.dc.html` (hold). Replace `OmenDecisionScreen` (in
  `App/Auth/CommandCenterView.swift`) and `OmenDecisionBrief` with a new `OmenCallView` built from § 5:
  headline (`payload.verdict`), body (`payload.explanation.first`), `OmenSidePair` for start/sit
  (`startSitDetail`), `OmenFigure` row (impact, risk, band), "What moved the call" from moved signals and
  `readComparison` drivers, actions ("Make this move in ESPN", "Not this week"), "See the full argument"
  pushed, "Report this" link. Trade call variant from `payload.tradeCall`. Hold and failure states via
  `OmenStateBlock`. Delete in the same change: `OmenDecisionBrief`, `OmenConfidenceBar`, `OmenMetricStrip`,
  `OmenRiskPanel`, `OmenSignalList`, old `OmenPlayerRow`, `OmenReportPill`, `OmenFirstCallScreens` parts the
  new call replaces; then rename `OmenRosterRow` to `OmenPlayerRow`.
- **Next:** Trade (chooser, Find, builder, verdict sheet, share, three-team, judge), then League (+ Waivers,
  Ledger, receipt), then the rest of the screen list, then the whole-app pass.
- **Tooling notes:** add Swift files with `addfile2.py`-style pbxproj edits (no synchronized groups);
  capture with `scripts/capture-screen-batch.sh --platform ios --build --scenarios "..."`; UI tests in
  `OmenIOSUITests/DeskUITests.swift` are the pattern (audit prints offending elements).
