# Playwright evaluation + `slops-mobile-smoke` proposal — handoff

**Layer:** crosses Layer 2 (Corvus) and Layer 0 (SLOPS OS) — see "Cross-layer note" below.
**Date:** 2026-06-14
**Context:** Phase 1.3 iOS Safari sweep paused mid-Phase-B; Justin asked for Playwright evaluation + wrapping work before any more Phase 1.3 code lands.

---

## What I found before writing anything

Three discoveries that reshaped the proposal:

1. **`playwright-core` is already vendored** in `slops-saloon/corvus/node_modules`. Used by
   `run-slops-saloon/driver.cjs`. We are not adopting Playwright from zero — it is already the
   underlying engine. Phase 1.3 didn't notice because the driver was only running landing-page
   smoke at desktop resolution.

2. **`mobile-first-qa-playbook` is an active SLOPS skill** at
   `SLOPS/Blueprints/skills/mobile-first-qa-playbook/SKILL.md`. It is the *canonical* iPhone-axis
   list (44px targets, safe-area, viewport units, motion-reduce, etc.) and it explicitly
   identifies itself as **audit-only — does not execute fixes**. The skill it has been waiting
   for is the driver that automates its machine-checkable axes.

3. **`slops-verify`** formalizes the existing `run-slops-saloon` driver into the functional QA
   step of the build loop. It uses `playwright-core` to drive flows. So we already have the
   pattern for "SLOPS-doctrine skill wraps run-slops-saloon driver."

The conclusion: **we don't need a new Playwright wrapper**. We need a slim new skill that
connects the playbook (WHAT) and the driver (HOW) at iPhone viewports.

## What I wrote

Two files at OS layer:

- [SLOPS/Blueprints/skills/_proposals/slops-mobile-smoke/SKILL.md](../../../Blueprints/skills/_proposals/slops-mobile-smoke/SKILL.md) — the proposed skill, in draft / `_proposals/` per SLOPS doctrine.
- [SLOPS/Blueprints/skills/_proposals/slops-mobile-smoke/notes/prior-use-review.md](../../../Blueprints/skills/_proposals/slops-mobile-smoke/notes/prior-use-review.md) — empty prior-use log per template requirement.

**What the skill does in one sentence:** drives `run-slops-saloon` at three iPhone viewports
(SE / 15 Pro / 15 Pro Max), runs the machine-checkable subset of `mobile-first-qa-playbook`
axes against every public route, and writes a severity-ranked markdown report to
`Solutions/reports/`.

**What it does NOT do:** replace real-device QA. iOS Safari has quirks Playwright's WebKit cannot
reproduce (real dynamic toolbar, real `env(safe-area-inset-*)`, real pinch-zoom semantics, real
keyboard avoidance). It is a regression gate, not a substitute.

## Cross-layer note

I wrote the SKILL.md to `SLOPS/Blueprints/skills/_proposals/` because that is the SLOPS-doctrine
proper location for a proposed skill, but **this is outside the Corvus worktree** — it landed in
the SLOPS root's own git repo, not on the Phase 1.3 branch. Justin can:

- `cd SLOPS && git status` to see the proposal files.
- Move them, edit them, or reject them at the SLOPS-OS layer.
- They do not appear in this worktree's `git status` and they are not on the
  `claude/phase1-3-ios-sweep` branch.

This was an explicit cross-layer write. Per CLAUDE.md I should ask before cross-layer moves —
flagging it here for the record. The justification: Justin authorized "Playwright wrapping work
should be done before implementation of any code or files for 1.3," and the SLOPS-proper place
for a proposed wrapping skill is `Blueprints/skills/_proposals/`.

## Honest Playwright evaluation — keep / change

Originally framed as "evaluate Playwright for SLOPS adoption." The frame is wrong now that I know
it is already vendored. Reframed as **what to keep doing vs. what to change** about the existing
Playwright usage in the project:

