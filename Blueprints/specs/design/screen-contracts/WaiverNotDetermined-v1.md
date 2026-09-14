# Screen contract - WaiverNotDetermined

Compiled from `design/native-visual-lock-2026-09-13/WaiverNotDetermined.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `a7f5f7e0ccee`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Waiver — system unknown |
| Family | League & waiver |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/waivers/analysis |
| API contract | waiver-analysis.v1 waiver_system.system=not_determined |
| Governing rule | FAAB/priority appear only after positive determination |

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
- `PAK`
- `Puk Around & Find Out`
- `YAHOO · FANTASY MADNESS`
- `▾`
- `+`
- `WEEK 7 · WAIVER`
- `The wire`
- `JD`
- `Omen could not tell which waiver system this league uses. Yahoo did not return the setting, and FAAB budget, rolling priority and reverse-standings each change the advice completely.`
- `WHAT IS STILL TRUE`
- `Jaylen Wright`
- `RB · TEN · +7.3 OVER YOUR WEAKEST SLOT`
- `LIVE`
- `Jalen McMillan`
- `WR · TB · +2.1`
- `WHAT OMEN WILL NOT TELL YOU`
- `Suggested bid`
- `NEEDS THE FAAB BUDGET`
- `UNAVAILABLE`
- `Your claim order`
- `NEEDS THE PRIORITY SYSTEM`
- `Odds you win the claim`
- `NEEDS BOTH`
- `A bid figure invented without the budget would be worse than no figure. The player read above is unaffected — it does not depend on the waiver system.`
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
| E054 | Command | TabNavItem | Open CommandCenter for the active league. |
| E057 | Omen | TabNavItem | Open OmenCall for the active league. |
| E060 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E063 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Puk Around & Find Out`
- `LIVE`
- `UNAVAILABLE`
- `A bid figure invented without the budget would be worse than no figure. The player read above is unaffected — it does not depend on the waiver system.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E055 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E056 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E058 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E059 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E061 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E062 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E064 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E065 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 65. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x781 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x23 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 26x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 323,10 51x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,23 390x49 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | PAK | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,32 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,31 282x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Puk Around & Find Out | Text | name | text-primary | transparent | text-primary | 54,31 282x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | YAHOO · Fantasy Madness | Text | micro | text-tertiary | transparent | text-tertiary | 54,49 282x12 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-yahoo-chip | text-tertiary | 54,51 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 346,39 5x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,37 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,72 390x50 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 120x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Waiver | Text | micro | accent | transparent | accent | 16,84 120x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The wire | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 120x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(4)` | Yahoo did not return the setting, and FAAB budget, rolling priority and reverse-standings each change the advice completely. | SampleDataPanel | body-sm | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 16,134 358x90 | pad 10/10/10/10; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(4) > b:nth-of-type(1)` | Omen could not tell which waiver system this league uses. | Text | body-sm | text-secondary | transparent | text-secondary | 27,146 315x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,236 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | What is still true | Text | micro | text-tertiary | transparent | text-tertiary | 16,236 144x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,254 358x97 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,257 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,265 264x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Jaylen Wright | Text | body-sm | text-primary | transparent | text-primary | 29,265 264x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | RB · TEN · +7.3 over your weakest slot | Text | micro | text-tertiary | transparent | text-tertiary | 29,281 264x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ds.live:nth-of-type(2)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 303,269 58x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,302 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,310 264x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Jalen McMillan | Text | body-sm | text-primary | transparent | text-primary | 29,310 264x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | WR · TB · +2.1 | Text | micro | text-tertiary | transparent | text-tertiary | 29,327 264x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ds.live:nth-of-type(2)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 303,315 58x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,363 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | What Omen will not tell you | Text | micro | text-tertiary | transparent | text-tertiary | 16,363 228x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,381 358x142 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,384 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,392 214x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Suggested bid | Text | body-sm | text-primary | transparent | text-primary | 29,392 214x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | needs the FAAB budget | Text | micro | text-tertiary | transparent | text-tertiary | 29,408 214x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ds.gone:nth-of-type(2)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 253,396 108x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,429 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,437 214x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Your claim order | Text | body-sm | text-primary | transparent | text-primary | 29,437 214x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | needs the priority system | Text | micro | text-tertiary | transparent | text-tertiary | 29,453 214x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ds.gone:nth-of-type(2)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 253,442 108x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,474 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,482 214x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Odds you win the claim | Text | body-sm | text-primary | transparent | text-primary | 29,482 214x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | needs both | Text | micro | text-tertiary | transparent | text-tertiary | 29,499 214x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ds.gone:nth-of-type(2)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 253,487 108x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(9)` | A bid figure invented without the budget would be worse than no figure. The player read above is unaffected — it does not depend on the waiver system. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,535 358x83 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,617 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E055 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4)` | League | TabNavItem | micro | accent | transparent | accent | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 65 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through waiver-analysis.v1 waiver_system.system=not_determined; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
