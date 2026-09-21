# Screen contract - TradeVerdict

Compiled from `design/native-visual-lock-2026-09-13/TradeVerdict.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `af0f335ef81b`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Trade — the read |
| Family | Trade |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 69px. |
| Data route | POST /api/trade/compare |
| API contract | trade-compare.v2 |
| Capability profile | `trade` — expresses per `capability-expression-v1.md` |
| Governing rule | Trade workshop section 9.2 verdict states |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values below are source evidence, not permission for local raw colors.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2, h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching component, implement the named component first; do not invent a local primitive.

## Experience contract

Trade is the argument-settler and advisor. A user should open it when a league chat is debating whether a deal is fair, smart, close, insulting, or veto-worthy. It must be good enough to become the shared reference in that argument.

Build acceptance:

- Show both sides in a way a commissioner, manager, or skeptical friend can understand without reading hidden math.
- State the verdict plainly: who benefits, whether it is close, what risk could change the answer, and whether the result supports a fair-trade or veto conversation.
- Keep advice separate from action. Until the server supports sending offers, Trade is analysis and handoff only.
- Close or insufficient-data trades must still help: name the missing context and what would make the answer stronger.
- The share state must be quotable: it should carry the verdict, the why, and the caveat without leaking private roster data beyond what the user chose to analyze.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · SLOPS SALOON`
- `▾`
- `+`
- `TWO TEAMS`
- `The read`
- `JD`
- `YOU SEND`
- `Out`
- `Jonathan Taylor`
- `RB · IND`
- `RB 8`
- `DAVANTE’S INFERNO SENDS`
- `In`
- `Ja’Marr Chase`
- `WR · CIN`
- `WR 3`
- `Take it`
- `CONFIDENT`
- `You are two deep at running back and starting a WR3 who projects 8.2. Chase is the best player in the deal and the position you actually need. Taylor is the better asset in a vacuum — you are not in a vacuum, you are 5–2 and one receiver short.`
- `MEDIUM RISK`
- `LIVE`
- `YOUR NEED`
- `WR3 has cost you about six points a week since the bye.`
- `THEIR NEED`
- `Thin at RB with two on bye in week 9. They will not counter hard.`
- `RISK`
- `Chase has missed two games with a hip. That is the medium, and it is why this is not a lock.`
- `HOW TO SUBMIT THIS`
- `ESPN · HANDOFF ONLY`
- `Copy the offer to your clipboard.`
- `Open ESPN, go to the league, tap Trade.`
- `Paste and send.`
- `Omen never submits on your behalf.`
- `Copy the offer & open ESPN`
- `Ask Omen for a counter`
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
| E059 | Copy the offer & open ESPN | Button.primary | Provider handoff to ESPN for this accepted move or offer. |
| E060 | Ask Omen for a counter | Button.secondary | Re-run trade-compare.v2 requesting a counter suggestion for the same two-team context. |
| E063 | Command | TabNavItem | Open CommandCenter for the active league. |
| E066 | Omen | TabNavItem | Open OmenCall for the active league. |
| E069 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E072 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Out`
- `CONFIDENT`
- `LIVE`
- `WR3 has cost you about six points a week since the bye.`
- `Open ESPN, go to the league, tap Trade.`
- `Copy the offer & open ESPN`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E064 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E065 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E067 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E068 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E070 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E071 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E073 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E074 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 74. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 84x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Two teams | Text | micro | accent | transparent | accent | 16,86 84x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The read | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 84x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,137 358x154 | pad 0/0/0/0; margin 12/16/0/16; gap 6  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legh:nth-of-type(1)` | You send | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,137 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,156 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.ar.out:nth-of-type(1)` | Out | Text | micro | text-tertiary | transparent | text-tertiary | 26,177 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,166 250x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Jonathan Taylor | Text | body-sm | text-primary | transparent | text-primary | 58,166 250x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | RB · IND | Text | micro | text-tertiary | transparent | text-tertiary | 58,187 38x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(2) > span.rk:nth-of-type(3)` | RB 8 | Text | label | text-tertiary | transparent | text-tertiary | 318,173 46x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legh:nth-of-type(3)` | Davante’s Inferno sends | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,217 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,236 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.ar:nth-of-type(1)` | In | Text | micro | accent | transparent | accent | 26,257 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,246 247x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Ja’Marr Chase | Text | body-sm | text-primary | transparent | text-primary | 58,246 247x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | WR · CIN | Text | micro | text-tertiary | transparent | text-tertiary | 58,267 41x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(4) > div.legrow:nth-of-type(4) > span.rk:nth-of-type(3)` | WR 3 | Text | label | text-tertiary | transparent | text-tertiary | 315,253 49x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5)` |  | NativeStack | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,305 358x438 | pad 14/14/14/14; margin 14/16/0/16; gap 8  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.verdh:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,320 330x21 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.verdh:nth-of-type(1) > b:nth-of-type(1)` | Take it | Text | h3 | text-primary | transparent | text-primary | 30,320 51x21 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.verdh:nth-of-type(1) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 266,324 94x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > p.rsn:nth-of-type(1)` | You are two deep at running back and starting a WR3 who projects 8.2. Chase is the best player in the deal and the position you actually need. Taylor is the better asset in a vacuum — you are not in a vacuum, you are 5–2 and one receiver short. | Text | body-sm | text-secondary | transparent | text-secondary | 30,349 330x89 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.meta:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,445 330x20 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.meta:nth-of-type(2) > span.rk.med:nth-of-type(1)` | Medium risk | Text | label | text-primary | risk-medium | text-primary | 30,445 106x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.meta:nth-of-type(2) > span.ds.live:nth-of-type(2)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 150,446 57x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3)` |  | EvidenceDisclosure | body | text-primary | transparent | text-primary-overlay | 30,473 330x129 | pad 10/0/0/0; margin 0/0/0/0; gap 8  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(1)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,484 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(1) > span.k:nth-of-type(1)` | Your need | Text | micro | text-tertiary | transparent | text-tertiary | 30,484 58x30 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(1) > span.v:nth-of-type(2)` | WR3 has cost you about six points a week since the bye. | Text | body-sm | text-secondary | transparent | text-secondary | 98,484 262x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(2)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,527 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(2) > span.k:nth-of-type(1)` | Their need | Text | micro | text-tertiary | transparent | text-tertiary | 30,527 58x30 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(2) > span.v:nth-of-type(2)` | Thin at RB with two on bye in week 9. They will not counter hard. | Text | body-sm | text-secondary | transparent | text-secondary | 98,527 262x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(3)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 30,569 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(3) > span.k:nth-of-type(1)` | Risk | Text | micro | text-tertiary | transparent | text-tertiary | 30,569 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.ev:nth-of-type(3) > div.evr:nth-of-type(3) > span.v:nth-of-type(2)` | Chase has missed two games with a hip. That is the medium, and it is why this is not a lock. | Text | body-sm | text-secondary | transparent | text-secondary | 98,569 262x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary-overlay | 30,621 330x108 | pad 10/0/0/0; margin 10/0/0/0; gap 8  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > div.hh:nth-of-type(1)` | How to submit this | NativeStack | micro | text-tertiary | transparent | text-tertiary | 30,632 330x19 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > div.hh:nth-of-type(1) > span.cap:nth-of-type(1)` | ESPN · handoff only | Text | micro | text-tertiary | transparent | border | 215,632 145x19 | pad 2/6/2/6; margin 0/0/0/38.25->40; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > ol.steps:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,659 330x70 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > ol.steps:nth-of-type(1) > li:nth-of-type(1)` | Copy the offer to your clipboard. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,659 330x18 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > ol.steps:nth-of-type(1) > li:nth-of-type(2)` | Open ESPN, go to the league, tap Trade. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,685 330x18 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > ol.steps:nth-of-type(1) > li:nth-of-type(3)` | Paste and send. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,711 330x18 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(5) > div.howto:nth-of-type(4) > ol.steps:nth-of-type(1) > li:nth-of-type(3) > b:nth-of-type(1)` | Omen never submits on your behalf. | Text | body-sm | text-secondary | transparent | text-secondary | 151,711 207x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(6)` | Copy the offer & open ESPN | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,755 358x42 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(7)` | Ask Omen for a counter | Button.secondary | card-lead | text-secondary | transparent | border | 16,805 358x44 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,849 390x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3)` | Trade | TabNavItem | micro | accent | transparent | accent | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E073 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 74 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through trade-compare.v2; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
