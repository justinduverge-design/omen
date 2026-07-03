# Phase 1.13 mobile QA — real Safari WebDriver sweep

**Date:** 2026-07-03
**Branch:** `frontend/phase1-13-mobile-qa-sweep` (`e234e7a`, child of `f826d2e`)
**Scope:** 6 unauthenticated routes — `/`, `/about`, `/login`, `/trade`, `/draft`, `/demo`
**Method:** Selenium 4.36 `webdriver.Safari()` via `safaridriver` — genuine desktop WebKit, genuine keyboard-origin focus events (`ActionChains.send_keys(Keys.TAB)`), not scripted `.focus()`/`.click()` or dispatched `KeyboardEvent`s. This closes the gap in the prior pass ([2026-07-02-phase1-13-mobile-qa-sweep-partial.md](2026-07-02-phase1-13-mobile-qa-sweep-partial.md)), which used a simulated preview browser and scripted key dispatch.
**Script:** `/tmp/phase1-13-safari-qa/qa_suite.py` (scratch, not committed — see note at bottom on whether to land it)

Full raw evidence (all assertion values, hop-by-hop logs, per-route/per-width data) is in `/tmp/phase1-13-safari-qa/results.json`. Screenshots are in `/tmp/phase1-13-safari-qa/screenshots/`.

---

## Methodology note: the app doesn't boot in real Safari over the actual prod server

Before any checklist item could run, the app failed to mount at all against the real target (`node --env-file=.env src/server.js`, `NODE_ENV=production`, plain HTTP on `:3000`) — real WebKit rendered a permanently blank white page. Diagnosis:

- `performance.getEntriesByType('resource')` returned zero entries — no subresources ever loaded.
- A manual `fetch()` from page context against the JS bundle returned `TypeError: Load failed`.
- Response headers showed Helmet's CSP includes `upgrade-insecure-requests` (auto-merged in because [`src/middleware/security.js`](../../src/middleware/security.js) never sets `useDefaults: false` on the `contentSecurityPolicy` config, so Helmet's defaults merge with the explicit directive list). Real WebKit enforces `upgrade-insecure-requests` by silently rewriting every same-origin `http://` subresource request to `https://` — and since `:3000` only serves plain HTTP, every rewritten request fails outright.
- Ruled out HSTS-over-HTTP / IP-literal exemption as the cause by testing `127.0.0.1` directly — still blank.

**This is a real, previously-unknown bug**, independent of the Phase 1.13 ARIA/touch-target work, and it's exactly the class of thing a simulated-browser pass cannot catch (a simulated preview doesn't enforce CSP `upgrade-insecure-requests` against real transport). **Any real device hitting the production build over plain HTTP today gets a blank page in Safari** — this would also hit iOS Safari on a real phone the same way.

**Recommended fix** in `src/middleware/security.js`: either set `useDefaults: false` on the `contentSecurityPolicy` block and explicitly opt into only the directives listed, or conditionally drop `upgradeInsecureRequests` (and reconsider `hsts`) when the server isn't behind TLS termination. Whichever path — this needs its own fix and isn't something this QA pass should silently paper over.

**Test isolation workaround used for the rest of this sweep:** built `/tmp/phase1-13-safari-qa/static_server.js`, a ~50-line header-free Node static server serving the *identical* `frontend/dist` build on `:3001` with zero security headers. All checks below ran against `:3001`, which serves byte-identical application code to `:3000` — only the transport-layer headers differ. This isolates the checklist from the CSP bug above without masking it.

---

## 1. Radiogroup real-keyboard navigation (`/draft`, Scoring Format) — **PASS**

Flow: mouse-click PPR → click a neutral heading to blur → hunt forward with genuine `Tab` keypresses (not `.focus()`) → assert landed on a `role="radio"` with visible focus outline → `ArrowRight` × 2 → `ArrowLeft` × 2, asserting `aria-checked`/`tabIndex` roving state and outline visibility at every stop.

- Mouse click PPR: `aria-checked`/`tabIndex` correctly become `(true, 0)` for PPR and `(false, -1)` for the other two.
- Real Tab reached the checked radio (PPR) in **1 hop**, with `getComputedStyle(activeElement).outlineStyle == "solid"` (never `"none"`) — confirms `:focus-visible` fires correctly from genuine keyboard-origin focus on this `<button role="radio">`.
- `ArrowRight` → Half PPR: `aria-checked`/`tabIndex` moved correctly (`half: (true,0)`, `ppr: (false,-1)`), outline stayed visible.
- `ArrowRight` → Standard: same, correct roving state, outline visible.
- `ArrowLeft` × 2 → back through Half PPR → PPR: same, correct roving state at every stop, outline visible throughout.

Screenshot: `/tmp/phase1-13-safari-qa/screenshots/check1_radiogroup_final_focus.png` (visible gold focus ring on PPR).

Full hop-by-hop log in `results.json` → `check1_radiogroup.log`.

---

