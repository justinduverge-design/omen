# Facts of Record — Omen (L2)

**valid-as-of:** 2026-06-15
**Purpose:** L2-specific facts. Inherits L0 and L1 facts.

## Active facts

1. **Omen is free indefinitely** (decided 2026-06-15, reaffirmed 2026-07-12). No billing gates in `Blueprints/definition-of-done.md`. Stripe is not used on this product at all — the `stripe` package, `/api/stripe/*` routes, `requireSubscription` middleware, `subscriptions` table, and `users.is_subscribed` column were fully removed 2026-07-12 (see decision log). Do not re-add billing/paywall code without a new explicit decision.
2. **Both Claude and Codex are lane-agnostic** with soft lean. Either agent can pull any item from `Direction/agent_inbox.md`.
3. **Auto-populate inbox mechanic** — agent reads pin first (`📌 [item]`), otherwise pulls next 5 unchecked items across ALL lanes in `Direction/current_sprint.md`, organizes by priority (respecting "Blocked by …" suffixes), overwrites the inbox, surfaces blockers to Justin. Full mechanic lives in the kickoff prompts (`Blueprints/prompts/kickoff-frontend-claude.md`, `Blueprints/prompts/kickoff-backend-codex.md`) and `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.
4. **`Blueprints/specs/page-system.md` is the contract** for every Phase 1.4–1.12 frontend item. Per-page typography, accent, palette, copy anchor, light/dark parity rules. Landed 2026-06-15.
5. **DoD is now per-type** at `Blueprints/done/` — pointer at `Blueprints/definition-of-done.md`, 7 type files (feature, page, release, security, recommendation, design, content-marketing), and `LEDGER.md` for closure tracking. Evidence discipline: point to evidence, don't paste command output.
6. **ESPN cookie values never logged, displayed, or echoed.** Anywhere. Ever.
7. **Mock data is always labeled.** Never silently mixed with live data.
