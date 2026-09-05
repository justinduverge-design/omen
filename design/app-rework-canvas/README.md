# Omen app rework — canvas source

**These files are the screen artifact of record** for the native rework, per
`Direction/facts-of-record.md` #20 (an approved Claude Design canvas is a valid screen artifact
alongside Figma; Figma stays authoritative for vector assets).

**Published canvas:** https://claude.ai/code/artifact/7cab7309-b9f3-40cf-b570-1878d41450f7

## Why these live here

They were authored in a session scratchpad, which is temporary. The published artifact holds a copy
and can be extracted back, but a screen artifact of record that lives only in a temp directory and a
hosted page is not durable. Anything an engineer builds from belongs in the repo, versioned, next to
the code it describes.

## What each file is

Every `.dc.html` is one artboard — a single 390×844 phone screen, plain HTML with inline styles.
Open one in a browser and it renders on its own; no build step, no dependencies. `canvas.json` is the
layout: positions, page grouping, and the sticky notes carrying each screen's decisions.

| File | Screen |
|---|---|
| `SignInB.dc.html` | 1 · Sign in — first screen, absorbs the old Welcome, Demo lives here |
| `EmailCode.dc.html` | 2 · Email six-digit code (the only sign-in path needing a screen) |
| `ConnectLeague.dc.html` | 3 · Connect your league |
| `TradeBuild.dc.html` | Trade — build from rosters |
| `TradeVerdict.dc.html` | Trade — the read, counter, and private advice |
| `TradeShare.dc.html` | Trade — share card |
| `Main.dc.html` | Command Center — Small Council, widget 1 |
| `CommandSwipe2.dc.html` | Command Center — swiped to widget 2 |
| `OmenBrief.dc.html` | Omen — this week's call, confidence bands |
| `LeagueWaiver.dc.html` | League — matchup, standings, ranked waiver |
| `Ledger.dc.html` | The Ledger |
| `CommandQuiet.dc.html` | Command Center — quiet week |
| `CommandNoLeague.dc.html` | Command Center — signed in, no league |
| `EspnConnect.dc.html` | ESPN — consent before the sign-in sheet |
| `ReportPill.dc.html` | Beta report pill and sheet |
| `SwitchSheet.dc.html` | Switch — team sheet, provider filter, favourite stars |
| `SwitchLoading.dc.html` | Switch — mid-switch, honest status lines |

## Built from real tokens, not from memory

Colors are the live `OmenColor` hexes, spacing is the 4/8/12/16/24 scale, cards are 12px radius with
1px borders, buttons 8px, touch targets ≥44pt. Type is **Alegreya Sans and Alegreya only** — no mono
anywhere, per facts-of-record #21 — with tabular figures for numerals. `SignInB.dc.html` inlines the
real `logos/svg/omen-lockup-stacked.svg`.

## Decisions these screens implement

`Blueprints/specs/mobile/omen-app-pages-workshop-v1.md` (nine parts) and
`omen-trade-page-workshop-v1.md`. The sticky notes in `canvas.json` carry the per-screen rationale
and the open questions.

## Editing

Edit the `.dc.html` files here, then re-seed and republish the canvas to the URL above. Do not treat
the published page as the source — this directory is the source.