## 2. Touch targets & chip spacing at 375/393/430px (`/draft`) — **PASS**

`getBoundingClientRect()` for every Scoring Format radio and every Position Needs chip, at all three widths. Flagged: any chip under 44×44px; any two adjacent same-row chips with <8px gap.

| Width | Scoring undersized | Scoring near-miss | Needs undersized | Needs near-miss |
|---|---|---|---|---|
| 375 | 0 | 0 | 0 | 0 |
| 393 | 0 | 0 | 0 | 0 |
| 430 | 0 | 0 | 0 | 0 |

All chips are exactly 44px tall (`h: 44` at every width); Position Needs chips are exactly 44×44 or wider. Gaps between adjacent chips are well above the 8px threshold at every width tested (raw rects for all chips at all 3 widths are in `results.json` → `check2_chip_targets.data`). No violations found — the Phase 1.13 touch-target fixes hold up under real rendering.

Screenshots: `check2_chips_w375.png`, `check2_chips_w393.png`, `check2_chips_w430.png`.

---

## 3. Hamburger nav drawer + Help panel — **FAIL** (real bug found, not a regression of the closed-state fix)

Tested: open → confirm not `inert`, `aria-expanded="true"`, links visible, **and that real Tab from the auto-focused close button reaches a link inside the panel**; close → confirm `inert` present, `aria-expanded="false"`, and a 20-hop Tab sweep never lands inside the (closed) container.

**Closed-state containment is correct** (this is the part the prior simulated-browser pass fixed and verified): once closed, `hasAttribute('inert')` is `true`, `aria-expanded` is `false`, and 20 real Tab hops after closing never land inside either container — 0/20 for both the nav drawer and the Help panel.

**Open-state focus trapping is broken — for both panels.** When either panel opens:
- Focus correctly auto-moves to the panel's close button (`aria-label="Close navigation"` / `"Close help"`).
- But the **next** real Tab keypress does not move to the next link inside the panel — it escapes the dialog entirely and lands on background page content: the Scoring Format PPR radio button, then the Draft Position input, then the Current Round input, cycling through those three repeatedly. This happened identically for both the nav drawer and the Help panel, confirmed over 8 hops each with zero hops landing inside the panel.

Root cause, confirmed by reading [`Header.jsx`](../../frontend/src/components/layout/Header.jsx): `NavDrawer` sets `inert` on itself only when *closed* (`inert={open ? undefined : ''}`) — there's no corresponding mechanism (focus trap keydown handler, or `inert`/`aria-hidden` on the rest of the page) that contains focus *inside* the dialog while it's *open*. The scrim (`<div className="fixed inset-0 ..." aria-hidden="true">`) blocks mouse clicks on the background via `pointerEvents: 'auto'`, but does nothing to keyboard focus order — background elements are still fully in the Tab sequence, just visually dimmed underneath the scrim. `HelpButton.jsx` has the identical pattern and the identical bug.

The nav-drawer screenshot (`check3_nav_drawer_open.png`) visually confirms this: you can see the dimmed Draft Position/Current Round inputs and Position Needs chips underneath the scrim — exactly the elements real Tab lands on.

This is a genuine WCAG 2.4.3 / ARIA APG modal-dialog violation (modal dialogs must trap focus while open) that the prior simulated-browser pass could not have caught, since it tested closed-state containment via scripted `KeyboardEvent` dispatch rather than genuine Tab traversal through an *open* dialog.

**Recommended fix:** add a focus trap to both `NavDrawer` and `HelpPanel` — on open, either set `inert` (or `aria-hidden` + `tabindex="-1"` sweep) on sibling page content, or add a `keydown` handler that cycles Tab/Shift+Tab between the dialog's first and last focusable elements (standard "roving trap" pattern). The existing `Escape`-to-close handler in both components is the right place to add it.

Evidence: `results.json` → `check3_panels` (`focus_trap_ok: false`, `markup_ok: true`, `close_ok: true` for both panels — the exact hop sequences are logged).

---

## 4. Horizontal overflow — 6 routes × 3 widths × portrait/landscape-approx — **PASS**

