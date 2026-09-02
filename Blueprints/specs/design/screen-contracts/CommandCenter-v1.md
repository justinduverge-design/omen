# Screen contract — Command Center

**Artboard:** `design/command-center/Main.dc.html` ("Command Center — chosen", page `Chosen direction`)
**Artboard state:** 11,509 bytes; canvas annotation `chosen` dated 2026-08-31
**Frame:** 393 × 852, background `#0A0A0B`
**Target:** iOS SwiftUI and Android Compose — **both**
**Design authority:** `Blueprints/specs/design/component-lock-v1.md`, `team-theme-contract-v1.md`,
`Blueprints/specs/mobile/omen-native-design-house-v1.md`
**Screenshot scenarios:** `command-center.demo-connected`, `command-center.disconnected`
**Version:** v1 — compiled 2026-09-02
**Element count: 24.** A build with a different count has dropped or added something.

> **Why this exists.** "Match the canvas" is not a checkable instruction — a dropped icon is not a
> failure a build agent can detect, which is what turned a screen build into a rate-limit burn.
> Every element below is a line an agent can check itself against before submitting.
>
> **This contract is compiled from the artboard. It does not add design decisions.** Anything the
> artboard does not specify is an open question at the bottom, not an invention.

---

## Screen frame

| Property | Value |
|---|---|
| Status bar | 59px reserved at top |
| Scroll | Vertical, whole screen. **The scroll is deliberate — see canvas annotation `chosen` §1.** |
| Background | `#0A0A0B` |
| Safe area | Top inset under the 59px bar; bottom inset above the tab bar |
| Tab bar | Command · Omen · Trade · League — Command active |
| Section rhythm | 16px spacers between the four blocks |
| Empty state | **UNSPECIFIED — see open questions** |
| Loading state | **UNSPECIFIED — see open questions** |

## Type roles

Three families, used consistently. Map these to the locked type scale rather than to raw sizes.

| Role | Use | Treatment |
|---|---|---|
| `mono` | eyebrows, provider chips, numbers, status | 11px / 500 / `letter-spacing: 1.1px` / uppercase (headline eyebrow 1.32px) |
| `sans` | names, headlines, actions | 12–20px / 600 for names, 500 for actions |
| `serif` | records, supporting prose | 12–13px / 400 |

**Numbers are `mono` at 24px/500.** Score is a number, not a name; do not render it in `sans`.

## Palette

| Token role | Hex | Where |
|---|---|---|
| Canvas | `#0A0A0B` | screen background |
| Raised surface | `#1C1C1E` | every card |
| Primary text | `#F5F0E8` | active names, headlines |
| Secondary text | `#AEAEB2` | non-primary team, supporting prose |
| Tertiary text | `#6D6D72` | eyebrows, records, "All set" |
| **Accent** | `#A67C2E` | "Switch", "Edit", "League", the primary-team hairline, the move eyebrow |
| Warning | `#FF9F0A` | "1 to set" |
| Sleeper | `#0F70B0` | provider chip |
| Yahoo | `#410093` | provider chip |
| ESPN | `#B21826` | provider chip |

**Accent is `#A67C2E`, not system blue.** This is the `W1-TABBAR` finding; it applies to every
accent surface on this screen, not only the tab bar.

---

## Elements

### Block 1 — Header

**E1 — Eyebrow.** `mono`, "Command Center", `#6D6D72`, 11px/500, ls 1.32px, uppercase. Padding `0 16px`.

**E2 — Greeting.** `sans`, "Your week", `#F5F0E8`, **20px**/600, line-height 1.2.
*Deliberately 20px, reduced from 32px — annotation `chosen` §1: the greeting was eating ~35% of the
first screen. **Do not restore a larger size.***

### Block 2 — Primary team card

Surface `#1C1C1E`, radius 12px.

**E3 — Provider chip.** `mono` "Sleeper", `#FFFFFF` on `#0F70B0`, 11px/500, ls 1.1px, uppercase, padding `3px 8px`, rounded.
**E4 — League name.** `sans` "Titan Up", `#F5F0E8`, 16px/600.
**E5 — League qualifier.** `serif` "· Sunday Slate", `#6D6D72`, 13px.
**E6 — Switch action.** `sans` "Switch", **`#A67C2E`**, 12px/500, ls 0.6px. Trailing. Opens the team/league switcher sheet.
Row padding `10px 14px`, gap 10px.

**E7 — Primary team name.** `sans` "Titan Up", `#F5F0E8`, 17px/600.
**E8 — Primary record.** `serif` "6–1", `#6D6D72`, 12px/400. Inline after E7.
**E9 — Primary score.** `mono` "64.8", `#F5F0E8`, **24px**/500. Trailing.
**E10 — Hairline.** 1px, **`#A67C2E`**. *The accent rule separating the two teams — it marks which team is primary. Not a neutral divider.*
**E11 — Opponent name.** `sans` "Ridge Runners", **`#AEAEB2`**, 17px/600.
**E12 — Opponent record.** `serif` "5–2", `#6D6D72`, 12px/400.
**E13 — Opponent score.** `mono` "58.1", **`#AEAEB2`**, 24px/500.
*E11–E13 are secondary by colour, not by size. Same sizes as E7–E9.*

