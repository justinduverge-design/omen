# Screen contract - OmenEvidence

Compiled from `design/native-visual-lock-2026-09-13/OmenEvidence.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `ef9a810ae253`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Omen — the full argument |
| Family | Omen |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | POST /api/omen/mvp-move with contract_version=omen-decision-brief.v3 |
| API contract | omen-decision-brief.v3 |
| Capability profile | `omen_mvp` — expresses per `capability-expression-v1.md` |
| Governing rule | Evidence rows carry verified/projection/model/inference/limitation; projection never renders as fact |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values below are source evidence, not permission for local raw colors.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2, h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching component, implement the named component first; do not invent a local primitive.

## Experience contract

Omen is the single weekly play. The server may choose a start, sit, pickup, drop, or trade, but the screen must behave like one decisive recommendation, not a menu of maybe-actions.

Build acceptance:

- Lead with the move when there is one, then explain why it matters, confidence band, risk, and the live evidence behind it.
- If there is no defensible play, the screen leads with the reason there is no Omen this week: optimized roster, no safe edge, missing provider read, off-season, or unavailable scoring evidence.
- A no-play week is still useful. It should tell the user what was checked and why forcing a move would be worse.
- Never rank several candidates on the Omen screen. Other destinations can explore; Omen decides or declines to decide.
- A fallback state must not sound apologetic or broken when the honest answer is "hold."

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · SLOPS SALOON`
- `▾`
- `+`
- `WEEK 7`
- `The argument`
- `JD`
- `START STAFFORD OVER DANIELS`
- `LOCKED TUE 3:00`
- `WEATHER`
- `Gusting 31 mph at kickoff. Daniels averages 4.1 fewer points in games above 18 mph, over nine starts. LIVE`
- `REST`
- `Thursday game after a Sunday night road loss. Four days, two time zones. LIVE`
- `PROJECTION`
- `18.6 to 17.9. The gap is small and context moved the band, not the number. LIVE`
- `MATCHUP`
- `Washington allows the 8th-most QB points at home. SAMPLE`
- `O-LINE`
- `No provider exposes personnel. Omen did not read this and is not pretending to.`
- `WHAT ELSE WAS CONSIDERED`
- `Start Daniels anyway. His rushing floor survives weather better than most. Rejected because the floor is not the question this week — you need the ceiling.`
- `Start neither; stream Mayfield. Rejected: he is not on your roster and not on the wire.`
- `CONFIDENCE`
- `CONFIDENT`
- `LOW RISK`
- `Three independent factors point the same way and none contradicts. That is what moves a call from Leaning to Confident — agreement, not margin.`
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
| E058 | Command | TabNavItem | Open CommandCenter for the active league. |
| E061 | Omen | TabNavItem | Open OmenCall for the active league. |
| E064 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E067 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Gusting 31 mph at kickoff. Daniels averages 4.1 fewer points in games above 18 mph, over nine starts. LIVE`
- `Thursday game after a Sunday night road loss. Four days, two time zones. LIVE`
- `18.6 to 17.9. The gap is small and context moved the band, not the number. LIVE`
- `Washington allows the 8th-most QB points at home. SAMPLE`
- `CONFIDENT`
- `Three independent factors point the same way and none contradicts. That is what moves a call from Leaning to Confident — agreement, not margin.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E059 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E060 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E062 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E063 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E065 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E066 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E068 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E069 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 69. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 134x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 | Text | micro | accent | transparent | accent | 16,84 134x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The argument | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 134x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,134 358x12 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1)` | Start Stafford over Daniels | Text | micro | text-tertiary | transparent | text-tertiary | 16,134 211x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(2)` | Locked Tue 3:00 | Text | micro | text-tertiary | transparent | text-tertiary | 259,134 115x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5)` |  | EvidenceDisclosure | body | text-primary | transparent | text-primary | 16,160 358x241 | pad 10/0/0/0; margin 14/16/0/16; gap 8  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(1)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 16,170 358x54 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(1) > span.k:nth-of-type(1)` | Weather | Text | micro | text-tertiary | transparent | text-tertiary | 16,170 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(1) > span.v:nth-of-type(2)` | Gusting 31 mph at kickoff. Daniels averages 4.1 fewer points in games above 18 mph, over nine starts. | Text | body-sm | text-secondary | transparent | text-secondary | 84,170 290x54 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(1) > span.v:nth-of-type(2) > span.ds.live:nth-of-type(1)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 123,204 58x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(2)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 16,231 358x37 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(2) > span.k:nth-of-type(1)` | Rest | Text | micro | text-tertiary | transparent | text-tertiary | 16,231 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(2) > span.v:nth-of-type(2)` | Thursday game after a Sunday night road loss. Four days, two time zones. | Text | body-sm | text-secondary | transparent | text-secondary | 84,231 290x37 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(2) > span.v:nth-of-type(2) > span.ds.live:nth-of-type(1)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 239,249 58x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(3)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 16,276 358x37 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(3) > span.k:nth-of-type(1)` | Projection | Text | micro | text-tertiary | transparent | text-tertiary | 16,276 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(3) > span.v:nth-of-type(2)` | 18.6 to 17.9. The gap is small and context moved the band, not the number. | Text | body-sm | text-secondary | transparent | text-secondary | 84,276 290x37 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(3) > span.v:nth-of-type(2) > span.ds.live:nth-of-type(1)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 234,293 58x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(4)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 16,320 358x38 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(4) > span.k:nth-of-type(1)` | Matchup | Text | micro | text-tertiary | transparent | text-tertiary | 16,320 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(4) > span.v:nth-of-type(2)` | Washington allows the 8th-most QB points at home. | Text | body-sm | text-secondary | transparent | text-secondary | 84,320 290x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(4) > span.v:nth-of-type(2) > span.ds.stub:nth-of-type(1)` | Sample | Text | micro | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 122,337 71x21 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(5)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 16,366 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(5) > span.k:nth-of-type(1)` | O-line | Text | micro | text-tertiary | transparent | text-tertiary | 16,366 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.ev:nth-of-type(5) > div.evr:nth-of-type(5) > span.v.pv-none:nth-of-type(2)` | No provider exposes personnel. Omen did not read this and is not pretending to. | Text | body-sm | text-secondary | transparent | text-secondary | 84,366 290x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,412 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6) > b:nth-of-type(1)` | What else was considered | Text | micro | text-tertiary | transparent | text-tertiary | 16,412 208x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,430 358x124 | pad 12/12/12/12; margin 0/16/0/16; gap 10  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1)` | His rushing floor survives weather better than most. Rejected because the floor is not the question this week — you need the ceiling. | Text | body-sm | text-secondary | transparent | text-secondary | 28,443 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1) > b:nth-of-type(1)` | Start Daniels anyway. | Text | body-sm | text-primary | transparent | text-primary | 28,444 130x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(2)` | Rejected: he is not on your roster and not on the wire. | Text | body-sm | text-secondary | transparent | text-secondary | 28,507 334x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(2) > b:nth-of-type(1)` | Start neither; stream Mayfield. | Text | body-sm | text-primary | transparent | text-primary | 28,508 185x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,566 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8) > b:nth-of-type(1)` | Confidence | Text | micro | text-tertiary | transparent | text-tertiary | 16,566 89x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8) > span:nth-of-type(1)` | Confident | Text | micro | text-tertiary | transparent | text-tertiary | 300,566 74x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,584 358x98 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,597 334x12 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.meta:nth-of-type(1) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 28,597 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.meta:nth-of-type(1) > span.rk.lo:nth-of-type(2)` | Low risk | Text | label | text-tertiary | transparent | text-tertiary | 138,597 66x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > p.rsn:nth-of-type(1)` | Three independent factors point the same way and none contradicts. That is what moves a call from Leaning to Confident — agreement, not margin. | Text | body-sm | text-secondary | transparent | text-secondary | 28,617 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,682 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2)` | Omen | TabNavItem | micro | accent | transparent | accent | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 69 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through omen-decision-brief.v3; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
