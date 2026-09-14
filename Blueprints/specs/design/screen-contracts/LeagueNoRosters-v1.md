# Screen contract - LeagueNoRosters

Compiled from `design/native-visual-lock-2026-09-13/LeagueNoRosters.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `3c35a1127d9c`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | League — no rosters |
| Family | League & waiver |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/league/overview |
| API contract | league-overview.v1 no rosters |
| Governing rule | Permanent provider limit for that league; do not build retry |

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
- `PAK`
- `Puk Around & Find Out`
- `YAHOO · FANTASY MADNESS`
- `▾`
- `+`
- `WEEK 7 · 10 TEAMS`
- `The Table`
- `JD`
- `THE TABLE`
- `LIVE`
- `1`
- `RGB`
- `Regulation Blondes`
- `5–1`
- `2`
- `4–2`
- `3`
- `MKM`
- `Mike’s Marauders`
- `TRADE TARGETS`
- `NOT POSSIBLE HERE`
- `UNAVAILABLE`
- `Yahoo does not expose other managers’ rosters for this league. Without them Omen cannot see who needs what, so it makes no trade read at all rather than guessing from standings.`
- `This is a permanent limit of the provider for this league type, not an outage. Retrying will not change it.`
- `WHAT YOU GET INSTEAD`
- `Omen’s weekly call for this team will be a start/sit or a waiver move, never a trade. Everything else on this screen is unaffected.`
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
| E070 | Command | TabNavItem | Open CommandCenter for the active league. |
| E073 | Omen | TabNavItem | Open OmenCall for the active league. |
| E076 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E079 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `Puk Around & Find Out`
- `LIVE`
- `UNAVAILABLE`
- `Yahoo does not expose other managers’ rosters for this league. Without them Omen cannot see who needs what, so it makes no trade read at all rather than guessing from standings.`
- `This is a permanent limit of the provider for this league type, not an outage. Retrying will not change it.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E071 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E072 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E074 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E075 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E077 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E078 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E080 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E081 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 81. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x780 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,24 390x50 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | PAK | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,33 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,32 281x31 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | Puk Around & Find Out | Text | name | text-primary | transparent | text-primary | 54,32 281x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | YAHOO · Fantasy Madness | Text | micro | text-tertiary | transparent | text-tertiary | 54,50 281x13 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1) > em:nth-of-type(1)` |  | Text | micro | text-tertiary | platform-yahoo-chip | text-tertiary | 54,53 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3)` | ▾ | Text | label | text-tertiary | transparent | text-tertiary | 345,40 5x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4)` | + | Text | h3 | accent | transparent | accent | 361,38 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,74 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 128x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · 10 teams | Text | micro | accent | transparent | accent | 16,86 128x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The Table | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 128x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,137 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4) > b:nth-of-type(1)` | The table | Text | micro | text-tertiary | transparent | text-tertiary | 16,137 72x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4) > span:nth-of-type(1)` | Live | Text | micro | text-tertiary | transparent | text-tertiary | 346,137 28x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,156 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.rk:nth-of-type(1)` | 1 | Text | label | text-tertiary | transparent | text-tertiary | 16,166 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.cr:nth-of-type(2)` | RGB | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,164 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.nm:nth-of-type(3)` | Regulation Blondes | Text | body-sm | text-primary | transparent | text-primary | 72,169 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,171 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,171 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,171 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,171 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.form:nth-of-type(4) > i:nth-of-type(4)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 329,171 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,171 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(5) > span.rec:nth-of-type(5)` | 5–1 | Text | label | text-tertiary | transparent | text-tertiary | 349,169 25x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6)` |  | LeagueTableRow | body-sm | text-primary | canvas-gradient(surface-2->surface-1) | text-primary | 0,198 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.rk:nth-of-type(1)` | 2 | Text | label | accent-hover | transparent | accent-hover | 16,208 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.cr:nth-of-type(2)` | PAK | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,206 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.nm:nth-of-type(3)` | Puk Around & Find Out | Text | body-sm | text-primary | transparent | text-primary | 72,211 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,213 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,213 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.form:nth-of-type(4) > i:nth-of-type(2)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 315,213 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,213 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(4)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 329,213 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,213 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(6) > span.rec:nth-of-type(5)` | 4–2 | Text | label | text-tertiary | transparent | text-tertiary | 349,211 25x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,240 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.rk:nth-of-type(1)` | 3 | Text | label | text-tertiary | transparent | text-tertiary | 16,250 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.cr:nth-of-type(2)` | MKM | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,248 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.nm:nth-of-type(3)` | Mike’s Marauders | Text | body-sm | text-primary | transparent | text-primary | 72,253 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,255 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i:nth-of-type(1)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 308,255 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,255 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,255 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i:nth-of-type(4)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 329,255 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,255 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(7) > span.rec:nth-of-type(5)` | 4–2 | Text | label | text-tertiary | transparent | text-tertiary | 349,253 25x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,294 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8) > b:nth-of-type(1)` | Trade targets | Text | micro | text-tertiary | transparent | text-tertiary | 16,294 109x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(8) > span:nth-of-type(1)` | Not possible here | Text | micro | text-tertiary | transparent | text-tertiary | 249,294 125x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,313 358x167 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,326 334x19 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > div.meta:nth-of-type(1) > span.ds.gone:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 28,326 104x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > p.rsn:nth-of-type(1)` | Without them Omen cannot see who needs what, so it makes no trade read at all rather than guessing from standings. | Text | body-sm | text-secondary | transparent | text-secondary | 28,353 334x71 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > p.rsn:nth-of-type(1) > b:nth-of-type(1)` | Yahoo does not expose other managers’ rosters for this league. | Text | body-sm | text-primary | transparent | text-primary | 28,354 316x33 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E062 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(9) > p.rsn:nth-of-type(2)` | This is a permanent limit of the provider for this league type, not an outage. Retrying will not change it. | Text | body-sm | text-secondary | transparent | text-secondary | 28,432 334x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,491 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E064 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(10) > b:nth-of-type(1)` | What you get instead | Text | micro | text-tertiary | transparent | text-tertiary | 16,491 164x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E065 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,510 358x78 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E066 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11) > p.rsn:nth-of-type(1)` | Omen’s weekly call for this team will be a , never a trade. Everything else on this screen is unaffected. | Text | body-sm | text-secondary | transparent | text-secondary | 28,523 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11) > p.rsn:nth-of-type(1) > b:nth-of-type(1)` | start/sit or a waiver move | Text | body-sm | text-primary | transparent | text-primary | 28,524 299x33 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E068 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,588 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E075 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E076 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E077 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E078 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E079 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4)` | League | TabNavItem | micro | accent | transparent | accent | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E080 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E081 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 81 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through league-overview.v1 no rosters; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
