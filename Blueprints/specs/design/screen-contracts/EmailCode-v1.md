# Screen contract - EmailCode

Compiled from `design/native-visual-lock-2026-09-13/EmailCode.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `a0711dc7f052`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | 2 · Email code |
| Family | Onboarding & connection |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits; measured body overflow from canvas render: 0px. |
| Data route | Supabase OTP |
| API contract | not an Omen route |
| Governing rule | m4-auth-providers-v1-brief.md; six digits, ten minute expiry |

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
- `STEP 2 OF 2`
- `Check your email.`
- `We sent a six-digit code to justin@slopssaloon.com. It expires in 10 minutes.`
- `4`
- `1`
- `9`
- `·`
- `Didn’t arrive? Send it again · Use a different email`
- `Paste the whole code and it fills every box. The keyboard stays up until the last digit lands.`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E021 | Send it again | Text | Request a fresh Supabase OTP for the same email. |
| E022 | Use a different email | Text | Return to SignIn email entry. |

## State strings

- No explicit state string on this artboard; state is carried by the API contract above.

## Icons and symbols

No icon glyphs or SVG symbols are present; initials and provider marks are text/shape elements inventoried below.

## Element inventory

Element count: 25. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x844 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,24 390x71 | pad 32/16/0/16; margin 0/0/0/0; gap 0  |
|  E006 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,56 178x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | Step 2 of 2 | Text | micro | accent | transparent | accent | 16,56 178x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E008 | `.screen > div.sbody:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Check your email. | Text.heading | screen-title | text-primary | transparent | text-primary | 16,73 178x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(1)` | We sent a six-digit code to . It expires in 10 minutes. | Text | name | text-secondary | transparent | text-secondary | 16,107 283x59 | pad 0/0/0/0; margin 12/16/0/16; gap 0  |
|  E010 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(1) > b:nth-of-type(1)` | justin@slopssaloon.com | Text | name | text-primary | transparent | text-primary | 16,128 152x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,166 390x24 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E012 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4)` |  | OtpCodeField | body | text-primary | transparent | text-primary | 16,190 358x56 | pad 0/0/0/0; margin 0/16/0/16; gap 8  |
|  E013 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4) > i.on:nth-of-type(1)` | 4 | Text | call | text-primary | surface-1 | accent | 16,190 53x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4) > i:nth-of-type(2)` | 1 | Text | call | text-primary | surface-1 | border | 77,190 53x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4) > i:nth-of-type(3)` | 9 | Text | call | text-primary | surface-1 | border | 138,190 53x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E016 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4) > i.mt:nth-of-type(4)` | · | Text | call | text-tertiary | surface-1 | border | 199,190 53x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4) > i.mt:nth-of-type(5)` | · | Text | call | text-tertiary | surface-1 | border | 260,190 53x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody:nth-of-type(1) > div.otp:nth-of-type(4) > i.mt:nth-of-type(6)` | · | Text | call | text-tertiary | surface-1 | border | 321,190 53x56 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,246 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(2)` | Didn’t arrive? · | Text | body-sm | text-tertiary | transparent | text-tertiary | 16,262 358x18 | pad 0/0/0/0; margin 0/16/0/16; gap 0  |
|  E021 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(2) > span:nth-of-type(1)` | Send it again | Text | body-sm | accent | transparent | accent | 93,263 75x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody:nth-of-type(1) > p.qp:nth-of-type(2) > span:nth-of-type(2)` | Use a different email | Text | body-sm | accent | transparent | accent | 175,263 118x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E023 | `.screen > div.sbody:nth-of-type(1) > div.spacer:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,280 390x469 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody:nth-of-type(1) > div.note:nth-of-type(7)` | Paste the whole code and it fills every box. The keyboard stays up until the last digit lands. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,749 358x63 | pad 12/12/12/12; margin 0/16/16/16; gap 0  |
|  E025 | `.screen > div.sbody:nth-of-type(1) > div:nth-of-type(8)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,828 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 25 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through not an Omen route; do not fall back to older contracts when this screen requests the version above.
- Preserve the fits scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
