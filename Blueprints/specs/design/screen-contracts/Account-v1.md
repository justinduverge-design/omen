# Screen contract - Account

Compiled from `design/native-visual-lock-2026-09-13/Account.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `17fd4145d530`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Account |
| Family | Ledger, switcher, account |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/dashboard/summary + GET /api/user/export + DELETE /api/user/delete |
| API contract | dashboard-summary.v1 + user-export.v1 + user-delete.v1 |
| Governing rule | Export excludes OAuth tokens, ESPN cookies and Vault ids; legacy DELETE MY OMEN DATA remains accepted |

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
- `SIGNED IN`
- `Account`
- `JD`
- `justin@slopssaloon.com`
- `Apple ID`
- `›`
- `CONNECTED LEAGUES`
- `3`
- `ESPN`
- `Titans of Slopsilonia`
- `Slops Saloon FF Showdown`
- `DISCONNECT`
- `SLPR`
- `Davante's Inferno`
- `EB Football`
- `YHOO`
- `Puk Around & Find Out`
- `Fantasy Madness`
- `+ Add a league`
- `SUPPORT`
- `Report a problem`
- `Sends device and version. Never your league data.`
- `Help centre`
- `Connecting, waivers, trades`
- `Privacy & data`
- `Export or delete everything`
- `Sign out`
- `Command`
- `Omen`
- `Trade`
- `League`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E009 | JD | AvatarButton | Open Account. |
| E045 | Report a problem | Text | Open report composer; GET /api/beta/reports/schema first, then POST metadata-only report. |
| E058 | Sign out | Button.secondary | Clear the local session and return to SignIn. |
| E061 | Command | TabNavItem | Open CommandCenter for the active league. |
| E064 | Omen | TabNavItem | Open OmenCall for the active league. |
| E067 | Trade | TabNavItem | Open TradeBuild for the active league. |
| E070 | League | TabNavItem | Open LeagueTable for the active league. |

## State strings

- `CONNECTED LEAGUES`
- `Puk Around & Find Out`
- `Sign out`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E014 | chevron.right | .screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(3) > span.go:nth-of-type(2) | › |
| E047 | chevron.right | .screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(10) > span.go:nth-of-type(2) | › |
| E052 | chevron.right | .screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(11) > span.go:nth-of-type(2) | › |
| E057 | chevron.right | .screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(12) > span.go:nth-of-type(2) | › |
| E062 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) | 42,792 20x20 |
| E063 | tab.command-grid | .screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1) | 45,795 13x13 |
| E065 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) | 137,792 20x20 |
| E066 | tab.omen-bolt | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1) | 140,794 13x17 |
| E068 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) | 233,792 20x20 |
| E069 | tab.trade-arrows | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1) | 234,794 17x16 |
| E071 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) | 328,792 20x20 |
| E072 | tab.league-shield-star | .screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 332,794 13x17 |

## Element inventory

