# Screen contract - ConnectLeague

Compiled from `design/native-visual-lock-2026-09-13/ConnectLeague.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `04da2eeb6cdf`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | 3 · Connect a league |
| Family | Onboarding & connection |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/platforms/state |
| API contract | platform-provider-state.v1 |
| Governing rule | omen-mobile-onboarding-connection-contract-v1.md; opaque recovery state only |

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
- `STEP 1 OF 1`
- `Connect a league`
- `JD`
- `Omen reads your league. It never posts, never trades, and never messages anyone for you.`
- `SLPR`
- `Sleeper`
- `Username only. About ten seconds.`
- `›`
- `YHOO`
- `Yahoo`
- `Sign in with Yahoo. Read-only access.`
- `ESPN`
- `A few more steps — ESPN has no read-only sign-in. We walk you through it here, on your phone.`
- `You can add more leagues later, and switch between them from any screen.`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E009 | JD | AvatarButton | Open Account. |
| E012 |  | PlatformConnectionCard | Update only the named local UI state; no hidden network side effect. |
| E019 |  | PlatformConnectionCard | Update only the named local UI state; no hidden network side effect. |
| E026 |  | PlatformConnectionCard | Update only the named local UI state; no hidden network side effect. |

## State strings

- `Username only. About ten seconds.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E017 | chevron.right | .screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4) > span.go:nth-of-type(3) | › |
| E024 | chevron.right | .screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6) > span.go:nth-of-type(3) | › |
| E031 | chevron.right | .screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8) > span.go:nth-of-type(3) | › |

## Element inventory

Element count: 35. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x844 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,24 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,36 174x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Step 1 of 1 | Text | micro | accent | transparent | accent | 16,36 174x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Connect a league | Text.heading | screen-title | text-primary | transparent | text-primary | 16,53 174x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,45 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(1)` | Omen reads your league. It never posts, never trades, and never messages anyone for you. | Text | name | text-secondary | transparent | text-secondary | 16,87 300x40 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,127 390x20 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4)` |  | PlatformConnectionCard | body | text-primary | surface-1 | text-primary | 16,147 358x68 | pad 14/12/14/12; margin 0/16/0/16; gap 12  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4) > span.mk:nth-of-type(1)` | SLPR | Text | micro | on-provider / identity-mark-white | platform-sleeper-chip | on-provider / identity-mark-white | 28,161 40x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4) > span.tx:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 80,162 265x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4) > span.tx:nth-of-type(2) > b:nth-of-type(1)` | Sleeper | Text | body | text-primary | transparent | text-primary | 80,162 265x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4) > span.tx:nth-of-type(2) > span:nth-of-type(1)` | Username only. About ten seconds. | Text | body-sm | text-tertiary | transparent | text-tertiary | 80,183 265x17 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(4) > span.go:nth-of-type(3)` | › | Text | h3 | text-tertiary | transparent | text-tertiary | 357,169 5x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,215 390x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6)` |  | PlatformConnectionCard | body | text-primary | surface-1 | text-primary | 16,225 358x68 | pad 14/12/14/12; margin 0/16/0/16; gap 12  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6) > span.mk:nth-of-type(1)` | YHOO | Text | micro | on-provider / identity-mark-white | platform-yahoo-chip | on-provider / identity-mark-white | 28,239 40x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6) > span.tx:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 80,240 265x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6) > span.tx:nth-of-type(2) > b:nth-of-type(1)` | Yahoo | Text | body | text-primary | transparent | text-primary | 80,240 265x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6) > span.tx:nth-of-type(2) > span:nth-of-type(1)` | Sign in with Yahoo. Read-only access. | Text | body-sm | text-tertiary | transparent | text-tertiary | 80,261 265x17 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(6) > span.go:nth-of-type(3)` | › | Text | h3 | text-tertiary | transparent | text-tertiary | 357,247 5x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,293 390x10 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8)` |  | PlatformConnectionCard | body | text-primary | surface-1 | text-primary | 16,303 358x99 | pad 14/12/14/12; margin 0/16/0/16; gap 12  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8) > span.mk:nth-of-type(1)` | ESPN | Text | micro | on-provider / identity-mark-white | platform-espn-chip | on-provider / identity-mark-white | 28,332 40x40 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8) > span.tx:nth-of-type(2)` |  | Text | body | text-primary | transparent | text-primary | 80,317 265x71 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8) > span.tx:nth-of-type(2) > b:nth-of-type(1)` | ESPN | Text | body | text-primary | transparent | text-primary | 80,317 265x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8) > span.tx:nth-of-type(2) > span:nth-of-type(1)` | A few more steps — ESPN has no read-only sign-in. We walk you through it here, on your phone. | Text | body-sm | text-tertiary | transparent | text-tertiary | 80,338 265x50 | pad 0/0/0/0; margin 2/0/0/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.pcard:nth-of-type(8) > span.go:nth-of-type(3)` | › | Text | h3 | text-tertiary | transparent | text-tertiary | 357,341 5x23 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,402 390x382 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,783 358x45 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > div.oneline:nth-of-type(10) > span.tx:nth-of-type(1)` | You can add more leagues later, and switch between them from any screen. | Text | body-sm | text-secondary | transparent | text-secondary | 16,794 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,828 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 35 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through platform-provider-state.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
