# Screen contract - SwitchSheet

Compiled from `design/native-visual-lock-2026-09-13/SwitchSheet.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `b742ca5724c1`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Switcher — the sheet |
| Family | Ledger, switcher, account |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/leagues + POST /api/leagues/active |
| API contract | league-directory.v1 + active-league.v1 |
| Governing rule | orderPlatformsByFollowCount is the only platform ordering authority |

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
- `THREE TEAMS`
- `Build a deal`
- `JD`
- `TYPE A TRADE`
- `BUILD A TRADE`
- `DSI`
- `Davante's`
- `NEEDS RB`
- `CHB`
- `Chubb Rock`
- `NEEDS WR`
- `ALL`
- `ESPN`
- `YAHOO`
- `SLEEPER`
- `FAVOURITES`
- `✓`
- `Davante's Inferno`
- `ESPN · EB Football`
- `ALL TEAMS`
- `PAK`
- `Puk Around & Find Out`
- `ESPN · Fantasy Madness`
- `DAR`
- `League 884411`
- `unnamed team`
- `Command`
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
| E019 | Type a trade | Text | Switch the local input segment; do not change the selected league or route contract. |
| E020 | Build a trade | Text | Switch the local input segment; do not change the selected league or route contract. |
| E022 |  | PartnerChip | Select this trade partner; comparison remains capped to two teams by trade-capabilities.v1. |
| E026 |  | PartnerChip | Select this trade partner; comparison remains capped to two teams by trade-capabilities.v1. |
| E034 | All | Text | Switch the local input segment; do not change the selected league or route contract. |
| E035 | ESPN | Text | Switch the local input segment; do not change the selected league or route contract. |
| E036 | Yahoo | Text | Switch the local input segment; do not change the selected league or route contract. |
| E037 | Sleeper | Text | Switch the local input segment; do not change the selected league or route contract. |
| E040 |  | LeagueSwitcherRow | POST /api/leagues/active with this league, then render SwitchLoading until the refresh list completes. |
| E049 |  | LeagueSwitcherRow | POST /api/leagues/active with this league, then render SwitchLoading until the refresh list completes. |
| E059 |  | LeagueSwitcherRow | POST /api/leagues/active with this league, then render SwitchLoading until the refresh list completes. |
| E068 |  | LeagueSwitcherRow | POST /api/leagues/active with this league, then render SwitchLoading until the refresh list completes. |
| E078 | Command | TabNavItem | Open CommandCenter for the active league. |
| E081 | Omen | TabNavItem | Open OmenCall for the active league. |
| E084 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E087 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Puk Around & Find Out`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E043 | favorite.star.fill | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.star:nth-of-type(2) > svg:nth-of-type(1) | 60,532 14x14 |
| E044 | favorite.star.fill | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 62,534 10x10 |
| E048 | checkmark | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.chk:nth-of-type(4) | ✓ |
| E052 | favorite.star | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.star:nth-of-type(2) > svg:nth-of-type(1) | 60,589 14x14 |
| E053 | favorite.star | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 62,591 10x10 |
| E062 | favorite.star | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.star:nth-of-type(2) > svg:nth-of-type(1) | 60,671 14x14 |
| E063 | favorite.star | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 62,673 10x10 |
| E071 | favorite.star | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.star:nth-of-type(2) > svg:nth-of-type(1) | 60,728 14x14 |
| E072 | favorite.star | .screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 62,730 10x10 |
| E079 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E080 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E082 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E083 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E085 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E086 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E088 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E089 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 89. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x780 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,24 390x50 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | TTO | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,33 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,32 281x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | name | text-primary | transparent | text-primary | 54,32 281x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | ESPN · Slops Saloon | Text | micro | text-tertiary | transparent | text-tertiary | 54,50 281x13 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-espn-chip | text-tertiary | 54,53 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 345,40 5x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,38 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,74 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 112x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Three teams | Text | micro | accent | transparent | accent | 16,86 112x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Build a deal | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 112x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.tabs2:nth-of-type(4)` |  | SegmentedTabs | body | text-primary | transparent | text-primary | 16,137 358x24 | pad 0/0/0/0; margin 12/16/0/16; gap 16  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.tabs2:nth-of-type(4) > span:nth-of-type(1)` | Type a trade | Text | label | text-tertiary | transparent | text-tertiary | 16,137 94x24 | pad 0/0/8/0; margin 0/0/-1->0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.tabs2:nth-of-type(4) > span.on:nth-of-type(2)` | Build a trade | Text | label | text-primary | transparent | text-primary | 126,137 100x24 | pad 0/0/8/0; margin 0/0/-1->0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,161 390x91 | pad 12/16/2/16; margin 0/0/0/0; gap 8  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1)` |  | PartnerChip | body | text-primary | transparent | text-primary | 16,173 62x77 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1) > span.cr:nth-of-type(1)` | DSI | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 25,173 44x44 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1) > span.n:nth-of-type(2)` | Davante's | Text | micro | text-primary | transparent | text-primary | 24,221 46x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1) > span.need:nth-of-type(3)` | Needs RB | Text | micro | accent | transparent | accent | 18,237 57x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(2)` |  | PartnerChip | body | text-primary | transparent | text-primary | 86,173 62x77 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(2) > span.cr:nth-of-type(1)` | CHB | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 95,173 44x44 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(2) > span.n:nth-of-type(2)` | Chubb Rock | Text | micro | text-tertiary | transparent | text-tertiary | 88,221 58x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(2) > span.need:nth-of-type(3)` | Needs WR | Text | micro | accent | transparent | accent | 87,237 61x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.scrim:nth-of-type(6)` |  | ModalScrim | body | text-primary | modal-scrim | text-primary | 0,0 390x780 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7)` |  | ModalSheet | body | text-primary | surface-1 | accent-overlay | 0,422 390x358 | pad 8/0/16/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.grab:nth-of-type(1)` |  | SheetGrabber | body | text-primary | surface-3 | text-primary | 177,431 36x4 | pad 0/0/0/0; margin 0/177->96/12/177->96; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.seg:nth-of-type(2)` |  | SegmentedControl | body | text-primary | bg | text-primary | 16,447 358x29 | pad 2/2/2/2; margin 0/16/10/16; gap 2  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.seg:nth-of-type(2) > span:nth-of-type(1)` | All | Text | micro | text-tertiary | transparent | text-tertiary | 18,449 87x25 | pad 6/0/6/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.seg:nth-of-type(2) > span.on:nth-of-type(2)` | ESPN | Text | micro | text-primary | surface-3 | text-primary | 107,449 87x25 | pad 6/0/6/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.seg:nth-of-type(2) > span:nth-of-type(3)` | Yahoo | Text | micro | text-tertiary | transparent | text-tertiary | 196,449 87x25 | pad 6/0/6/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.seg:nth-of-type(2) > span:nth-of-type(4)` | Sleeper | Text | micro | text-tertiary | transparent | text-tertiary | 285,449 87x25 | pad 6/0/6/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,486 390x278 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.divid:nth-of-type(1)` | Favourites | NativeStack | micro | text-tertiary | transparent | text-tertiary | 0,486 390x25 | pad 8/16/4/16; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2)` |  | LeagueSwitcherRow | body | text-primary | transparent | text-primary | 0,511 390x57 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.cr:nth-of-type(1)` | TTO | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,524 31x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.star:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 57,532 20x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.star:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 60,532 14x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 62,534 10x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.nm:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 87,521 261x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.nm:nth-of-type(3) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | name | text-primary | transparent | text-primary | 87,521 261x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.nm:nth-of-type(3) > span:nth-of-type(1)` | ESPN | Text | micro | text-tertiary | transparent | text-tertiary | 87,543 27x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row.active:nth-of-type(2) > span.chk:nth-of-type(4)` | ✓ | Text | name | accent | transparent | accent | 358,531 16x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3)` |  | LeagueSwitcherRow | body | text-primary | transparent | text-primary | 0,568 390x57 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E050 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.cr:nth-of-type(1)` | DSI | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 16,581 31x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.star:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 57,589 20x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.star:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 60,589 14x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 62,591 10x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.nm:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 87,578 261x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.nm:nth-of-type(3) > b:nth-of-type(1)` | Davante's Inferno | Text | name | text-primary | transparent | text-primary | 87,578 261x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.nm:nth-of-type(3) > span:nth-of-type(1)` | ESPN · EB Football | Text | micro | text-tertiary | transparent | text-tertiary | 87,600 86x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(3) > span.chk:nth-of-type(4)` |  | Text | name | accent | transparent | accent | 358,596 16x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.divid:nth-of-type(4)` | All teams | NativeStack | micro | text-tertiary | transparent | text-tertiary | 0,625 390x25 | pad 8/16/4/16; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5)` |  | LeagueSwitcherRow | body | text-primary | transparent | text-primary | 0,650 390x57 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E060 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.cr:nth-of-type(1)` | PAK | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 16,663 31x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.star:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 57,671 20x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.star:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 60,671 14x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 62,673 10x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.nm:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 87,660 261x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.nm:nth-of-type(3) > b:nth-of-type(1)` | Puk Around & Find Out | Text | name | text-primary | transparent | text-primary | 87,660 261x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.nm:nth-of-type(3) > span:nth-of-type(1)` | ESPN · Fantasy Madness | Text | micro | text-tertiary | transparent | text-tertiary | 87,682 114x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(5) > span.chk:nth-of-type(4)` |  | Text | name | accent | transparent | accent | 358,678 16x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6)` |  | LeagueSwitcherRow | body | text-primary | transparent | text-primary | 0,707 390x57 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E069 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.cr:nth-of-type(1)` | DAR | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 16,720 31x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.star:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 57,728 20x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.star:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 60,728 14x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.star:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 62,730 10x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.nm:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 87,717 261x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.nm:nth-of-type(3) > b:nth-of-type(1)` | League 884411 | Text | name | text-primary | transparent | text-primary | 87,717 261x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E075 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.nm:nth-of-type(3) > span:nth-of-type(1)` | unnamed team | Text | micro | text-tertiary | transparent | text-tertiary | 87,739 70x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E076 | `.screen > div.sbody:nth-of-type(1) > div.sheet:nth-of-type(7) > div.rows:nth-of-type(3) > div.row:nth-of-type(6) > span.chk:nth-of-type(4)` |  | Text | name | accent | transparent | accent | 358,735 16x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E077 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E078 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E079 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E080 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E081 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E082 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E083 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E084 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3)` | Trade | TabNavItem | micro | accent | transparent | accent | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E085 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E086 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E087 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E088 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E089 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 89 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through league-directory.v1 + active-league.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
