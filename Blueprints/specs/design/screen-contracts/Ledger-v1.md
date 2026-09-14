# Screen contract - Ledger

Compiled from `design/native-visual-lock-2026-09-13/Ledger.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `1fb3a8fbde83`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | The Ledger |
| Family | Ledger, switcher, account |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/moves?contract_version=moves-history.v2&platform={platform}&league_id={league_id} |
| API contract | moves-history.v2 |
| Governing rule | C4 resolved here; index requires explicit league scope and maps raw outcomes to worked/did_not_work/not_verified |

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
- `11 CALLS`
- `The Ledger`
- `JD`
- `WEEK 7`
- `1 OPEN`
- `Start Stafford over Daniels`
- `START / SIT`
- `OUTCOME PENDING`
- `YOU FOLLOWED IT`
- `Claim Wright, drop Johnson`
- `WAIVER`
- `YOU PASSED`
- `SELF-REPORTED`
- `Wright went for 94 and a score. Somebody else claimed him Wednesday.`
- `WEEKS 1–6`
- `9 CLOSED`
- `Trade Kupp for Nacua`
- `TRADE`
- `FOLLOWED`
- `WORKED`
- `Bench Kyren Williams, Week 4`
- `DIDN'T WORK`
- `He went for 21.4. Omen was wrong — the snap-share read didn't survive the game script.`
- `Claim Tank Dell, Week 3`
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
| E063 | Command | TabNavItem | Open CommandCenter for the active league. |
| E066 | Omen | TabNavItem | Open OmenCall for the active league. |
| E069 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E072 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `1 OPEN`
- `OUTCOME PENDING`
- `SELF-REPORTED`
- `9 CLOSED`
- `WORKED`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E064 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E065 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E067 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E068 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E070 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E071 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 115x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | 11 calls | Text | micro | accent | transparent | accent | 16,86 115x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The Ledger | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 115x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,137 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4) > b:nth-of-type(1)` | Week 7 | Text | micro | text-tertiary | transparent | text-tertiary | 16,137 50x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4) > span:nth-of-type(1)` | 1 open | Text | micro | text-tertiary | transparent | text-tertiary | 330,137 44x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5)` |  | LedgerRow | body | text-primary | transparent | text-primary | 0,156 390x56 | pad 10/16/10/16; margin 0/0/0/0; gap 6  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5) > div.lgt:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,166 358x16 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5) > div.lgt:nth-of-type(1) > b:nth-of-type(1)` | Start Stafford over Daniels | Text | name | text-primary | transparent | text-primary | 16,166 161x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5) > div.lgt:nth-of-type(1) > em:nth-of-type(1)` | Start / sit | Text | micro | text-tertiary | transparent | text-tertiary | 302,169 72x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5) > div.outcome:nth-of-type(2)` |  | OutcomeBadgeGroup | micro | text-primary | transparent | text-primary | 16,188 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5) > div.outcome:nth-of-type(2) > span.o-p:nth-of-type(1)` | Outcome pending | Text | micro | text-tertiary | transparent | text-tertiary | 16,188 119x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(5) > div.outcome:nth-of-type(2) > span.o-y:nth-of-type(2)` | You followed it | Text | micro | text-primary | transparent | text-primary | 143,188 122x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6)` |  | LedgerRow | body | text-primary | transparent | text-primary | 0,212 390x98 | pad 10/16/10/16; margin 0/0/0/0; gap 6  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > div.lgt:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,222 358x16 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > div.lgt:nth-of-type(1) > b:nth-of-type(1)` | Claim Wright, drop Johnson | Text | name | text-primary | transparent | text-primary | 16,222 170x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > div.lgt:nth-of-type(1) > em:nth-of-type(1)` | Waiver | Text | micro | text-tertiary | transparent | text-tertiary | 326,225 48x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > div.outcome:nth-of-type(2)` |  | OutcomeBadgeGroup | micro | text-primary | transparent | text-primary | 16,244 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > div.outcome:nth-of-type(2) > span.o-n:nth-of-type(1)` | You passed | Text | micro | text-tertiary | transparent | text-tertiary | 16,244 76x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > div.outcome:nth-of-type(2) > span.o-s:nth-of-type(2)` | Self-reported | Text | micro | text-secondary | transparent | text-secondary | 100,244 109x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(6) > p.rsn:nth-of-type(1)` | Wright went for 94 and a score. Somebody else claimed him Wednesday. | Text | body-sm | text-secondary | transparent | text-secondary | 16,263 358x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,321 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | Weeks 1–6 | Text | micro | text-tertiary | transparent | text-tertiary | 16,321 73x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > span:nth-of-type(1)` | 9 closed | Text | micro | text-tertiary | transparent | text-tertiary | 314,321 60x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8)` |  | LedgerRow | body | text-primary | transparent | text-primary | 0,340 390x56 | pad 10/16/10/16; margin 0/0/0/0; gap 6  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8) > div.lgt:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,350 358x16 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8) > div.lgt:nth-of-type(1) > b:nth-of-type(1)` | Trade Kupp for Nacua | Text | name | text-primary | transparent | text-primary | 16,350 131x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8) > div.lgt:nth-of-type(1) > em:nth-of-type(1)` | Trade | Text | micro | text-tertiary | transparent | text-tertiary | 333,353 41x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8) > div.outcome:nth-of-type(2)` |  | OutcomeBadgeGroup | micro | text-primary | transparent | text-primary | 16,372 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8) > div.outcome:nth-of-type(2) > span.o-y:nth-of-type(1)` | Followed | Text | micro | text-primary | transparent | text-primary | 16,372 67x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(8) > div.outcome:nth-of-type(2) > span.o-y:nth-of-type(2)` | Worked | Text | micro | text-primary | transparent | text-primary | 91,372 65x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9)` |  | LedgerRow | body | text-primary | transparent | text-primary | 0,396 390x98 | pad 10/16/10/16; margin 0/0/0/0; gap 6  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > div.lgt:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,406 358x16 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > div.lgt:nth-of-type(1) > b:nth-of-type(1)` | Bench Kyren Williams, Week 4 | Text | name | text-primary | transparent | text-primary | 16,406 183x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > div.lgt:nth-of-type(1) > em:nth-of-type(1)` | Start / sit | Text | micro | text-tertiary | transparent | text-tertiary | 302,409 72x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > div.outcome:nth-of-type(2)` |  | OutcomeBadgeGroup | micro | text-primary | transparent | text-primary | 16,428 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > div.outcome:nth-of-type(2) > span.o-y:nth-of-type(1)` | Followed | Text | micro | text-primary | transparent | text-primary | 16,428 67x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > div.outcome:nth-of-type(2) > span.o-n:nth-of-type(2)` | Didn't work | Text | micro | text-tertiary | transparent | text-tertiary | 91,428 94x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(9) > p.rsn:nth-of-type(1)` | He went for 21.4. Omen was wrong — the snap-share read didn't survive the game script. | Text | body-sm | text-secondary | transparent | text-secondary | 16,447 358x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10)` |  | LedgerRow | body | text-primary | transparent | text-primary | 0,494 390x56 | pad 10/16/10/16; margin 0/0/0/0; gap 6  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10) > div.lgt:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,504 358x16 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10) > div.lgt:nth-of-type(1) > b:nth-of-type(1)` | Claim Tank Dell, Week 3 | Text | name | text-primary | transparent | text-primary | 16,504 143x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10) > div.lgt:nth-of-type(1) > em:nth-of-type(1)` | Waiver | Text | micro | text-tertiary | transparent | text-tertiary | 326,507 48x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10) > div.outcome:nth-of-type(2)` |  | OutcomeBadgeGroup | micro | text-primary | transparent | text-primary | 16,526 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10) > div.outcome:nth-of-type(2) > span.o-y:nth-of-type(1)` | Followed | Text | micro | text-primary | transparent | text-primary | 16,526 67x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.lg:nth-of-type(10) > div.outcome:nth-of-type(2) > span.o-y:nth-of-type(2)` | Worked | Text | micro | text-primary | transparent | text-primary | 91,526 65x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,550 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2)` | Omen | TabNavItem | micro | accent | transparent | accent | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E073 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 74 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through moves-history.v2; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
