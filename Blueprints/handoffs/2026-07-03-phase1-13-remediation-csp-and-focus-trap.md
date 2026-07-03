# 2026-07-03 — Phase 1.13 remediation: CSP bug + focus trap

Follow-up to [`2026-07-03-phase1-13-mobile-qa-real-safari-sweep.md`](2026-07-03-phase1-13-mobile-qa-real-safari-sweep.md). That report surfaced two findings beyond the original 5-item checklist. Both are now fixed and verified with real Safari WebDriver — this doc closes them out.

## Finding 1 — CSP `upgrade-insecure-requests` broke the SPA over plain HTTP

**Root cause:** Helmet's CSP defaults (`useDefaults: true`) merge in `upgrade-insecure-requests` unless explicitly excluded. `src/server.js` sets `app.set("trust proxy", 1)` — TLS is terminated at the Nginx/Oracle LB in front of Node, so the Node process itself only ever speaks plain HTTP, including for local/LAN device QA hitting it directly. Real WebKit enforces `upgrade-insecure-requests` by silently rewriting every same-origin `http://` asset fetch to `https://`, which fails outright with nothing listening on TLS at that port — the SPA never mounted in real Safari.

**Fix:** [`src/middleware/security.js`](../../src/middleware/security.js) — added `upgradeInsecureRequests: null` to the `contentSecurityPolicy.directives` object. This excludes only that one default directive (confirmed via Helmet 7.2.0 source, `normalizeDirectives()`); all other Helmet CSP defaults (`base-uri`, `form-action`, `frame-ancestors`, `script-src-attr`, etc.) still apply.

**Verification:** Restarted the real production-mode server (`node --env-file=.env src/server.js`, `NODE_ENV` from `.env`) on `:3000`, confirmed via `curl -I` that the CSP response header no longer includes `upgrade-insecure-requests`, then loaded `/draft` in real `webdriver.Safari()` over plain HTTP. SPA mounted correctly — heading, nav, and Draft Assistant content all present. Previously this hung/failed to mount under the same conditions.

## Finding 2 — Focus escaped the open nav drawer / Help panel via real keyboard Tab

**Root cause, refined during investigation:** the initial framing ("no focus trap") was incomplete. Diagnostic script (`debug_tabindex.py`, scratch) showed the drawer's close button and nav links are in correct DOM order and are programmatically `.focus()`-able, yet real `Tab` skipped over them. A follow-up test (`debug_tabindex2.py`, scratch) confirmed why: macOS Safari's default keyboard mode (without "Full Keyboard Access") excludes plain `<button>`/`<a href>` elements from the native Tab order unless they carry an *explicit* `tabindex` HTML attribute — forcing `tabindex="0"` via JS made the same elements newly Tab-reachable in the correct order. So real Safari Tab wasn't just escaping an untrapped boundary — for elements without explicit `tabindex`, it was skipping the entire modal's interior and landing on the nearest actually-tabbable background element (a roving-tabindex radio button or a native `<input>`).

This means a conventional trap that only intercepts Tab at the first/last element (relying on native traversal for the interior hops) would still fail in Safari, since interior hops between un-indexed links are exactly what Safari's default mode skips.

**Fix:** [`frontend/src/lib/useFocusTrap.js`](../../frontend/src/lib/useFocusTrap.js) (new, following the existing `lib/use*.js` hook convention) — intercepts *every* `Tab`/`Shift+Tab` keydown while active, queries the container's focusable elements fresh on each keypress, and drives focus between them via `.focus()` with `preventDefault()`. Programmatic `.focus()` bypasses Safari's Tab-reachability restriction entirely (confirmed via the same diagnostic), so this holds regardless of that platform quirk, and works identically in Chromium/Firefox where the quirk doesn't exist. Wired into:
- [`frontend/src/components/layout/Header.jsx`](../../frontend/src/components/layout/Header.jsx) — `NavDrawer`, trapped on `drawerRef` while `open`.
- [`frontend/src/components/ui/HelpButton.jsx`](../../frontend/src/components/ui/HelpButton.jsx) — `HelpPanel`, trapped on `panelRef` while `open`.

**Verification:** Rebuilt `frontend/dist` (`npm run build`) and re-ran both a standalone real-Safari script (`verify_focustrap.py`, scratch — 12 forward hops + 3 reverse hops on each panel, multiple full wrap cycles) and the full `qa_suite.py` suite against it. Forward Tab now cycles `Close → link → link → link → Close → …` indefinitely without ever landing outside the container; `Shift+Tab` reverses correctly. `qa_suite.py`'s `check3_panels` — previously the only failing check in the original sweep — now passes:

```
nav_drawer: real-Tab from close button reached a link inside panel = True after 1 hop(s)
help_panel: real-Tab from close button reached a link inside panel = True after 1 hop(s)
```

## Full suite re-run (post-fix)

All 5 checklist items pass against the rebuilt bundle, no regressions:

```
check1_radiogroup: pass=True
check2_chip_targets: pass=True
check3_panels: pass=True   (was False in the original sweep)
check4_overflow: pass=True
check5_links: pass=True
```

## Files changed

- `src/middleware/security.js` — CSP fix.
- `frontend/src/lib/useFocusTrap.js` — new hook.
- `frontend/src/components/layout/Header.jsx` — wired trap into `NavDrawer`.
- `frontend/src/components/ui/HelpButton.jsx` — wired trap into `HelpPanel`.

Changes are on `frontend/phase1-13-mobile-qa-sweep` (unstaged as of this handoff), the same branch as the original sweep's commit `f826d2e`. Not committed — per standing instruction, commits happen on Justin's explicit ask.

## Skill receipt

- `slops-ui-ux-audit` — not re-run standalone; the real-Safari WebDriver verification above is the evidence trail for this remediation's accessibility claim (gate 10, Design Done: "Focus rings visible... consistent across modes" — extended in practice to focus *order*, since the underlying bug was keyboard-navigation escape, not ring visibility).
- Security-Done gates: mostly N/A — no auth, data, secret, or credential path touched. The CSP change is a transport/header config fix, recorded here for traceability rather than against a numbered gate.

## Still open

- Neither fix has been committed. Recommend a scoped commit on `frontend/phase1-13-mobile-qa-sweep` once reviewed.
- A hands-on physical iPhone pass (real cellular/WiFi network, real Safari chrome, VoiceOver) is still recommended before calling Phase 1.13 fully closed — noted in the original sweep report and still true.
