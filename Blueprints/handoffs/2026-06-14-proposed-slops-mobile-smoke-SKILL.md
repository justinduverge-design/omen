---
name: slops-mobile-smoke
description: Automated phone-shape smoke. Drives the run-slops-saloon driver at iPhone viewports (SE / 15 Pro / 15 Pro Max) and reports machine-checkable violations from mobile-first-qa-playbook — touch targets <44px, horizontal overflow at 375/390/430px, missing safe-area-inset on fixed elements, viewport meta missing viewport-fit=cover, inputs with computed font-size <16px, JS errors, missing routes. Severity-ranked output (P0/P1/P2). Audit only; never replaces real-device QA.
status: draft
skill_type: wrapper
layer: 0
default_agent: Claude (review findings), Codex (extend driver + fixes via loop)
trigger: "mobile smoke | iPhone smoke | phone-shape smoke | pre-deploy mobile check"
version: 0.1.0
upstream: playwright-core@1.49.x (already vendored in slops-saloon/corvus/node_modules)
owner: Justin
---

# Slops Mobile Smoke

## Purpose

Automate the machine-checkable axes from `mobile-first-qa-playbook` so they run before every deploy
without burning Justin's morning on a manual iPhone walk. The playbook stays the WHAT (the failure
list, P0/P1/P2 framing); this skill is the HOW — driver runs + report.

**Critical scope line:** this does *not* replace device QA. iOS Safari has quirks Playwright's
bundled WebKit can't reproduce (real dynamic toolbar, real `env(safe-area-inset-*)`, real
pinch-zoom semantics, real keyboard avoidance). Use this as a regression gate that catches the
things a human is bad at: every-route overflow checks, every-input font-size checks, every-
interactive-element 44px checks. Use the device for the things only a human can feel:
"this feels slow," "this typography clashes," "this state is unclear."

## When to Use

- Before opening a PR that touches layout, routes, or interactive components.
- As a pre-deploy gate alongside `slops-canary` and `slops-quality-baseline`.
- After bumping any UI dependency (Tailwind, React Router, design tokens) to catch silent breaks.
- During a phase like the iOS Safari sweep (Phase 1.3) to baseline before/after.

## When Not to Use

- As a substitute for real-device QA. Hard rule.
- For visual pixel-diffs. Too flaky; use snapshot evidence in the report and let humans judge.
- For testing live platform integrations (Yahoo / Sleeper / ESPN) — that's `slops-verify`.
- For component-level unit tests — that's the existing test suite.

## Required Inputs

- A reachable running instance: local Vite (`localhost:5173`) OR a deployed URL.
- The route inventory the smoke should walk. Default: read from `frontend/src/routes/index.jsx`.
  Authenticated routes are skipped unless a session-bypass mode is configured.
- The axis list from `mobile-first-qa-playbook` (the WHAT). This skill implements a machine-checkable
  subset; non-machine-checkable axes stay manual under the playbook.

## Preconditions & Dependencies

- **Runtime:** Node.js 24+ (`node --version`).
- **Package:** `playwright-core` — already in `slops-saloon/corvus/node_modules` (vendored).
  Pinned at the version in `corvus/package.json`. No install required.
- **Browser binary:** Chromium downloaded on first run to `%LOCALAPPDATA%\ms-playwright`.
  WebKit binary will need a first-run download too — detect and stop with the install command if
  missing (see Install Boundary below).
- **Reachable target:** the dev server or deployed URL must respond before the driver starts. A
  build-only run cannot smoke functional axes (learned by `slops-verify` on 2026-06-08).

**Install boundary.** This skill never auto-installs anything. If the WebKit binary is missing,
the driver stops with:

```text
Missing Playwright WebKit binary. Ask Justin to run:
  node -e "require('./node_modules/playwright-core').webkit.launch().then(b=>b.close())"
```

## Read-First Procedure

1. `frontend/src/routes/index.jsx` — route inventory.
2. `Blueprints/skills/mobile-first-qa-playbook/SKILL.md` — the canonical axis list.
3. `.claude/skills/run-slops-saloon/driver.cjs` — existing driver to extend.
4. `Blueprints/definition-of-done.md` — the bar a finding might gate against.
5. Nothing else unless a specific finding requires reading a component.

## Process Recipe

1. Confirm the target (URL) is reachable. If not, stop and report BLOCKED.
2. For each viewport in the matrix (default: 375×667 iPhone SE, 390×844 iPhone 15 Pro,
   430×932 iPhone 15 Pro Max), drive each public route in the inventory.
3. Per route, capture:
   - Full-page screenshot at the viewport width
   - All JS console errors and unhandled rejections
   - All network failures
   - DOM-driven axis checks (see "Machine-checkable axes" below)
4. Aggregate into a single markdown report with sections per route, per viewport, per finding.
5. Severity-rank using the playbook's P0/P1/P2 buckets.
6. Output to `Solutions/reports/<YYYY-MM-DD>-mobile-smoke-<product>.md` (per the playbook's output
   convention). Embed screenshot filenames; screenshots land at
   `Solutions/reports/_screenshots/<run-id>/...`.

### Machine-checkable axes (the subset this skill automates)