Element count: 72. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x781 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x23 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 26x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 323,10 51x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,23 390x50 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,35 82x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Signed in | Text | micro | accent | transparent | accent | 16,35 82x12 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Account | Text.heading | screen-title | text-primary | transparent | text-primary | 16,51 82x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,43 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,73 390x59 | pad 12/16/12/16; margin 0/0/0/0; gap 10  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(3) > span.info:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 16,85 342x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(3) > span.info:nth-of-type(1) > b:nth-of-type(1)` | justin@slopssaloon.com | Text | name | text-primary | transparent | text-primary | 16,85 342x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(3) > span.info:nth-of-type(1) > span:nth-of-type(1)` | Apple ID | Text | label | text-tertiary | transparent | text-tertiary | 16,105 44x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(3) > span.go:nth-of-type(2)` | › | Text | card-lead | text-tertiary | transparent | text-tertiary | 368,94 6x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,144 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4) > b:nth-of-type(1)` | Connected leagues | Text | micro | text-tertiary | transparent | text-tertiary | 16,144 152x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(4) > span:nth-of-type(1)` | 3 | Text | micro | text-tertiary | transparent | text-tertiary | 366,144 8x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,162 390x54 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5) > span.prov:nth-of-type(1)` | ESPN | PlatformBadge | micro | text-secondary | transparent | text-secondary | 16,183 50x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-espn-chip | text-secondary | 16,184 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5) > span.info:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 76,172 207x33 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5) > span.info:nth-of-type(2) > b:nth-of-type(1)` | Titans of Slopsilonia | Text | body-sm | text-primary | transparent | text-primary | 76,172 207x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5) > span.info:nth-of-type(2) > span:nth-of-type(1)` | Slops Saloon FF Showdown | Text | label | text-tertiary | transparent | text-tertiary | 76,191 144x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(5) > span.dc:nth-of-type(3)` | Disconnect | Text | micro | text-tertiary | transparent | text-tertiary | 293,183 81x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,216 390x54 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6) > span.prov:nth-of-type(1)` | SLPR | PlatformBadge | micro | text-secondary | transparent | text-secondary | 16,237 49x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-sleeper-chip | text-secondary | 16,238 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6) > span.info:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 75,226 208x33 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6) > span.info:nth-of-type(2) > b:nth-of-type(1)` | Davante's Inferno | Text | body-sm | text-primary | transparent | text-primary | 75,226 208x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6) > span.info:nth-of-type(2) > span:nth-of-type(1)` | EB Football | Text | label | text-tertiary | transparent | text-tertiary | 75,245 59x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(6) > span.dc:nth-of-type(3)` | Disconnect | Text | micro | text-tertiary | transparent | text-tertiary | 293,237 81x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,270 390x54 | pad 10/16/10/16; margin 0/0/0/0; gap 10  |
|  E033 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7) > span.prov:nth-of-type(1)` | YHOO | PlatformBadge | micro | text-secondary | transparent | text-secondary | 16,291 53x12 | pad 0/0/0/0; margin 0/0/0/0; gap 6  |
|  E034 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7) > span.prov:nth-of-type(1) > i:nth-of-type(1)` |  | Text | micro | text-secondary | platform-yahoo-chip | text-secondary | 16,292 9x9 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7) > span.info:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 79,280 204x33 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E036 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7) > span.info:nth-of-type(2) > b:nth-of-type(1)` | Puk Around & Find Out | Text | body-sm | text-primary | transparent | text-primary | 79,280 204x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E037 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7) > span.info:nth-of-type(2) > span:nth-of-type(1)` | Fantasy Madness | Text | label | text-tertiary | transparent | text-tertiary | 79,299 91x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E038 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.conn:nth-of-type(7) > span.dc:nth-of-type(3)` | Disconnect | Text | micro | text-tertiary | transparent | text-tertiary | 293,291 81x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E039 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,324 390x30 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E040 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(8) > span:nth-of-type(1)` | + Add a league | Text | name | accent | transparent | accent | 16,339 92x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E041 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,366 390x12 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E042 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(9) > b:nth-of-type(1)` | Support | Text | micro | text-tertiary | transparent | text-tertiary | 16,366 65x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E043 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,384 390x59 | pad 12/16/12/16; margin 0/0/0/0; gap 10  |
|  E044 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(10) > span.info:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 16,396 342x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E045 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(10) > span.info:nth-of-type(1) > b:nth-of-type(1)` | Report a problem | Text | name | text-primary | transparent | text-primary | 16,396 342x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E046 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(10) > span.info:nth-of-type(1) > span:nth-of-type(1)` | Sends device and version. Never your league data. | Text | label | text-tertiary | transparent | text-tertiary | 16,416 265x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E047 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(10) > span.go:nth-of-type(2)` | › | Text | card-lead | text-tertiary | transparent | text-tertiary | 368,405 6x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E048 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,443 390x59 | pad 12/16/12/16; margin 0/0/0/0; gap 10  |
|  E049 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(11) > span.info:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 16,455 342x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E050 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(11) > span.info:nth-of-type(1) > b:nth-of-type(1)` | Help centre | Text | name | text-primary | transparent | text-primary | 16,455 342x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E051 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(11) > span.info:nth-of-type(1) > span:nth-of-type(1)` | Connecting, waivers, trades | Text | label | text-tertiary | transparent | text-tertiary | 16,475 146x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E052 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(11) > span.go:nth-of-type(2)` | › | Text | card-lead | text-tertiary | transparent | text-tertiary | 368,464 6x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E053 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,502 390x59 | pad 12/16/12/16; margin 0/0/0/0; gap 10  |
|  E054 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(12) > span.info:nth-of-type(1)` |  | Text | body | text-primary | transparent | text-primary | 16,514 342x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E055 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(12) > span.info:nth-of-type(1) > b:nth-of-type(1)` | Privacy & data | Text | name | text-primary | transparent | text-primary | 16,514 342x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E056 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(12) > span.info:nth-of-type(1) > span:nth-of-type(1)` | Export or delete everything | Text | label | text-tertiary | transparent | text-tertiary | 16,534 143x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E057 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.arow:nth-of-type(12) > span.go:nth-of-type(2)` | › | Text | card-lead | text-tertiary | transparent | text-tertiary | 368,523 6x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E058 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(13)` | Sign out | Button.secondary | card-lead | text-secondary | transparent | border | 16,579 358x43 | pad 12/12/12/12; margin 18->16/16/0/16; gap 0  |
|  E059 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(14)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,622 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E060 | `.screen > div.tabbar:nth-of-type(2)` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x63 | pad 10/4/16/4; margin 0/0/0/0; gap 0  |
|  E061 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1)` | Command | TabNavItem | micro | accent | transparent | accent | 4,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E062 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1)` |  | Icon | micro | accent | transparent | accent | 42,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E063 | `.screen > div.tabbar:nth-of-type(2) > span.tab.on:nth-of-type(1) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | accent | transparent | accent | 45,795 13x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E064 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2)` | Omen | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 100,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E065 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 137,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E066 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(2) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 140,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E067 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3)` | Trade | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 195,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E068 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 233,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E069 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(3) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 234,794 17x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E070 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4)` | League | TabNavItem | micro | text-tertiary | transparent | text-tertiary | 291,792 96x36 | pad 0/0/0/0; margin 0/0/0/0; gap 4  |
|  E071 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | micro | text-tertiary | transparent | text-tertiary | 328,792 20x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E072 | `.screen > div.tabbar:nth-of-type(2) > span.tab:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | micro | text-tertiary | transparent | text-tertiary | 332,794 13x17 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 72 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through dashboard-summary.v1 + user-export.v1 + user-delete.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
