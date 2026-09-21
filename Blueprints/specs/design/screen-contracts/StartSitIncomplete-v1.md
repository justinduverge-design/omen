# Screen contract - StartSitIncomplete

Compiled from `design/native-visual-lock-2026-09-13/StartSitIncomplete.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `88a9100be733`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Start/sit — incomplete |
| Family | Omen |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/start-sit/detail |
| API contract | start-sit-detail.v1 state=incomplete_data |
| Capability profile | `start_sit` — expresses per `capability-expression-v1.md` |
| Governing rule | visual briefs section 5; scoring format unknown is a limitation, never assumed PPR |

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
- `Partial read`
- `JD`
- `Omen is working from part of your roster. ESPN returned six of nine starters. The three missing slots are not guesses — they are blank.`
- `WHAT OMEN CAN SEE`
- `6 OF 9`
- `Matthew Stafford`
- `QB · LAR`
- `18.6`
- `Bijan Robinson`
- `RB · ATL`
- `16.2`
- `Trey McBride`
- `TE · ARI`
- `11.1`
- `WHAT IT CANNOT`
- `3 SLOTS`
- `FLEX`
- `NOT RETURNED BY ESPN`
- `UNAVAILABLE`
- `D/ST`
- `K`
- `SO OMEN IS NOT MAKING A CALL`
- `A start/sit recommendation across six of nine slots would look like advice and be a guess. Retry the connection, or make this week’s call yourself — Omen will be back next week either way.`
- `Retry ESPN`
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
| E061 | Retry ESPN | Button.primary | Run the recovery action from platform-provider-state.v1, then refresh the affected section only. |
| E064 | Command | TabNavItem | Open CommandCenter for the active league. |
| E067 | Omen | TabNavItem | Open OmenCall for the active league. |
| E070 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E073 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `UNAVAILABLE`
- `A start/sit recommendation across six of nine slots would look like advice and be a guess. Retry the connection, or make this week’s call yourself — Omen will be back next week either way.`
- `Retry ESPN`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E065 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E066 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E068 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E069 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E071 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E072 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E074 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E075 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 75. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 149x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Start / sit | Text | micro | accent | transparent | accent | 16,84 149x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Partial read | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 149x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(4)` | ESPN returned six of nine starters. The three missing slots are not guesses — they are blank. | SampleDataPanel | body-sm | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 16,134 358x73 | pad 10/10/10/10; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(4) > b:nth-of-type(1)` | Omen is working from part of your roster. | Text | body-sm | text-secondary | transparent | text-secondary | 27,146 249x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,219 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | What Omen can see | Text | micro | text-tertiary | transparent | text-tertiary | 16,219 148x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > span:nth-of-type(1)` | 6 of 9 | Text | micro | text-tertiary | transparent | text-tertiary | 333,219 41x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,237 358x142 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,240 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,248 294x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Matthew Stafford | Text | body-sm | text-primary | transparent | text-primary | 29,248 294x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | QB · LAR | Text | micro | text-tertiary | transparent | text-tertiary | 29,264 294x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(1) > span.lo.good:nth-of-type(2)` | 18.6 | Text | micro | text-primary | transparent | text-primary | 333,256 28x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,285 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,293 294x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Bijan Robinson | Text | body-sm | text-primary | transparent | text-primary | 29,293 294x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | RB · ATL | Text | micro | text-tertiary | transparent | text-tertiary | 29,309 294x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(2) > span.lo.good:nth-of-type(2)` | 16.2 | Text | micro | text-primary | transparent | text-primary | 333,301 28x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,330 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,338 298x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Trey McBride | Text | body-sm | text-primary | transparent | text-primary | 29,338 298x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | TE · ARI | Text | micro | text-tertiary | transparent | text-tertiary | 29,355 298x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(6) > div.lrow:nth-of-type(3) > span.lo.good:nth-of-type(2)` | 11.1 | Text | micro | text-primary | transparent | text-primary | 337,347 24x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,391 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | What it cannot | Text | micro | text-tertiary | transparent | text-tertiary | 16,391 121x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > span:nth-of-type(1)` | 3 slots | Text | micro | text-tertiary | transparent | text-tertiary | 321,391 53x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,409 358x142 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,412 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,420 214x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | FLEX | Text | body-sm | text-primary | transparent | text-primary | 29,420 214x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | Not returned by ESPN | Text | micro | text-tertiary | transparent | text-tertiary | 29,436 214x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(1) > span.ds.gone:nth-of-type(2)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 253,425 108x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,457 332x45 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,465 214x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | D/ST | Text | body-sm | text-primary | transparent | text-primary | 29,465 214x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | Not returned by ESPN | Text | micro | text-tertiary | transparent | text-tertiary | 29,482 214x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(2) > span.ds.gone:nth-of-type(2)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 253,470 108x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,503 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,511 214x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | K | Text | body-sm | text-primary | transparent | text-primary | 29,511 214x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | Not returned by ESPN | Text | micro | text-tertiary | transparent | text-tertiary | 29,527 214x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(8) > div.lrow:nth-of-type(3) > span.ds.gone:nth-of-type(2)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 253,515 108x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,563 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(9) > b:nth-of-type(1)` | So Omen is not making a call | Text | micro | text-tertiary | transparent | text-tertiary | 16,563 230x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(10)` | A start/sit recommendation across six of nine slots would look like advice and be a guess. Retry the connection, or make this week’s call yourself — Omen will be back next week either way. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,581 358x102 | pad 12/12/12/12; margin 0/16/0/16; gap 0  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(11)` | Retry ESPN | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,695 358x41 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E062 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,736 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2)` | Omen | TabNavItem | micro | accent | transparent | accent | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E075 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 75 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through start-sit-detail.v1 state=incomplete_data; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
