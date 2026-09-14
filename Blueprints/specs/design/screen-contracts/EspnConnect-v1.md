# Screen contract - EspnConnect

Compiled from `design/native-visual-lock-2026-09-13/EspnConnect.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `1b5cacdfe460`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | 4 · ESPN — consent |
| Family | Onboarding & connection |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | POST /api/platforms/espn/connect |
| API contract | espn-connect.v1 |
| Governing rule | facts-of-record #6; cookie names may display, values never display/log/echo |

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
- `ESPN`
- `Before we start`
- `JD`
- `ESPN has no read-only sign-in. There is no ESPN equivalent of the “Continue with Yahoo” button, so the only way in is the two cookies your browser already holds. That is a real trade-off and you should make it knowingly.`
- `WHAT OMEN TAKES`
- `Two cookies, SWID and espn_s2, which identify you to ESPN.`
- `Your leagues, rosters, matchups and scoring settings.`
- `WHAT OMEN NEVER DOES`
- `Set a lineup, make a claim, or send a trade.`
- `Post, message, or act as you anywhere.`
- `Show those cookies back to you, log them, or send them anywhere but ESPN.`
- `Signing out of ESPN in your browser ends Omen’s access too. You can disconnect from Account at any time and the stored values are deleted.`
- `I understand — open the ESPN sheet`
- `Use Sleeper or Yahoo instead`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E009 | JD | AvatarButton | Open Account. |
| E027 | I understand — open the ESPN sheet | Button.primary | Proceed from consent into ESPN credential capture. |
| E028 | Use Sleeper or Yahoo instead | Button.secondary | Update only the named local UI state; no hidden network side effect. |

## State strings

- `Signing out of ESPN in your browser ends Omen’s access too. You can disconnect from Account at any time and the stored values are deleted.`
- `I understand — open the ESPN sheet`

## Icons and symbols

No icon glyphs or SVG symbols are present; initials and provider marks are text/shape elements inventoried below.

## Element inventory

Element count: 29. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x844 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,24 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,36 154x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | ESPN | Text | micro | accent | transparent | accent | 16,36 154x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | Before we start | Text.heading | screen-title | text-primary | transparent | text-primary | 16,53 154x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,45 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,75 390x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(4)` | There is no ESPN equivalent of the “Continue with Yahoo” button, so the only way in is the two cookies your browser already holds. That is a real trade-off and you should make it knowingly. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,87 358x122 | pad 12/12/12/12; margin 0/16/0/16; gap 0  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(4) > b:nth-of-type(1)` | ESPN has no read-only sign-in. | Text | name | text-primary | transparent | text-primary | 28,100 189x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,221 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | What Omen takes | Text | micro | text-tertiary | transparent | text-tertiary | 16,221 129x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(1)` |  | NativeStack | name | text-secondary | transparent | text-secondary | 0,240 390x63 | pad 0/0/0/16; margin 0/0/0/0; gap 6  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(1) > li:nth-of-type(1)` | Two cookies, and , which identify you to ESPN. | StepGuideRow | name | text-secondary | transparent | text-secondary | 16,240 374x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(1) > li:nth-of-type(1) > code:nth-of-type(1)` | SWID | Text | body-sm | text-primary | code-bg | text-primary | 96,242 37x16 | pad 1/4/1/4; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(1) > li:nth-of-type(1) > code:nth-of-type(2)` | espn_s2 | Text | body-sm | text-primary | code-bg | text-primary | 162,242 59x16 | pad 1/4/1/4; margin 0/0/0/0; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(1) > li:nth-of-type(2)` | Your leagues, rosters, matchups and scoring settings. | StepGuideRow | name | text-secondary | transparent | text-secondary | 16,284 374x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,315 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(6) > b:nth-of-type(1)` | What Omen never does | Text | micro | text-tertiary | transparent | text-tertiary | 16,315 171x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(2)` |  | NativeStack | name | text-secondary | transparent | text-secondary | 0,334 390x87 | pad 0/0/0/16; margin 0/0/0/0; gap 6  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(2) > li:nth-of-type(1)` | Set a lineup, make a claim, or send a trade. | StepGuideRow | name | text-secondary | transparent | text-secondary | 16,334 374x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(2) > li:nth-of-type(2)` | Post, message, or act as you anywhere. | StepGuideRow | name | text-secondary | transparent | text-secondary | 16,358 374x19 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > ul.bullets.pad:nth-of-type(2) > li:nth-of-type(3)` | Show those cookies back to you, log them, or send them anywhere but ESPN. | StepGuideRow | name | text-secondary | transparent | text-secondary | 16,383 374x38 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.hatch:nth-of-type(7)` | Signing out of ESPN in your browser ends Omen’s access too. You can disconnect from Account at any time and the stored values are deleted. | SampleDataPanel | body-sm | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 16,435 358x73 | pad 10/10/10/10; margin 14/16/0/16; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(8)` | I understand — open the ESPN sheet | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,520 358x42 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(9)` | Use Sleeper or Yahoo instead | Button.secondary | card-lead | text-secondary | transparent | border | 16,570 358x44 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,614 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 29 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through espn-connect.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
