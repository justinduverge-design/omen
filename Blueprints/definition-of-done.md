# Definition of Done

**File:** `Blueprints/definition-of-done.md`
**Scope:** Corvus feature work by Claude (frontend) or Codex (backend).
**Why it exists:** This is the agent's self-check. When every box is true, Justin reviews the *outcome* — not every step. It is the thing that keeps building near hands-off.

A task is **not done** until all applicable items are satisfied. If an item cannot be met, stop and report why rather than marking done.

## 1. Correctness
- [ ] The task in `Direction/agent_inbox.md` (or the named task) is fully implemented — no partial features left visible.
- [ ] No placeholder or mock output is shown as if it were real. Incomplete features are hidden, never displayed.
- [ ] Mock vs. live data is clearly labeled where both can occur.

## 2. Tests & build
- [ ] Backend: `npm test` passes (state the count, e.g. 207/207).
- [ ] Backend: `npm audit --audit-level=moderate` reports no new vulnerabilities.
- [ ] Frontend: `npm --prefix frontend run build` passes (the existing Vite `NODE_ENV` warning is acceptable).
- [ ] `git diff --check` is clean (no whitespace/conflict markers). No commit or push without Justin.

## 3. AAA Framework (all three — two of three is a fail)
- [ ] **Accuracy** — output is correct and defensible; nothing guessy or misleading.
- [ ] **Accessibility** — intuitive without instruction; WCAG AA contrast; keyboard-navigable; risk/confidence carry labels, not color alone.
- [ ] **Aesthetic Integrity** — matches `Brand/brand-system.md` (palette, type, voice); feels intentional, not rushed.

## 4. Handoff & memory
- [ ] Backend wrote the contract to `Blueprints/handoffs/backend-to-frontend.md` in the Required Handoff Shape (`handoffs/README.md`).
- [ ] Frontend recorded any new backend needs in `Blueprints/handoffs/frontend-to-backend.md`.
- [ ] Notable decisions logged in `Direction/decision_log.md`.
- [ ] `Direction/agent_inbox.md` / `current_sprint.md` updated to reflect what is now complete.

## 5. Boundary & safety
- [ ] Stayed inside ownership (Codex = backend, Claude = frontend) per `AGENTS.md`.
- [ ] Did not touch secrets, `.env`, Supabase migrations, Docker/deploy, or production.
- [ ] Stopped before any deploy, migration, secret, or paid/Stripe action and left it for Justin.
