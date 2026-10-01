# Screen contract - TradeBuildThreeTeam

Compiled from `design/native-visual-lock-2026-09-13/TradeBuildThreeTeam.dc.html`, drawn 2026-09-27
for **T5-ThreeTeamBuilderInteraction**. `_shared.css` hash matches every other artboard in this
folder (verified via `node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check`
→ `canvas css parity: OK (34 artboards match _shared.css)`).

**This is a companion to `TradeBuild-v1.md`, not a replacement.** `TradeBuild-v1.md` remains the
contract for the 2-team builder exactly as approved — this file governs only the screen a user
reaches after a live `trade-capabilities.v1` read reports `three_team.supported: true` **and** a
third team has been added. A user without three connectable teams, or on a league where three-team
support is unavailable, sees exactly `TradeBuild-v1.md`'s existing 2-team experience and never this
screen. Element IDs below are independent of `TradeBuild-v1.md`'s (`E001`… restarts here) since this
is a distinct rendered state, not a diff against the same DOM.

**Drift note (read before building against `TradeBuild-v1.md`):** `TradeBuild-v1.md` was compiled
2026-09-14 and, at that time, `TradeBuild.dc.html` itself drew a fake working three-team state
(`THREE TEAMS` kicker, a live `+ Add team`, a three-leg ring). Commit `c287cae9` (2026-09-20)
reconciled the artboard against the real `trade-capabilities.v1` contract of that date
(`max_teams: 2`) and redrew it to the honest 2-team-max-disabled state it shows today — but
**`TradeBuild-v1.md` itself was never re-compiled** and still describes the pre-reconciliation
three-team mock as if it were the current 2-team artboard's content. That contract file is stale on
this one point; the current `TradeBuild.dc.html` (2-team, `.pt.addt` dashed and captioned "Two teams
max", `.note` stating the limit) is ground truth, per `CONTRACTS.md`'s own rule that the canvas is
the reference for the actual screens. This file is compiled against the current, real artboard family
— it does not inherit the stale three-team mock's exact copy, only its now-real intent.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Trade — three teams, built and ready to submit |
| Family | Trade |
| Journey | J4 |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured `.sbody` overflow at 390x781 viewport: 139px (`scrollHeight` 920 vs `clientHeight` 781). |
| Data route | GET /api/trade/capabilities + POST /api/trade/compare (`legs` body) |
| API contract | trade-capabilities.v1 + trade-compare.v2 (three-team `legs` branch) |
| Capability profile | `trade` — expresses per `capability-expression-v1.md` |
| Governing rule | Reachable only when `three_team.supported === true` **and** exactly 3 teams are selected. `max_teams` stays 3 — a 4th team is refused by the server (`multi_team_trade_unsupported`) and this screen never offers a 4th slot. |
| Reached from | `TradeBuild` (2-team state) once `TradePartnerPicker-v1.md`'s sheet commits a third team. |

## Native build rules

Identical to `TradeBuild-v1.md`'s (same registry, same spacing scale, same "resolve to foundation
names" rule). Repeated in full there; not restated here.

## The interaction decisions this screen encodes

**Why a live picker sheet instead of inline expansion.** `TradeBuild-v1.md` already names the
pattern to reuse: `LeagueSwitcherBar` / `SwitchSheet` (E005/E011/E012 there). Adding a third team is
exactly the same shape of decision as switching your active league — pick one thing from a filtered
list of named options you don't currently have selected — so `TradePartnerPicker-v1.md` reuses that
sheet's chrome (scrim, grab handle, divided row list, crest + name + secondary line) rather than
inventing a new picker control. It differs from `SwitchSheet` in what it lists (the current league's
other teams, not your other owned leagues) and in dropping the platform segmented control (a
trade's three teams are always in one already-selected league, so there is nothing to filter by
platform).

**Why the chip row stops offering not-yet-selected candidates once three are active.** In the 2-team
state, `TradeBuild-v1.md`'s `.partners` row shows every candidate team so tapping any of them swaps
the single active partner (E022/E026/E030 there). With two non-"you" partners simultaneously
selected, that same tap semantics becomes ambiguous — swap *which* one? Rather than invent a
disambiguation step, this screen simplifies: once three teams are active, the `.partners` row shows
**only the two selected partner chips** (`E022`, `E026` below) and nothing else. Changing the third
team is remove-then-reopen-the-picker, not a direct swap. This is a deliberate beta simplification,
named here so a later pass can revisit it rather than silently inheriting it as an oversight.

**Why the third chip's tap semantics change (removal, not selection).** The two-team screen's
partner chip has exactly one meaningful tap target state: "not selected → select." Once a chip is
already `.pt.on` and a third team exists, tapping it a second time **removes that team from the
trade** — it is the only chip in this state where "already on" is itself the thing you can act on.
This reuses the same toggle idiom already established for `.fc` filter chips (tap an `.fc.on` chip
again to turn it off) rather than adding a new gesture, dialog, or glyph. There is no confirmation
step: removal is immediate, paired with a one-line disclosure (see State strings) so the user is
told what happened rather than asked to predict it. **The primary partner chip (`E022`, the first
team added) is not removable this way** — removing your only non-"you" partner would leave an
invalid 1-team trade, so that chip keeps today's 2-team behavior and this screen's removal affordance
applies only to the third (`E026`).

**Why each leg block is headed by a team, not by a direction.** `trade-compare.v2`'s three-team
response already aggregates each participant's own `sends` list (`participants[].sends`) — this
screen renders exactly that shape, one `.leg` block per participant that sends something, headed by
that participant's name (`"You send"` for the caller, `"<team_name> sends"` for everyone else),
**never one block per pairwise leg.** This is a direct, zero-translation mapping onto data the server
already computes; the client performs no leg-to-side reassembly of its own. Block order matches the
`.partners` chip order above it (you, then the order teams were added) so the chip strip and the
leg list read as the same list twice, not two different orderings a user has to reconcile.

**Why a leg row needs a third direction state.** The existing `OmenTradeLeg.Direction` enum
(`sending` labelled "Out", `receiving` labelled "In") is relative to the viewer and was sufficient
because a 2-team trade only ever has two participants — anything not sent by you is received by you.
A 3-team trade breaks that: Davante's Inferno sending Ja'Marr Chase to Chubb Rock touches neither
your outgoing nor your incoming pile. Rather than mislabel it "In" (wrong — it never reaches you) or
invent a new glyph, this screen adds a **third, silent state**: the direction column renders blank
for a row that neither leaves nor enters your roster (`E109` below — an empty `.ar.out` span, no
text). This reuses `_shared.css`'s own stated philosophy for `.rk.lo` ("absence is the state") rather
than inventing a fourth visual language for risk/status. The row's `.pl` meta line already carries
the real information APIs need to convey — `"WR · CIN → Chubb Rock"` — so nothing is lost; the
direction column simply declines to claim a relationship to the viewer that does not exist.
**Native model change implied:** `OmenTradeLeg.Direction` gains a third case (`lateral`, or
similar); label is empty string, ink is `text-tertiary` (same as `.out`), never `accent`.

**Why `meta`'s destination suffix is now load-bearing, not decorative.** `OmenTradeLeg`'s existing
doc comment already anticipated this: *"'RB · IND', or 'RB · IND → Davante's' where a third party is
involved."* This screen is where that anticipated case actually fires. Rule, made explicit: the
destination suffix (`" → <team>"`) appears whenever the leg's recipient is **not** the viewer;
it is omitted when the viewer is the recipient (unchanged from today — `"RB · TEN"` never
`"RB · TEN → you"` … except this screen's own artboard literal below reads `"RB · TEN → you"`
for clarity to a design reviewer. **The native build renders the shorter, existing 2-team-style
form (`"RB · TEN"`, no suffix) when you are the recipient** — the artboard spells out "→ you" only
because a static mock has no other way to show the reader which row is the payoff; do not carry the
literal "→ you" suffix into the shipped copy.

**Why the submission steps became a checklist instead of a read-only list.** T1's `submission.steps`
is already a flat array of English sentences (`buildThreeTeamSubmission` in
`src/routes/trade.js`); today's `TradeBuild-v1.md` 2-team screen has no submission block at all
because a 2-team trade needs no split handoff. For three teams, "how to submit this" stops being a
one-shot instruction and becomes a **multi-session task** — a user opens ESPN, sends leg 1, waits for
Davante's Inferno to accept, comes back, sends leg 2. A static numbered list gives no way to
remember where you left off. This screen adds, per step: a **local, client-only "done" toggle** (tap
the step to mark it complete — not shown as checked in this artboard, which draws the resting/
nothing-done state per the same convention `_shared.css` already uses for focus rings: "artboards
show resting state... the specification the build implements and must be verified on device"), a
progress caption above the list (`E103`, "0 of 3 legs sent"), and a per-step **"Copy" micro-action**
that copies only that leg's player names — not the whole three-leg block — so a user mid-handoff can
grab exactly the text they need for the provider screen in front of them. **This "done" state is
never synced, never reported to the server, and never claimed as proof the trade was sent** — it is
scoped exactly the same way `OmenTradeRosterRow`'s existing states are scoped: a reminder for the
user, not a fact about the world. `TradeBuild-v1.md`'s own contract rule stands unmodified: *"Omen
never submits on your behalf"* and, by direct extension, never claims a leg went through because a
box got tapped.

**Deliberately out of scope, flagged rather than improvised.** `trade-compare.v2` returns
`acceptance_likelihood` and `roster_fit` **per participant** (`participants[].acceptance_likelihood`,
`.roster_fit`) — this screen shows neither for the non-you participants. Disclosing a third party's
likely reaction to a deal, in a screen that same party might eventually see summarized secondhand,
is a real design question (`omen-trade-page-workshop-v1.md`'s locked rule that private negotiation
advice may name another team's weakness but public surfaces never do — this screen is private, but
showing "Chubb Rock: unlikely to accept" to the user building the trade is still a decision with
consequences worth its own pass rather than a drive-by addition here). Flagged in `Still open` below
rather than shipped ad hoc.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · Slops Saloon`
- `▾`
- `+`
- `Three teams`
- `Build a deal`
- `JD`
- `TYPE A TRADE`
- `BUILD A TRADE`
- `DSI`
- `Davante's`
- `NEEDS RB`
- `CHB`
- `Chubb Rock`
- `NEEDS WR`
- `ALL`
- `QB`
- `RB`
- `WR`
- `TE`
- `FILLS MY RB HOLE`
- `YOU SEND`
- `Out`
- `Jonathan Taylor`
- `RB · IND → Davante's`
- `RB 8`
- `DAVANTE'S INFERNO SENDS`
- `Ja'Marr Chase`
- `WR · CIN → Chubb Rock`
- `WR 3`
- `CHUBB ROCK SENDS`
- `In`
- `Tyjae Spears`
- `RB · TEN` (native: no destination suffix when you are the recipient — see note above)
- `Counter`
- `Three-team deals fail on the middle team. Ask Chubb Rock for their 2027 second — you're taking the least certain asset.`
- `HOW TO SUBMIT THIS`
- `ESPN · HANDOFF ONLY`
- `0 of 3 legs sent.` (state string — see State strings)
- `Taylor → Davante's first. Tell them it's contingent on the second leg.`
- `Then Chase → Chubb Rock. Both accept or neither should.`
- `Then Spears comes back to you, closing the loop.`
- `COPY`
- `Copy all three legs & open ESPN`
- `Command`
- `Omen`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · Slops Saloon; ▾; + | LeagueSwitcherBar | Unchanged from `TradeBuild-v1.md`. Open SwitchSheet; read GET /api/leagues before rendering. |
| E022 | DSI; Davante's; Needs RB | PartnerChip (primary, non-removable) | No-op while three teams are active — behaves as the sole always-required partner. Not the removal affordance; see E026. |
| E026 | CHB; Chubb Rock; Needs WR | PartnerChip (removable third partner) | Tap: remove this team from the trade, discard any legs touching it, return to the 2-team `TradeBuild` state, and show the one-line disclosure in State strings. This is the only chip with removal behavior. |
| E038–E043 | All; QB; RB; WR; TE; Fills my RB hole | FilterChip | Unchanged from `TradeBuild-v1.md`. Filters the visible local list only. |
| — (leg rows) | see Literal strings | TradeLegRow (extended — see interaction notes) | Read-only in this screen; legs are built via `TradeRoster`'s "Add to deal" flow, not edited here. |
| E106 | Copy (per step) | Text.action (micro, brass) | Copy only this step's leg text (players + destination) to the clipboard. Does not mark the step done by itself — done is a separate tap on the step row. |
| — (step row, tap target) | step sentence | StepGuideRow (extended — adds a done toggle) | Tap the row (outside the Copy action) to toggle its local "done" state and advance the "N of 3 legs sent" caption. Client-local only; never sent to the server; never implies provider confirmation. |
| E110 | Copy all three legs & open ESPN | Button.primary | Unchanged mechanism from `TradeBuild-v1.md`'s equivalent — copies every leg's text, opens the provider. Enabled once `trade-compare.v2`'s `evaluability.status === "evaluable"`. |
| E111–E118 | Command; Omen; Trade; League | TabNavItem | Unchanged. |

## State strings

- `0 of 3 legs sent.` / `1 of 3 legs sent.` / `2 of 3 legs sent.` / `3 of 3 legs sent.` — the progress
  caption, derived purely from the client-local done-toggle count. Never implies the provider
  confirmed anything.
- `Removed Chubb Rock. Any legs with them were cleared too.` — the one-line disclosure shown the
  instant a third partner is removed (reuses `.oneline`/`.tx` styling). Transient; dismissed by the
  next render or after a few seconds, whichever the platform's existing toast/inline-note convention
  already does elsewhere in this app.
- Direction column: `Out` / `In` / *(blank)* — three states, per the interaction notes above. Never
  a fourth glyph, never color as the only carrier of the blank state (its carrier is the absence of
  text, same tier as `.rk.lo`'s "absence is the state").

## Icons and symbols

Identical set to `TradeBuild-v1.md` (tab bar icons only; no new icon is introduced by this screen).
See that file's Icons and symbols table — the same four tab glyphs at the same paths.

## Element inventory

Measured directly against the artboard at 390×844 (actual rendered `.sbody` height at this state:
781 visible / 920 total, confirming the `scrolls` rule) via a real browser layout pass, the same
method the other Trade contracts' tables were produced by. Element count: 84 (including the trailing
zero-height spacer div and the tab bar's icon paths).

| ID | Selector | Text | Component | Rect | Notes |
|---|---|---|---|---|---|
| E001 | `.screen > .sbody.scrolls` |  | NativeStack | 0,0 390x781 |  |
| E002 | `.screen > .sbody.scrolls > .statusbar` |  | StatusBar | 0,0 390x24 |  |
| E003 | `...> .statusbar > span:nth-of-type(1)` | 3:50 | Text | 16,10 23x14 |  |
| E004 | `...> .statusbar > span:nth-of-type(2)` | 5G · 42% | Text | 329,10 45x14 |  |
| E005 | `...> .sw` |  | LeagueSwitcherBar | 0,24 390x49 | unchanged from TradeBuild |
| E013 | `...> .top` |  | ScreenHeader | 0,73 390x51 |  |
| E015 | `...> .top > div > p.kick` | Three teams | Text | 16,85 112x13 |  |
| E016 | `...> .top > div > h2.ttl` | Build a deal | Text.heading | 16,102 112x22 |  |
| E017 | `...> .top > div.av` | JD | AvatarButton | 344,94 30x30 |  |
| E018 | `...> .tabs2` |  | SegmentedTabs | 16,136 358x24 |  |
| E021 | `...> .partners` |  | NativeStack | 0,160 390x91 | two chips only — see interaction notes |
| E022 | `...> .partners > .pt.on:nth-of-type(1)` |  | PartnerChip | 16,172 62x77 | primary, non-removable |
| E023 | `...> .pt.on:nth-of-type(1) > .cr` | DSI | CrestOrProviderMark | 25,172 44x44 |  |
| E024 | `...> .pt.on:nth-of-type(1) > .n` | Davante's | Text | 24,220 46x12 |  |
| E025 | `...> .pt.on:nth-of-type(1) > .need` | Needs RB | Text | 18,236 57x13 |  |
| E026 | `...> .partners > .pt.on:nth-of-type(2)` |  | PartnerChip | 86,172 62x77 | third, removable — see interaction notes |
| E027 | `...> .pt.on:nth-of-type(2) > .cr` | CHB | CrestOrProviderMark | 95,172 44x44 |  |
| E028 | `...> .pt.on:nth-of-type(2) > .n` | Chubb Rock | Text | 88,220 58x12 |  |
| E029 | `...> .pt.on:nth-of-type(2) > .need` | Needs WR | Text | 87,236 61x13 |  |
| E037 | `...> .filters` |  | NativeStack | 0,250 390x39 |  |
| E038–E043 | `...> .filters > .fc*` | All/QB/RB/WR/TE/Fills my RB hole | FilterChip | (row at y=260, 27 tall) | unchanged pattern |
| E044 | `...> .leg` |  | NativeStack | 16,301 358x233 | 3 sub-blocks, not 2 |
| E045 | `...> .leg > .legh:nth-of-type(1)` | You send | NativeStack | 16,301 358x13 |  |
| E046 | `...> .leg > .legrow:nth-of-type(2)` |  | TradeLegRow | 16,319 358x55 |  |
| E047 | `...legrow(2) > .ar.out` | Out | Text | 26,340 22x13 | viewer sends |
| E048 | `...legrow(2) > .pl > b` | Jonathan Taylor | Text | 58,329 250x15 |  |
| E049 | `...legrow(2) > .pl > span` | RB · IND → Davante's | Text | 58,350 97x13 |  |
| E050 | `...legrow(2) > .rk` | RB 8 | Text | 318,337 46x20 |  |
| E051 | `...> .leg > .legh:nth-of-type(3)` | Davante's Inferno sends | NativeStack | 16,380 358x13 |  |
| E052 | `...> .leg > .legrow:nth-of-type(4)` |  | TradeLegRow | 16,399 358x55 |  |
| E053 | `...legrow(4) > .ar.out` | — *(rendered blank; em dash shown only for reviewer legibility)* | Text | 26,420 22x13 | **lateral** — new third direction state |
| E054 | `...legrow(4) > .pl > b` | Ja'Marr Chase | Text | 58,409 247x15 |  |
| E055 | `...legrow(4) > .pl > span` | WR · CIN → Chubb Rock | Text | 58,430 112x13 |  |
| E056 | `...legrow(4) > .rk` | WR 3 | Text | 315,416 49x20 |  |
| E057 | `...> .leg > .legh:nth-of-type(5)` | Chubb Rock sends | NativeStack | 16,460 358x13 |  |
| E058 | `...> .leg > .legrow:nth-of-type(6)` |  | TradeLegRow | 16,478 358x55 |  |
| E059 | `...legrow(6) > .ar` | In | Text | 26,499 22x13 | recipient is viewer |
| E060 | `...legrow(6) > .pl > b` | Tyjae Spears | Text | 58,488 280x15 |  |
| E061 | `...legrow(6) > .pl > span` | RB · TEN → you *(native: "RB · TEN")* | Text | 58,509 71x13 |  |
| E062 | `...legrow(6) > .rk` | *(blank — unranked)* | Text | 348,502 16x8 |  |
| E066 | `...> .verd` |  | NativeStack | 16,547 358x319 |  |
| E068 | `...verdh > b` | Counter | Text | 30,562 68x23 | your own verdict_state headline |
| E070 | `...> .verd > p.rsn` | Three-team deals fail on the middle team. Ask Chubb Rock for their 2027 second — you're taking the least certain asset. | Text | 30,593 330x53 |  |
| E071 | `...> .howto` |  | NativeStack | 30,664 330x189 |  |
| E072 | `...howto > .hh` | How to submit this | NativeStack | 30,675 330x19 |  |
| E073 | `...hh > .cap` | ESPN · handoff only | Text | 215,675 145x19 |  |
| E103 | `...howto > .oneline > .tx` | 0 of 3 legs sent. | Text (state) | 30,709 330x17 | new — progress caption |
| E074 | `...howto > ol.steps` |  | NativeStack | 30,734 330x118 |  |
| E075 | `...steps > li:nth-of-type(1)` | Taylor → Davante's first. Tell them it's contingent on the second leg. | StepGuideRow (extended) | 30,734 330x34 | tappable to mark done |
| E104 | `...li(1) > span` | Copy | Text.action | 326,734 34x34 | new — per-step copy |
| E076 | `...steps > li:nth-of-type(2)` | Then Chase → Chubb Rock. Both accept or neither should. | StepGuideRow (extended) | 30,776 330x34 |  |
| E105 | `...li(2) > span` | Copy | Text.action | 326,776 34x34 |  |
| E077 | `...steps > li:nth-of-type(3)` | Then Spears comes back to you, closing the loop. | StepGuideRow (extended) | 30,818 330x34 |  |
| E106 | `...li(3) > span` | Copy | Text.action | 326,818 34x34 |  |
| E110 | `...> .btn` | Copy all three legs & open ESPN | Button.primary | 16,878 358x42 |  |
| E111 | `.screen > .tabbar` |  | TabNav | 0,781 390x64 |  |
| E112–E118 | `.tabbar > .tab*` | Command; Omen; Trade; League + icon paths | TabNavItem / Icon / IconPath | (row at y=792) | unchanged from every other artboard in this family |

## Acceptance checks

- Render exactly the element set above; the `.partners` row shows exactly two `.pt.on` chips and no
  candidate/add-team chips while three teams are active.
- The middle leg block's direction column (E053) renders no text and no glyph — not "Out", not "In",
  not a dash in the shipped build (the artboard's em dash is a reviewer legibility aid only).
- `meta` (`.pl > span`) carries the destination suffix (`" → <team>"`) only when the recipient is not
  the viewer; the viewer-recipient row never carries a "→ you" suffix in the shipped copy.
- The submission checklist's "done" state is client-local: it is never included in any request body,
  never persisted server-side, and its caption never claims a leg was sent to or accepted by a
  provider.
- Removing the third partner chip (E026) discards every leg touching that team and returns the
  screen to `TradeBuild-v1.md`'s existing 2-team state — never a silent partial state with orphaned
  legs.
- Bind data only through trade-capabilities.v1 + trade-compare.v2 (`legs` branch); a payload that
  would touch more or fewer than exactly three teams is never sent — `T1`'s `uniqueTeamIdsFromLegs`
  check on the server is the backstop, not the client's excuse to skip its own bookkeeping.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry
  section 2.3 states. No confidence band or risk chip is drawn (per the c287cae9 reconciliation —
  `trade-compare.v2` returns neither).

## Still open

- Whether/how `participants[].acceptance_likelihood` and `.roster_fit` for the non-you participants
  surface anywhere in this screen. Not shown here; flagged for a follow-up design pass.
- Whether a swapped (not just added/removed) third partner deserves a direct one-tap affordance
  instead of remove-then-reopen-the-picker.
- A pixel-accurate artboard for the `TradeRoster` inline "who receives this player" chooser (the
  third decision point named in the T5 brief) is documented in prose and a Controls-table delta in
  `TradeRoster-v1.md`'s new section rather than drawn here — flagged there, not silently skipped.
