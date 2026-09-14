# Screen contract - LeagueTable

Compiled from `design/native-visual-lock-2026-09-13/LeagueTable.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `975de5898f56`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | League — the table |
| Family | League & waiver |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 126px. |
| Data route | GET /api/league/overview |
| API contract | league-overview.v1 |
| Governing rule | Scout nest order: strip, Table, Trade targets, Waiver, Activity |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values below are source evidence, not permission for local raw colors.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2, h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching component, implement the named component first; do not invent a local primitive.

## Experience contract

League is the scout room. It should feel like Omen has people watching the whole league: standings pressure, opponent needs, trade openings, waiver shape, matchup context, and recent movement. This is where the user learns what everyone else is likely to do next.

Build acceptance:

- Put league intelligence before decoration: standings, pressure, needs, openings, waiver context, and activity each earn their space by changing what the user would do.
- Provider gaps are part of the intelligence picture. If ESPN, Yahoo, or Sleeper cannot provide a feed, say which section is partial instead of averaging the league into a false complete state.
- The League screen can suggest where to hunt, but the detailed trade verdict belongs in Trade and the final weekly move belongs in Omen.
- Opponent reads must be specific enough to act on: "thin at RB" beats generic strength/weakness labels.
- The screen passes only if it helps a user spot an opening they would have missed by looking only at their own roster.

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · SLOPS SALOON`
- `▾`
- `+`
- `WEEK 7 · 12 TEAMS`
- `The Table`
- `JD`
- `64.8`
- `VS`
- `51.2`
- `LIVE · Q2`
- `Your week`
- `THE TABLE`
- `FORM · LAST 5`
- `1`
- `GMR`
- `Gibbs me some Rice`
- `6–1`
- `2`
- `PAK`
- `Puk Around & Find Out`
- `5–2`
- `3`
- `4`
- `DSI`
- `Davante's Inferno`
- `4–3`
- `PLAYOFF CUT`
- `5`
- `CHB`
- `Chubb Rock`
- `3–4`
- `TRADE TARGETS`
- `3 OPENINGS`
- `Thin at RB, three startable receivers. You have the reverse.`
- `BUILD →`
- `3–4 and fading. Two RBs on bye weeks 9 and 11.`
- `WAIVER`
- `BEST MOVE`
- `Jaylen Wright`
- `RB · TEN`
- `11.4`
- `Roschon Johnson`
- `RB · CHI`
- `4.1`
- `Pollard's out three weeks. Roschon is behind two healthy backs — you're not losing anything you'll miss.`
- `CONFIDENT`
- `LOW RISK`
- `ACTIVITY`
- `PARTIAL`
- `STANDINGS`
- `Two teams are tied for the final playoff spot.`
- `You are one game from the playoff cut line.`
- `Transactions unavailable for ESPN right now — adds, drops and trades aren't in this list.`
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
| E025 | Your week | TextLink | Open the full source section using the route named in the data binding. |
| E130 | Command | TabNavItem | Open CommandCenter for the active league. |
| E133 | Omen | TabNavItem | Open OmenCall for the active league. |
| E136 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E139 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `LIVE · Q2`
- `Puk Around & Find Out`
- `3 OPENINGS`
- `Pollard's out three weeks. Roschon is behind two healthy backs — you're not losing anything you'll miss.`
- `CONFIDENT`
- `Transactions unavailable for ESPN right now — adds, drops and trades aren't in this list.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E131 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E132 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E134 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E135 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E137 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E138 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E140 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E141 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 141. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · 12 teams | Text | micro | accent | transparent | accent | 16,84 134x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The Table | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 134x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4)` |  | ContextStrip | body | text-primary | surface-1 | text-primary | 16,134 358x37 | pad 10/12/10/12; margin 12/16/0/16; gap 10  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > span.prov:nth-of-type(1)` |  | PlatformBadge | micro | text-secondary | transparent | text-secondary | 28,148 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-espn-chip | text-secondary | 28,148 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > span.sc:nth-of-type(2)` | 64.8 | Text | body | text-primary | transparent | text-primary | 47,144 27x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > span.vs:nth-of-type(3)` | VS | Text | micro | text-tertiary | transparent | text-tertiary | 84,146 16x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > span.sc.d:nth-of-type(4)` | 51.2 | Text | name | text-tertiary | transparent | text-tertiary | 110,145 23x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > span.lb:nth-of-type(5)` | Live · Q2 | Text | micro | text-tertiary | transparent | text-tertiary | 143,146 151x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(4) > a:nth-of-type(1)` | Your week | TextLink | label | accent | transparent | accent | 304,146 58x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,183 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | The table | Text | micro | text-tertiary | transparent | text-tertiary | 16,183 75x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > span:nth-of-type(1)` | Form · last 5 | Text | micro | text-tertiary | transparent | text-tertiary | 280,183 94x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,201 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.rk:nth-of-type(1)` | 1 | Text | label | text-tertiary | transparent | text-tertiary | 16,211 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.cr:nth-of-type(2)` | GMR | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,209 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.nm:nth-of-type(3)` | Gibbs me some Rice | Text | body-sm | text-primary | transparent | text-primary | 72,214 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,216 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,216 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,216 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.form:nth-of-type(4) > i:nth-of-type(3)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 322,216 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(4)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 329,216 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,216 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(6) > span.rec:nth-of-type(5)` | 6–1 | Text | label | text-tertiary | transparent | text-tertiary | 349,215 25x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,243 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.rk:nth-of-type(1)` | 2 | Text | label | text-tertiary | transparent | text-tertiary | 16,253 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.cr:nth-of-type(2)` | PAK | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,251 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.nm:nth-of-type(3)` | Puk Around & Find Out | Text | body-sm | text-primary | transparent | text-primary | 72,256 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,258 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,258 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i:nth-of-type(2)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 315,258 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,258 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(4)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 329,258 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,258 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.rec:nth-of-type(5)` | 5–2 | Text | label | text-tertiary | transparent | text-tertiary | 349,257 25x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8)` |  | LeagueTableRow | body-sm | text-primary | canvas-gradient(surface-2->surface-1) | text-primary | 0,285 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.rk:nth-of-type(1)` | 3 | Text | label | accent-hover | transparent | accent-hover | 16,295 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.cr:nth-of-type(2)` | TTO | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,293 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.nm:nth-of-type(3)` | Titans of Slopsilonia | Text | body-sm | text-primary | transparent | text-primary | 72,298 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,300 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,300 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,300 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,300 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.form:nth-of-type(4) > i:nth-of-type(4)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 329,300 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,300 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(8) > span.rec:nth-of-type(5)` | 5–2 | Text | label | text-tertiary | transparent | text-tertiary | 349,299 25x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,327 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E063 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.rk:nth-of-type(1)` | 4 | Text | label | text-tertiary | transparent | text-tertiary | 16,337 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E064 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.cr:nth-of-type(2)` | DSI | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,335 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.nm:nth-of-type(3)` | Davante's Inferno | Text | body-sm | text-primary | transparent | text-primary | 72,340 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,342 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E067 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.form:nth-of-type(4) > i:nth-of-type(1)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 308,342 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.form:nth-of-type(4) > i:nth-of-type(2)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 315,342 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,342 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.form:nth-of-type(4) > i:nth-of-type(4)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 329,342 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,342 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(9) > span.rec:nth-of-type(5)` | 4–3 | Text | label | text-tertiary | transparent | text-tertiary | 349,341 25x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.cutline:nth-of-type(10)` | Playoff cut | NativeStack | micro | text-tertiary | transparent | text-tertiary | 16,375 358x12 | pad 0/0/0/0; margin 6/16/6/16; gap 8  |
|  E074 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,393 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E075 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.rk:nth-of-type(1)` | 5 | Text | label | text-tertiary | transparent | text-tertiary | 16,403 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E076 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.cr:nth-of-type(2)` | CHB | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,401 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E077 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.nm:nth-of-type(3)` | Chubb Rock | Text | body-sm | text-primary | transparent | text-primary | 72,406 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E078 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,408 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E079 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.form:nth-of-type(4) > i:nth-of-type(1)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 308,408 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E080 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,408 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E081 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.form:nth-of-type(4) > i:nth-of-type(3)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 322,408 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E082 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.form:nth-of-type(4) > i:nth-of-type(4)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 329,408 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E083 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.form:nth-of-type(4) > i:nth-of-type(5)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 336,408 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E084 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(11) > span.rec:nth-of-type(5)` | 3–4 | Text | label | text-tertiary | transparent | text-tertiary | 349,407 25x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E085 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,447 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E086 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(12) > b:nth-of-type(1)` | Trade targets | Text | micro | text-tertiary | transparent | text-tertiary | 16,447 113x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E087 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(12) > span:nth-of-type(1)` | 3 openings | Text | micro | text-tertiary | transparent | text-tertiary | 296,447 78x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E088 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(13)` |  | WaiverCandidateRow | body | text-primary | transparent | text-primary | 0,465 390x67 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E089 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(13) > span.cr:nth-of-type(1)` | DSI | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 16,483 29x29 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E090 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(13) > span.info:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 55,475 257x46 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E091 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(13) > span.info:nth-of-type(2) > b:nth-of-type(1)` | Davante's Inferno | Text | body-sm | text-primary | transparent | text-primary | 55,475 257x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E092 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(13) > span.info:nth-of-type(2) > span:nth-of-type(1)` | Thin at RB, three startable receivers. You have the reverse. | Text | label | text-tertiary | transparent | text-tertiary | 55,491 257x30 | pad 0/0/0/0; margin 1/0/0/0; gap 0  |
|  E093 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(13) > span.go:nth-of-type(3)` | Build → | Text | micro | accent | transparent | accent | 322,492 52x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E094 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(14)` |  | WaiverCandidateRow | body | text-primary | transparent | text-primary | 0,532 390x52 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E095 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(14) > span.cr:nth-of-type(1)` | CHB | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 16,543 29x29 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E096 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(14) > span.info:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 55,542 257x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E097 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(14) > span.info:nth-of-type(2) > b:nth-of-type(1)` | Chubb Rock | Text | body-sm | text-primary | transparent | text-primary | 55,542 257x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E098 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(14) > span.info:nth-of-type(2) > span:nth-of-type(1)` | 3–4 and fading. Two RBs on bye weeks 9 and 11. | Text | label | text-tertiary | transparent | text-tertiary | 55,558 257x15 | pad 0/0/0/0; margin 1/0/0/0; gap 0  |
|  E099 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hole:nth-of-type(14) > span.go:nth-of-type(3)` | Build → | Text | micro | accent | transparent | accent | 322,552 52x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E100 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(15)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,596 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E101 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(15) > b:nth-of-type(1)` | Waiver | Text | micro | text-tertiary | transparent | text-tertiary | 16,596 54x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E102 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(15) > span:nth-of-type(1)` | Best move | Text | micro | text-tertiary | transparent | text-tertiary | 301,596 73x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E103 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,614 390x129 | pad 12/16/12/16; margin 0/0/0/0; gap 8  |
|  E104 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,626 358x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E105 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.tick:nth-of-type(1)` |  | Text | body | text-primary | border-subtle | text-primary | 28,626 2x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E106 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 50,626 324x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E107 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > b:nth-of-type(1)` | Jaylen Wright | Text | name | text-primary | transparent | text-primary | 50,628 86x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E108 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > em:nth-of-type(1)` | RB · TEN | Text | micro | text-tertiary | transparent | text-tertiary | 142,631 54x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E109 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.in:nth-of-type(2) > span.p:nth-of-type(1)` | 11.4 | Text | body-sm | text-primary | transparent | text-primary | 345,629 29x15 | pad 0/0/0/0; margin 0/0/0/142.391->96; gap 0  |
|  E110 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3)` |  | Text | body | text-primary | transparent | text-primary | 50,646 324x20 | pad 2/0/2/0; margin 0/0/0/0; gap 6  |
|  E111 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > b:nth-of-type(1)` | Roschon Johnson | Text | name | text-tertiary | transparent | text-tertiary | 50,648 107x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E112 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > em:nth-of-type(1)` | RB · CHI | Text | micro | text-tertiary | transparent | text-tertiary | 163,651 52x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E113 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.swap:nth-of-type(1) > span.sline.out:nth-of-type(3) > span.p:nth-of-type(1)` | 4.1 | Text | body-sm | text-tertiary | transparent | text-tertiary | 353,649 21x15 | pad 0/0/0/0; margin 0/0/0/132.438->96; gap 0  |
|  E114 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > p.rsn:nth-of-type(1)` | Pollard's out three weeks. Roschon is behind two healthy backs — you're not losing anything you'll miss. | Text | body-sm | text-secondary | transparent | text-secondary | 16,674 358x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E115 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.meta:nth-of-type(2)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,718 358x12 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E116 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.meta:nth-of-type(2) > span.band.b-conf:nth-of-type(1)` | Confident | ConfidenceBand | micro | accent-hover | transparent | accent-hover | 16,718 96x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E117 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.wrow:nth-of-type(16) > div.meta:nth-of-type(2) > span.risk:nth-of-type(2)` | Low risk | RiskLabel | micro | text-tertiary | transparent | text-tertiary | 126,718 61x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E118 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(17)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,755 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E119 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(17) > b:nth-of-type(1)` | Activity | Text | micro | text-tertiary | transparent | text-tertiary | 16,755 66x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E120 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(17) > span:nth-of-type(1)` | Partial | Text | micro | text-tertiary | transparent | text-tertiary | 320,755 54x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E121 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.act:nth-of-type(18)` |  | NativeStack | body-sm | text-secondary | transparent | text-secondary | 0,773 390x34 | pad 8/16/8/16; margin 0/0/0/0; gap 10  |
|  E122 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.act:nth-of-type(18) > span.k:nth-of-type(1)` | Standings | Text | micro | text-tertiary | transparent | text-tertiary | 16,781 58x17 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E123 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.act:nth-of-type(18) > span:nth-of-type(2)` | Two teams are tied for the final playoff spot. | Text | body-sm | text-secondary | transparent | text-secondary | 84,781 249x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E124 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.act:nth-of-type(19)` |  | NativeStack | body-sm | text-secondary | transparent | text-secondary | 0,807 390x34 | pad 8/16/8/16; margin 0/0/0/0; gap 10  |
|  E125 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.act:nth-of-type(19) > span.k:nth-of-type(1)` | Standings | Text | micro | text-tertiary | transparent | text-tertiary | 16,815 58x17 | pad 2/0/0/0; margin 0/0/0/0; gap 0  |
|  E126 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.act:nth-of-type(19) > span:nth-of-type(2)` | You are one game from the playoff cut line. | Text | body-sm | text-secondary | transparent | text-secondary | 84,815 243x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E127 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(20)` | Transactions unavailable for ESPN right now — adds, drops and trades aren't in this list. | SampleDataPanel | body-sm | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 16,851 358x56 | pad 10/10/10/10; margin 10/16/0/16; gap 0  |
|  E128 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(21)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,907 390x0 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E129 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E130 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E131 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E132 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E133 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E134 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E135 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E136 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E137 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E138 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E139 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4)` | League | TabNavItem | micro | accent | transparent | accent | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E140 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E141 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 141 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through league-overview.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
