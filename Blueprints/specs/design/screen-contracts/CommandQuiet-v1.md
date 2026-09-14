# Screen contract - CommandQuiet

Compiled from `design/native-visual-lock-2026-09-13/CommandQuiet.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `1b071a4e4a3f`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Command — quiet, neutral |
| Family | Command Center |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/dashboard/quiet-week |
| API contract | quiet-week.v1 |
| Governing rule | Voice fence; neutral copy allowed only when all positive quiet evidence is present |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values below are source evidence, not permission for local raw colors.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2, h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching component, implement the named component first; do not invent a local primitive.

## Experience contract

Command is the general manager view, not the head coach headset. It should feel like stepping back from the field to see the whole organization for this week: matchup state, lineup pressure, waiver opportunity, trade openings, league movement, and recent evidence. Each card is a light brief that helps the user decide where to go next.

Build acceptance:

- Show breadth before depth: one scannable read per active domain, then route to the destination that owns the detail.
- Keep the tone current and calm. Command can say what matters now, but it does not litigate every calculation.
- Do not duplicate Omen's single-move authority. If a card points at Omen, it says why the user should inspect it; it does not become the Omen result.
- Do not hide unavailable domains. If waivers, league activity, trades, or ledger evidence are unavailable, Command names the gap and keeps the rest of the desk useful.
- The screen passes only if a user can answer, in under ten seconds: what is happening this week, what area needs attention, and where to tap for depth.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · SLOPS SALOON`
- `▾`
- `+`
- `WEEK 8 · BYE`
- `Command`
- `JD`
- `Nothing worth waking you for.`
- `You're on bye, your roster is healthy, and nobody on your waiver wire is worth a claim. Genuinely — go outside.`
- `CONFIDENT`
- `LOW RISK`
- `NEXT READ · TUESDAY 3:00 AM WAIVERS`
- `3rd of 12, two games clear of the cut. Trade deadline in three weeks.`
- `Omen`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · SLOPS SALOON; ▾; + | LeagueSwitcherBar | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E011 | ▾ | Text | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E012 | + | Text | Open ConnectLeague to add another provider connection. |
| E017 | JD | AvatarButton | Open Account. |
| E036 | Command | TabNavItem | Open CommandCenter for the active league. |
| E039 | Omen | TabNavItem | Open OmenCall for the active league. |
| E042 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E045 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `You're on bye, your roster is healthy, and nobody on your waiver wire is worth a claim. Genuinely — go outside.`
- `CONFIDENT`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E019 | canvas-custom-symbol-E019 | .screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) | 167,154 56x56 |
| E020 | canvas-custom-symbol-E020 | .screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 183,162 23x40 |
| E021 | canvas-custom-symbol-E021 | .screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(1) | 194,173 2x17 |
| E022 | canvas-custom-symbol-E022 | .screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(2) | 192,176 6x1 |
| E023 | canvas-custom-symbol-E023 | .screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(3) | 192,180 6x1 |
| E024 | canvas-custom-symbol-E024 | .screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(4) | 192,183 6x1 |
| E037 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E038 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E040 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E041 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E043 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E044 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E046 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E047 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 47. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x781 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x23 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 26x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 323,10 51x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,23 390x49 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | TTO | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,32 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,31 282x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | name | text-primary | transparent | text-primary | 54,31 282x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | ESPN · Slops Saloon | Text | micro | text-tertiary | transparent | text-tertiary | 54,49 282x12 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-espn-chip | text-tertiary | 54,51 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 346,39 5x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,37 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,72 390x50 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 101x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 8 · Bye | Text | micro | accent | transparent | accent | 16,84 101x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Command | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 101x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,122 390x256 | pad 32/24/0/24; margin 0/0/0/0; gap 12  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 167,154 56x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 183,162 23x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 194,173 2x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(2)` |  | Icon | body | text-primary | transparent | text-primary | 192,176 6x1 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(3)` |  | Icon | body | text-primary | transparent | text-primary | 192,180 6x1 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(4)` |  | Icon | body | text-primary | transparent | text-primary | 192,183 6x1 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > h3.qh:nth-of-type(1)` | Nothing worth waking you for. | Text.heading | h2 | text-primary | transparent | text-primary | 63,222 265x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > p.qp:nth-of-type(1)` | You're on bye, your roster is healthy, and nobody on your waiver wire is worth a claim. Genuinely — go outside. | Text | name | text-secondary | transparent | text-secondary | 72,256 246x59 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 107,329 176x12 | pad 0/0/0/0; margin 2/0/0/0; gap 14  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > div.meta:nth-of-type(1) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 107,329 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > div.meta:nth-of-type(1) > span.rk.lo:nth-of-type(2)` | Low risk | Text | label | text-tertiary | transparent | text-tertiary | 217,329 66x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.quiet:nth-of-type(4) > p.qmeta:nth-of-type(2)` | Next read · Tuesday 3:00 AM waivers | Text | micro | text-tertiary | transparent | text-tertiary | 56,355 277x12 | pad 0/0/0/0; margin 2/0/10/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,377 390x345 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,722 358x45 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(6) > span.tx:nth-of-type(1)` | 3rd of 12, two games clear of the cut. Trade deadline in three weeks. | Text | body-sm | text-secondary | transparent | text-secondary | 16,733 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,767 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1)` | Command | TabNavItem | micro | accent | transparent | accent | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E037 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E040 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E043 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E046 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 47 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through quiet-week.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
