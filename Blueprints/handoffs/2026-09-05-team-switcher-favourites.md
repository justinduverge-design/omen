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

---

## Session close, 2026-09-05 — the day turned into an outage

The switcher work above shipped, but the session was dominated by a production
outage the founder surfaced mid-review ("Omen couldn't be reached").

### What was wrong

`findTradeCandidate` solves the optimal lineup **twice per (own player × opponent player)
pair, per opponent** — ~5,600 exhaustive assignment searches in an eleven-team league.
**177 seconds for two opponents**, ~15 minutes for a real league, synchronous, on the thread
that serves every request. The API answered nothing — not Omen, not the marketing page.

**Why that day:** everything in the module is gated on a finite `projected_points`, and ESPN
published no 2026 projections until week 1 went live. The code did not change; the data did.

### Two wrong theories, recorded so the mistake is not repeated

1. **PR #401's season-anchor change** — blamed on timing. Disproved by a rollback that also wedged.
2. **`POST /api/omen/mvp-move`** — blamed because it was the only request logged as never
   completing. It was a *victim* of the freeze, not the cause.

Both came from reading logs. A **CPU profile over the V8 inspector** named the function on the
first attempt. Reach for the profiler first: a blocked event loop leaves logs that look like
evidence and are not.

### What shipped

| PR | What |
|---|---|
| [#404](https://github.com/justinduverge-design/omen/pull/404) **merged** | 2s search budget. Returns **null**, never a partial ranking — a truncated lineup total is an underestimate of unknown size, so a trade ranked on one could make the team worse. Logs when it trips. |
| [#405](https://github.com/justinduverge-design/omen/pull/405) open | Kuhn-Munkres assignment replaces the enumeration. **~15 min → 65 ms.** Property-tested against the old brute force over 400 randomised rosters (3,000 checked while developing, zero mismatches). |
| [#406](https://github.com/justinduverge-design/omen/pull/406) open | The iOS switcher work, rebased onto `#403`. iOS **443/443**. |

### Production state

Restored and verified from outside (200s, ~150ms). An earlier rollback pinned `:main` on the
box to the 2026-09-04 image; the `#404` deploy superseded it and the debug compose override has
been removed. **Nothing temporary is left on the box.**

### Next, in the founder's order

1. Merge `#405`, then `#406`.
2. **League/team naming** — prompt at connect, editable after. Needs decisions first: Omen-only
   name vs write-back to the provider, and whether the connect-time prompt is skippable.
   Recommendation: Omen-only and skippable. Needs a server field — same conversation as
   cross-device favourites, so they likely ship together.
3. Founder reviews on device.
4. Android twin.

### Standing concern the founder raised, worth its own pass

Are there sibling algorithms like this one? The shape to hunt is **synchronous work on a request
path whose cost grows faster than its inputs** — specifically code that is fast today only
because some provider field is still empty. Distinct from the page-by-page design audit.
Extending `#404`'s budget posture to the Trade and League paths is cheap insurance regardless.

---

## 2026-09-06 — providers finished: what "we can't" actually meant

A second day on the same thread. The founder's question — *"is that still accurate?"* about one
error message — turned into an audit of every provider limitation in the codebase.

### The pattern, and it is the finding

**Six "we can't do this" claims were tested against the live APIs. Five were wrong.**

| claim in code | reality |
|---|---|
| ESPN projections unavailable | shipped in `player.stats`, unread — **#409** |
| Yahoo matchup `provider_unsupported` | scoreboard returns 12,955 bytes — **#410** |
| Yahoo scoring `pending`, entitlement refused | settings returns 13,901 bytes — **#410** |
| Yahoo waivers refused at entitlement level | teams + roster return 43KB |
| ESPN playoff count "unproven" | `playoffTeamCount: 6`, right there in the payload |
| ESPN exact scoring `provider_restricted` | **not stale** — a real rights position, lifted by the founder |

Five shared one shape: **a true statement that stopped being true, written into code as a permanent
fact.** Yahoo's entitlement was restored 2026-08-28 and nothing downstream noticed for nine days.
`facts-of-record.md` already warns about exactly this — *"a correction was written where it was
discovered rather than everywhere it was asserted"* — and it happened again anyway.

**The mechanical lesson: provider limitations should be probed, not remembered.** A per-capability
probe, in the shape of the existing `/api/yahoo/access-probe`, would have caught all five.

### What shipped

| PR | |
|---|---|
| [#409](https://github.com/justinduverge-design/omen/pull/409) merged | ESPN projections. 0 of 16 players projected → 16 of 16. Turned "nothing to recommend" into a real recommendation on the founder's phone. |
| [#410](https://github.com/justinduverge-design/omen/pull/410) open | Yahoo matchups, exact ESPN scoring, Yahoo scoring rules. 1055/1055. |

### Production changes, both founder-authorized

- **ESPN rule retention lifted.** `RETAIN_RULE_BODY.espn` false → true. A deliberate rights
  position from 2026-08-26, not a stale claim — the founder was told it split into read-in-flight
  versus capture-and-retain, and that the second feeds a grading pipeline held off for safety, and
  reaffirmed both. Decision log, 2026-09-06.
- **Tuesday grading enabled.** `OMEN_CRON_SCORING_ENABLED` false → true, cron recreated, API
  untouched. The row that caused the 2026-08-26 hold — `season 2099`, no player, `followed = true`
  — was recorded to `References/evidence/2026-09-06-grading-enable/` and deleted. `moves` now holds
  two rows and **zero can reach the legacy PPR fallback**.

### Corrections owed, and one still open

**My 2026-09-05 outage explanation was wrong.** #404, `known_issues.md` and the skill ledger all
say the exhaustive trade search "had been dormant because ESPN published no projections". With
`Number(null) === 0`, every player always passed the finite check — the search always had full
input and was never gated on projections. **The real trigger for 2026-09-05 is not established.**
Flagged in #409; those three documents still need correcting.

Also corrected mid-session: a probe reporting "ESPN roster size 0" was my own bug — the adapter
returns `slots.{starters,bench,ir}`, not `players`. I nearly reported ESPN as broken.

### Open

1. **Merge and deploy #410 before Tuesday** — grading is enabled and the cron runs weekly.
2. **Correct the #404 outage claim** in three places.
3. **Defensive/IDP leagues** cannot reach a `supported` contract — now written up in
   `known_issues.md` with what closing it needs.
4. **The algorithm pass** the founder has been steering toward: right math, cheapest path to the
   most information.
5. **Android switcher.**
