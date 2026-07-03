# Mobile QA Sweep — Omen — 2026-07-02

**Skill:** `mobile-first-qa-playbook`
**Status:** Complete. Part 1 (source-code audit) + Part 2 (live sweep, 298 screenshots via Safari WebDriver — real WebKit, not emulation).
**Method note:** Part 2 used desktop Safari's WebDriver automation (`safaridriver`) resized to iPhone SE / 15 Pro / 15 Pro Max viewport widths, driving the real logged-in app end to end — Pass 1 covered all 14 routes at all 3 widths; Pass 2 clicked through all 32 NFL team color schemes via the real Appearance-page UI (not a synthetic state injection — see caveat below) across the 8 "accent active" pages. Same WebKit engine as an iPhone, but not identical to a physical device: true `env(safe-area-inset-*)` values, the real on-screen keyboard, and Share Sheet weren't exercised. Screenshots: `Solutions/reports/_screenshots/2026-07-02-mobile-qa/`.
**Methodology caveat:** an earlier attempt at Pass 2 set team state directly via `localStorage` injection, which the app silently overrode (something re-syncs the saved account preference over it) — every "team" screenshot from that run showed the same wrong content. Re-done by clicking the actual team tiles through the UI, which is the version reflected below.

## Part 1 — Source Audit

### Viewport / pinch-zoom — PASS
`frontend/index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`. No `user-scalable=no` or `maximum-scale` — pinch-zoom is not disabled. `viewport-fit=cover` is present, which is the required precondition for `env(safe-area-inset-*)` to take effect at all.

### PWA / Add-to-Home-Screen — PASS (P2 nit)
`manifest.webmanifest` has name, short_name, standalone display, theme/background color, and maskable icons at 256/512. `apple-touch-icon` (180x180) is set separately in `index.html`. Minor: no 192x192 icon in the manifest, which some Android launchers prefer — cosmetic, not a blocker.

### Safe-area insets — PASS where it matters, one gap
Used correctly in `Header.jsx`, `HelpButton.jsx` (floating element), `Landing.jsx`, `OmenLanding.jsx`. **Not found** in `Footer.jsx` or `AppLayout.jsx` — but there's no fixed-position bottom nav bar in this app (navigation is a drawer, not a bottom tab bar), so the blast radius is small. **P2**: confirm `Footer.jsx` doesn't render behind the home-indicator area when it's the last scrollable element on a notched device — worth a screenshot check in Part 2, not urgent.

### `prefers-reduced-motion` — PASS
Two call sites: `index.css` actively guards the post-win-pulse header wash animation (`animation: none` under reduced motion). `themeMode.js` reads the flag for the cultural-moment chrome (`MomentChrome.jsx`) but the code comments explain that surface is static (tint + text, no animation) — the flag is read to keep the contract explicit but there's nothing to disable. Not a gap.

### Touch targets — PASS (strong signal)
`min-h-[44px]` / equivalent sizing appears 56 times across 25 files, including all the interactive surfaces that matter (buttons, chips, nav items, form controls). Code-level intent is solid. **Still needs Part 2 confirmation** — explicit classes don't guarantee no override collapses an element at a specific breakpoint.

### Modal scroll lock — N/A
No modal/dialog overlay component exists anywhere in the frontend (`ConnectLeague.jsx`, `Login.jsx`, and other candidate files use inline sections, not overlays). This checklist axis doesn't apply to the current app shape — nothing to lock.

### Share sheet — Not yet shipped (not a defect)
No `navigator.share` usage anywhere in the frontend. This matches `current_sprint.md`: **backend** Phase 2.10 (trade-share hash routes) is complete, but **frontend** Phase 2.10 (the actual share button/card) is still unchecked in the sprint doc. There's nothing broken to flag — the feature just hasn't reached the frontend yet.

## Part 2 — Live Sweep

### Pass 1 — layout/responsive, all 14 routes × 3 widths — PASS
No horizontal scroll, no overflow, no clipped text at any of the three widths (iPhone SE 375px through 15 Pro Max 430px). Public pages (Landing, About, Login, Demo, Trade, Draft) and authenticated pages (Account, Connect, Appearance, Football, Omen, Ledger, Standings) all render cleanly. Touch targets look correctly sized at every width — matches the source-audit signal. One methodology note: the Landing page screenshots look visually "compressed" in a thumbnail — that's Safari capturing the full scrollable page height (it's a long page), not a rendering defect.

