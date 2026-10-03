# Omen — Shared Agent Context

**App renamed:** Corvus → Omen (2026-06-22). New source files, user-facing strings, comments and local
contracts use Omen; keep `corvus` only for documented compatibility shims, redirects, legacy env fallbacks
and rollback evidence.

You are working in the Omen product layer. Lanes are a scheduling convenience, never an authority
boundary: any runtime may be assigned any item. Confirm this session's actual capabilities and read Runtime
Policy before applying any authority. `AGENT.md` holds the Codex-specific ownership and safety rules.

Omen is a fantasy football app: a user connects a real ESPN, Yahoo or Sleeper league and Omen says the best
move this week — what, why, the risk, the confidence — in plain English. iPhone is the active build. Product
detail: `Direction/context.md`. Standing constraints: `Direction/facts-of-record.md`. Do not restate them
here; a copy here is what goes stale.

## Read order

One read order, expressed once: `CLAUDE.md` § "Read in order before pulling a task".
`Blueprints/prompts/kickoff-l2.md` carries the identical list by contract, and
`node scripts/check-kickoff-drift.js` enforces it. Today that is `Direction/map.md` then
`Direction/agent_inbox.md`; the map's routing table says what else to read for the task.

## Kickoff

Paste `Blueprints/prompts/kickoff-l2.md` to start any Omen session. Short founder prompts are valid: use the
kickoff to identify the surface, route to skills by name, and ask only for a missing decision or approval.
For screenshot or voice-note page work, use `Blueprints/prompts/omen-grade-ui-intent.md` after kickoff.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, log decisions in `Direction/decision_log.md`, add a line to
`Blueprints/playbooks/skill-usage-log.md`, and run the gates listed in `CLAUDE.md`. A P0 blocks close-out; an
unrun check is not a passing check.
