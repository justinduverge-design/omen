# Phase 1.13 iOS Safari Mobile QA Sweep — Partial Handoff

Date: 2026-07-02
Owner: Claude
Status: In progress locally. Branch `frontend/phase1-13-mobile-qa-sweep`, commit `f826d2e`. Not pushed, merged, or deployed.

## Summary

Partial pass on Phase 1.13. Completed the named ARIA conversion (`DraftAssistant.jsx` Scoring Format), a full touch-target/overflow sweep across all 6 public/unauthenticated routes at 375/390/430px, a focus-ring fix the new keyboard-navigable radiogroup surfaced, and a pre-existing keyboard-trap bug found and fixed on both app-wide slide-in panels. Explicitly did not complete: the 7 authenticated routes (sandbox limitation) and two additional ARIA judgment calls that were considered and deferred as separate follow-ups.

## Files Changed

- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/Landing.jsx`
- `frontend/src/pages/OmenLanding.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/TradeAnalyzer.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/components/ui/HelpButton.jsx`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`
- `Direction/agent_inbox.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/2026-07-02-phase1-13-mobile-qa-sweep-partial.md` (this file)

## Contract Changes

None. Frontend-only styling/markup/ARIA pass. No endpoint, payload, auth, provider, package, SQL, env, or deploy behavior changed.

## Behavior

**1. Radiogroup conversion (the named site).** `DraftAssistant.jsx` Scoring Format chips (PPR / Half PPR / Standard) converted from `aria-pressed` buttons to a proper `role="radiogroup"` (labelled via the existing `<legend>`) containing `role="radio"` buttons with `aria-checked`, roving `tabIndex` (only the checked option is tab-stoppable), and arrow-key navigation (Left/Up = previous, Right/Down = next, Home/End = first/last) via a new `handleScoringFormatKeyDown` handler. Position Needs chips are unchanged — confirmed multi-select (`needs.has(pos)` / `toggleNeed`), correctly keeps `aria-pressed` per the sprint item's own instruction.

**2. Focus-ring gap found and fixed.** Neither the Scoring Format buttons nor the Position Needs chips had any `focus-visible` styling — confirmed via `getComputedStyle(el).outlineStyle === 'none'` while focused. This is a real gap given the radiogroup now has keyboard arrow-nav: a keyboard user tabbing/arrowing through it would see no visual indicator of which option has focus. Added the same `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-team-accent)]` pattern already used elsewhere on this page (the Draft Position / Current Round number inputs).

**3. Touch-target sweep, 6 public routes × 3 widths (375/390/430px), 8 violations fixed:**
- `Landing.jsx`: three secondary CTA text links (`See your Omen →`, `Open Draft Assistant →`, `Try the live tool →`) had only their line-height as hit box (~16px tall); added `min-h-[44px]` + centering. Two platform-picker radio pills (hero waitlist form + expanded form) were 26px tall; added `min-h-[44px]` to the `<label>` wrapping the `sr-only` native radio input (native radio semantics were already correct — no ARIA conversion needed there).
- `OmenLanding.jsx`: header "← Slops Saloon" / "Sign In →" links were 32px tall; added `min-h-[44px]`.
- `Login.jsx`: footer "Try Trade Analyzer without signing in →" link was 16px tall; added `min-h-[44px]`.
- `TradeAnalyzer.jsx`: shared `INPUT_CLS` (position `<select>` + player `<input>`, used per player row) was 34–38px tall; added `min-h-[44px]` to the shared class so both the `/trade` route and the embedded copy on `/about` are fixed together.
- `Header.jsx`: site wordmark `<Link to="/">` had no min-height (~28px); added `min-h-[44px]`.
- `HelpButton.jsx`: Quick Links panel entries (~36px) and the "Continue setup →" onboarding-reentry link (16px, no padding) both fixed with `min-h-[44px]`.
- `DraftAssistant.jsx`: Position Needs chips with short labels (QB/RB/TE/K) were as narrow as 33px wide (height already met 44px via existing `min-h-[44px]`); added `min-w-[44px]` + `justify-center`.