`document.documentElement.scrollWidth <= window.innerWidth` asserted for all 6 routes at 375/393/430px portrait **and** the same three widths with width/height swapped (landscape approximation — real device rotation/touch isn't available from desktop Safari).

**36/36 configs checked, 0 violations.** No route overflows horizontally at any tested width in either orientation approximation. Full per-config data in `results.json` → `check4_overflow.results`.

**Safe-area-inset usage (static check, NOT VERIFIABLE HERE):** grepped `env(safe-area-inset-*)` usage across `frontend/src`:

- [`Header.jsx:174,258`](../../frontend/src/components/layout/Header.jsx) — nav drawer top/bottom padding
- [`HelpButton.jsx:174,298,329`](../../frontend/src/components/ui/HelpButton.jsx) — help panel top/bottom padding + floating button offset
- [`Landing.jsx:35`](../../frontend/src/pages/Landing.jsx), [`OmenLanding.jsx:7`](../../frontend/src/pages/OmenLanding.jsx) — sticky header top padding

Desktop Safari has no real notch/home-indicator, so `env(safe-area-inset-*)` always resolves to `0` here — this is a code-presence check only, **not** a verification that the values render correctly against a real iPhone notch or home indicator. **Needs a hands-on pass on a real iPhone** (specifically an iPhone with a notch/Dynamic Island, in both orientations) to confirm the drawer/help-panel/header padding actually clears the safe areas.

---

## 5. Logo / Sign In / Try the live tool / Help quick-links navigation — **PASS**

All tested at 430×932, zero console errors captured on every click (via an injected `window.__qaErrors` listener wrapping `console.error` + `error`/`unhandledrejection` events — Safari's WebDriver has no `get_log`/CDP/BiDi console access, so this is the only viable capture mechanism; see caveat below).

- **Site logo** (`/trade` → click wordmark) → returns to `/` (SPA `<Link>`), 0 errors.
- **"Sign In →"** (`/` → plain `<a href="/login">`, full page reload) → lands on `/login`, 0 errors.
- **"Try the live tool →"** (`/` → plain `<a href="/about">`) → lands on `/about`, 0 errors.
- **Help panel quick links**, all 5, each re-opened fresh from `/draft`:
  - Trade Analyzer → `/trade` ✓, Draft Assistant → `/draft` ✓ (both non-auth-gated, land exactly on target)
  - Football Dashboard, Connect a Platform, Account → all correctly redirect to `/login` (these 3 sit behind `ProtectedRoute`; with no session, redirecting to login is correct behavior and out of this sweep's scope per the original task — not a failure)
  - 0 console errors on any of the 5

**Methodology caveat (not a bug, a measurement limitation):** for full-page `<a href>` navigations (Sign In, Try the live tool), the error listener is re-injected *after* the new document loads, so any error thrown during that page's very first synchronous script parse/mount — before the listener can attach — would not be captured. SPA `<Link>` navigations (logo, quick links) don't have this gap since the JS context persists across the route change. No errors were observed in either case, but this gap is worth naming explicitly rather than claiming airtight coverage.

---

## Still needs a hands-on pass on a real iPhone

Desktop Safari WebDriver cannot exercise these — they are **NOT VERIFIABLE HERE**, not silently passed:

1. **Real safe-area-inset rendering** against an actual notch/Dynamic Island/home indicator (item 4 above) — code presence confirmed, rendering not confirmed.
2. **Genuine touch behavior**: tap accuracy/hit-testing on the 44×44 chips under a real finger (vs. a WebDriver-synthesized click), swipe/scroll momentum, double-tap-zoom prevention.
3. **Real device rotation** — item 4's landscape check is a width/height *swap* approximation; actual `orientationchange` timing, any layout thrash during the transition, and the safe-area values changing mid-transition are untested.
4. **VoiceOver** (real screen reader) traversal of the nav drawer / Help panel — the focus-trap bug found in item 3 will also affect VoiceOver users navigating by swipe, likely more severely, and should be re-verified once the fix lands.
5. **The CSP `upgrade-insecure-requests` bug** (see methodology section) needs to be confirmed as fixed against the *actual* `:3000` production server, over the network, from a real iPhone — the `:3001` workaround used for this whole sweep was necessary specifically because the real server doesn't work yet.

---

## Summary

| # | Check | Verdict |
|---|---|---|
| 1 | Radiogroup real-keyboard nav | **PASS** |
| 2 | Touch target size + chip gaps | **PASS** |
| 3 | Nav drawer / Help panel open/close + focus containment | **FAIL** — no focus trap while open (real bug, both panels) |
| 4 | No horizontal overflow, 6 routes × 6 configs | **PASS** (safe-area rendering: NOT VERIFIABLE HERE) |
| 5 | Logo / Sign In / Try the live tool / Help quick-links nav | **PASS** |
| — | Prod server (`:3000`) boots in real Safari at all | **FAIL** — separate, high-severity finding (CSP `upgrade-insecure-requests` over plain HTTP) |

Two real, previously-unknown bugs came out of this pass, both structurally invisible to a simulated-browser/scripted-event QA method:
1. **CSP `upgrade-insecure-requests` blanks the entire SPA in real Safari** when served over plain HTTP (`src/middleware/security.js`).
2. **No focus trap in either slide-in panel while open** — real keyboard Tab escapes into background page content (`Header.jsx` `NavDrawer`, `HelpButton.jsx` `HelpPanel`).

Both need fixes before this can be called done; recommended fixes are inline in sections 3 and the methodology note above.

**On the script:** `/tmp/phase1-13-safari-qa/qa_suite.py` + `static_server.js` are scratch/not committed. If this kind of real-WebDriver sweep should be repeatable (e.g. re-run after the two fixes above land), worth asking whether to land a trimmed version under something like `frontend/qa/` — flagging as a decision rather than assuming either way.
