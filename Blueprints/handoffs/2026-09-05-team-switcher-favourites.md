# 2026-09-05 — Team switcher: canvas amendment, favourites, and the pinned bar (iOS)

## What this was

The founder screenshotted the Omen tab: a "Your Teams" chip row running off the right edge, no
pinned control, and a sketch of what it should be instead. The stated complaint was that the canvas
had not been followed. Reading both, the truth was the other way round — the app had grown a
carousel the canvas never specified, and the founder wanted to keep it.

## Decisions taken live

| Question | Answer |
|---|---|
| Carousel or the canvas's single-line bar? | **Carousel.** Canvas amended to match. |
| `E Y S A` in the sketch | Provider filter inside the sheet: ESPN / Yahoo / Sleeper / **All** |
| Row label | Team name; league name when the provider gave no team name |
| Favourites | Multiple, no cap, multiple per provider, ordered by **when starred** |
| Ordering | Favourites first in star order, then server order — one rule, applied to whatever the filter shows |
| Filter memory | First open ever = All; every open after = last used |
| Switch speed | Fast, not instant. No teardown, no full-screen spinner. |
| Loading copy | Playful, but every line names a request actually being made |
| Star colour | **Platinum `#C7CBD1`**, founder-approved, added to the palette |
| Add league | Verdigris `#2F7D5B` |

## Design (done first, on purpose)

- Amended `Main`, `CommandSwipe2`, `CommandQuiet` to the carousel bar; the other six artboards to a
  team-name-first context bar.
- New artboards `SwitchSheet.dc.html` and `SwitchLoading.dc.html`.
- `canvas.json`: both placed, three decision notes added.
- `Brand/brand-system.md`: Platinum added with its light-mode counterpart and contrast figures.
- New contract: `Blueprints/specs/mobile/omen-league-switcher-contract-v1.md`.

## Code (iOS)

- `OmenColor.platinum` — trait-aware, `#C7CBD1` dark / `#78808A` light.
- `LeagueFavorites.swift` — ordered stars + `LeagueSwitcherPreferencesStore` (UserDefaults and
  in-memory doubles).
- `LeagueCarouselViewModel` — `ordered(_:by:)` (pure, `nonisolated`), `toggleFavorite`, filter
  restore/persist, star pruning on every directory read.
- `OmenTeamSwitcherSheet.swift` — new primitive: provider segment, content-height sheet, star beside
  the name, two tap targets per row.
- `OmenTeamPicker` — rewritten as the context bar: scrolling team row with a faded edge, **pinned**
  `+` and `Switch`.
- `CommandCenterView` — one sheet, two triggers, via a shared presentation binding. The legacy
  `OmenLeagueSwitcherSheet` is no longer presented.
- `ScreenshotScenarios` — new `switcher.team-sheet` scenario, live rather than inert.

## Bug found and fixed while in there

`load()` picked the opening page with `allPages.firstIndex(where: \.isActive)` while `selectedIndex`
addresses the **filtered** `pages`. Harmless while the filter always started on All; restoring a
stored provider filter would have landed the pager on an unrelated league. Now indexes `pages`.

## Evidence

- `xcodebuild build` — **BUILD SUCCEEDED**
- `OmenIOSTests` — **442/443**, 1 skipped. The single failure is `PrimitiveEnforcementTests`
  flagging pre-existing raw `Button(` in `SignInView.swift` and `ConnectView.swift`, both untouched
  by this change. Verified failing on a clean tree before any edit.
- New `LeagueSwitcherFavoritesTests` — 10/10.
- Driven in the simulator, light **and** dark, against the `switcher.team-sheet` fixture:
  starring an ESPN team moved it from third to first in both the sheet and the bar; the star did not
  switch the active team; a row tap did not toggle the star (the nested-button check); the ESPN
  filter narrowed the list with the favourite still leading.

## Two defects the simulator caught that the code review would not have

1. **The star shipped flush-right** on the first build — a right-aligned accessory column, exactly
   what the founder ruled out. Only visible in a render.
2. **The ESPN row read `ESPN · League 884411`.** ESPN returns no league name, and the carousel's
   id fallback is fine on a matchup card but is unusable noise as a subtitle. Now the provider alone.

Also fixed after seeing it: `Add league` was a trailing chip inside the scroller and clipped off
behind `Switch` — the same defect this change exists to remove. Now pinned beside `Switch`.

## Open

- **Android twin not built.** iOS only this pass.
- **Favourites do not sync across devices** — needs a `league-directory.v1` field.
- Projections in the carousel pill — parked by the founder.
- `PrimitiveEnforcementTests` pre-existing failure.
- The `Unable to build this recommendation` server error in the original screenshot is unrelated and
  untouched.
