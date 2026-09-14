# Screen contract - TradeShare

Compiled from `design/native-visual-lock-2026-09-13/TradeShare.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `caaf60817fa7`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Trade — share |
| Family | Trade |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | POST /api/trade/share |
| API contract | trade-share.v1 |
| Governing rule | 30-day hash, no auth, no provider data, names off by default |

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
- `SHARE`
- `Send the read`
- `JD`
- `OMEN · WEEK 7`
- `Taylor for Chase`
- `CONFIDENT`
- `MEDIUM RISK`
- `Two deep at back, one short at receiver. The need decides it, not the ranking.`
- `OMEN · SLOPSSALOON.COM`
- `WHAT GOES IN THE CARD`
- `The verdict and the band`
- `TAKE IT · CONFIDENT`
- `ON`
- `The one-line reason`
- `NO EVIDENCE ROWS`
- `Your team name`
- `TITANS OF SLOPSILONIA`
- `OFF`
- `League name`
- `SLOPS SALOON FF SHOWDOWN`
- `Names are off by default. A shared card should be arguable on its own merits without telling a group chat which league you are in.`
- `Share the card`
- `Copy as text instead`
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
| E052 | Share the card | Button.primary | Update only the named local UI state; no hidden network side effect. |
| E053 | Copy as text instead | Button.secondary | Copy the share text generated from trade-share.v1 without provider data. |
| E056 | Command | TabNavItem | Open CommandCenter for the active league. |
| E059 | Omen | TabNavItem | Open OmenCall for the active league. |
| E062 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E065 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `CONFIDENT`
- `TAKE IT · CONFIDENT`
- `Names are off by default. A shared card should be arguable on its own merits without telling a group chat which league you are in.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E057 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E058 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E060 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E061 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E063 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E064 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E066 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E067 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 67. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 140x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Share | Text | micro | accent | transparent | accent | 16,86 140x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Send the read | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 140x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4)` |  | Card | body | text-primary | surface-1 | accent-overlay | 16,139 358x191 | pad 12/12/12/12; margin 14/16/0/16; gap 12  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,152 334x13 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.meta:nth-of-type(1) > span.ctype:nth-of-type(1)` | Omen · Week 7 | Text | micro | text-tertiary | transparent | text-tertiary | 28,152 102x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > p.lead:nth-of-type(1)` | Taylor for Chase | Text | h3 | text-primary | transparent | text-primary | 28,177 334x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.meta:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,211 334x20 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.meta:nth-of-type(2) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 28,215 94x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.meta:nth-of-type(2) > span.rk.med:nth-of-type(2)` | Medium risk | Text | label | text-primary | risk-medium | text-primary | 136,211 106x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > p.rsn:nth-of-type(2)` | Two deep at back, one short at receiver. The need decides it, not the ranking. | Text | body-sm | text-secondary | transparent | text-secondary | 28,243 334x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.oneline:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | border-subtle | 28,291 334x26 | pad 10/0/0/0; margin 0/0/0/0; gap 10  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(4) > div.oneline:nth-of-type(3) > span.tx:nth-of-type(1)` | omen · slopssaloon.com | Text | label | text-tertiary | transparent | text-tertiary | 28,302 334x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,341 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | What goes in the card | Text | micro | text-tertiary | transparent | text-tertiary | 16,341 170x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,360 358x192 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,363 332x46 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,371 303x29 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | The verdict and the band | Text | body-sm | text-primary | transparent | text-primary | 29,371 303x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | Take it · Confident | Text | micro | text-tertiary | transparent | text-tertiary | 29,388 303x13 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.lo.good:nth-of-type(2)` | On | Text | micro | text-primary | transparent | text-primary | 342,379 19x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,410 332x46 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,418 303x29 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | The one-line reason | Text | body-sm | text-primary | transparent | text-primary | 29,418 303x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | No evidence rows | Text | micro | text-tertiary | transparent | text-tertiary | 29,434 303x13 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.lo.good:nth-of-type(2)` | On | Text | micro | text-primary | transparent | text-primary | 342,426 19x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,456 332x46 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,464 298x29 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Your team name | Text | body-sm | text-primary | transparent | text-primary | 29,464 298x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | Titans of Slopsilonia | Text | micro | text-tertiary | transparent | text-tertiary | 29,480 298x13 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.lo.bad:nth-of-type(2)` | Off | Text | micro | text-tertiary | transparent | text-tertiary | 337,472 24x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,502 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,510 298x29 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | League name | Text | body-sm | text-primary | transparent | text-primary | 29,510 298x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | Slops Saloon FF Showdown | Text | micro | text-tertiary | transparent | text-tertiary | 29,527 298x13 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.lo.bad:nth-of-type(2)` | Off | Text | micro | text-tertiary | transparent | text-tertiary | 337,519 24x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(7)` | Names are off by default. A shared card should be arguable on its own merits without telling a group chat which league you are in. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,564 358x83 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(8)` | Share the card | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,658 358x42 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(9)` | Copy as text instead | Button.secondary | card-lead | text-secondary | transparent | border | 16,708 358x44 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,752 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3)` | Trade | TabNavItem | micro | accent | transparent | accent | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 67 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through trade-share.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