**4. Keyboard-trap fix, app-wide.** `Header.jsx`'s `NavDrawer` and `HelpButton.jsx`'s Help panel both hide via `transform: translateX(...)` when closed, with no `inert`/`aria-hidden` guard — their links stayed in the tab order and were programmatically clickable while visually off-screen. Added a conditional `inert` attribute to both panel containers. React 18.3 (this repo's version) has no native boolean handling for the `inert` prop — passing `inert={!open}` triggers a "non-boolean attribute" console warning. Used `inert={open ? undefined : ''}` instead (verified via `getBoundingClientRect`/`hasAttribute` inspection that `inert=""` is present when closed and absent when open).

## Verification

- `node --test` (root, all files) → `npm test` → 401/401.
- `npm --prefix frontend run build` → clean (pre-existing Vite chunk-size warning only).
- `npm audit --audit-level=moderate` → 0 vulnerabilities.
- `git diff --check` → clean.
- Radiogroup: dispatched a real `ArrowRight` `KeyboardEvent` against the focused PPR radio via `preview_eval`, confirmed after a render tick that focus moved to Half PPR, its `aria-checked` flipped to `true`/`tabIndex` to `0`, and PPR's flipped to `false`/`-1`. Click-to-select still works (`onClick` retained alongside the new `role`/`aria-checked`/`onKeyDown`).
- Touch targets/overflow: scripted sweep via `preview_resize` (375/390/430) + `preview_eval` querying all `button, a, input, select, [role="button"], [role="radio"], [role="tab"]`, filtering out `sr-only` elements, and flagging any visible element with width or height under 44px. Re-ran after each fix; all 6 public routes report zero violations and zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) at all three widths.
- `inert`: confirmed via `document.getElementById('omen-nav-drawer').hasAttribute('inert')` (and the equivalent Help-panel query) toggling correctly with the `open` state, with no non-boolean-attribute console warning from current code (an initial `inert={!open}` attempt did warn; fixed before this evidence was captured).
- Self-administered `slops-code-review`: scope stayed to touch-target sizing, ARIA semantics, and the keyboard-trap fix; no data/API/auth/package/provider surface touched; the radiogroup keyboard handler correctly wraps (`% SCORING_FORMATS.length`) and doesn't leak state. Verdict: mergeable pending the remaining-scope items below.
- Self-administered `slops-ui-ux-audit` (AAA framework): **Accuracy** — radiogroup semantics now correctly describe a single-choice control instead of overstating it as N independent toggles; **Accessibility** — the two concrete gaps this pass targets (touch target size, focus visibility) are fixed on every route checked, and a real keyboard-trap bug was found and fixed as a bonus; **Aesthetic Integrity** — all fixes were hit-box/attribute changes (`min-h`, `min-w`, `inert`, ARIA roles), no visual regression — spot-checked via `preview_screenshot` was not re-run since no fix changed rendered pixel dimensions beyond intentional hit-box growth on already-small elements. Verdict: no P0/P1 on the routes checked.

## Risks / Limitations

- **7 authenticated routes not verified**: `/account`, `/account/connect`, `/account/appearance`, `/onboarding`, `/football`, `/omen`, `/ledger`, `/standings`. Same Supabase `getSession()` sandbox limitation documented in every recent phase handoff (1.5d, 1.7, 1.8, 1.9, 1.12). These routes were not swept at all — not silently passed, just not reachable from this session.
- **`ConnectLeague.jsx`'s ESPN browser-instruction selector** (Chrome/Firefox/Safari step-by-step guide switcher) was considered for the same radiogroup treatment but deferred. It swaps *displayed content* (which browser's cookie-finding steps show), not a form value — the more semantically correct target is an ARIA tabs pattern (`role="tablist"`/`tab`/`tabpanel"`), which is a different, larger conversion than a straight radiogroup swap. Recommend a separate small follow-up item rather than force-fitting radiogroup semantics onto a content switcher.
- **`AppearancePicker.jsx`'s 32-team selection grid** was also considered and deferred — it is a genuine mutually-exclusive single-select control, but a correct keyboard-accessible grid needs 2D arrow-key navigation (up/down move by row, not just left/right through DOM order), which is meaningfully more scope than the single-row Scoring Format conversion. Recommend as its own follow-up item, not bundled into 1.13.
- **Real-device gate still open.** Justin has an iPhone and a Mac; the Mac is powered on and on Tailscale but this session's dev box is not on the same tailnet, so no live dev-server URL could be handed over for real-device testing against the in-progress branch. A manual checklist for Justin to run against production once this ships is included in the chat response accompanying this handoff (not duplicated here to avoid a second source of truth going stale).
- **No commit of this handoff / sprint / decision-log / ledger docs yet** — those are staged as a separate docs commit per `slops-git-flow`, after this file is written.
- **Push/PR/merge not done.** Per `slops-git-flow`, this stays a local branch (`frontend/phase1-13-mobile-qa-sweep`) until Justin approves push/PR. Local `main` was already 2 commits ahead of `origin/main` (Codex's unpushed Phase 1.12) when this branch was cut from it.

## Skill Receipt

Task: Phase 1.13 — iOS Safari mobile QA sweep (partial).

Change type: Frontend user-visible ARIA/touch-target/keyboard-trap fixes across 7 files + close-out docs.

Skills invoked: `slops-repo-inspector` (kickoff), `mobile-first-qa-playbook`, `slops-git-flow`, `slops-code-review` (self-administered), `slops-ui-ux-audit` (self-administered).

Conditional skills considered but not applicable: `planning-pass` (queue already established via auto-populated inbox), `slops-tdd` (styling/ARIA/attribute sweep, not new application behavior — regression coverage is the existing `npm test` suite plus the scripted browser checks above, not a new RED/GREEN unit test), `slops-ux-copy` (no words changed), `security-privacy-evidence` (no trust-boundary change), `slops-ship`/`slops-canary` (no merge/deploy this session), `mobile-first-qa-playbook`'s real-device axis (no device reachable this session — deferred to Justin per the Risks section).

Evidence: commit `f826d2e`; scripted viewport/touch-target sweep results above; radiogroup keyboard-nav verification; `inert` attribute verification; full test/build/audit/diff-check results; self-administered review/audit verdicts.
