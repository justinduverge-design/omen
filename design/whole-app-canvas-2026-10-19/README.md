# Whole-app canvas — first cut, 2026-10-19

**Proposal.** Every frame here is a proposal until the founder approves it on the canvas.

- **Published canvas:** https://claude.ai/artifact/Gwu93gZJUCzG87GRUrp2vS (Claude Design; private until shared).
- **Brief:** `Blueprints/specs/design/omen-whole-app-canvas-v1.md`. **Visual authority:** `Blueprints/specs/mobile/omen-native-visual-lock-v2.md`, built on `design/native-visual-lock-2026-09-13/`.
- **Why Claude Design:** Figma is retired (founder, 2026-10-19). What the Figma file held is in `design/figma-archive/`.

## First cut (brief § First canvas cut)

| File | Frame |
|---|---|
| `Main.dc.html` | 00 · Start here: the spine, the decision order, the six journeys, frame status |
| `Shell.dc.html` | Shell and the league switcher sheet, grouped by provider, with live score and status |
| `Desk.dc.html` | J2 Desk: the live week across every team, this week's move, what needs you |
| `OmenCall.dc.html` | J3 the call: verdict, leading read, counsel, write-up state, act or decline |
| `OmenEvidence.dc.html` | J3 the argument: leading read receipt, crosswind, portents, fog, receipt |
| `TradeMode.dc.html` | J4 how you arrived: Find, Build, Judge an offer, saved trades |
| `TradeFind.dc.html` | J4 a Find candidate: both sides, both lineups, the catch, the search funnel |
| `StateBoard.dc.html` | Shared states: loading, unread, provider limit, empty with reason, stale, fog, write-up, demo, buttons, motion |
| `Welcome.dc.html` | J0 welcome and sign in: Apple, Google, Discord, email, demo first |
| `Connect.dc.html` | J1 provider picker, each provider's honest one-line on how it connects |
| `EspnConnect.dc.html` | J1 ESPN discovery as visible steps; follow what is found, the rest joins later |
| `League.dc.html` | J5 the scout room: Table / Needs / Activity, playoff line, who needs what you have |
| `Ledger.dc.html` | J6 receipts: contested record, week strip, checked vs your word vs unknown |
| `Account.dc.html` | J6 account: sign-in methods, leagues, appearance, privacy, sign out, delete |
| `DeskLight.dc.html`, `OmenCallLight.dc.html` | Light mode proposal: neutral near-white, darker brass for contrast |

## Proposed changes to the app (for approval)

- **Tabs:** Desk · Omen · Trade · League, in a floating Liquid Glass bar. Ledger is reached from the Desk and the switcher's Account; Account leaves the tab bar.
- **Desk** leads with the live portfolio (one card per followed team, paged), then the one move, then a "Needs you" queue that merges waivers, trade openings and reconnects.
- **Omen** asks the user to say what they did ("I made the move" / "Not this week") so the Ledger has real follow-through.
- **Trade** opens on a three-way chooser; "Judge an offer" replaces the old "Type" mode name.
- **Light mode** (founder, 2026-10-19: wanted, not beige). Account gets Dark / Light / Match iPhone. Team colours are a later theme pack.
- **ESPN connect** follows the leagues it has found while ESPN lists the rest, instead of waiting for all of them (needs a small backend follow-up).
- **Safe area:** frames show the Dynamic Island; the time, Wi-Fi and battery are the system's, so they are not drawn.
- **Screen work rule:** a component on a live screen with no frame here is a leftover and is removed.

Sample names on the frames are illustration, not anyone's league.