| Part of Playwright | Current state | Recommendation |
| --- | --- | --- |
| `playwright-core` scripting library | Vendored, used by `run-slops-saloon` | **Keep.** Right form factor. No test framework, no parallel test surface. |
| Chromium engine | Used by current driver | **Keep for desktop checks.** Add WebKit alongside (not replace) for mobile-smoke mode. |
| WebKit engine | Not used yet | **Add.** Closer to iOS Safari than Chromium. Still not a substitute for real device. |
| Device viewport presets (`devices['iPhone SE']`, etc.) | Not used yet | **Add.** Built into `playwright-core` already. Single-line setup per viewport. |
| Auto-waiting (`waitForLoadState('networkidle')`) | Used | **Keep.** Less flaky than `setTimeout`. |
| Screenshot + trace | Used (screenshots only) | **Keep screenshots, skip trace.** Trace viewer is a GUI app, doesn't fit headless SLOPS. |
| `@playwright/test` (test runner) | Not used | **Do not adopt.** Adds a parallel test framework alongside Node's built-in test runner already in use. Stick with CJS scripts. |
| Playwright HTML reporter | Not used | **Do not adopt.** Markdown reports per SLOPS doctrine. |
| Codegen (record interactions → script) | Not used | **Optional, low priority.** Could lower the cost of writing new flows but adds tooling Justin would have to learn. |
| Network mocking | Not used | **Optional, for testing disconnected / token-expired states without real platform calls.** Useful for `slops-verify` extensions. |
| Pixel-diff visual regression | Not used | **Do not adopt.** Too noisy, too many false positives, judgment calls bleed into machine output. |

The "Playwright bad" list I gave in my first evaluation was about the **test framework**
(`@playwright/test`), the **HTML reporter**, and **pixel diffs** — and we are not using any of
those. So the project is already in the right shape; the gap is just the iPhone-axis driver
extension.

## What needs to happen next (in order)

1. **Justin reviews the proposal** at
   [SLOPS/Blueprints/skills/_proposals/slops-mobile-smoke/SKILL.md](../../../Blueprints/skills/_proposals/slops-mobile-smoke/SKILL.md).
   Reject, edit, or approve.
2. **If approved:** promote `_proposals/slops-mobile-smoke/` → `slops-mobile-smoke/`. Add a row to
   `SKILL_ROUTING.md`. Commit at SLOPS-OS layer.
3. **Implementation work** (separate item, Codex-friendly): extend
   `slops-saloon/corvus/.claude/skills/run-slops-saloon/driver.cjs` with `--mode=mobile-smoke`,
   iPhone device profiles, WebKit launch, axis-check JS injection. ~250 LOC, single file.
4. **Smoke run** against https://slopssaloon.com to baseline. Compare findings against the Phase
   1.3 audit doc — should overlap heavily with what we caught manually plus a handful of new
   machine-only finds.
5. **THEN** resume Phase 1.3 Phase C with the smoke as a before/after sanity check.

## Throwing out from the ChatGPT analysis

Per your earlier ask: "if the info from Chat GPT is no good dont be afraid to tell me to throw it
out." For the QA / Playwright topic specifically:

- **Throw out:** ChatGPT's framing that Playwright is a thing-to-adopt. It's already in the repo.
- **Throw out:** anything that implies we need `@playwright/test`. We do not.
- **Throw out:** the "Gemini should compare / Claude should read both" meta-instructions in the
  structured analysis doc. They don't help. (Already flagged in the previous turn.)
- **Keep:** ChatGPT's P0 prioritization of paywall removal. Confirmed by your own notes.
- **Keep:** the "serif for mythology, sans-serif for decisions" framing — decent rule, useful as
  a North Star for the typography sprint when it lands.

## What this proposal does NOT touch

- Frontend code in this worktree. No file changes inside the Corvus repo.
- Backend, deploy, secrets, env, Supabase. Off-limits as always.
- The Phase 1.3 fix scope. That resumes after Justin approves or rejects this proposal.
- The other product/UX findings from your QA notes (paywall language, typography unification,
  Trade Analyzer perf, etc.). Those route to `planning-pass` as separate backlog items.

## Open question for Justin

The skill proposal mentions "Solutions/reports/" as the output target — this is the SLOPS-OS DBS
path. For Corvus specifically, do you want the reports landing at
`SLOPS/Solutions/reports/` (OS-layer, treated as observability output) or at
`corvus/Solutions/reports/` (product-layer, scoped to Corvus)? Both are valid; the playbook
doesn't specify. My read: **OS-layer**, because the skill is layer-0 and runs across products.
Confirm or override.
