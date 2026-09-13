# Native visual lock — canvas source, 2026-09-13

**Screen artifact of record for the locked native visual direction**, per
`Direction/facts-of-record.md` #20 — an approved Claude Design canvas is a valid screen artifact
alongside Figma; Figma stays authoritative for vector assets.

Authored in a Cowork session with the founder on 2026-09-12/13. Committed here rather than left in a
scratchpad and a hosted page, for the reason `design/app-rework-canvas/README.md` already gives:
anything an engineer builds from belongs in the repo, versioned, next to the code it describes.

## Relationship to `design/app-rework-canvas/`

**These supersede it for the eight screens below.** The earlier canvas is Raven Black `#0A0A0B` with
the Alegreya stack and pastel provider pills — it predates founder decisions D1–D11. It is not
deleted: it holds screens these do not (sign-in, email code, connect, share card) and remains the
artifact of record for those.

Where the two disagree on a screen listed below, **this folder wins**.

## The screens

| File | Screen | Scroll |
|---|---|---|
| `CommandCenter.dc.html` | Command Center — scoreboard, waiver seat, ledger row | fits |
| `OmenCall.dc.html` | Omen — one call per team, per week | fits |
| `CommandQuiet.dc.html` | Command Center — quiet week, neutral variant | fits |
| `LeagueTable.dc.html` | League — table, trade targets, waiver, activity | scrolls |
| `TradeBuild.dc.html` | Trade — partners, filters, three teams, execution steps | scrolls |
| `Ledger.dc.html` | The Ledger — every call and how it went | scrolls |
| `SwitchSheet.dc.html` | Team switcher sheet over Trade | — |
| `Account.dc.html` | Account | scrolls |

Each is one 390×844 artboard, plain HTML with inline styles and a Google Fonts link. Open one in a
browser and it renders on its own — no build step, no `support.js`. `canvas.json` is the layout.

**"Fits" is a requirement, not an observation** (D11). Command Center, Omen and the quiet week must
render with nothing below the fold and nothing clipped by the tab bar. If an edit pushes content out
of the 844px frame, the edit is wrong, not the frame.

## Reading the tokens out

Every value is a CSS custom property in the `:root` block of each file, and the names match the
registry after Amendment 01:

```
--bg #1F1F1D   --s1 #2A2A27   --s2 #343431   --s3 #3F3F3B
--hair #3A3A36 --bd  #8A8272
--t1 #F5F0E8   --t2 #BDB5A9   --t3 #A79E90
--ac #C4933B   --acH #D8A648  --acM #3A2A0A  --onAc #14140F
--espn #B21826 --sleeper #0F70B0 --yahoo #410093
--lip rgba(196,147,59,.34)   brass edge highlight
--up / --dn                  engraved inset highlight / shadow
```

The provider chip ring is `rgba(245,240,232,.38)` — see Amendment 01 §2.2 for why `.22` failed.

## Type scale — fixed

30 was the scoreboard before the leader/trailing split. Current:

| px | Role |
|---|---|
| 27 | Scoreboard, leading score |
| 22 | Scoreboard, trailing score |
| 24 | The Omen call |
| 21 | Screen title |
| 15 / 13 | League live strip, leader / trailing |
| 14 | Card lead |
| 13 | Player and team names, switcher |
| 12.3 | Reasoning copy |
| 9.5 | Labels, uppercase |

Weight and letterspacing carry emphasis, not size. This scale drifted twice before it was written
down; treat a size not on this list as a defect.

## Conformance pass — 2026-09-13, after Registry Amendment 01

Applied across all eight artboards. Verified by rendering: **Command Center, Omen and the quiet week
all still report 0px overflow** in an 844px frame, so D11 survives the pass.

| Fixed | Was | Now |
|---|---|---|
| Provider marks had no silhouette | raw hex + `rgba(...,.24)` inset — Yahoo 1.13:1, ESPN ~1.26:1 on `surface-1` | `--ring rgba(245,240,232,.38)`, the registry `fill-ring` token |
| Unstarred favourite invisible | `#4A4A4E`, **1.63:1** on `surface-1` | `#8A8272`, the `border` token, 3.78:1 |
| Self-reported shared a carrier with not-read | both dashed underline | self-reported is **dotted**; dashed stays with provisional data |
| Type below any sanctioned floor | 8px and 8.5px uppercase labels | 10px |
| Focus had no specification | absent | `.focus, :focus-visible` rule present in every file |

**Why the ring is `.38` and not `.24`.** `.22` was tried first and composites to `#575651` over
`surface-1` — **1.96:1**, too faint to restore the silhouette it existed to restore. `.38`
composites to `#777570` at **3.13:1**, clearing WCAG 1.4.11's non-text floor. The artboards had
shipped `.24`, which is the same mistake one point along.

**Why not-read and self-reported had to split.** *Not read* says Omen has no source. *Self-reported*
says a source exists and it is the user. Those are opposite claims, and the Ledger rule that
self-reported rows are never blended with verified ones cannot hold while they look identical.

**Focus is specified, not drawn.** Artboards show resting state, so no element carries `.focus`. The
rule is in every file for the build to read, and registry §4 requires a visible outline **plus**
platform-native focus behaviour — never the brass colour alone. Verify on device.

## Known gaps — still open

Tracked as `V-CanvasConformance` and `C7-TypeScaleReconciliation` in `Direction/current_sprint.md`.

- **Spacing is not yet on the amended scale.** Registry §2.5 is now
  `2·4·6·8·10·12·14·16·20·24·32·40·48·64·96`; these files still run 7, 9, 11 and 13. Snapping is one
  pixel per value, but it moves vertical rhythm on three screens that must not scroll, so it is done
  with a render check rather than a find-and-replace.
- **The type scale conflicts with registry §2.4.** This canvas needs four roles the registry does
  not name — 27, 22, 24, 21 — and runs reasoning copy at 12.3 and labels at 9.5 against `chip` at
  11. **Two fixed scales for one app is two sources of truth.** Founder call, blocking `U2`/`U3`.
- **The switcher `+`, the chevron and the favourite star are under the 44pt touch floor.** Not fixed
  here on purpose: padding the hit area without moving the glyph is a build-brief concern, and
  growing the geometry in the artboard would make the artboard wrong. Registry §4 governs it.
- **Scoreboard numerals are what breaks first at 200% Dynamic Type.** Behaviour undefined.
- **The quiet-week straight variant** — after a loss, an injury, a breakage — is still not drawn.
  Only the neutral one is. That is the voice fence and it is the half that matters. Now tracked as
  its own item, `V-QuietWeekStraight`, because the switching predicate is server-side and the copy
  cannot be invented at build time.

