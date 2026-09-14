# Screen contract - LedgerDetail

Compiled from `design/native-visual-lock-2026-09-13/LedgerDetail.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `5472e91423db`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Ledger — one call |
| Family | Ledger, switcher, account |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/moves/:id |
| API contract | move-detail.v1 |
| Governing rule | Immutable snapshot; raw win/loss translates before render |

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
- `WEEK 4 · START / SIT`
- `The receipt`
- `JD`
- `ISSUED TUE 3:00 AM`
- `IMMUTABLE`
- `START / SIT`
- `Bench Kyren Williams`
- `Snap share fell to 54% over two weeks while Blake Corum climbed to 38%.`
- `LEANING`
- `MEDIUM RISK`
- `WHAT HAPPENED`
- `CLOSED`
- `YOU FOLLOWED IT`
- `IT DID NOT WORK`
- `Williams went for 21.4. Omen was wrong. The snap-share read was accurate and did not survive the game script — the Rams trailed by seventeen and abandoned the committee.`
- `THE EVIDENCE AS IT STOOD THEN`
- `SNAPS`
- `54% over two weeks, down from 71%. LIVE`
- `CORUM`
- `38% and rising in the same window. LIVE`
- `GAME SCRIPT`
- `Not modelled. Omen had no view of this and it is what decided the game.`
- `This receipt is frozen as it was issued. Losses stay in the Ledger — a record that only shows wins is marketing.`
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

- `LEANING`
- `CLOSED`
- `IT DID NOT WORK`
- `54% over two weeks, down from 71%. LIVE`
- `38% and rising in the same window. LIVE`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E055 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E056 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E058 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E059 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E061 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E062 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E064 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E065 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 65. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 144x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 4 · Start / sit | Text | micro | accent | transparent | accent | 16,86 144x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The receipt | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 144x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,137 358x13 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(1)` | Issued Tue 3:00 AM | Text | micro | text-tertiary | transparent | text-tertiary | 16,137 127x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.scope:nth-of-type(4) > span:nth-of-type(2)` | Immutable | Text | micro | text-tertiary | transparent | text-tertiary | 301,137 73x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5)` |  | DecisionBrief | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,160 358x150 | pad 14/14/14/14; margin 10/16/0/16; gap 10  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5) > span.ctype:nth-of-type(1)` | Start / sit | Text | micro | text-tertiary | transparent | text-tertiary | 30,175 330x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5) > h3.callh:nth-of-type(1)` | Bench Kyren Williams | Text.heading | call | text-primary | transparent | text-primary | 30,198 330x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5) > p.callr:nth-of-type(1)` | Snap share fell to 54% over two weeks while Blake Corum climbed to 38%. | Text | name | text-secondary | transparent | text-secondary | 30,228 330x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,276 330x20 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5) > div.meta:nth-of-type(1) > span.band.b-lean:nth-of-type(1)` | Leaning | ConfidenceBand | micro | text-secondary | transparent | text-secondary | 30,279 77x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.call:nth-of-type(5) > div.meta:nth-of-type(1) > span.rk.med:nth-of-type(2)` | Medium risk | Text | label | text-primary | risk-medium | text-primary | 121,276 106x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,322 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6) > b:nth-of-type(1)` | What happened | Text | micro | text-tertiary | transparent | text-tertiary | 16,322 114x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6) > span:nth-of-type(1)` | Closed | Text | micro | text-tertiary | transparent | text-tertiary | 325,322 49x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,341 358x119 | pad 12/12/12/12; margin 0/16/0/16; gap 10  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > div.outcome:nth-of-type(1)` |  | OutcomeBadgeGroup | micro | text-primary | transparent | text-primary | 28,354 334x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > div.outcome:nth-of-type(1) > span.o-y:nth-of-type(1)` | You followed it | Text | micro | text-primary | transparent | text-primary | 28,354 111x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > div.outcome:nth-of-type(1) > span.o-n:nth-of-type(2)` | It did not work | Text | micro | text-tertiary | transparent | text-tertiary | 147,354 118x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1)` | Omen was wrong. The snap-share read was accurate and did not survive the game script — the Rams trailed by seventeen and abandoned the committee. | Text | body-sm | text-secondary | transparent | text-secondary | 28,377 334x71 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(7) > p.rsn:nth-of-type(1) > b:nth-of-type(1)` | Williams went for 21.4. | Text | body-sm | text-primary | transparent | text-primary | 28,378 129x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,472 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8) > b:nth-of-type(1)` | The evidence as it stood then | Text | micro | text-tertiary | transparent | text-tertiary | 16,472 228x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,491 358x116 | pad 12/12/12/12; margin 0/16/0/16; gap 9->8  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(1)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 28,504 334x20 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(1) > span.k:nth-of-type(1)` | Snaps | Text | micro | text-tertiary | transparent | text-tertiary | 28,504 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(1) > span.v:nth-of-type(2)` | 54% over two weeks, down from 71%. | Text | body-sm | text-secondary | transparent | text-secondary | 96,504 266x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(1) > span.v:nth-of-type(2) > span.ds.live:nth-of-type(1)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 305,504 57x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(2)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 28,532 334x20 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(2) > span.k:nth-of-type(1)` | Corum | Text | micro | text-tertiary | transparent | text-tertiary | 28,532 58x16 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(2) > span.v:nth-of-type(2)` | 38% and rising in the same window. | Text | body-sm | text-secondary | transparent | text-secondary | 96,532 266x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(2) > span.v:nth-of-type(2) > span.ds.live:nth-of-type(1)` | Live | LiveStatusMark | micro | text-primary | surface-3 | text-primary | 295,533 57x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(3)` |  | EvidenceRow | body-sm | text-primary | transparent | text-primary | 28,561 334x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(3) > span.k:nth-of-type(1)` | Game script | Text | micro | text-tertiary | transparent | text-tertiary | 28,561 58x30 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.evr:nth-of-type(3) > span.v.pv-none:nth-of-type(2)` | Not modelled. Omen had no view of this and it is what decided the game. | Text | body-sm | text-secondary | transparent | text-secondary | 96,561 266x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(10)` | This receipt is frozen as it was issued. Losses stay in the Ledger — a record that only shows wins is marketing. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,619 358x63 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,682 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E055 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2)` | Omen | TabNavItem | micro | accent | transparent | accent | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E058 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 65 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through move-detail.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
