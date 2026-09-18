# Screen contract - StartSitClear

Compiled from `design/native-visual-lock-2026-09-13/StartSitClear.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `2c3113317019`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Start/sit — clear |
| Family | Omen |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/start-sit/detail |
| API contract | start-sit-detail.v1 state=clear_decision |
| Capability profile | `start_sit` — expresses per `capability-expression-v1.md` |
| Governing rule | visual briefs section 5 |

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
- `WEEK 7 · START / SIT`
- `Your lineup`
- `JD`
- `Every slot is already right. Omen checked all nine and has nothing to change.`
- `YOUR STARTERS`
- `9 OF 9 OPTIMAL`
- `Matthew Stafford`
- `QB · LAR VS SEA`
- `18.6`
- `Bijan Robinson`
- `RB · ATL AT TB`
- `16.2`
- `Jaylen Waddle`
- `WR · MIA VS BUF`
- `14.8`
- `Trey McBride`
- `TE · ARI AT SF`
- `11.1`
- `CLOSEST CALL`
- `3.2 POINTS`
- `WR · MIA`
- `Rome Odunze`
- `WR · CHI`
- `11.6`
- `Not close enough to be interesting. If Waddle is downgraded on Saturday this is the swap, and Omen will say so then rather than hedging now.`
- `CONFIDENT`
- `LOW RISK`
- `Lineups lock 1:00 PM Sunday. Omen re-checks at 11:00 AM.`
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
| E066 | Command | TabNavItem | Open CommandCenter for the active league. |
| E069 | Omen | TabNavItem | Open OmenCall for the active league. |
| E072 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E075 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `CONFIDENT`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E067 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E068 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E070 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E071 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E073 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E074 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E076 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E077 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 77. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 149x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Start / sit | Text | micro | accent | transparent | accent | 16,84 149x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Your lineup | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 149x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.note:nth-of-type(4)` | Every slot is already right. Omen checked all nine and has nothing to change. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,134 358x63 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,209 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | Your starters | Text | micro | text-tertiary | transparent | text-tertiary | 16,209 114x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(5) > span:nth-of-type(1)` | 9 of 9 optimal | Text | micro | text-tertiary | transparent | text-tertiary | 271,209 103x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,227 358x188 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,230 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,238 294x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Matthew Stafford | Text | body-sm | text-primary | transparent | text-primary | 29,238 294x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | QB · LAR vs SEA | Text | micro | text-tertiary | transparent | text-tertiary | 29,254 294x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.lo.good:nth-of-type(2)` | 18.6 | Text | micro | text-primary | transparent | text-primary | 333,246 28x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,275 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,283 294x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Bijan Robinson | Text | body-sm | text-primary | transparent | text-primary | 29,283 294x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | RB · ATL at TB | Text | micro | text-tertiary | transparent | text-tertiary | 29,299 294x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.lo.good:nth-of-type(2)` | 16.2 | Text | micro | text-primary | transparent | text-primary | 333,291 28x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,320 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,328 294x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Jaylen Waddle | Text | body-sm | text-primary | transparent | text-primary | 29,328 294x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | WR · MIA vs BUF | Text | micro | text-tertiary | transparent | text-tertiary | 29,345 294x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.lo.good:nth-of-type(2)` | 14.8 | Text | micro | text-primary | transparent | text-primary | 333,337 28x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,366 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,374 298x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Trey McBride | Text | body-sm | text-primary | transparent | text-primary | 29,374 298x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | TE · ARI at SF | Text | micro | text-tertiary | transparent | text-tertiary | 29,390 298x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(4) > span.lo.good:nth-of-type(2)` | 11.1 | Text | micro | text-primary | transparent | text-primary | 337,382 24x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,426 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | Closest call | Text | micro | text-tertiary | transparent | text-tertiary | 16,426 103x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(7) > span:nth-of-type(1)` | 3.2 points | Text | micro | text-tertiary | transparent | text-tertiary | 301,426 73x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,444 358x146 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,457 334x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.tick:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 40,457 2x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 62,457 300x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E050 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > b:nth-of-type(1)` | Jaylen Waddle | Text | name | text-primary | transparent | text-primary | 62,459 91x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > em:nth-of-type(1)` | WR · MIA | Text | micro | text-tertiary | transparent | text-tertiary | 159,462 57x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > span.p:nth-of-type(1)` | 14.8 | Text | body-sm | text-primary | transparent | text-primary | 333,460 29x15 | pad 0/0/0/0; margin 0/0/0/111.391->96; gap 0  |
|  E053 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 62,477 300x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E054 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > b:nth-of-type(1)` | Rome Odunze | Text | name | text-tertiary | transparent | text-tertiary | 62,479 84x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > em:nth-of-type(1)` | WR · CHI | Text | micro | text-tertiary | transparent | text-tertiary | 152,482 55x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > span.p:nth-of-type(1)` | 11.6 | Text | body-sm | text-tertiary | transparent | text-tertiary | 333,480 29x15 | pad 0/0/0/0; margin 0/0/0/119.484->96; gap 0  |
|  E057 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > p.rsn:nth-of-type(1)` | Not close enough to be interesting. If Waddle is downgraded on Saturday this is the swap, and Omen will say so then rather than hedging now. | Text | body-sm | text-secondary | transparent | text-secondary | 28,505 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.meta:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,566 334x12 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E059 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.meta:nth-of-type(2) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 28,566 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E060 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(8) > div.meta:nth-of-type(2) > span.rk.lo:nth-of-type(2)` | Low risk | Text | label | text-tertiary | transparent | text-tertiary | 138,566 66x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E061 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,591 390x149 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,739 358x28 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E063 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(10) > span.tx:nth-of-type(1)` | Lineups lock 1:00 PM Sunday. Omen re-checks at 11:00 AM. | Text | body-sm | text-secondary | transparent | text-secondary | 16,750 358x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,767 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2)` | Omen | TabNavItem | micro | accent | transparent | accent | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E073 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E075 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E076 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E077 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 77 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through start-sit-detail.v1 state=clear_decision; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
