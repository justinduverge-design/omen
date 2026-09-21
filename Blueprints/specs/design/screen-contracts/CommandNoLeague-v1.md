# Screen contract - CommandNoLeague

Compiled from `design/native-visual-lock-2026-09-13/CommandNoLeague.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `725364deba5d`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Command — no league |
| Family | Command Center |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/dashboard/summary |
| API contract | dashboard-summary.v1 |
| Capability profile | consumes receipts; owns no profile — expresses per `capability-expression-v1.md` |
| Governing rule | No active connection is zero state, not an error state |

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
- `—`
- `No league yet`
- `NOTHING TO READ`
- `+`
- `WELCOME`
- `Command`
- `JD`
- `Omen has nothing to read yet.`
- `Connect a league and the first call lands within a minute. Until then this screen would be guessing, so it stays empty.`
- `Connect a league`
- `See how Omen decides`
- `Sleeper takes about ten seconds. ESPN takes a few more steps and we walk you through them.`
- `Omen`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · SLOPS SALOON; ▾; + | LeagueSwitcherBar | Open SwitchSheet; read GET /api/leagues before rendering the sheet. |
| E010 | + | Text | Open ConnectLeague to add another provider connection. |
| E015 | JD | AvatarButton | Open Account. |
| E025 | Connect a league | Button.primary | Update only the named local UI state; no hidden network side effect. |
| E026 | See how Omen decides | Button.secondary | Open OmenEvidence for the same decision id. |
| E032 | Command | TabNavItem | Open CommandCenter for the active league. |
| E035 | Omen | TabNavItem | Open OmenCall for the active league. |
| E038 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E041 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `No league yet`
- `Sleeper takes about ten seconds. ESPN takes a few more steps and we walk you through them.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E010 | plus | .screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(3) | + |
| E017 | canvas-custom-symbol-E017 | .screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) | 167,154 56x56 |
| E018 | canvas-custom-symbol-E018 | .screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 183,162 23x40 |
| E019 | canvas-custom-symbol-E019 | .screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(1) | 194,173 2x17 |
| E020 | canvas-custom-symbol-E020 | .screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(2) | 192,176 6x1 |
| E021 | canvas-custom-symbol-E021 | .screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(3) | 192,180 6x1 |
| E022 | canvas-custom-symbol-E022 | .screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(4) | 192,183 6x1 |
| E033 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E034 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E036 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E037 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E039 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E040 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E042 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E043 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 43. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x781 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x23 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 26x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 323,10 51x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2)` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,23 390x49 | pad 8/16/10/16; margin 0/0/0/0; gap 10  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.cr:nth-of-type(1)` | — | CrestOrProviderMark | micro | text-tertiary | surface-3 | text-tertiary | 16,32 28x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 54,31 297x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > b:nth-of-type(1)` | No league yet | Text | name | text-primary | transparent | text-primary | 54,31 297x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.who:nth-of-type(2) > i:nth-of-type(1)` | Nothing to read | Text | micro | text-tertiary | transparent | text-tertiary | 54,49 297x12 | pad 0/0/0/0; margin 2/0/0/0; gap 4  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus:nth-of-type(3)` | + | Text | h3 | accent | transparent | accent | 361,37 13x18 | pad 0/0/0/2; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,72 390x50 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,84 101x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Welcome | Text | micro | accent | transparent | accent | 16,84 101x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Command | Text.heading | screen-title | text-primary | transparent | text-primary | 16,100 101x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(3) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,92 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4)` |  | EmptyState | body | text-primary | transparent | text-primary | 0,122 390x194 | pad 32/24/0/24; margin 0/0/0/0; gap 12  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 167,154 56x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 183,162 23x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 194,173 2x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(2)` |  | Icon | body | text-primary | transparent | text-primary | 192,176 6x1 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(3)` |  | Icon | body | text-primary | transparent | text-primary | 192,180 6x1 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > svg:nth-of-type(1) > rect:nth-of-type(4)` |  | Icon | body | text-primary | transparent | text-primary | 192,183 6x1 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > h3.eh:nth-of-type(1)` | Omen has nothing to read yet. | Text.heading | h2 | text-primary | transparent | text-primary | 62,222 266x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.empty:nth-of-type(4) > p.ep:nth-of-type(1)` | Connect a league and the first call lands within a minute. Until then this screen would be guessing, so it stays empty. | Text | name | text-secondary | transparent | text-secondary | 64,257 262x59 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.btn:nth-of-type(5)` | Connect a league | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,339 358x41 | pad 12/12/12/12; margin 24/16/0/16; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.btn.ghost:nth-of-type(6)` | See how Omen decides | Button.secondary | card-lead | text-secondary | transparent | border | 16,388 358x43 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,431 390x291 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,722 358x45 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(8) > span.tx:nth-of-type(1)` | Sleeper takes about ten seconds. ESPN takes a few more steps and we walk you through them. | Text | body-sm | text-secondary | transparent | text-secondary | 16,733 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,767 390x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1)` | Command | TabNavItem | micro | accent | transparent | accent | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E033 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E036 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E039 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E042 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 43 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through dashboard-summary.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
