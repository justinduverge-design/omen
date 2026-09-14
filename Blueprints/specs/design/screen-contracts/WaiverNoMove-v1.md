# Screen contract - WaiverNoMove

Compiled from `design/native-visual-lock-2026-09-13/WaiverNoMove.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `9cf6bb30bb0d`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Waiver — no move |
| Family | League & waiver |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/waivers/analysis |
| API contract | waiver-analysis.v1 state=no_credible_move or no_low_cost_drop |
| Governing rule | visual briefs sections 6.2 and 6.3 |

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
- `WEEK 7 · WAIVER`
- `The wire`
- `JD`
- `YOUR BUDGET $63 OF $100`
- `CLAIM ORDER 7 OF 12`
- `Nothing on this wire beats what you have.`
- `Omen checked all 143 free agents against your nine starting slots. The best of them projects 1.2 points above your weakest starter, which is noise.`
- `WHAT IT WOULD HAVE COST`
- `Claiming the best available means dropping Tyjae Spears, who is one Pollard injury from being startable. Doing nothing is the move this week.`
- `CONFIDENT`
- `LOW RISK`
- `WATCH LIST`
- `OMEN WILL FLAG THESE`
- `Jaylen Wright`
- `RB · TEN · IF POLLARD SITS`
- `Watching`
- `Cade Otton`
- `TE · TB · IF GODWIN MISSES WEEK 8`
- `Next read Tuesday 3:00 AM. Omen will wake you only if something changes.`
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
| E053 | Command | TabNavItem | Open CommandCenter for the active league. |
| E056 | Omen | TabNavItem | Open OmenCall for the active league. |
| E059 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E062 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `CONFIDENT`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E054 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E055 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E057 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E058 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E060 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E061 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E063 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E064 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 64. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 120x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Waiver | Text | micro | accent | transparent | accent | 16,84 120x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The wire | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 120x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,134 358x12 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1)` | Your budget | Text | micro | text-tertiary | transparent | text-tertiary | 16,134 179x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1) > b:nth-of-type(1)` | $63 of $100 | Text | micro | text-secondary | transparent | text-secondary | 112,134 83x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(2)` | Claim order 7 of 12 | Text | micro | text-tertiary | transparent | text-tertiary | 234,134 140x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(5)` |  | EmptyState | body | text-primary | transparent | text-primary | 0,146 390x160 | pad 24/24/0/24; margin 0/0/0/0; gap 12  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(5) > h3.eh:nth-of-type(1)` | Nothing on this wire beats what you have. | Text.heading | h2 | text-primary | transparent | text-primary | 24,170 342x46 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(5) > p.ep:nth-of-type(1)` | Omen checked all 143 free agents against your nine starting slots. The best of them projects 1.2 points above your weakest starter, which is noise. | Text | name | text-secondary | transparent | text-secondary | 64,228 262x78 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,318 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(6) > b:nth-of-type(1)` | What it would have cost | Text | micro | text-tertiary | transparent | text-tertiary | 16,318 197x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,336 358x98 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1)` | Claiming the best available means dropping , who is one Pollard injury from being startable. | Text | body-sm | text-secondary | transparent | text-secondary | 28,349 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1) > b:nth-of-type(1)` | Tyjae Spears | Text | body-sm | text-primary | transparent | text-primary | 277,350 78x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1) > b:nth-of-type(2)` | Doing nothing is the move this week. | Text | body-sm | text-primary | transparent | text-primary | 28,367 297x33 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,410 334x12 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7) > div.meta:nth-of-type(1) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 28,410 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(7) > div.meta:nth-of-type(1) > span.rk.lo:nth-of-type(2)` | Low risk | Text | label | text-tertiary | transparent | text-tertiary | 138,410 66x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,446 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(8) > b:nth-of-type(1)` | Watch list | Text | micro | text-tertiary | transparent | text-tertiary | 16,446 85x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(8) > span:nth-of-type(1)` | Omen will flag these | Text | micro | text-tertiary | transparent | text-tertiary | 220,446 154x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,464 358x97 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,467 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,475 272x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Jaylen Wright | Text | body-sm | text-primary | transparent | text-primary | 29,475 272x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | RB · TEN · if Pollard sits | Text | micro | text-tertiary | transparent | text-tertiary | 29,491 272x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.lo.pend:nth-of-type(2)` | Watching | Text | micro | text-secondary | transparent | text-secondary | 311,483 50x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,512 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,520 272x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Cade Otton | Text | body-sm | text-primary | transparent | text-primary | 29,520 272x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | TE · TB · if Godwin misses week 8 | Text | micro | text-tertiary | transparent | text-tertiary | 29,537 272x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(2) > span.lo.pend:nth-of-type(2)` | Watching | Text | micro | text-secondary | transparent | text-secondary | 311,529 50x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,561 390x162 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,722 358x45 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E050 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(11) > span.tx:nth-of-type(1)` | Next read Tuesday 3:00 AM. Omen will wake you only if something changes. | Text | body-sm | text-secondary | transparent | text-secondary | 16,733 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,767 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E054 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4)` | League | TabNavItem | micro | accent | transparent | accent | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 64 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through waiver-analysis.v1 state=no_credible_move or no_low_cost_drop; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