| Axis | Check | Severity if violated |
| --- | --- | --- |
| Touch targets <44px | All elements matching `button, a, [role="button"], input[type="checkbox"], input[type="radio"], select` measured via `getBoundingClientRect()` — flag any with width OR height <44px (with the exception of inline links inside paragraphs, which are scoped via parent-tag detection). | P1 |
| Horizontal overflow | `document.documentElement.scrollWidth > window.innerWidth` at viewport width. | P0 |
| Viewport meta | Presence of `viewport-fit=cover` and absence of `user-scalable=no` / `maximum-scale=1` in the `<meta name="viewport">` tag. | P1 (missing fit-cover) / P0 (zoom blocked) |
| Input font-size <16px | All `input[type=text|email|password|number|search|tel|url], textarea, select` — computed `font-size` <16px on mobile breakpoint. | P1 |
| `min-h-screen` / `100vh` | Search the DOM for any element with `min-height: 100vh` or `height: 100vh` (computed). | P1 |
| Missing safe-area on fixed-bottom | Any element with `position: fixed` and `bottom: 0` (or near-zero) that lacks any `env(safe-area-inset-bottom)` in its inline style or computed padding-bottom. | P1 |
| JS errors at route load | Console errors, page errors, request failures. | P0 |
| Route returns 404 | Page does not match the expected DOM (e.g., the AppLayout shell is absent). | P0 |
| Pinch-zoom blocked | `user-scalable=no` or `maximum-scale<=1` in viewport meta. | P0 |

### Non-machine-checkable axes (stay manual under `mobile-first-qa-playbook`)

- Keyboard avoidance behavior (real iOS keyboard)
- Real dynamic toolbar / 100dvh behavior
- Share sheet
- Add-to-Home-Screen and PWA install flow
- Visual hierarchy / "feels off"
- Hover-only states (we can detect them, but the consequence depends on context)
- Body scroll-lock rubber-band
- Perceived performance ("this feels slow")

## Output Contract

Single markdown file at `Solutions/reports/<YYYY-MM-DD>-mobile-smoke-<product>.md`:

```markdown
# Mobile Smoke Report — <product> — <date>

**Target:** <URL>
**Driver:** slops-mobile-smoke v<version>
**Viewports:** iPhone SE (375), iPhone 15 Pro (390), iPhone 15 Pro Max (430)
**Routes audited:** <count> public + <count> auth-skipped

## Summary
- P0: <count>
- P1: <count>
- P2: <count>

## P0 findings
... (one block per finding: axis, route, viewport, evidence path, smallest-fix recommendation)

## P1 findings
...

## P2 findings
...

## Routes audited (clean)
... (just route + viewport, no body)

## Routes skipped
... (route + reason: "auth required, no bypass configured")
```

Always include:
- Target path of report
- Run timestamp + driver version + upstream Playwright version
- List of routes that were skipped (with reason) so silent gaps are visible

## Verification

- **Smoke test:** run the driver against the production landing page (`https://slopssaloon.com`)
  with the default viewport matrix and assert the report file is created with at least one
  non-empty section.
- **Success signal:** report file exists at the expected target path AND the run-summary block
  shows P0/P1/P2 counts (even if all are zero).
- **Escalation:** any P0 from a routine smoke run routes through `slops-investigate` to confirm
  the cause before opening a fix item. Routine smoke is for catching regressions; a fresh P0
  is a real incident.

## Safety Rules

- Read-only against production. Never POSTs except where the route inventory explicitly marks a
  read-safe form (e.g., GET search).
- Never logs cookie values, session tokens, ESPN cookies, or any field whose name matches
  `/(cookie|swid|s2|token|secret|key|password)/i`.
- Never edits app code. Findings route through the build loop for fix work.
- Never deploys.
- Never replaces device QA. If the report comes back clean, the next step is still a real iPhone
  walk for the qualitative axes the machine can't check.

## DBS Routing

- Reports → `Solutions/reports/<YYYY-MM-DD>-mobile-smoke-<product>.md`
- Screenshot evidence → `Solutions/reports/_screenshots/<run-id>/...`
- Driver extensions → `slops-saloon/corvus/.claude/skills/run-slops-saloon/` (extends, doesn't
  replace, the existing CJS driver)
- This skill → `Blueprints/skills/_proposals/slops-mobile-smoke/SKILL.md` while in draft,
  promote to `Blueprints/skills/slops-mobile-smoke/SKILL.md` on approval

## Failure Modes

- Reporting "no findings" when WebKit binary failed to launch — verification must check for the
  report file AND the per-viewport pass count, not just the exit code.
- Treating viewport emulation as iOS Safari ground truth. WebKit isn't iOS Safari; document this
  in the report header.
- Flagging every Tailwind utility class as a touch-target violation because the test misreads
  computed sizes during route transitions. Add a `waitForLoadState('networkidle')` before the
  axis sweep.
- Drift between this skill's axis list and the canonical `mobile-first-qa-playbook` axis list.
  Re-anchor on every minor version bump.
- Cookie / token name in a URL query string getting screenshotted into evidence. The driver must
  redact known-sensitive query params from screenshot filenames AND blur them in capture if
  visible on-screen.

## Prior Use Review Loop

Path: `Blueprints/skills/slops-mobile-smoke/notes/prior-use-review.md`

After each routine run, append one line: date, P0/P1/P2 counts, any false positives that need
the driver updated.

## Changelog

- 0.1.0 — initial proposal (2026-06-14). Not yet implemented; driver extension is the next step.

## Implementation Notes (proposal-only)

The driver extension to `run-slops-saloon/driver.cjs` should:

1. Add a `--mode=mobile-smoke` flag.
2. Add device profiles using `playwright-core`'s built-in `devices` map (already includes
   `'iPhone SE'`, `'iPhone 15 Pro'`, `'iPhone 15 Pro Max'`).
3. Use `webkit.launch()` instead of `chromium.launch()` for the mobile-smoke mode — closer to
   iOS Safari than emulated-Chrome.
4. Inject the axis-check JS into each page after `networkidle`.
5. Write the report markdown directly; no test framework required.

Approximate driver size: ~250 lines additional CJS. Single file change.
