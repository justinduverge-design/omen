# Screen contract - ConnectFailed

Compiled from `design/native-visual-lock-2026-09-13/ConnectFailed.dc.html` on 2026-09-14 using `_shared.css` hash `5f66e0a5c23a`. Source hash `348bf22f3487`.

## Build binding

| Field | Value |
|---|---|
| Artboard title | 5 · ESPN — failed |
| Family | Onboarding & connection |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls; measured body overflow from canvas render: 0px. |
| Data route | GET /api/platforms/state |
| API contract | platform-provider-state.v1 |
| Governing rule | known_issues.md ESPN fragility; stale cookies are recoverable |

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
- `That did not work`
- `JD`
- `ESPN returned 401 Unauthorized for league 884411 at 3:48 PM. The cookies are there and ESPN is refusing them.`
- `MOST LIKELY CAUSE`
- `You signed out of ESPN — or ESPN signed you out, which it does every few weeks. The values Omen stored are stale. Nothing is wrong with your league.`
- `TRY IN THIS ORDER`
- `Open ESPN Fantasy in your browser and sign in again.`
- `Come back here and tap Reconnect. Omen re-reads the two cookies.`
- `Still failing? The league may have been made private, or deleted.`
- `Reconnect ESPN`
- `Send this to support`
- `Your other two leagues are unaffected. Sleeper and Yahoo are still live.`

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E009 | JD | AvatarButton | Open Account. |
| E024 | Reconnect ESPN | Button.primary | Run the recovery action from platform-provider-state.v1, then refresh the affected section only. |
| E025 | Send this to support | Button.secondary | Open report composer; GET /api/beta/reports/schema first, then POST metadata-only report. |

## State strings

- `That did not work`
- `You signed out of ESPN — or ESPN signed you out, which it does every few weeks. The values Omen stored are stale. Nothing is wrong with your league.`
- `Open ESPN Fantasy in your browser and sign in again.`
- `Come back here and tap Reconnect. Omen re-reads the two cookies.`
- `Reconnect ESPN`
- `Your other two leagues are unaffected. Sleeper and Yahoo are still live.`

## Icons and symbols

No icon glyphs or SVG symbols are present; initials and provider marks are text/shape elements inventoried below.

## Element inventory

Element count: 30. Count every rendered descendant inside `.screen`; pseudo-elements are listed under icons/symbols.

