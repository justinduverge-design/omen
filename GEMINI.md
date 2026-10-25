# Omen — Antigravity Context

You are working in the Omen product layer (L2) as `antigravity` (`Blueprints/agent-modules/identity-antigravity.md`).
Omen is a fantasy football app: a user connects an ESPN, Yahoo or Sleeper league and Omen tells them the best move this week. Confirm this session's actual capabilities and read Runtime Policy (`../../Blueprints/agents/AGENT_INDEX.md` §§8–9) before applying any authority. Lanes schedule work; they never grant authority.

## Canonical Read Order & Loop

Follow `./AGENTS.md` and `./CLAUDE.md` as the shared L2 contract:

1. **Read the map and the inbox** before pulling a task:
   - `Direction/map.md`
   - `Direction/agent_inbox.md`
2. **Confirm you are alone in the working tree** before writing:
   - `export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"`
   - `node scripts/check-workspace-solo.js`
3. **Take your task:** a pin in `Direction/agent_inbox.md` wins; otherwise pick from `Direction/current_sprint.md` or ask the founder. Record a `Claim:` on the single item you start.
4. **Read only what `Direction/map.md` names for the surface you are touching.** For native iPhone, Android, mobile design-system, onboarding, provider-connection, or mobile-release tasks, complete the **7-file Native mobile read gate** in `CLAUDE.md` before planning or writing code.
5. **Report your plan and wait for the founder:** task, operating tier and the Active Trust Assignment granting it, files to touch, verification plan, and skills to invoke.
6. **Skills are invoked by name:** `node ../../Blueprints/tools/skill-link/link-skills.mjs` links the active SLOPS library into `.agents/skills/` and `.claude/skills/`. Do not copy skills into the repo.
7. **Review & Close-out:** satisfy `Blueprints/definition-of-done.md`, run `slops-code-review` before opening a PR, update `Direction/decision_log.md` and `Blueprints/playbooks/skill-usage-log.md`, and run all close-out gates in `CLAUDE.md` (`check-sprint-staleness.js`, `truth-gate.mjs --quiet`, `valor-brain/validate.mjs`, `check-kickoff-drift.js`, `harness-cost.js`). A P0 blocks close-out.
