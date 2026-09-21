# Screen contract - TradeBuild

Compiled from `design/native-visual-lock-2026-09-13/TradeBuild.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `a86f09037bf8`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Trade — build |
| Family | Trade |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 34px. |
| Data route | GET /api/trade/capabilities + POST /api/trade/compare |
| API contract | trade-capabilities.v1 + trade-compare.v2 |
| Capability profile | `trade` — expresses per `capability-expression-v1.md` |
| Governing rule | Free public compare; bearer + league_context opts into personalization; max_teams is 2 until capabilities changes |

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
- `THREE TEAMS`
- `Build a deal`
- `JD`
- `TYPE A TRADE`
- `BUILD A TRADE`
- `DSI`
- `Davante's`
- `NEEDS RB`
- `CHB`
- `Chubb Rock`
- `NEEDS WR`
- `GMR`
- `Gibbs`
- `NO HOLE`
- `Add team`
- `ALL`
- `QB`
- `RB`
- `WR`
- `TE`
- `FILLS MY RB HOLE`
- `YOU SEND`
- `Out`
- `Jonathan Taylor`
- `RB · IND → Davante's`
- `RB 8`
- `DAVANTE'S INFERNO SENDS`
- `In`
- `Ja'Marr Chase`
- `WR · CIN → Chubb Rock`
- `WR 3`
- `CHUBB ROCK SENDS`
- `Tyjae Spears`
- `RB · TEN → you`
- `—`
- `Counter`
- `LEANING`
- `Three-team deals fail on the middle team. Ask Chubb Rock for their 2027 second — you're taking the least certain asset.`
- `HOW TO SUBMIT THIS`
- `ESPN · HANDOFF ONLY`
- `Copy the offer — all three legs go to your clipboard.`
- `ESPN can't build a three-team trade. Send it as two linked two-team trades, in this order.`
- `Taylor → Davante's first. Tell them it's contingent on the second leg.`
- `Then Chase → Chubb Rock. Both accept or neither should.`
- `Copy all three legs & open ESPN`
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
| E019 | Type a trade | Text | Switch the local input segment; do not change the selected league or route contract. |
| E020 | Build a trade | Text | Switch the local input segment; do not change the selected league or route contract. |
| E022 |  | PartnerChip | Select this trade partner; comparison remains capped to two teams by trade-capabilities.v1. |
| E026 |  | PartnerChip | Select this trade partner; comparison remains capped to two teams by trade-capabilities.v1. |
| E030 |  | PartnerChip | Select this trade partner; comparison remains capped to two teams by trade-capabilities.v1. |
| E034 |  | PartnerChip | Select this trade partner; comparison remains capped to two teams by trade-capabilities.v1. |
| E038 | All | FilterChip | Filter the visible local list only; preserve source order within the filter. |
| E039 | QB | FilterChip | Filter the visible local list only; preserve source order within the filter. |
| E040 | RB | FilterChip | Filter the visible local list only; preserve source order within the filter. |
| E041 | WR | FilterChip | Filter the visible local list only; preserve source order within the filter. |
| E042 | TE | FilterChip | Filter the visible local list only; preserve source order within the filter. |
| E043 | Fills my RB hole | FilterChip | Filter the visible local list only; preserve source order within the filter. |
| E079 | Copy all three legs & open ESPN | Button.primary | Disabled while trade-capabilities.v1 reports max_teams=2; otherwise provider handoff to ESPN after compare succeeds. |
| E082 | Command | TabNavItem | Open CommandCenter for the active league. |
| E085 | Omen | TabNavItem | Open OmenCall for the active league. |
| E088 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E091 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Out`
- `LEANING`
- `Copy all three legs & open ESPN`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E083 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E084 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E086 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E087 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E089 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E090 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E092 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E093 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 93. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 112x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Three teams | Text | micro | accent | transparent | accent | 16,86 112x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Build a deal | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 112x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.tabs2:nth-of-type(4)` |  | SegmentedTabs | body | text-primary | transparent | text-primary | 16,137 358x24 | pad 0/0/0/0; margin 12/16/0/16; gap 16  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.tabs2:nth-of-type(4) > span:nth-of-type(1)` | Type a trade | Text | label | text-tertiary | transparent | text-tertiary | 16,137 94x24 | pad 0/0/8/0; margin 0/0/-1->0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.tabs2:nth-of-type(4) > span.on:nth-of-type(2)` | Build a trade | Text | label | text-primary | transparent | text-primary | 126,137 100x24 | pad 0/0/8/0; margin 0/0/-1->0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,161 390x14 | pad 12/16/2/16; margin 0/0/0/0; gap 8  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1)` |  | PartnerChip | body | text-primary | transparent | text-primary | 16,173 62x0 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1) > span.cr:nth-of-type(1)` | DSI | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 25,173 44x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1) > span.n:nth-of-type(2)` | Davante's | Text | micro | text-primary | transparent | text-primary | 24,190 46x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(1) > span.need:nth-of-type(3)` | Needs RB | Text | micro | accent | transparent | accent | 18,206 57x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(2)` |  | PartnerChip | body | text-primary | transparent | text-primary | 86,173 62x0 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(2) > span.cr:nth-of-type(1)` | CHB | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 95,173 44x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(2) > span.n:nth-of-type(2)` | Chubb Rock | Text | micro | text-primary | transparent | text-primary | 88,190 58x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.on:nth-of-type(2) > span.need:nth-of-type(3)` | Needs WR | Text | micro | accent | transparent | accent | 87,206 61x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(3)` |  | PartnerChip | body | text-primary | transparent | text-primary | 156,173 62x0 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(3) > span.cr:nth-of-type(1)` | GMR | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 165,173 44x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(3) > span.n:nth-of-type(2)` | Gibbs | Text | micro | text-tertiary | transparent | text-tertiary | 173,190 28x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt:nth-of-type(3) > span.need:nth-of-type(3)` | No hole | Text | micro | accent | transparent | accent | 161,206 52x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.addt:nth-of-type(4)` |  | PartnerChip | body | text-primary | transparent | text-primary | 226,173 62x0 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.addt:nth-of-type(4) > span.cr:nth-of-type(1)` | + | CrestOrProviderMark | h3 | text-tertiary | transparent | border | 235,173 44x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.partners:nth-of-type(5) > span.pt.addt:nth-of-type(4) > span.n:nth-of-type(2)` | Add team | Text | micro | text-tertiary | transparent | text-tertiary | 234,202 46x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,175 390x12 | pad 10/16/2/16; margin 0/0/0/0; gap 6  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6) > span.fc.on:nth-of-type(1)` | All | FilterChip | micro | text-primary | surface-3 | transparent | 16,185 44x14 | pad 6/10/6/10; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6) > span.fc:nth-of-type(2)` | QB | FilterChip | micro | text-tertiary | transparent | border-subtle | 66,185 39x14 | pad 6/10/6/10; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6) > span.fc:nth-of-type(3)` | RB | FilterChip | micro | text-tertiary | transparent | border-subtle | 111,185 38x14 | pad 6/10/6/10; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6) > span.fc:nth-of-type(4)` | WR | FilterChip | micro | text-tertiary | transparent | border-subtle | 154,185 41x14 | pad 6/10/6/10; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6) > span.fc:nth-of-type(5)` | TE | FilterChip | micro | text-tertiary | transparent | border-subtle | 201,185 36x14 | pad 6/10/6/10; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.filters:nth-of-type(6) > span.fc.smart:nth-of-type(6)` | Fills my RB hole | FilterChip | micro | accent | transparent | accent-overlay | 243,185 128x14 | pad 6/10/6/10; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,199 358x234 | pad 0/0/0/0; margin 12/16/0/16; gap 6  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legh:nth-of-type(1)` | You send | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,199 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(2)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,218 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(2) > span.ar.out:nth-of-type(1)` | Out | Text | micro | text-tertiary | transparent | text-tertiary | 26,239 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,228 250x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Jonathan Taylor | Text | body-sm | text-primary | transparent | text-primary | 58,228 250x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(2) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | RB · IND → Davante's | Text | micro | text-tertiary | transparent | text-tertiary | 58,249 97x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(2) > span.rk:nth-of-type(3)` | RB 8 | Text | label | text-tertiary | transparent | text-tertiary | 318,235 46x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legh:nth-of-type(3)` | Davante's Inferno sends | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,279 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(4)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,298 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(4) > span.ar:nth-of-type(1)` | In | Text | micro | accent | transparent | accent | 26,319 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,308 247x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Ja'Marr Chase | Text | body-sm | text-primary | transparent | text-primary | 58,308 247x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(4) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | WR · CIN → Chubb Rock | Text | micro | text-tertiary | transparent | text-tertiary | 58,329 112x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(4) > span.rk:nth-of-type(3)` | WR 3 | Text | label | text-tertiary | transparent | text-tertiary | 315,315 49x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legh:nth-of-type(5)` | Chubb Rock sends | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,359 358x13 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(6)` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 16,378 358x55 | pad 10/10/10/10; margin 0/0/0/0; gap 10  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(6) > span.ar:nth-of-type(1)` | In | Text | micro | accent | transparent | accent | 26,399 22x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(6) > span.pl:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 58,388 268x35 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(6) > span.pl:nth-of-type(2) > b:nth-of-type(1)` | Tyjae Spears | Text | body-sm | text-primary | transparent | text-primary | 58,388 268x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(6) > span.pl:nth-of-type(2) > span:nth-of-type(1)` | RB · TEN → you | Text | micro | text-tertiary | transparent | text-tertiary | 58,409 71x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.leg:nth-of-type(7) > div.legrow:nth-of-type(6) > span.rk:nth-of-type(3)` | — | Text | label | text-tertiary | transparent | text-tertiary | 336,395 28x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E066 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8)` |  | NativeStack | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,447 358x313 | pad 14/14/14/14; margin 14/16/0/16; gap 8  |
|  E067 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.verdh:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,462 330x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.verdh:nth-of-type(1) > b:nth-of-type(1)` | Counter | Text | h3 | text-primary | transparent | text-primary | 30,462 68x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.verdh:nth-of-type(1) > span.band.b-lean:nth-of-type(1)` | Leaning | ConfidenceBand | micro | text-secondary | transparent | text-secondary | 283,467 77x13 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E070 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > p.rsn:nth-of-type(1)` | Three-team deals fail on the middle team. Ask Chubb Rock for their 2027 second — you're taking the least certain asset. | Text | body-sm | text-secondary | transparent | text-secondary | 30,493 330x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary-overlay | 30,564 330x182 | pad 10/0/0/0; margin 10/0/0/0; gap 8  |
|  E072 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > div.hh:nth-of-type(1)` | How to submit this | NativeStack | micro | text-tertiary | transparent | text-tertiary | 30,575 330x19 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E073 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > div.hh:nth-of-type(1) > span.cap:nth-of-type(1)` | ESPN · handoff only | Text | micro | text-tertiary | transparent | border | 215,575 145x19 | pad 2/6/2/6; margin 0/0/0/38.25->40; gap 0  |
|  E074 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > ol.steps:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,602 330x144 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E075 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > ol.steps:nth-of-type(1) > li:nth-of-type(1)` | Copy the offer — all three legs go to your clipboard. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,602 330x18 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E076 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > ol.steps:nth-of-type(1) > li:nth-of-type(2)` | ESPN can't build a three-team trade. Send it as two linked two-team trades, in this order. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,628 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E077 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > ol.steps:nth-of-type(1) > li:nth-of-type(3)` | Taylor → Davante's first. Tell them it's contingent on the second leg. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,670 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E078 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.verd:nth-of-type(8) > div.howto:nth-of-type(2) > ol.steps:nth-of-type(1) > li:nth-of-type(4)` | Then Chase → Chubb Rock. Both accept or neither should. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 30,712 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E079 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(9)` | Copy all three legs & open ESPN | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,772 358x42 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E080 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,814 390x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E081 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E082 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E083 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E084 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E085 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E086 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E087 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E088 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3)` | Trade | TabNavItem | micro | accent | transparent | accent | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E089 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E090 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E091 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E092 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E093 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 93 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through trade-capabilities.v1 + trade-compare.v2; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
