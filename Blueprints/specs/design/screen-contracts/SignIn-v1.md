# Screen contract - SignIn

Compiled from `design/native-visual-lock-2026-09-13/SignIn.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `89904aa7be40`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | 1 · Sign in |
| Family | Onboarding & connection |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | GET /api/session |
| API contract | session.v1 |
| Governing rule | m4-auth-providers-v1-brief.md; Supabase email, Google, Apple, Discord, passkeys enabled |

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
- `OMEN`
- `See the move before`
- `the league does.`
- `One call a week for every team you manage. Plain English, and it shows its work.`
- `Continue with Apple`
- `Continue with Google`
- `Continue with Discord`
- `Continue with email`
- `By continuing you agree to the Terms and Privacy Policy.`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E012 |  | AuthProviderButton | Update only the named local UI state; no hidden network side effect. |
| E016 |  | AuthProviderButton | Update only the named local UI state; no hidden network side effect. |
| E023 |  | AuthProviderButton | Update only the named local UI state; no hidden network side effect. |
| E027 |  | AuthProviderButton | Update only the named local UI state; no hidden network side effect. |
| E033 | Terms | Text | Open Terms of Use legal document. |
| E034 | Privacy Policy | Text | Open Privacy Policy legal document. |

## State strings

- No explicit state string on this artboard; state is carried by the API contract above.

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E013 | identity.apple-mark | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(4) > svg:nth-of-type(1) | 32,231 18x18 |
| E014 | identity.apple-mark | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1) | 36,234 10x12 |
| E017 | identity.google-g | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) | 32,288 18x18 |
| E018 | identity.google-g | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(1) | 41,296 7x7 |
| E019 | identity.google-g | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(2) | 34,298 12x6 |
| E020 | identity.google-g | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(3) | 33,294 3x7 |
| E021 | identity.google-g | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(4) | 34,289 12x6 |
| E024 | identity.discord-mark | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(6) > svg:nth-of-type(1) | 32,345 18x18 |
| E025 | identity.discord-mark | .screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(6) > svg:nth-of-type(1) > path:nth-of-type(1) | 35,348 16x12 |
| E028 | identity.email-envelope | .screen > div.sbody:nth-of-type(1) > div.auth.mail:nth-of-type(7) > svg:nth-of-type(1) | 32,402 18x18 |
| E029 | identity.email-envelope | .screen > div.sbody:nth-of-type(1) > div.auth.mail:nth-of-type(7) > svg:nth-of-type(1) > path:nth-of-type(1) | 34,405 14x12 |

## Element inventory

Element count: 35. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x844 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,24 390x109 | pad 48/16/0/16; margin 0/0/0/0; gap 0  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,72 208x61 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Omen | Text | micro | accent | transparent | accent | 16,72 208x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | See the move before the league does. | Text.heading | screen-title | text-primary | transparent | text-primary | 16,89 208x44 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1) > br:nth-of-type(1)` |  | NativeStack | screen-title | text-primary | transparent | text-primary | 224,86 0x28 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(1)` | One call a week for every team you manage. Plain English, and it shows its work. | Text | name | text-secondary | transparent | text-secondary | 16,145 283x40 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,185 390x32 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(4)` |  | AuthProviderButton | body | text-primary | surface-1 | text-primary | 16,217 358x47 | pad 14/16/14/16; margin 0/16/10/16; gap 10  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(4) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 32,231 18x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(4) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 36,234 10x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(4) > span.lb:nth-of-type(1)` | Continue with Apple | Text | body | text-primary | transparent | text-primary | 60,231 280x19 | pad 0/0/0/0; margin 0/18->16/0/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5)` |  | AuthProviderButton | body | text-primary | surface-1 | text-primary | 16,274 358x47 | pad 14/16/14/16; margin 0/16/10/16; gap 10  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 32,288 18x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 41,296 7x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(2)` |  | IconPath | body | text-primary | transparent | text-primary | 34,298 12x6 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(3)` |  | IconPath | body | text-primary | transparent | text-primary | 33,294 3x7 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > svg:nth-of-type(1) > path:nth-of-type(4)` |  | IconPath | body | text-primary | transparent | text-primary | 34,289 12x6 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(5) > span.lb:nth-of-type(1)` | Continue with Google | Text | body | text-primary | transparent | text-primary | 60,288 280x19 | pad 0/0/0/0; margin 0/18->16/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(6)` |  | AuthProviderButton | body | text-primary | surface-1 | text-primary | 16,331 358x47 | pad 14/16/14/16; margin 0/16/10/16; gap 10  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(6) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 32,345 18x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(6) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 35,348 16x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody:nth-of-type(1) > div.auth:nth-of-type(6) > span.lb:nth-of-type(1)` | Continue with Discord | Text | body | text-primary | transparent | text-primary | 60,345 280x19 | pad 0/0/0/0; margin 0/18->16/0/0; gap 0  |
|  E027 | `.screen > div.sbody:nth-of-type(1) > div.auth.mail:nth-of-type(7)` |  | AuthProviderButton | body | text-primary | surface-1 | text-primary | 16,388 358x47 | pad 14/16/14/16; margin 0/16/10/16; gap 10  |
|  E028 | `.screen > div.sbody:nth-of-type(1) > div.auth.mail:nth-of-type(7) > svg:nth-of-type(1)` |  | Icon | body | text-primary | transparent | text-primary | 32,402 18x18 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody:nth-of-type(1) > div.auth.mail:nth-of-type(7) > svg:nth-of-type(1) > path:nth-of-type(1)` |  | IconPath | body | text-primary | transparent | text-primary | 34,405 14x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody:nth-of-type(1) > div.auth.mail:nth-of-type(7) > span.lb:nth-of-type(1)` | Continue with email | Text | body | text-primary | transparent | text-primary | 60,402 280x19 | pad 0/0/0/0; margin 0/18->16/0/0; gap 0  |
|  E031 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,445 390x357 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E032 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(2)` | By continuing you agree to the and . | Text | body-sm | text-tertiary | transparent | text-tertiary | 16,802 358x18 | pad 0/0/0/0; margin 0/16/0/16; gap 0  |
|  E033 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(2) > span:nth-of-type(1)` | Terms | Text | body-sm | accent | transparent | accent | 212,803 34x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E034 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(2) > span:nth-of-type(2)` | Privacy Policy | Text | body-sm | accent | transparent | accent | 273,803 76x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E035 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(9)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,820 390x24 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 35 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through session.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
