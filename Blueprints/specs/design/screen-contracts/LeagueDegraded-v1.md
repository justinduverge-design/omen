# Screen contract - LeagueDegraded

Compiled from `design/native-visual-lock-2026-09-13/LeagueDegraded.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `b2b6c28604d6`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | League — degraded |
| Family | League & waiver |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/league/overview |
| API contract | league-overview.v1 per-section status=unavailable |
| Governing rule | Unread, not empty; every failed section names what is unavailable |

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
- `ESPN is returning partial data right now. Two sections below are live, two are not. Each one says which it is rather than the page showing one banner and hoping.`
- `MATCHUP`
- `LIVE`
- `64.8`
- `VS`
- `51.2`
- `LIVE · Q2`
- `Your week`
- `THE TABLE`
- `1`
- `GMR`
- `Gibbs me some Rice`
- `6–1`
- `3`
- `5–2`
- `TRADE TARGETS`
- `UNAVAILABLE`
- `Reading other teams’ rosters needs a call ESPN is currently refusing. Omen issues no trade read without rosters — it will not name a team it has not read.`
- `ACTIVITY`
- `Adds, drops and trades are not in this list. The list is not empty — it is unread, and those are different things.`
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
| E030 | Your week | TextLink | Open the full source section using the route named in the data binding. |
| E071 | Retry ESPN | Button.secondary | Run the recovery action from platform-provider-state.v1, then refresh the affected section only. |
| E074 | Command | TabNavItem | Open CommandCenter for the active league. |
| E077 | Omen | TabNavItem | Open OmenCall for the active league. |
| E080 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E083 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `ESPN is returning partial data right now. Two sections below are live, two are not. Each one says which it is rather than the page showing one banner and hoping.`
- `LIVE`
- `LIVE · Q2`
- `UNAVAILABLE`
- `Reading other teams’ rosters needs a call ESPN is currently refusing. Omen issues no trade read without rosters — it will not name a team it has not read.`
- `Retry ESPN`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev:nth-of-type(3) | ▾ |
| E012 | plus | .screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(4) | + |
| E075 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) | 42,791 20x20 |
| E076 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,794 13x13 |
| E078 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,791 20x20 |
| E079 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,793 13x17 |
| E081 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,791 20x20 |
| E082 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,793 17x16 |
| E084 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) | 328,791 20x20 |
| E085 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,793 13x17 |

## Element inventory

Element count: 85. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

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
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,86 127x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Week 7 · 12 teams | Text | micro | accent | transparent | accent | 16,86 127x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | The Table | Text.heading | screen-title | text-primary | transparent | text-primary | 16,103 127x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,95 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(4)` | Two sections below are live, two are not. Each one says which it is rather than the page showing one banner and hoping. | SampleDataPanel | body-sm | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 16,137 358x73 | pad 10/10/10/10; margin 12/16/0/16; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(4) > b:nth-of-type(1)` | ESPN is returning partial data right now. | Text | body-sm | text-secondary | transparent | text-secondary | 27,149 229x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,222 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | Matchup | Text | micro | text-tertiary | transparent | text-tertiary | 16,222 64x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > span:nth-of-type(1)` | Live | Text | micro | text-tertiary | transparent | text-tertiary | 346,222 28x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6)` |  | ContextStrip | body | text-primary | surface-1 | text-primary | 16,253 358x39 | pad 10/12/10/12; margin 12/16/0/16; gap 10  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > span.prov:nth-of-type(1)` |  | PlatformBadge | micro | text-secondary | transparent | text-secondary | 28,268 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-espn-chip | text-secondary | 28,268 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > span.sc:nth-of-type(2)` | 64.8 | Text | body | text-primary | transparent | text-primary | 47,263 32x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > span.vs:nth-of-type(3)` | VS | Text | micro | text-tertiary | transparent | text-tertiary | 89,266 16x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > span.sc.d:nth-of-type(4)` | 51.2 | Text | name | text-tertiary | transparent | text-tertiary | 114,264 24x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > span.lb:nth-of-type(5)` | Live · Q2 | Text | micro | text-tertiary | transparent | text-tertiary | 148,266 149x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.strip:nth-of-type(6) > a:nth-of-type(1)` | Your week | TextLink | label | accent | transparent | accent | 307,265 55x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,304 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | The table | Text | micro | text-tertiary | transparent | text-tertiary | 16,304 72x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > span:nth-of-type(1)` | Live | Text | micro | text-tertiary | transparent | text-tertiary | 346,304 28x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8)` |  | LeagueTableRow | body-sm | text-primary | transparent | text-primary | 0,323 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.rk:nth-of-type(1)` | 1 | Text | label | text-tertiary | transparent | text-tertiary | 16,333 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.cr:nth-of-type(2)` | GMR | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,331 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.nm:nth-of-type(3)` | Gibbs me some Rice | Text | body-sm | text-primary | transparent | text-primary | 72,336 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,338 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,338 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,338 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.form:nth-of-type(4) > i:nth-of-type(3)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 322,338 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(4)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 329,338 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,338 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow:nth-of-type(8) > span.rec:nth-of-type(5)` | 6–1 | Text | label | text-tertiary | transparent | text-tertiary | 349,336 25x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9)` |  | LeagueTableRow | body-sm | text-primary | canvas-gradient(surface-2->surface-1) | text-primary | 0,365 390x42 | pad 8/16/8/16; margin 0/0/0/0; gap 8  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.rk:nth-of-type(1)` | 3 | Text | label | accent-hover | transparent | accent-hover | 16,375 16x20 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.cr:nth-of-type(2)` | TTO | CrestOrProviderMark | micro | text-secondary | surface-3 | text-secondary | 39,373 25x25 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.nm:nth-of-type(3)` | Titans of Slopsilonia | Text | body-sm | text-primary | transparent | text-primary | 72,378 228x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.form:nth-of-type(4)` |  | Text | body-sm | text-primary | transparent | text-primary | 308,380 33x11 | pad 0/0/0/0; margin 0/0/0/0; gap 2  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.form:nth-of-type(4) > i.w:nth-of-type(1)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 308,380 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.form:nth-of-type(4) > i.w:nth-of-type(2)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 315,380 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.form:nth-of-type(4) > i.w:nth-of-type(3)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 322,380 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.form:nth-of-type(4) > i:nth-of-type(4)` |  | Text | body-sm | text-primary | surface-3 | text-primary | 329,380 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.form:nth-of-type(4) > i.w:nth-of-type(5)` |  | Text | body-sm | text-primary | text-secondary | text-primary | 336,380 5x11 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.trow.me:nth-of-type(9) > span.rec:nth-of-type(5)` | 5–2 | Text | label | text-tertiary | transparent | text-tertiary | 349,378 25x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,419 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(10) > b:nth-of-type(1)` | Trade targets | Text | micro | text-tertiary | transparent | text-tertiary | 16,419 109x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(10) > span:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 289,419 85x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,438 358x105 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E060 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,451 334x19 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E061 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11) > div.meta:nth-of-type(1) > span.ds.gone:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 28,451 104x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E062 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11) > p.rsn:nth-of-type(1)` | Reading other teams’ rosters needs a call ESPN is currently refusing. — it will not name a team it has not read. | Text | body-sm | text-secondary | transparent | text-secondary | 28,478 334x53 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(11) > p.rsn:nth-of-type(1) > b:nth-of-type(1)` | Omen issues no trade read without rosters | Text | body-sm | text-primary | transparent | text-primary | 79,496 244x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,555 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E065 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(12) > b:nth-of-type(1)` | Activity | Text | micro | text-tertiary | transparent | text-tertiary | 16,555 63x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(12) > span:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 289,555 85x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(13)` |  | Card | body | text-primary | surface-1 | text-primary-overlay | 16,574 358x88 | pad 12/12/12/12; margin 0/16/0/16; gap 8  |
|  E068 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(13) > div.meta:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 28,587 334x19 | pad 0/0/0/0; margin 0/0/0/0; gap 14  |
|  E069 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(13) > div.meta:nth-of-type(1) > span.ds.gone:nth-of-type(1)` | Unavailable | Text | micro | text-tertiary | transparent | text-tertiary | 28,587 104x19 | pad 4/8/4/8; margin 0/0/0/0; gap 6  |
|  E070 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.card:nth-of-type(13) > p.rsn:nth-of-type(1)` | Adds, drops and trades are not in this list. The list is not empty — it is unread, and those are different things. | Text | body-sm | text-secondary | transparent | text-secondary | 28,614 334x36 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E071 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(14)` | Retry ESPN | Button.secondary | card-lead | text-secondary | transparent | border | 16,675 358x44 | pad 12/12/12/12; margin 14/16/0/16; gap 0  |
|  E072 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(15)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,719 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E073 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,780 390x64 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E074 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1)` | Command | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 4,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E075 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 42,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E076 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 45,794 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E077 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E078 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E079 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E080 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E081 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E082 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,793 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E083 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4)` | League | TabNavItem | micro | accent | transparent | accent | 291,791 96x37 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E084 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 328,791 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E085 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 332,793 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 85 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through league-overview.v1 per-section status=unavailable; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