**E14 — Move eyebrow.** `mono` "This week's move", **`#A67C2E`**, 11px/500, ls 1.1px, uppercase.
**E15 — Move headline.** `sans` "Start Bijan Robinson", `#F5F0E8`, 17px/600.
**E16 — Move rationale.** `serif` "Bench Tony Pollard. +4.1 projected.", `#AEAEB2`, 12px.
Row padding `12px 14px`, gap 10px.

### Block 3 — Other teams

**E17 — Section label.** `sans` "Your other teams", `#AEAEB2`, 12px/500, ls 0.6px.
**E18 — Edit action.** `sans` "Edit", **`#A67C2E`**, 12px/500, ls 0.6px. Trailing.

**E19 — Yahoo row.** Surface `#1C1C1E`, radius 10px, **min-height 52px**, padding `0 14px`, gap 10px.
Chip `mono` "Yahoo" on `#410093`; `sans` "Gridiron Ghosts" `#F5F0E8` 15px/600; `serif` "4–3" `#6D6D72` 12px;
trailing status `mono` "1 to set" **`#FF9F0A`** 11px/500 uppercase.

**E20 — ESPN row.** Same shell. Chip `mono` "ESPN" on `#B21826`; "Office Rivals" 15px/600; "2–5";
trailing status **`serif` "All set" `#6D6D72` 12px** — *note the shape change: an actionable status is
`mono` and warning-coloured; a settled one is `serif` and tertiary. The difference carries meaning.*

### Block 4 — Widget deck

**Horizontal, swipeable.** Cards 345px wide, `#1C1C1E`, radius 12px, padding 14px, gap 12px,
`padding-left: 16px` so the next card peeks.

> **Annotation `deck`: the swipe is on the WIDGETS, not the teams.** Three teams must be comparable
> at a glance, so a gesture showing one at a time defeats the requirement it serves. **Do not move
> the swipe back onto the team cards.**

**E21 — League Pulse card.** Eyebrow `mono` "League Pulse" `#AEAEB2`; trailing action `sans` "League"
**`#A67C2E`**; headline `sans` "3rd of 12 · in a playoff spot" `#F5F0E8` 18px/600; body `serif`
"Two games clear of the cut line. Ridge Runners are the team to catch." `#AEAEB2` 13px.

**E22 — The Ledger card.** Eyebrow `mono` "The Ledger" `#AEAEB2`; headline `sans` "Week 6 · start/sit"
`#F5F0E8` 18px/600.

**E23 — Waiver Watch card.** Named in annotation `deck` as the third widget. **Its content is not
drawn on this artboard** — see open questions.

**E24 — Tab bar.** Command · Omen · Trade · League. Command active. **Active tint `#A67C2E`, never
system blue.**

---

## Unmapped components

Check each against `component-lock-v1.md` before building. If the lock has no equivalent, that is a
**finding for the founder**, not a component to invent.

| Element | Shape | Likely lock match |
|---|---|---|
| E3/E19/E20 chips | provider pill, per-provider colour | `OmenPlatformConnectionCard` may already own provider colour |
| E10 | 1px accent rule marking primacy | possibly no equivalent — confirm |
| Block 4 | horizontal snapping deck with peek | confirm a locked carousel exists |

## Unspecified — open questions, not inventions

Taken from canvas annotation `open` and from what the artboard does not draw. **Each needs a founder
answer; none should be resolved inside a build.**

1. **Widget deck order and membership.** Annotation `open`: *"Which widgets go in the deck, and in
   what order?"* Drawn: League Pulse, Ledger, Waivers.
2. **E23 Waiver Watch content.** Named but not drawn.
3. **Trade / Omen / League scope.** Annotation `open`: they *"stay scoped to ONE team — the primary
   one. Confirm that is right when three are on screen."* **Unconfirmed.**
4. **Empty state.** No teams connected. `command-center.disconnected` scenario exists — the fixture
   may already answer this; check it before asking.
5. **Loading state.** Not drawn.
6. **Error state.** Not drawn.
7. **More than three teams.** The artboard shows one primary plus two. Behaviour at four is unknown.
8. **Deck pagination affordance.** Annotation `note-c` says Option C is *"the reference for how the
   peek and dots should behave"* — so dots are expected, but they are not drawn on `Main.dc.html`.

## Deliberately not contracted

Animation timing, haptics, gesture physics, and pull-to-refresh. The artboard cannot express them.
Their absence here is a decision, not an oversight.

## How to check a build against this

1. Count elements. **24.**
2. Every accent surface is `#A67C2E`.
3. E10 is accent, not neutral.
4. Scores are `mono` 24px; names are `sans`.
5. E20's "All set" is `serif`/tertiary while E19's "1 to set" is `mono`/warning.
6. Greeting is 20px.
7. Swipe is on the deck, not the teams.
8. Nothing from "Unspecified" was invented.

For a screenshot diff, dispatch `native-visual-evidence.yml` and compare the
`command-center.demo-connected` artifact against the artboard, element by element. Classify each
difference **MISSING / MISPLACED / OFF-TOKEN / DRIFT / UNDECIDED** — DRIFT meaning the build is right
and the canvas is stale, which is a legitimate outcome that fixes the canvas, not the code.
