# Screen contract - ReportPill

Compiled from `design/native-visual-lock-2026-09-13/ReportPill.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `80c4f494def7`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Command — report pill |
| Family | Command Center |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/beta/reports/schema + POST /api/beta/reports |
| API contract | beta-report.v1 |
| Governing rule | W1-B metadata-only route built; screenshots_supported=false until native capture carriers land |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values below are source evidence, not permission for local raw colors.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2, h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching component, implement the named component first; do not invent a local primitive.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · SLOPS SALOON`
- `▾`
- `+`
- `WEEK 7 · SUNDAY`
- `Command`
- `LINEUPS LOCK`
- `1:00 PM`
- `ESPN`
- `LIVE · Q2`
- `5–2 · YOU`
- `64.8`
- `119.6 – 114.2`
- `PROJECTED · 5.4 AHEAD`
- `GMR`
- `Gibbs me some Rice`
- `6–1`
- `51.2`
- `!`
- `Something look wrong?`
- `Sends this screen, your app version and the provider — never your league data.`
- `REPORT`
- `Omen`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · SLOPS SALOON; ▾; + | LeagueSwitcherBar | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E011 | ▾ | Text | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E012 | + | Text | Open ConnectLeague to add another provider connection. |
| E047 | Report | Text | Open report composer; GET /api/beta/reports/schema first, then POST metadata-only report. |
| E050 | Command | TabNavItem | Open CommandCenter for the active league. |
| E053 | Omen | TabNavItem | Open OmenCall for the active league. |
| E056 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E059 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `LIVE · Q2`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E043 | alert-mark | .screen > div.sbody:nth-of-type(1) > div:nth-of-type(6) > span:nth-of-type(1) | ! |
| E051 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E052 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E054 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E055 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E057 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E058 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E060 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E061 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 61. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 123x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Sunday | Text | micro | accent | transparent | accent | 16,84 123x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Command | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 123x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > p.rt:nth-of-type(1)` | Lineups lock 1:00 PM | Text | micro | text-tertiary | transparent | text-tertiary | 282,94 92x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > p.rt:nth-of-type(1) > br:nth-of-type(1)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 374,95 0x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4)` |  | MatchupScoreboard | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,134 358x143 | pad 10/14/10/14; margin 12/16/0/16; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,145 330x12 | pad 0/0/0/0; margin 0/0/10/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.prov:nth-of-type(1)` | ESPN | PlatformBadge | micro | text-secondary | transparent | text-secondary | 30,145 50x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-espn-chip | text-secondary | 30,146 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.live:nth-of-type(2)` | Live · Q2 | LiveStatusMark | micro | text-primary | transparent | text-primary | 286,145 74x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,167 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.crest:nth-of-type(1)` | TTO | Text | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 30,169 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bn:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 70,168 230x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bn:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | body-sm | text-primary | transparent | text-primary | 70,168 230x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bn:nth-of-type(2) > span:nth-of-type(1)` | 5–2 · you | Text | micro | text-tertiary | transparent | text-tertiary | 70,187 60x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bs.lead:nth-of-type(3)` | 64.8 | Text | score-lead | text-primary | transparent | text-primary | 310,167 50x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,207 330x22 | pad 0/0/0/0; margin 6/0/6/0; gap 10  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.ln:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 44,207 2x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.ln:nth-of-type(1) > i:nth-of-type(1)` |  | Text | body | text-primary | accent | text-primary | 44,229 2x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.mm:nth-of-type(2)` | Projected · 5.4 ahead | Text | micro | text-tertiary | transparent | text-tertiary | 70,207 290x22 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.mm:nth-of-type(2) > b:nth-of-type(1)` | 119.6 – 114.2 | Text | micro | text-secondary | transparent | text-secondary | 70,212 79x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,235 330x32 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.crest:nth-of-type(1)` | GMR | Text | micro | text-secondary | surface-3 | text-secondary | 30,236 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 70,235 242x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > b:nth-of-type(1)` | Gibbs me some Rice | Text | body-sm | text-primary | transparent | text-primary | 70,235 242x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > span:nth-of-type(1)` | 6–1 | Text | micro | text-tertiary | transparent | text-tertiary | 70,254 22x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bs:nth-of-type(3)` | 51.2 | Text | score-trail | text-tertiary | transparent | text-tertiary | 322,242 38x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,277 390x490 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(6)` |  | NativeStack | body | text-primary | surface-2 | text-primary | 16,632 358x73 | pad 12/12/12/12; margin 0/0/0/0; gap 10  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(6) > span:nth-of-type(1)` | ! | Text | body | accent | accent-muted | accent | 28,654 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(6) > span:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 68,644 230x49 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(6) > span:nth-of-type(2) > b:nth-of-type(1)` | Something look wrong? | Text | name | text-primary | transparent | text-primary | 68,644 230x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(6) > span:nth-of-type(2) > span:nth-of-type(1)` | Sends this screen, your app version and the provider — never your league data. | Text | label | text-tertiary | transparent | text-tertiary | 68,662 230x31 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(6) > span:nth-of-type(3)` | Report | Text | label | accent | transparent | accent | 308,662 54x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,767 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1)` | Command | TabNavItem | micro | accent | transparent | accent | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E051 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E054 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 61 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through beta-report.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
