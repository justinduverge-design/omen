# Screen contract - OmenCall

Compiled from `design/native-visual-lock-2026-09-13/OmenCall.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `bad0ec88d3e6`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Omen — the call |
| Family | Omen |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | POST /api/omen/mvp-move with contract_version=omen-decision-brief.v2 |
| API contract | omen-decision-brief.v2 |
| Governing rule | C1 resolved here; v2 response carries confidence band plus drivers, no numeric confidence |

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
- `WEEK 7`
- `Omen`
- `JD`
- `CALL 1 OF 3 · ONE PER TEAM`
- `LOCKED TUE 3:00`
- `START / SIT`
- `Start Stafford over Jayden Daniels`
- `Daniels is on a short week, crossing two time zones, into 22 mph crosswinds. Stafford is home on turf.`
- `CONFIDENT`
- `LOW RISK`
- `WIND 22`
- `2 ZONES`
- `4 DAYS`
- `O-LINE`
- `WEATHER`
- `Gusting 31. Daniels averages 4.1 fewer points above 18 mph.`
- `REST`
- `Thursday game after a Sunday night road loss.`
- `PROJECTION`
- `18.6 to 17.9 — small. Context moved the band, not the gap.`
- `See the full argument`
- `→`
- `Make this move in ESPN`
- `Not this week`
- `Every call lands in the Ledger whether you take it or not.`
- `Command`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · SLOPS SALOON; ▾; + | LeagueSwitcherBar | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E011 | ▾ | Text | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E012 | + | Text | Open ConnectLeague to add another provider connection. |
| E017 | JD | AvatarButton | Open Account. |
| E053 | See the full argument | Text | Open OmenEvidence for the same decision id. |
| E055 | Make this move in ESPN | Button.primary | Provider handoff to ESPN for this accepted move or offer. |
| E056 | Not this week | Button.secondary | Record declined action locally and leave the decision in Ledger as not followed. |
| E062 | Command | TabNavItem | Open CommandCenter for the active league. |
| E065 | Omen | TabNavItem | Open OmenCall for the active league. |
| E068 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E071 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `CONFIDENT`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E031 | evidence.wind | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(1) > svg:nth-of-type(1) | 30,321 12x12 |
| E032 | evidence.wind | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 32,321 9x9 |
| E034 | evidence.travel-zones | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(2) > svg:nth-of-type(1) | 107,321 12x12 |
| E035 | evidence.travel-zones | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 108,322 10x10 |
| E037 | evidence.rest-clock | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(3) > svg:nth-of-type(1) | 184,321 12x12 |
| E038 | evidence.rest-clock | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 185,322 10x10 |
| E040 | evidence.unread-source | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f.off:nth-of-type(4) > svg:nth-of-type(1) | 253,321 12x12 |
| E041 | evidence.unread-source | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f.off:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 255,323 8x9 |
| E054 | arrow.right | .screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.more:nth-of-type(4) > span:nth-of-type(2) | → |
| E063 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E064 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E066 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E067 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E069 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E070 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E072 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E073 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 73. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 59x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 | Text | micro | accent | transparent | accent | 16,84 59x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Omen | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 59x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,134 358x12 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1)` | Call · one per team | Text | micro | text-tertiary | transparent | text-tertiary | 16,134 186x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1) > b:nth-of-type(1)` | 1 of 3 | Text | micro | text-secondary | transparent | text-secondary | 53,134 40x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(2)` | Locked Tue 3:00 | Text | micro | text-tertiary | transparent | text-tertiary | 259,134 115x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5)` |  | DecisionBrief | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,156 358x351 | pad 14/14/14/14; margin 10/16/0/16; gap 10  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > span.ctype:nth-of-type(1)` | Start / sit | Text | micro | text-tertiary | transparent | text-tertiary | 30,171 330x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > h3.callh:nth-of-type(1)` | Start Stafford over Jayden Daniels | Text.heading | call | text-primary | transparent | text-primary | 30,193 330x48 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > p.callr:nth-of-type(1)` | Daniels is on a short week, crossing two time zones, into 22 mph crosswinds. Stafford is home on turf. | Text | name | text-secondary | transparent | text-secondary | 30,251 330x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,299 330x12 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.meta:nth-of-type(1) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 30,299 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.meta:nth-of-type(1) > span.risk:nth-of-type(2)` | Low risk | RiskLabel | micro | text-tertiary | transparent | text-tertiary | 140,299 61x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2)` |  | NativeStack | micro | text-secondary | transparent | text-secondary | 30,321 330x12 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(1)` | Wind 22 | Text | micro | text-secondary | transparent | text-secondary | 30,321 69x12 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-secondary | transparent | text-secondary | 30,321 12x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-secondary | transparent | text-secondary | 32,321 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(2)` | 2 zones | Text | micro | text-secondary | transparent | text-secondary | 107,321 69x12 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-secondary | transparent | text-secondary | 107,321 12x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-secondary | transparent | text-secondary | 108,322 10x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(3)` | 4 days | Text | micro | text-secondary | transparent | text-secondary | 184,321 61x12 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-secondary | transparent | text-secondary | 184,321 12x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-secondary | transparent | text-secondary | 185,322 10x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f.off:nth-of-type(4)` | O-line | Text | micro | text-tertiary | transparent | text-tertiary | 253,321 60x12 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f.off:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 253,321 12x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.facts:nth-of-type(2) > span.f.off:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 255,323 8x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3)` |  | EvidenceDisclosure | body | text-primary | transparent | text-primary-overlay | 30,343 330x150 | pad 10/0/0/0; margin 0/0/0/0; gap 8  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(1)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,354 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(1) > span.k:nth-of-type(1)` | Weather | Text | micro | text-tertiary | transparent | text-tertiary | 30,354 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(1) > span.v:nth-of-type(2)` | Gusting 31. Daniels averages 4.1 fewer points above 18 mph. | Text | body-sm | text-secondary | transparent | text-secondary | 98,354 262x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(2)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,396 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(2) > span.k:nth-of-type(1)` | Rest | Text | micro | text-tertiary | transparent | text-tertiary | 30,396 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(2) > span.v:nth-of-type(2)` | Thursday game after a Sunday night road loss. | Text | body-sm | text-secondary | transparent | text-secondary | 98,396 262x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(3)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,438 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E050 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(3) > span.k:nth-of-type(1)` | Projection | Text | micro | text-tertiary | transparent | text-tertiary | 30,438 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(3) > span.v:nth-of-type(2)` | 18.6 to 17.9 — small. Context moved the band, not the gap. | Text | body-sm | text-secondary | transparent | text-secondary | 98,438 262x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.more:nth-of-type(4)` |  | NativeStack | label | accent | transparent | accent | 30,480 330x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.more:nth-of-type(4) > span:nth-of-type(1)` | See the full argument | Text | label | accent | transparent | accent | 30,480 120x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody:nth-of-type(1) > div.call:nth-of-type(5) > div.ev:nth-of-type(3) > div.more:nth-of-type(4) > span:nth-of-type(2)` | → | Text | label | accent | transparent | accent | 350,480 10x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody:nth-of-type(1) > div.btn:nth-of-type(6)` | Make this move in ESPN | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,519 358x41 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E056 | `.screen > div.sbody:nth-of-type(1) > div.btn.ghost:nth-of-type(7)` | Not this week | Button.secondary | card-lead | text-secondary | transparent | border | 16,568 358x43 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E057 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,611 390x128 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,739 358x28 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E059 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(9) > span.tx:nth-of-type(1)` | Every call lands in the Ledger whether you take it or not. | Text | body-sm | text-secondary | transparent | text-secondary | 16,750 358x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,767 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2)` | Omen | TabNavItem | micro | accent | transparent | accent | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 73 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through omen-decision-brief.v2; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