| ID | Selector | Text | Component | Type role | Foreground token | Background token | Border token | Rect | Spacing |
|---|---|---|---|---|---|---|---|---|---|
|  E001 | `.screen > div.sbody.scrolls:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x844 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E002 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1)` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 | pad 10/16/0/16; margin 0/0/0/0; gap 0  |
|  E003 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(1)` | 3:50 | Text | label | text-tertiary | transparent | text-tertiary | 16,10 23x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E004 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.statusbar:nth-of-type(1) > span:nth-of-type(2)` | 5G · 42% | Text | label | text-tertiary | transparent | text-tertiary | 329,10 45x14 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E005 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2)` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,24 390x51 | pad 12/16/0/16; margin 0/0/0/0; gap 0  |
|  E006 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 16,36 176x39 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E007 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > p.kick:nth-of-type(1)` | ESPN | Text | micro | accent | transparent | accent | 16,36 176x13 | pad 0/0/0/0; margin 0/0/4/0; gap 0  |
|  E008 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div:nth-of-type(1) > h2.ttl:nth-of-type(1)` | That did not work | Text.heading | screen-title | text-primary | transparent | text-primary | 16,53 176x22 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E009 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.top:nth-of-type(2) > div.av:nth-of-type(2)` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,45 30x30 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E010 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(3)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,75 390x12 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E011 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.fld:nth-of-type(4)` |  | FormField | body | text-primary | transparent | text-primary | 16,87 358x46 | pad 0/0/0/0; margin 0/16/0/16; gap 8  |
|  E012 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.fld:nth-of-type(4) > span.err:nth-of-type(1)` | ESPN returned for league 884411 at 3:48 PM. The cookies are there and ESPN is refusing them. | Text | body-sm | text-primary | risk-high | text-primary | 16,87 358x46 | pad 6/8/6/8; margin 0/0/0/0; gap 0  |
|  E013 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.fld:nth-of-type(4) > span.err:nth-of-type(1) > b:nth-of-type(1)` | 401 Unauthorized | Text | body-sm | text-primary | transparent | text-primary | 110,93 102x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E014 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,145 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E015 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(5) > b:nth-of-type(1)` | Most likely cause | Text | micro | text-tertiary | transparent | text-tertiary | 16,145 137x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E016 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(6)` | You signed out of ESPN — or ESPN signed you out, which it does every few weeks. The values Omen stored are stale. | NoticeCard | name | text-secondary | surface-1 | text-secondary | 16,164 358x83 | pad 12/12/12/12; margin 0/16/0/16; gap 0  |
|  E017 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.note:nth-of-type(6) > b:nth-of-type(1)` | Nothing is wrong with your league. | Text | name | text-primary | transparent | text-primary | 127,216 215x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E018 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,258 390x13 | pad 0/16/0/16; margin 12/0/6/0; gap 0  |
|  E019 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sh:nth-of-type(7) > b:nth-of-type(1)` | Try in this order | Text | micro | text-tertiary | transparent | text-tertiary | 16,258 131x13 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E020 | `.screen > div.sbody.scrolls:nth-of-type(1) > ol.steps.pad:nth-of-type(1)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,279 390x102 | pad 0/16/0/16; margin 2/0/0/0; gap 8  |
|  E021 | `.screen > div.sbody.scrolls:nth-of-type(1) > ol.steps.pad:nth-of-type(1) > li:nth-of-type(1)` | Open ESPN Fantasy in your browser and sign in again. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 16,279 358x18 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E022 | `.screen > div.sbody.scrolls:nth-of-type(1) > ol.steps.pad:nth-of-type(1) > li:nth-of-type(2)` | Come back here and tap Reconnect. Omen re-reads the two cookies. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 16,305 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E023 | `.screen > div.sbody.scrolls:nth-of-type(1) > ol.steps.pad:nth-of-type(1) > li:nth-of-type(3)` | Still failing? The league may have been made private, or deleted. | StepGuideRow | body-sm | text-secondary | transparent | text-secondary | 16,347 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 8  |
|  E024 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn:nth-of-type(8)` | Reconnect ESPN | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 16,393 358x42 | pad 12/12/12/12; margin 12/16/0/16; gap 0  |
|  E025 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.btn.ghost:nth-of-type(9)` | Send this to support | Button.secondary | card-lead | text-secondary | transparent | border | 16,443 358x44 | pad 12/12/12/12; margin 8/16/0/16; gap 0  |
|  E026 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.spacer:nth-of-type(10)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,487 390x296 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E027 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.oneline:nth-of-type(11)` |  | NativeStack | body | text-primary | transparent | border-subtle | 16,783 358x45 | pad 10/0/0/0; margin 0/16/0/16; gap 10  |
|  E028 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.oneline:nth-of-type(11) > span.tx:nth-of-type(1)` | Sleeper and Yahoo are still live. | Text | body-sm | text-secondary | transparent | text-secondary | 16,794 358x34 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E029 | `.screen > div.sbody.scrolls:nth-of-type(1) > div.oneline:nth-of-type(11) > span.tx:nth-of-type(1) > b:nth-of-type(1)` | Your other two leagues are unaffected. | Text | body-sm | text-primary | transparent | text-primary | 16,794 222x15 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |
|  E030 | `.screen > div.sbody.scrolls:nth-of-type(1) > div:nth-of-type(12)` |  | NativeStack | body | text-primary | transparent | text-primary | 0,828 390x16 | pad 0/0/0/0; margin 0/0/0/0; gap 0  |

## Acceptance checks

- Render exactly 30 element descendants inside the screen frame and preserve every literal listed above.
- Bind data only through platform-provider-state.v1; do not fall back to older contracts when this screen requests the version above.
- Preserve the scrolls scroll behavior at 390 x 844. Smaller iPhone SE screens may scroll.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states.
