# Screen contract - TradePartnerPicker

Compiled from `design/native-visual-lock-2026-09-13/TradePartnerPicker.dc.html`, drawn 2026-09-27
for **T5-ThreeTeamBuilderInteraction**. `_shared.css` hash matches every other artboard in this
folder (verified via `node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check`
→ `canvas css parity: OK (34 artboards match _shared.css)`).

This is the sheet opened by tapping the live "Add team" chip on `TradeBuild` once
`trade-capabilities.v1` reports `three_team.supported: true` and exactly two teams are selected.
Selecting a row here is what produces the state `TradeBuildThreeTeam-v1.md` describes.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Trade — pick a third team, sheet open |
| Family | Trade |
| Journey | J4 |
| Frame | 390 x 844; overlay presentation, same D11 floor as its host screen. |
| Scroll rule | The sheet's own `.rows` list scrolls if it overflows (reuses `SwitchSheet`'s `.rows{max-height:300px;overflow-y:auto}`); the host screen behind the scrim does not scroll while the sheet is open. |
| Data route | GET /api/trade/roster?platform=&league_id= — the route T1 added (`omen-t1-three-team-capability`, `src/routes/trade.js`, unmerged as of this writing) and the same read `TradeRoster` will use for the league's teams once merged. |
| API contract | `trade-roster.v1` **(not yet registered in `Blueprints/api-routes.md` on this branch — it exists only on T1's unmerged branch)**. `canvas-contract-requirements-v1.json`'s machine-checked `api_contracts` field for this screen is left as `trade-capabilities.v1` only, matching what is actually registered today; `check-canvas-foundation.mjs` would otherwise fail on a contract this branch cannot see yet. **Whoever merges T1 must also add `trade-roster.v1` to `api-routes.md` and update this contract's `api_contracts` entry to include it** — flagged here rather than fabricated. |
| Capability profile | `trade` |
| Governing rule | Lists every team in the active league **except** the viewer's own team and the already-selected primary partner. Reachable only while `three_team.supported: true`; the live "Add team" chip that opens it does not render at all otherwise (today's `TradeBuild-v1.md` unavailable-chip state stands unchanged). |
| Reused pattern | `TradeBuild-v1.md`'s own `LeagueSwitcherBar` / `SwitchSheet` reference (its E005/E011/E012 row). Same scrim + bottom-sheet + grab-handle + divided-row-list chrome as `SwitchSheet.dc.html`; **not** a new picker component. |

## Native build rules

Identical to every other artboard in this folder (registry §2 tokens, spacing scale, no local
primitives). Not restated here.

## What this reuses from `SwitchSheet`, and what it deliberately drops

- **Reused as-is:** `.scrim`, `.sheet`, `.grab`, `.rows`, `.row` (crest + name/secondary-line pair +
  trailing `.chk` checkmark slot), and the tap-a-row-to-commit-and-dismiss interaction.
