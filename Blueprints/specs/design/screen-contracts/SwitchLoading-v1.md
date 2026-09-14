# Screen contract - SwitchLoading

Compiled from `design/native-visual-lock-2026-09-13/SwitchLoading.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `64b9908b140a`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Switcher — mid-switch |
| Family | Ledger, switcher, account |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | POST /api/leagues/active |
| API contract | active-league.v1 refresh list |
| Governing rule | Discard previous team numbers while loading; never reuse stale values |

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
- `DSI`
- `Davante’s Inferno`
- `ESPN · EB FOOTBALL`
- `▾`
- `+`
- `WEEK 7 · SUNDAY`
- `Command`
- `JD`
- `ESPN`
- `LOADING`
- `WAIVER WATCH`
- `Reading Davante’s Inferno from ESPN. The previous team’s numbers are gone, not reused.`
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
| E057 | Command | TabNavItem | Open CommandCenter for the active league. |
| E060 | Omen | TabNavItem | Open OmenCall for the active league. |
| E063 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E066 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `LOADING`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E058 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E059 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E061 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E062 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E064 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E065 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E067 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E068 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 68. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x780 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,24 390x50 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | DSI | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,33 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,32 281x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Davante’s Inferno | Text | name | text-primary | transparent | text-primary | 54,32 281x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | ESPN · EB Football | Text | micro | text-tertiary | transparent | text-tertiary | 54,50 281x13 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-espn-chip | text-tertiary | 54,53 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 345,40 5x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,38 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,74 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 117x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Sunday | Text | micro | accent | transparent | accent | 16,86 117x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Command | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 117x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4)` |  | MatchupScoreboard | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,137 358x170 | pad 10/14/10/14; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,148 330x13 | pad 0/0/0/0; margin 0/0/10/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.prov:nth-of-type(1)` | ESPN | PlatformBadge | micro | text-secondary | transparent | text-secondary | 30,148 48x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-espn-chip | text-secondary | 30,150 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.live:nth-of-type(2)` | Loading | LiveStatusMark | micro | text-tertiary | transparent | text-tertiary | 290,148 70x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,171 330x45 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.crest:nth-of-type(1)` |  | Text | micro | text-secondary | surface-3 | text-secondary | 30,178 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bn:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 70,171 228x45 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bn:nth-of-type(2) > b:nth-of-type(1)` |  | Text | body-sm | text-primary | transparent | text-primary | 70,171 228x24 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bn:nth-of-type(2) > b:nth-of-type(1) > span.skel.ln:nth-of-type(1)` |  | Text | micro | text-tertiary | canvas-gradient(surface-2->surface-1) | text-tertiary | 70,177 130x12 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bn:nth-of-type(2) > span:nth-of-type(1)` |  | Text | micro | text-tertiary | transparent | text-tertiary | 70,201 228x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bn:nth-of-type(2) > span:nth-of-type(1) > span.skel.ln:nth-of-type(1)` |  | Text | micro | text-tertiary | canvas-gradient(surface-2->surface-1) | text-tertiary | 70,201 60x9 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bs:nth-of-type(3)` |  | Text | score-trail | text-tertiary | transparent | text-tertiary | 308,176 52x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(2) > span.bs:nth-of-type(3) > span.skel.ln:nth-of-type(1)` |  | Text | screen-title | text-tertiary | canvas-gradient(surface-2->surface-1) | text-tertiary | 308,182 52x22 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,222 330x24 | pad 0/0/0/0; margin 6/0/6/0; gap 10  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.ln:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 44,222 2x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.mm:nth-of-type(2)` |  | Text | micro | text-tertiary | transparent | text-tertiary | 70,222 290x24 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.mm:nth-of-type(2) > span.skel.ln:nth-of-type(1)` |  | Text | micro | text-tertiary | border-subtle | text-tertiary | 70,228 150x12 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,252 330x45 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.crest:nth-of-type(1)` |  | Text | micro | text-secondary | surface-3 | text-secondary | 30,259 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 70,252 228x45 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > b:nth-of-type(1)` |  | Text | body-sm | text-primary | transparent | text-primary | 70,252 228x24 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > b:nth-of-type(1) > span.skel.ln:nth-of-type(1)` |  | Text | micro | text-tertiary | canvas-gradient(surface-2->surface-1) | text-tertiary | 70,258 110x12 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > span:nth-of-type(1)` |  | Text | micro | text-tertiary | transparent | text-tertiary | 70,282 228x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > span:nth-of-type(1) > span.skel.ln:nth-of-type(1)` |  | Text | micro | text-tertiary | canvas-gradient(surface-2->surface-1) | text-tertiary | 70,282 44x9 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bs:nth-of-type(3)` |  | Text | score-trail | text-tertiary | transparent | text-tertiary | 308,257 52x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bs:nth-of-type(3) > span.skel.ln:nth-of-type(1)` |  | Text | screen-title | text-tertiary | canvas-gradient(surface-2->surface-1) | text-tertiary | 308,263 52x22 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,319 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | Waiver watch | Text | micro | text-tertiary | transparent | text-tertiary | 16,319 104x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,338 358x113 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > span.skel.ln:nth-of-type(1)` |  | Text | body | text-primary | canvas-gradient(surface-2->surface-1) | text-primary | 28,357 234x12 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E049 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > span.skel.ln:nth-of-type(2)` |  | Text | body | text-primary | canvas-gradient(surface-2->surface-1) | text-primary | 28,389 301x12 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E050 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > span.skel.ln:nth-of-type(3)` |  | Text | body | text-primary | canvas-gradient(surface-2->surface-1) | text-primary | 28,421 150x12 | pad 0/0/0/0; margin 6/0/6/0; gap 0  |
|  E051 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,451 390x271 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,721 358x45 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E053 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(8) > span.tx:nth-of-type(1)` | Reading Davante’s Inferno from ESPN. | Text | body-sm | text-secondary | transparent | text-secondary | 16,732 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(8) > span.tx:nth-of-type(1) > b:nth-of-type(1)` | The previous team’s numbers are gone, not reused. | Text | body-sm | text-primary | transparent | text-primary | 16,732 329x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,766 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1)` | Command | TabNavItem | micro | accent | transparent | accent | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 68 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through active-league.v1 refresh list; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