### P1 — League Standings fails to load, every time
**`/standings` and the embedded standings card on `/football` consistently show "Couldn't load standings" / "Couldn't load standings right now"** for this fully-authenticated account with all three platforms connected (Yahoo, Sleeper, ESPN — confirmed connected on `/account`). Reproduced across all 3 viewports and (via Pass 2) many team themes, so it isn't theme- or viewport-related. Two possibilities, need engineering to confirm which: (a) a genuine fetch/backend bug, or (b) expected off-season behavior (today's test date is July, NFL off-season) presented with error-style copy ("Couldn't load... Try again") instead of an honest empty state ("Standings appear once the season starts"). If it's (b), this is a copy/UX fix, not a functional one — but as shipped, it reads as broken either way.

### P1 — Unhandled rate-limit response leaks raw JSON to the screen
**`ATL__ledger.png` and `ATL__standings.png`** both render a completely unstyled backend error directly in the page: `{"error":"Too many requests, please slow down."}` — plain monospace text, no layout, no retry affordance. This was very likely triggered by this test's own rapid-fire navigation across 32 team switches in quick succession, not something an ordinary user would casually hit. But the underlying gap is real regardless of what triggered it: **there is no graceful handling anywhere in the frontend for a 429 response** — it falls through to displaying the raw API body. Worth a generic API-error boundary/toast rather than only handling the "happy path" error cases the styled empty-states cover.

### Pass 2 — all 32 team color schemes on `/account/appearance` — PASS
Every team renders with genuinely distinct, correctly-selected colors (verified by file-size diversity and visual spot-check, not just trusting the click succeeded) — confirms the Phase 1.5h multi-palette/`surfaceRole` system is working end-to-end through the real UI. Notably confirmed **MIA (Dolphins) correctly renders a light beach-sand surface** per its `surfaceRole: 'neutral'` data, matching the doctrine documented in `nflTeams.js` ("page is light when the team's surface color is light") — this and other light-surface teams (KC, LAC visually confirmed light; ARI, IND per the same doctrine) are working, superseding the older Phase 1.5e "6 teams flip light axis" plan referenced in `current_sprint.md`, which is now stale relative to the shipped Phase 1.5h palette system.

**P2 nit:** DEN's "Team" mode-selector card on the Appearance page has notably low contrast against the page background (both similar saturated orange) — text stays legible, just a soft edge. Cosmetic only; DEN's actual accent usage on functional pages (checked `/draft`) is properly contrasted (navy-on-orange), so this is narrow to that one card.

### Pass 2 — accent integration on other pages (targeted sample: MIA, ATL, GB, DEN)
Trade Analyzer and Draft Assistant pick up team accents cleanly (buttons, selected chips, culture-tag pills all correctly themed, still ≥44px touch targets). The horizontal gray bar under the Trade/Omen/Draft tab row (visible regardless of team) is very likely desktop Safari's persistent scrollbar for a horizontally-scrollable tab strip — real iOS hides scroll indicators outside active touch-scrolling, so this probably isn't visible on an actual device. **Needs a real-device glance to close out, not a confirmed defect.**

The `/omen` page showed loading-skeleton placeholders instead of resolved content in one team's screenshot (MIA) — almost certainly this test's 2-second wait being shorter than the Omen recommendation endpoint's own documented ~5s p95 latency (`current_sprint.md` tech debt section), not a broken render. Not counted as a defect; flagging in case anyone re-runs this and sees the same thing.

## Summary

| Severity | Count | Items |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | Standings consistently fail to load (bug or mis-labeled off-season empty state — needs eng call); unhandled 429 leaks raw JSON to the screen |
| P2 | 3 | Footer safe-area confirmation on notched devices; manifest missing 192x192 icon; DEN Appearance-card contrast |
| Needs real-device check | 2 | Tab-strip scrollbar bar (likely desktop-Safari-only artifact); safe-area insets generally (WebKit desktop doesn't have a physical notch) |

No P0 launch blockers found. The two P1s are both about error-state handling (stale/missing data and rate-limiting) rather than layout or touch-target problems — the mobile-first layout work itself (Phase 1.3 onward) held up well across all 14 routes, 3 widths, and all 32 team themes.