- **Dropped: the platform segmented control** (`SwitchSheet`'s `.seg` — All/ESPN/Yahoo/Sleeper).
  `SwitchSheet` lets a user switch across every league and platform they've connected; a third trade
  partner is always a team **inside the league already selected for this trade**, so there is nothing
  to filter by platform. Including the control would imply a choice that does not exist.
- **Dropped: the star/favourite affordance** (`SwitchSheet`'s `.row .star`). Favouriting a league you
  manage is a standing preference; favouriting a one-time trade partner has no product meaning here.
- **Changed: what the secondary line under the name shows.** `SwitchSheet` shows the platform/league
  label ("ESPN", "ESPN · EB Football"). This sheet shows the same "need" read already used on the
  `.pt` partner chips ("Needs RB", "No hole") — the information that actually helps someone choose a
  third team, reusing the exact vocabulary rather than inventing a new one.
- **Changed: the heading.** `SwitchSheet` has no heading row at all (context comes from the segmented
  control). This sheet has nothing to head it with once the segmented control is gone, so it adds one
  `.divid` row as its opening element — a reuse of `SwitchSheet`'s own section-divider styling
  (`Favourites` / `All teams` in that file), repurposed as the sheet's title rather than a section
  break.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · Slops Saloon`
- `▾`
- `+`
- `Two teams`
- `Build a deal`
- `JD`
- `TYPE A TRADE`
- `BUILD A TRADE`
- `DSI`
- `Davante's`
- `NEEDS RB`
- `GMR`
- `Gibbs`
- `NO HOLE`
- `PUK`
- `Puk Around`
- `Add team`
- `ADD A THIRD TEAM`
- `ALL`
- `QB`
- `RB`
- `WR`
- `TE`
- `FILLS MY RB HOLE`
- `Pick a third team — Slops Saloon`
- `CHB`
- `Chubb Rock`
- `NEEDS WR`
- `Puk Around & Find Out`
- `DAR`
- `League 884411`
- `unnamed team`
- `Command`
- `Omen`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E034 | +; Add team; Add a third team | PartnerChip.addt **(live variant — see below)** | Tap: open this sheet. Only rendered when `three_team.supported: true` and exactly 2 teams are selected. |
| — | Pick a third team — Slops Saloon | Text (sheet heading, repurposed `.divid`) | Non-interactive. |
| — (each `.row`) | crest + team name + need read | Row (reused `SwitchSheet` row shape, no star) | Tap: commit this team as the third partner, close the sheet, hand off to `TradeBuildThreeTeam-v1.md`'s state with this team populated in the second `.pt.on` chip slot. |
| — | scrim (tap outside sheet) | Scrim | Tap: dismiss without selecting; `TradeBuild` returns to its 2-team state unchanged. |

**The live "Add team" chip (E034) is a new enabled state of an existing component, not a new
component.** `OmenTradePartnerChip`'s `.pt.addt` shell (dashed square, "+", sub-label) is unchanged;
only its ink/border and interactivity change from the always-unavailable state
`OmenUnavailableControl` renders today. Reusing the exact accent-dashed treatment already defined for
`.fc.smart` (the "Fills my RB hole" smart filter — brass ink, brass-tinted dashed border) rather than
inventing a new visual language for "an affordance that is now live": `color:var(--ac)` on the "+"
and the sub-label, `border:1px dashed var(--ac)` on the crest slot. Sub-label text changes from "Two
teams max" to "Add a third team". **No new CSS class is introduced** — this is an inline override of
existing token values, the same way other one-off treatments already appear inline elsewhere in this
canvas (e.g. the destination-color `<em style="background:var(--espn)">` swatch already used in every
`.sw` bar).

## State strings

- `Add a third team` — replaces `Two teams max` on the chip's sub-label once eligible. The always-
  unavailable state's copy (`Two teams max`, muted ink, `OmenUnavailableControl`) is unchanged for
  every league/account where three-team support is not live.
- No row shows a pre-filled checkmark on open — nothing is selected until the user taps a row.

## Icons and symbols

Identical tab-bar icon set to every other artboard in this family. No new icon.

## Element inventory

Measured directly against the artboard at 390×844 via a real browser layout pass (background screen
plus overlay sheet, `.sbody` height 781, sheet occupying y=485–781 before the tab bar). Element
count: 68.

| ID | Selector | Text | Component | Rect | Notes |
|---|---|---|---|---|---|
| E001 | `.screen > .sbody` |  | NativeStack | 0,0 390x781 | not `scrolls` — the background screen is frozen behind the scrim |
| E005 | `...> .sw` |  | LeagueSwitcherBar | 0,24 390x49 | unchanged |
| E013 | `...> .top` |  | ScreenHeader | 0,73 390x51 | background still reads "Two teams" — third team not yet committed |
| E018 | `...> .tabs2` |  | SegmentedTabs | 16,136 358x24 |  |
| E021 | `...> .partners` |  | NativeStack | 0,160 390x116 |  |
| E022 | `...> .pt.on:nth-of-type(1)` |  | PartnerChip | 16,172 62x102 | DSI, unchanged primary |
| E026 | `...> .pt:nth-of-type(2)` |  | PartnerChip | 86,172 62x102 | GMR, unselected candidate — still browsable pre-third-team |
| E030 | `...> .pt:nth-of-type(3)` |  | PartnerChip | 156,172 62x102 | PUK, unselected candidate |
| E034 | `...> .pt.addt:nth-of-type(4)` |  | PartnerChip.addt (live) | 226,172 62x102 | the trigger — see Controls |
| E035 | `...addt > .cr` | + | CrestOrProviderMark | 235,172 44x44 | brass dashed border (inline override) |
| E036 | `...addt > .n` | Add team | Text | 234,220 46x12 | brass ink (inline override) |
| E118 | `...addt > .need` | Add a third team | Text | 226,236 62x38 | replaces "Two teams max" |
| E037 | `...> .filters` |  | NativeStack | 0,275 390x39 |  |
| E038–E043 | `...> .filters > .fc*` | All/QB/RB/WR/TE/Fills my RB hole | FilterChip | (row at y=285) | unchanged |
| E119 | `...> .scrim` |  | Scrim | 0,0 390x781 | dims background; tap dismisses |
| E120 | `...> .sheet` |  | BottomSheet | 0,485 390x296 |  |
| E121 | `...sheet > .grab` |  | GrabHandle | 177,494 36x4 |  |
| E122 | `...sheet > .divid` | Pick a third team — Slops Saloon | Text (repurposed section-divider) | 0,510 390x25 | sheet heading |
| E123 | `...sheet > .rows` |  | NativeStack | 0,535 390x230 (visible; scrolls past 300px per `SwitchSheet`'s own rule) |  |
| E124 | `...rows > .row:nth-of-type(1)` |  | Row | 0,535 390x58 |  |
| E125 | `...row(1) > .cr` | GMR | CrestOrProviderMark | 16,547 31x31 |  |
| E126 | `...row(1) > .nm > b` | Gibbs | Text | 57,545 291x17 |  |
| E127 | `...row(1) > .nm > span` | No hole | Text | 57,567 36x13 | reused "need" vocabulary, not a platform label |
| E128 | `...row(1) > .chk` |  | Checkmark slot | 358,563 16x0 | empty — nothing selected yet |
| E129 | `...rows > .row:nth-of-type(2)` |  | Row | 0,592 390x58 |  |
| E130 | `...row(2) > .cr` | PUK | CrestOrProviderMark | 16,605 31x31 |  |
| E131 | `...row(2) > .nm > b` | Puk Around & Find Out | Text | 57,602 291x17 |  |
| E132 | `...row(2) > .nm > span` | Needs WR | Text | 57,625 50x13 |  |
| E133 | `...rows > .row:nth-of-type(3)` |  | Row | 0,650 390x58 |  |
| E134 | `...row(3) > .cr` | CHB | CrestOrProviderMark | 16,662 31x31 |  |
| E135 | `...row(3) > .nm > b` | Chubb Rock | Text | 57,660 291x17 |  |
| E136 | `...row(3) > .nm > span` | Needs WR | Text | 57,682 50x13 |  |
| E137 | `...rows > .row:nth-of-type(4)` |  | Row | 0,707 390x58 |  |
| E138 | `...row(4) > .cr` | DAR | CrestOrProviderMark | 16,720 31x31 |  |
| E139 | `...row(4) > .nm > b` | League 884411 | Text | 57,717 291x17 |  |
| E140 | `...row(4) > .nm > span` | unnamed team | Text | 57,740 70x13 | honest fallback — never invents a team name |
| E111 | `.screen > .tabbar` |  | TabNav | 0,781 390x64 | unchanged |

## Acceptance checks

- The row list excludes the viewer's own team and the already-selected primary partner; it never
  lists a team already in the trade.
- No row is pre-checked on open. Selection commits immediately on tap — there is no separate "Done"
  button, matching every other single-select row list in this canvas.
- The background screen behind the scrim is frozen (no scroll, no tap-through) while the sheet is
  open, except the scrim itself, which dismisses on tap.
- The live "Add team" chip (E034) never renders when `three_team.supported` is `false` or absent —
  that state renders exactly as `TradeBuild-v1.md` already specifies (`OmenUnavailableControl`,
  dashed, muted, reason sentence).
- Team names that the provider did not supply render `unnamed team` (or an equivalent honest
  fallback) — never a fabricated name.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry
  section 2.3 states.
