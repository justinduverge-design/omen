# Startup Surface One-Kickoff Handoff — 2026-09-12

## Scope

Justin asked for a light harness and one dependable Omen kickoff so future work can start from short prompts instead of detailed task packets.

## Changed

- `AGENT.md` is now a Codex-specific light harness with explicit low-effort/older-model posture.
- `AGENTS.md` is titled as shared context and points agents at the single kickoff.
- `Blueprints/prompts/kickoff-l2.md` remains the only live Omen kickoff and now handles short founder prompts plus skill routing defaults.
- `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` no longer says to choose retired frontend/backend kickoffs and no longer names Stripe as a live gate.
- `Blueprints/prompts/README.md` now names the current `omen/` route and the archived kickoff location.
- `Blueprints/prompts/PROMPTS_CHANGELOG.md`, `Direction/decision_log.md`, `Blueprints/playbooks/skill-usage-ledger.md`, and `Blueprints/done/LEDGER.md` record the change.
- `Blueprints/prompts/kickoff-2026-09-01-tier-0.md` and `Blueprints/prompts/kickoff-omen-parity-audit.md` moved to `Archive/prompts/2026-09-12-retired-kickoffs/`.
- `output/archives/testflight-whats-new-6.txt` was deleted at founder direction.

`CLAUDE.md` was intentionally not edited.

## Gate Results

- `git diff --check`: PASS
- `node scripts/check-kickoff-drift.js`: PASS
- `node ../../Blueprints/tools/valor-brain/validate.mjs`: PASS
- `node scripts/check-sprint-staleness.js`: FAIL, 12 existing findings
- `node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet`: FAIL, 220 existing P0 findings

The red gates were already outside the bounded startup-surface change. They block a clean closeout claim and should be treated as inherited governance backlog, not hidden.

## Recommendation

Keep `Blueprints/prompts/kickoff-l2.md` as the only live starter. New task-specific prompt packets should either become backlog items/handoffs or be archived after use, not added as new `kickoff-*` files.
