# Screen contract - LeagueWaiver

Compiled from `design/native-visual-lock-2026-09-13/LeagueWaiver.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `ee553e5552ea`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | League — waiver |
| Family | League & waiver |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/waivers/analysis |
| API contract | waiver-analysis.v1 state=confirmed_opportunity |
| Governing rule | D5 and visual briefs section 6; bid null when input missing, never 0 |

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
- `CLAIMS PROCESS`
- `TUE 3:00 AM`
- `YOUR BUDGET $63 OF $100`
- `CLAIM ORDER 7 OF 12`
- `THE MOVE`
- `BEST AVAILABLE`
- `Jaylen Wright`
- `RB · TEN`
- `11.4`
- `Roschon Johnson`
- `RB · CHI`
- `4.1`
- `Pollard is out three weeks and Wright took almost every backup snap on Sunday. Roschon sits behind two healthy backs — you will not miss him.`
- `CONFIDENT`
- `LOW RISK`
- `LIVE`
- `Suggested bid $14 — two managers ahead of you need a back.`
- `ALSO WORTH A CLAIM`
- `2 ALTERNATIVES`
- `Jalen McMillan`
- `WR · TB`
- `9.2`
- `Tim Patrick`
- `WR · DET`
- `5.8`
- `Projects 2.2 points below Wright against your lineup. Take this one only if you lose the Wright claim.`
- `Cade Otton`
- `TE · TB`
- `8.1`
- `—`
- `NO LOW-COST DROP`
- `There is no defensible drop for this one. Everyone on your bench is either starting somewhere or worth more than Otton. Named rather than forced.`
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
| E074 | Command | TabNavItem | Open CommandCenter for the active league. |
| E077 | Omen | TabNavItem | Open OmenCall for the active league. |
| E080 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E083 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Pollard is out three weeks and Wright took almost every backup snap on Sunday. Roschon sits behind two healthy backs — you will not miss him.`
- `CONFIDENT`
- `LIVE`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E075 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E076 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E078 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E079 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E081 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E082 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E084 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E085 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 85. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x781 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x23 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 26x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 323,10 51x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,23 390x49 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | TTO | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,32 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,31 282x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | name | text-primary | transparent | text-primary | 54,31 282x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | ESPN · Slops Saloon | Text | micro | text-tertiary | transparent | text-tertiary | 54,49 282x12 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-espn-chip | text-tertiary | 54,51 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 346,39 5x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,37 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,72 390x50 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 120x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Waiver | Text | micro | accent | transparent | accent | 16,84 120x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The wire | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 120x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > p.rt:nth-of-type(1)` | Claims process Tue 3:00 AM | Text | micro | text-tertiary | transparent | text-tertiary | 263,94 111x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > p.rt:nth-of-type(1) > br:nth-of-type(1)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 374,95 0x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,134 358x12 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1)` | Your budget | Text | micro | text-tertiary | transparent | text-tertiary | 16,134 179x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1) > b:nth-of-type(1)` | $63 of $100 | Text | micro | text-secondary | transparent | text-secondary | 112,134 83x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(2)` | Claim order 7 of 12 | Text | micro | text-tertiary | transparent | text-tertiary | 234,134 140x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,158 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | The move | Text | micro | text-tertiary | transparent | text-tertiary | 16,158 71x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > span:nth-of-type(1)` | Best available | Text | micro | text-tertiary | transparent | text-tertiary | 267,158 107x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6)` |  | Card | body | text-primary | surface-1 | accent-overlay | 16,176 358x206 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,189 334x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.tick:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 40,189 2x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 62,189 300x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > b:nth-of-type(1)` | Jaylen Wright | Text | name | text-primary | transparent | text-primary | 62,191 86x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > em:nth-of-type(1)` | RB · TEN | Text | micro | text-tertiary | transparent | text-tertiary | 154,194 54x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > span.p:nth-of-type(1)` | 11.4 | Text | body-sm | text-primary | transparent | text-primary | 333,192 29x15 | pad 0/0/0/0; margin 0/0/0/118.391->96; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 62,209 300x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > b:nth-of-type(1)` | Roschon Johnson | Text | name | text-tertiary | transparent | text-tertiary | 62,211 107x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > em:nth-of-type(1)` | RB · CHI | Text | micro | text-tertiary | transparent | text-tertiary | 175,214 52x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > span.p:nth-of-type(1)` | 4.1 | Text | body-sm | text-tertiary | transparent | text-tertiary | 341,212 21x15 | pad 0/0/0/0; margin 0/0/0/108.438->96; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > p.rsn:nth-of-type(1)` | Pollard is out three weeks and Wright took almost every backup snap on Sunday. Roschon sits behind two healthy backs — you will not miss him. | Text | body-sm | text-secondary | transparent | text-secondary | 28,237 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.meta:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,298 334x19 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.meta:nth-of-type(2) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 28,301 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.meta:nth-of-type(2) > span.rk.lo:nth-of-type(2)` | Low risk | Text | label | text-tertiary | transparent | text-tertiary | 138,301 66x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.meta:nth-of-type(2) > span.ds.live:nth-of-type(3)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 218,298 58x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.oneline:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | border-subtle | 28,325 334x45 | pad 10/0/0/0; margin 0/0/0/0; gap 10  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.oneline:nth-of-type(3) > span.tx:nth-of-type(1)` | Suggested bid — two managers ahead of you need a back. | Text | body-sm | text-secondary | transparent | text-secondary | 28,336 334x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card.hero:nth-of-type(6) > div.oneline:nth-of-type(3) > span.tx:nth-of-type(1) > b:nth-of-type(1)` | $14 | Text | body-sm | text-primary | transparent | text-primary | 113,336 22x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,393 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | Also worth a claim | Text | micro | text-tertiary | transparent | text-tertiary | 16,393 155x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > span:nth-of-type(1)` | 2 alternatives | Text | micro | text-tertiary | transparent | text-tertiary | 267,393 107x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,411 390x109 | pad 12/16/12/16; margin 0/0/0/0; gap 8  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,423 358x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.tick:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 28,423 2x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 50,423 324x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > b:nth-of-type(1)` | Jalen McMillan | Text | name | text-primary | transparent | text-primary | 50,425 93x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > em:nth-of-type(1)` | WR · TB | Text | micro | text-tertiary | transparent | text-tertiary | 149,428 49x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > span.p:nth-of-type(1)` | 9.2 | Text | body-sm | text-primary | transparent | text-primary | 353,426 21x15 | pad 0/0/0/0; margin 0/0/0/149.219->96; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 50,443 324x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > b:nth-of-type(1)` | Tim Patrick | Text | name | text-tertiary | transparent | text-tertiary | 50,445 67x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > em:nth-of-type(1)` | WR · DET | Text | micro | text-tertiary | transparent | text-tertiary | 123,448 57x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > span.p:nth-of-type(1)` | 5.8 | Text | body-sm | text-tertiary | transparent | text-tertiary | 353,446 21x15 | pad 0/0/0/0; margin 0/0/0/166.781->96; gap 0  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(8) > p.rsn:nth-of-type(1)` | Projects 2.2 points below Wright against your lineup. Take this one only if you lose the Wright claim. | Text | body-sm | text-secondary | transparent | text-secondary | 16,471 358x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,520 390x126 | pad 12/16/12/16; margin 0/0/0/0; gap 8  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,532 358x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.tick:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 28,532 2x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 50,532 324x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E064 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > b:nth-of-type(1)` | Cade Otton | Text | name | text-primary | transparent | text-primary | 50,534 71x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > em:nth-of-type(1)` | TE · TB | Text | micro | text-tertiary | transparent | text-tertiary | 127,537 45x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > span.p:nth-of-type(1)` | 8.1 | Text | body-sm | text-primary | transparent | text-primary | 353,535 21x15 | pad 0/0/0/0; margin 0/0/0/175.281->96; gap 0  |
|  E067 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 50,552 324x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E068 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > b:nth-of-type(1)` | — | Text | name | text-tertiary | transparent | text-tertiary | 50,554 11x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > em:nth-of-type(1)` | no low-cost drop | Text | micro | text-tertiary | transparent | text-tertiary | 67,557 128x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > span.p:nth-of-type(1)` | — | Text | body-sm | text-tertiary | transparent | text-tertiary | 363,555 11x15 | pad 0/0/0/0; margin 0/0/0/161.406->96; gap 0  |
|  E071 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(9) > p.rsn:nth-of-type(1)` | There is no defensible drop for this one. Everyone on your bench is either starting somewhere or worth more than Otton. Named rather than forced. | Text | body-sm | text-secondary | transparent | text-secondary | 16,580 358x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,646 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E075 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E076 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E077 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E078 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E079 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E080 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E081 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E082 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E083 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4)` | League | TabNavItem | micro | accent | transparent | accent | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E084 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E085 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 85 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through waiver-analysis.v1 state=confirmed_opportunity; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
