# Screen contract - CommandCenter

Compiled from `design/native-visual-lock-2026-09-13/CommandCenter.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `bd58950e3901`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Command — the week |
| Family | Command Center |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/dashboard/summary + GET /api/league/overview + GET /api/waivers/analysis + GET /api/moves?contract_version=moves-history.v2 |
| API contract | dashboard-summary.v1 + league-overview.v1 + waiver-analysis.v1 + moves-history.v2 |
| Governing rule | Small Council pages workshop; independent section failure |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values below are source evidence, not permission for local raw colors.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2, h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching component, implement the named component first; do not invent a local primitive.

## Experience contract

Command is the general manager view, not the head coach headset. It should feel like stepping back from the field to see the whole organization for this week: matchup state, lineup pressure, waiver opportunity, trade openings, league movement, and recent evidence. Each card is a light brief that helps the user decide where to go next.

Build acceptance:

- Show breadth before depth: one scannable read per active domain, then route to the destination that owns the detail.
- Keep the tone current and calm. Command can say what matters now, but it does not litigate every calculation.
- Do not duplicate Omen's single-move authority. If a card points at Omen, it says why the user should inspect it; it does not become the Omen result.
- Do not hide unavailable domains. If waivers, league activity, trades, or ledger evidence are unavailable, Command names the gap and keeps the rest of the desk useful.
- The screen passes only if a user can answer, in under ten seconds: what is happening this week, what area needs attention, and where to tap for depth.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · SLOPS SALOON`
- `▾`
- `+`
- `WEEK 7 · SUNDAY`
- `Command`
- `LINEUPS LOCK`
- `1:00 PM`
- `ESPN`
- `LIVE · Q2`
- `5–2 · YOU`
- `64.8`
- `119.6 – 114.2`
- `PROJECTED · 5.4 AHEAD`
- `GMR`
- `Gibbs me some Rice`
- `6–1`
- `51.2`
- `Four of your starters left; two of theirs.`
- `WAIVER WATCH`
- `League`
- `Jaylen Wright`
- `RB · TEN`
- `11.4`
- `Roschon Johnson`
- `RB · CHI`
- `4.1`
- `Pollard's out three weeks and Wright took almost every backup snap. Roschon is behind two healthy backs — you won't miss him.`
- `CONFIDENT`
- `LOW RISK`
- `THE LEDGER`
- `See all`
- `Start Stafford over Daniels`
- `THIS WEEK · START / SIT · YOU FOLLOWED IT`
- `Pending`
- `Omen`
- `Trade`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · SLOPS SALOON; ▾; + | LeagueSwitcherBar | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E011 | ▾ | Text | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E012 | + | Text | Open ConnectLeague to add another provider connection. |
| E049 | League | TextLink | Open LeagueTable for the active league. |
| E067 | See all | TextLink | Open the full source section using the route named in the data binding. |
| E077 | Command | TabNavItem | Open CommandCenter for the active league. |
| E080 | Omen | TabNavItem | Open OmenCall for the active league. |
| E083 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E086 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `LIVE · Q2`
- `Pollard's out three weeks and Wright took almost every backup snap. Roschon is behind two healthy backs — you won't miss him.`
- `CONFIDENT`
- `Pending`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E042 | page-control-dots | .screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) | 0,323 390x13 |
| E043 | page-control-dots | .screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i.on:nth-of-type(1) | 174,331 16x5 |
| E044 | page-control-dots | .screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i:nth-of-type(2) | 194,331 5x5 |
| E045 | page-control-dots | .screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i:nth-of-type(3) | 203,331 5x5 |
| E046 | page-control-dots | .screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i:nth-of-type(4) | 212,331 5x5 |
| E078 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E079 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E081 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E082 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E084 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E085 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E087 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E088 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 88. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 123x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · Sunday | Text | micro | accent | transparent | accent | 16,84 123x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Command | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 123x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > p.rt:nth-of-type(1)` | Lineups lock 1:00 PM | Text | micro | text-tertiary | transparent | text-tertiary | 282,94 92x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > p.rt:nth-of-type(1) > br:nth-of-type(1)` |  | NativeStack | micro | text-tertiary | transparent | text-tertiary | 374,95 0x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4)` |  | MatchupScoreboard | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,134 358x189 | pad 10/14/10/14; margin 12/16/0/16; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,145 330x12 | pad 0/0/0/0; margin 0/0/10/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.prov:nth-of-type(1)` | ESPN | PlatformBadge | micro | text-secondary | transparent | text-secondary | 30,145 50x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-espn-chip | text-secondary | 30,146 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bhead:nth-of-type(1) > span.live:nth-of-type(2)` | Live · Q2 | LiveStatusMark | micro | text-primary | transparent | text-primary | 286,145 74x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,167 330x34 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.crest:nth-of-type(1)` | TTO | Text | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 30,169 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bn:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 70,168 230x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bn:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | body-sm | text-primary | transparent | text-primary | 70,168 230x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bn:nth-of-type(2) > span:nth-of-type(1)` | 5–2 · you | Text | micro | text-tertiary | transparent | text-tertiary | 70,187 60x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow.me:nth-of-type(2) > span.bs.lead:nth-of-type(3)` | 64.8 | Text | score-lead | text-primary | transparent | text-primary | 310,167 50x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,207 330x22 | pad 0/0/0/0; margin 6/0/6/0; gap 10  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.ln:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 44,207 2x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.ln:nth-of-type(1) > i:nth-of-type(1)` |  | Text | body | text-primary | accent | text-primary | 44,229 2x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.mm:nth-of-type(2)` | Projected · 5.4 ahead | Text | micro | text-tertiary | transparent | text-tertiary | 70,207 290x22 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.bmid:nth-of-type(3) > span.mm:nth-of-type(2) > b:nth-of-type(1)` | 119.6 – 114.2 | Text | micro | text-secondary | transparent | text-secondary | 70,212 79x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 30,235 330x32 | pad 0/0/0/0; margin 0/0/0/0; gap 10  |
|  E036 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.crest:nth-of-type(1)` | GMR | Text | micro | text-secondary | surface-3 | text-secondary | 30,236 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 70,235 242x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > b:nth-of-type(1)` | Gibbs me some Rice | Text | body-sm | text-primary | transparent | text-primary | 70,235 242x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bn:nth-of-type(2) > span:nth-of-type(1)` | 6–1 | Text | micro | text-tertiary | transparent | text-tertiary | 70,254 22x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > div.brow:nth-of-type(4) > span.bs:nth-of-type(3)` | 51.2 | Text | score-trail | text-tertiary | transparent | text-tertiary | 322,242 38x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody:nth-of-type(1) > div.board:nth-of-type(4) > p.bwatch:nth-of-type(1)` | Four of your starters left; two of theirs. | Text | body-sm | text-secondary | transparent | text-primary-overlay | 30,275 330x26 | pad 8/0/0/0; margin 8/0/12/0; gap 0  |
|  E042 | `.screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5)` |  | PagerDots | body | text-primary | transparent | text-primary | 0,323 390x13 | pad 8/0/0/0; margin 0/0/0/0; gap 4  |
|  E043 | `.screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i.on:nth-of-type(1)` |  | Text | body | text-primary | accent | text-primary | 174,331 16x5 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i:nth-of-type(2)` |  | Text | body | text-primary | border-subtle | text-primary | 194,331 5x5 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i:nth-of-type(3)` |  | Text | body | text-primary | border-subtle | text-primary | 203,331 5x5 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody:nth-of-type(1) > div.dots:nth-of-type(5) > i:nth-of-type(4)` |  | Text | body | text-primary | border-subtle | text-primary | 212,331 5x5 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,348 390x15 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E048 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(6) > b:nth-of-type(1)` | Waiver watch | Text | micro | text-tertiary | transparent | text-tertiary | 16,349 108x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(6) > a:nth-of-type(1)` | League | TextLink | body-sm | accent | transparent | accent | 302,333 72x45 | pad 15->14/0/15->14/16; margin -15->0/0/-15->0/0; gap 4  |
|  E050 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7)` |  | Card | body | text-primary | surface-1 | accent-overlay | 16,369 358x146 | pad 12/13->12/12/13->12; margin 0/16/0/16; gap 8  |
|  E051 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,382 332x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.tick:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 41,382 2x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 63,382 298x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E054 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > b:nth-of-type(1)` | Jaylen Wright | Text | name | text-primary | transparent | text-primary | 63,384 86x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > em:nth-of-type(1)` | RB · TEN | Text | micro | text-tertiary | transparent | text-tertiary | 155,387 54x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > span.p:nth-of-type(1)` | 11.4 | Text | body-sm | text-primary | transparent | text-primary | 332,385 29x15 | pad 0/0/0/0; margin 0/0/0/116.391->96; gap 0  |
|  E057 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 63,402 298x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E058 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > b:nth-of-type(1)` | Roschon Johnson | Text | name | text-tertiary | transparent | text-tertiary | 63,404 107x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > em:nth-of-type(1)` | RB · CHI | Text | micro | text-tertiary | transparent | text-tertiary | 176,407 52x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > span.p:nth-of-type(1)` | 4.1 | Text | body-sm | text-tertiary | transparent | text-tertiary | 340,405 21x15 | pad 0/0/0/0; margin 0/0/0/106.438->96; gap 0  |
|  E061 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > p.rsn:nth-of-type(1)` | Pollard's out three weeks and Wright took almost every backup snap. Roschon is behind two healthy backs — you won't miss him. | Text | body-sm | text-secondary | transparent | text-secondary | 29,430 332x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.meta:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,491 332x12 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E063 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.meta:nth-of-type(2) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 29,491 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E064 | `.screen > div.sbody:nth-of-type(1) > div.card.hero:nth-of-type(7) > div.meta:nth-of-type(2) > span.risk:nth-of-type(2)` | Low risk | RiskLabel | micro | text-tertiary | transparent | text-tertiary | 139,491 61x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,527 390x15 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E066 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(8) > b:nth-of-type(1)` | The Ledger | Text | micro | text-tertiary | transparent | text-tertiary | 16,528 86x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.sbody:nth-of-type(1) > div.sh:nth-of-type(8) > a:nth-of-type(1)` | See all | TextLink | body-sm | accent | transparent | accent | 306,512 68x45 | pad 15->14/0/15->14/16; margin -15->0/0/-15->0/0; gap 4  |
|  E068 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,548 358x51 | pad 2/13->12/4/13->12; margin 0/16/0/16; gap 0  |
|  E069 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 29,551 332x44 | pad 8/0/8/0; margin 0/0/0/0; gap 10  |
|  E070 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 29,559 278x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > b:nth-of-type(1)` | Start Stafford over Daniels | Text | body-sm | text-primary | transparent | text-primary | 29,559 278x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.ld:nth-of-type(1) > span:nth-of-type(1)` | This week · start / sit · you followed it | Text | micro | text-tertiary | transparent | text-tertiary | 29,575 278x12 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E073 | `.screen > div.sbody:nth-of-type(1) > div.card:nth-of-type(9) > div.lrow:nth-of-type(1) > span.lo.pend:nth-of-type(2)` | Pending | Text | micro | text-secondary | transparent | text-secondary | 317,567 44x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,599 390x170 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E075 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,769 390x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E076 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E077 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1)` | Command | TabNavItem | micro | accent | transparent | accent | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E078 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E079 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E080 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E081 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E082 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E083 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E084 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E085 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E086 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E087 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E088 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 88 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through dashboard-summary.v1 + league-overview.v1 + waiver-analysis.v1 + moves-history.v2; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
