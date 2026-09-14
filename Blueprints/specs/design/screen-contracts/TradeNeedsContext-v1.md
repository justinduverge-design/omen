# Screen contract - TradeNeedsContext

Compiled from `design/native-visual-lock-2026-09-13/TradeNeedsContext.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `cd072c285b6e`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Trade — needs context |
| Family | Trade |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | POST /api/trade/compare |
| API contract | trade-compare.v2 close_needs_context / insufficient_data |
| Governing rule | Both states are live and verified |

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
- `TWO TEAMS`
- `Not yet`
- `JD`
- `YOU SEND`
- `Out`
- `Jonathan Taylor`
- `RB · IND`
- `RB 8`
- `THEY SEND`
- `In`
- `Ja’Marr Chase`
- `WR · CIN`
- `WR 3`
- `Too close to call blind`
- `COIN FLIP`
- `On rankings alone these two are within a point of each other. A verdict here would be a coin flip dressed as advice.`
- `HAVE`
- `Both players’ season projections. LIVE`
- `MISSING`
- `Your roster — so Omen cannot see which position you are actually short at. UNAVAILABLE`
- `Their roster — so it cannot see whether they need a back. UNAVAILABLE`
- `Connect the league and this becomes answerable in one call. Need decides most trades, and need is the thing Omen is missing.`
- `Connect this league`
- `Show the ranking comparison anyway`
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
| E053 | Connect this league | Button.primary | Update only the named local UI state; no hidden network side effect. |
| E054 | Show the ranking comparison anyway | Button.secondary | Update only the named local UI state; no hidden network side effect. |
| E057 | Command | TabNavItem | Open CommandCenter for the active league. |
| E060 | Omen | TabNavItem | Open OmenCall for the active league. |
| E063 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E066 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Out`
- `COIN FLIP`
- `On rankings alone these two are within a point of each other. A verdict here would be a coin flip dressed as advice.`
- `Both players’ season projections. LIVE`
- `Your roster — so Omen cannot see which position you are actually short at. UNAVAILABLE`
- `Their roster — so it cannot see whether they need a back. UNAVAILABLE`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E058 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E059 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E061 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E062 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E064 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E065 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E067 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E068 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 68. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x780 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,24 390x50 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | TTO | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,33 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,32 281x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | name | text-primary | transparent | text-primary | 54,32 281x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | ESPN · Slops Saloon | Text | micro | text-tertiary | transparent | text-tertiary | 54,50 281x13 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-espn-chip | text-tertiary | 54,53 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 345,40 5x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,38 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,74 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 80x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Two teams | Text | micro | accent | transparent | accent | 16,86 80x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Not yet | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 80x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,137 358x154 | pad 0/0/0/0; margin 12/16/0/16; gap 6  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legh:nth-of-type(1)` | You send | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,137 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,156 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.ar.out:nth-of-type(1)` | Out | Text | micro | text-tertiary | transparent | text-tertiary | 26,177 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,166 250x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Jonathan Taylor | Text | body-sm | text-primary | transparent | text-primary | 58,166 250x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | RB · IND | Text | micro | text-tertiary | transparent | text-tertiary | 58,187 38x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.rk:nth-of-type(3)` | RB 8 | Text | label | text-tertiary | transparent | text-tertiary | 318,173 46x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legh:nth-of-type(3)` | They send | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,217 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,236 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.ar:nth-of-type(1)` | In | Text | micro | accent | transparent | accent | 26,257 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,246 247x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Ja’Marr Chase | Text | body-sm | text-primary | transparent | text-primary | 58,246 247x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | WR · CIN | Text | micro | text-tertiary | transparent | text-tertiary | 58,267 41x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.rk:nth-of-type(3)` | WR 3 | Text | label | text-tertiary | transparent | text-tertiary | 315,253 49x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5)` |  | NativeStack | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,305 358x239 | pad 14/14/14/14; margin 14/16/0/16; gap 8  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.verdh:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,320 330x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.verdh:nth-of-type(1) > b:nth-of-type(1)` | Too close to call blind | Text | h3 | text-primary | transparent | text-primary | 30,320 172x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.verdh:nth-of-type(1) > span.band.b-lean:nth-of-type(1)` | Coin flip | ConfidenceBand | micro | text-secondary | transparent | text-secondary | 276,325 84x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > p.rsn:nth-of-type(1)` | On rankings alone these two are within a point of each other. A verdict here would be a coin flip dressed as advice. | Text | body-sm | text-secondary | transparent | text-secondary | 30,351 330x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2)` |  | EvidenceDisclosure | body | text-primary | transparent | text-primary-overlay | 30,394 330x136 | pad 10/0/0/0; margin 0/0/0/0; gap 8  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(1)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,405 330x20 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(1) > span.k:nth-of-type(1)` | Have | Text | micro | text-tertiary | transparent | text-tertiary | 30,405 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(1) > span.v:nth-of-type(2)` | Both players’ season projections. | Text | body-sm | text-secondary | transparent | text-secondary | 98,405 262x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(1) > span.v:nth-of-type(2) > span.ds.live:nth-of-type(1)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 284,406 57x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(2)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,433 330x53 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(2) > span.k:nth-of-type(1)` | Missing | Text | micro | text-tertiary | transparent | text-tertiary | 30,433 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(2) > span.v:nth-of-type(2)` | Your roster — so Omen cannot see which position you are actually short at. | Text | body-sm | text-secondary | transparent | text-secondary | 98,433 262x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(2) > span.v:nth-of-type(2) > span.ds.gone:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 98,467 104x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(3)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,494 330x36 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(3) > span.k:nth-of-type(1)` | Missing | Text | micro | text-tertiary | transparent | text-tertiary | 30,494 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(3) > span.v:nth-of-type(2)` | Their roster — so it cannot see whether they need a back. | Text | body-sm | text-secondary | transparent | text-secondary | 98,494 262x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(2) > div.evr:nth-of-type(3) > span.v:nth-of-type(2) > span.ds.gone:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 171,511 104x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(6)` | Need decides most trades, and need is the thing Omen is missing. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,556 358x83 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(6) > b:nth-of-type(1)` | Connect the league and this becomes answerable in one call. | Text | name | text-primary | transparent | text-primary | 28,569 322x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(7)` | Connect this league | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,650 358x42 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(8)` | Show the ranking comparison anyway | Button.secondary | card-lead | text-secondary | transparent | border | 16,700 358x44 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,744 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3)` | Trade | TabNavItem | micro | accent | transparent | accent | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 68 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through trade-compare.v2 close_needs_context / insufficient_data; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
