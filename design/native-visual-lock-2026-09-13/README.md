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

## The screens — 30 artboards, six families

**Scope C, founder 2026-09-13: every screen, not just the happy path.** The eight locked screens
were all populated best-case, which left the honest states with nowhere to live and left ESPN — the
only confirmed beta failure on record — undrawn.

### Onboarding & connection

| File | Screen | Scroll |
|---|---|---|
| `SignIn.dc.html` | One door, three ways through | fits |
| `EmailCode.dc.html` | Six digits, one screen | fits |
| `ConnectLeague.dc.html` | Three providers, honest about each | fits |
| `EspnConnect.dc.html` | **ESPN — consent before the sheet** | scrolls |
| `ConnectFailed.dc.html` | **ESPN — failed, and what to do** | scrolls |

### Command Center

| File | Screen | Scroll |
|---|---|---|
| `CommandCenter.dc.html` | The week — scoreboard, waiver seat, ledger row | **fits** |
| `CommandQuiet.dc.html` | Quiet week, **neutral** variant | **fits** |
| `CommandQuietStraight.dc.html` | Quiet week, **straight** variant — the voice fence | **fits** |
| `CommandNoLeague.dc.html` | No league connected | fits |
| `ReportPill.dc.html` | The beta report pill in place | fits |

### Omen

| File | Screen | Scroll |
|---|---|---|
| `OmenCall.dc.html` | One call per team, per week | **fits** |
| `OmenEvidence.dc.html` | The full argument, expanded | scrolls |
| `StartSitClear.dc.html` | Nothing to change, said confidently | fits |
| `StartSitIncomplete.dc.html` | Six of nine slots — so no call at all | scrolls |

### League & waiver

| File | Screen | Scroll |
|---|---|---|
| `LeagueTable.dc.html` | The table, trade targets, waiver, activity | scrolls |
| `LeagueWaiver.dc.html` | The waiver section in full | scrolls |
| `WaiverNoMove.dc.html` | Nothing on the wire beats what you have | fits |
| `WaiverNotDetermined.dc.html` | The waiver system itself is unknown | scrolls |
| `LeagueDegraded.dc.html` | Partial provider, section by section | scrolls |
| `LeagueNoRosters.dc.html` | No rosters, so no trade read — permanently | scrolls |

### Trade

| File | Screen | Scroll |
|---|---|---|
| `TradeBuild.dc.html` | Partners, filters, three teams, execution steps | scrolls |
| `TradeRoster.dc.html` | Picking from real rosters | scrolls |
| `TradeVerdict.dc.html` | The read and the counter | scrolls |
| `TradeNeedsContext.dc.html` | Too close to call blind | scrolls |
| `TradeShare.dc.html` | Share the read, names off by default | scrolls |

### Ledger, switcher, account

| File | Screen | Scroll |
|---|---|---|
| `Ledger.dc.html` | Every call and how it went | scrolls |
| `LedgerDetail.dc.html` | One call, in full — including a loss | scrolls |
| `SwitchSheet.dc.html` | The sheet, favourites in star order | fits |
| `SwitchLoading.dc.html` | Mid-switch — nothing reused, nothing invented | fits |
| `Account.dc.html` | Identity, connections, support | scrolls |

**"Fits" is a requirement, not an observation** (D11) and it is **measured, not eyeballed**. Thirteen
artboards are declared fits and every one reports **0px overflow** in the 844px frame. If an edit
pushes content out, the edit is wrong, not the frame.

### Deliberately not carried forward

- **`CommandSwipe2`** — the Command Center carousel. Retired by the one-switcher decision; the
  matchup rail already swipes leagues, so the carousel was the same gesture twice, six pixels apart.
- **`Main`** — superseded by `CommandCenter.dc.html`.

## How the CSS works — read this before editing

Every artboard carries the **same stylesheet inline**, so opening one file in a browser renders it
with no build step, no sibling fetch, and no server. That property is the point of the `.dc.html`
convention and it is worth keeping: a relative `<link>` breaks the moment an artboard is opened from
a `data:` URL, mailed, or unzipped. That was tried here first and is why it was reverted.

The cost of that choice is thirty copies of the same CSS, which drift. So:

```bash
node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13
node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check
```

`_shared.css` is the **single source**. Editing CSS inside an artboard is the mistake `--check`
exists to catch. Run the sync after touching `_shared.css`; run `--check` before you commit.

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

