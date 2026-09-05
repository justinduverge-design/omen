# Omen League Switcher — Contract v1

**Status:** approved 2026-09-05 (founder, live session)
**Screen artifact of record:** `design/app-rework-canvas/` — `Main.dc.html`, `CommandSwipe2.dc.html`,
`CommandQuiet.dc.html`, `SwitchSheet.dc.html`, `SwitchLoading.dc.html`
**Supersedes:** the single-line `League · Provider · Week` + `Switch ›` bar previously drawn on every
Command/Omen/Trade/League artboard.

## Why this exists

The canvas specified a one-line context bar. The app shipped a horizontal team carousel. The carousel
is the better idea and the founder kept it, so the canvas was the thing out of date — it has been
amended to match, and this document is the behavior the amended screens imply. Design moved first;
code follows this document, not the current build.

## 1. Entry points

| Surface | What it shows |
|---|---|
| Command Center | Team carousel + pinned `Switch ›` |
| Omen, Trade, League, Ledger | Single-line context bar (team name) + `Switch ›` |

- **`Switch` appears only when more than one team is connected.** One team = no Switch control, no
  provider segment, no sheet. The carousel with a single pill is still shown, followed by `Add league`.
- **`Switch` is pinned**, outside the carousel's scroll container. It must never scroll out of
  reach. This is the specific defect in the shipped build.
- **`Add league` is pinned too**, as a Verdigris `+` beside `Switch`. It was drawn as a trailing
  chip at the end of the carousel and that clipped off-screen behind `Switch` in the first
  build — the same defect, reintroduced. Burying the only control that adds a league behind a
  horizontal scroll was wrong on its own terms.
- The scroll edge **fades** into the pinned controls rather than slicing a chip in half. A hard
  cut reads as a rendering bug; a fade reads as "there is more this way".

## 2. What a row says

1. **Team name** is the primary line. Never the league name when a team name exists.
2. **Fallback:** when the provider returns no team name, the **league name** takes the primary line and
   the secondary line reads `unnamed team`. No "My Team", no user's display name.
3. Secondary line is `Provider · League`, **except** when the provider returned no league name
   at all — ESPN routinely does not. Then it is the provider alone. The carousel's
   `displayLeagueName` falls back to `League 884411`, which is a fine last resort on a matchup
   card where the id is the only thing separating two pages, but under a real team name it is
   noise the user cannot act on.
4. Truncate the primary line with an ellipsis; never wrap, never shrink the type. The star keeps
   its column — the name yields first.

## 3. Favourites

- Multiple favourites allowed. No cap. Multiple per provider allowed.
- **Order is star order:** first-starred sits above second-starred, and so on. Unstarring and
  re-starring moves a team to the end of the favourite block.
- **One sort rule, applied to whatever is on screen:** favourites first in star order, then everything
  else. On `All` that is every favourite across providers; on `ESPN` it is only the ESPN favourites at
  the top of the ESPN list. There is no separate cross-provider ordering rule — same function, filtered
  input.
- **The carousel uses the identical ordering.** The sheet is the carousel opened up; the two must never
  disagree.
- Star color is **Platinum `#C7CBD1`** filled when on, `#4A4A4E` outline when off. Quiet, not a CTA.
- Star sits in its own narrow column immediately beside the name — not flush to the row's right edge.
- **Two hit targets per row:** the star toggles the favourite, re-sorts the list in place, and does
  **not** dismiss the sheet. Anywhere else in the row switches team and dismisses.
- Implementation note: the star button is nested *inside* the row button so it can sit against the
  name. SwiftUI delivers a tap to the innermost button, so the targets stay distinct — verified on
  device, not assumed. Placing the star as a sibling at the end of the row produced a
  right-aligned accessory column, which is the arrangement the founder ruled out.

## 4. Provider filter

- Segment: `All · ESPN · Yahoo · Sleeper`. **Only connected providers appear.** With one provider
  connected, the segment is not rendered.
- **First open ever defaults to `All`** — a deliberate one-time demonstration that Omen handles all four.
- **Every open after that restores the last-used filter.** Leave it on ESPN, it opens on ESPN.

## 5. Sheet presentation

- Height is **content**, not a fixed detent. Five teams means a five-row sheet with no dead space.
- Past ~7 rows the list scrolls and the sheet stops growing. The provider segment stays pinned above
  the scroll.
- Active team is marked with a brass check; it stays in its sorted position and is not pulled to the top.

## 6. Switching performance

**Fast, not instant.** The bar in front of a target is what matters, not a benchmark number.

- The context bar / active pill updates **immediately** on tap, before any data lands.
- **No full-screen spinner and no teardown.** The header stays mounted; content swaps underneath it.
- Show a **skeleton shaped like the widget that will land there**, plus a determinate 2px brass hairline
  under the bar.
- **Prefetch the other connected teams** so the common switch has nothing to wait for and the mid-switch
  state is rarely seen at all.
- A failed switch keeps the user on the team they came from and surfaces the error in place. It must not
  strand them on a half-switched screen — the state in the reported screenshot.

## 7. Status lines during a switch

Approved, with one hard rule: **every line names a request actually being made.** "Checking who the
waiver wire forgot" is legitimate while the waiver wire is being fetched. Inventing a step that is not
performed is not, however well it reads. Lines are bound to real fetch stages and mark themselves done.

This does not conflict with `brand-system.md`'s "motion never hides loading" — the lines narrate the
wait rather than masking it.

## 8. Persistence

- Users stay signed in.
- The last active team persists across launches; they return to the team they left.
- Favourites and their star order persist per user. **v1 stores them locally
  (`UserDefaults`, keyed by user id), so they survive launches but not a device change.**
  `league-directory.v1` has no favourite field, and `is_followed` must not be overloaded for it —
  followed and favourite are different sets, and reusing one would change which leagues appear in
  the carousel the moment a user starred one. `LeagueFavorites` is the seam: give it a remote
  repository and no call site changes. **Cross-device sync needs a server field and is open.**
- The last-used provider filter persists.

## 9. Out of scope for v1

- **Projections in the carousel pill** — parked by the founder, not forgotten.
- **Light vs dark mode.** The shipped screen is light with red pills; every artboard is Raven Black
  `#0A0A0B`. That discrepancy is real and is a separate founder decision. This contract specifies dark,
  per the canvas.
- The `Unable to build this recommendation` server error in the reported screenshot is an unrelated bug.
