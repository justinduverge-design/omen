# MANIFEST — Authority / Routing Surfaces Retired Before the Runtime Trust Model (L2)

**Status: HISTORICAL ONLY.** Nothing in this directory is authoritative. No file here is
loaded by any runtime, and no filename here auto-loads. Both files were renamed with an
`.archived.md` suffix so they cannot be picked up as live doctrine.

**Archived:** 2026-07-30
**Cutover:** PR B — Repository Authority / Routing (D54–D69)
**Successor model:** Runtime Policy + Active Trust Assignments in L0's
`Blueprints/agents/AGENT_INDEX.md` §§8–9, with canonical action and approval doctrine
(Action Risk Tiers) in L0's `Blueprints/tools/tool-permissions.md`.

Records are **not** edited to match new doctrine, and their old references stay as
written (D58).

---

## Retired vendor-named kickoffs (2 of 6 across the cutover)

| Field | Value |
|---|---|
| **Original paths** | `Blueprints/prompts/kickoff-frontend-claude.md`, `Blueprints/prompts/kickoff-backend-codex.md` |
| **Archived as** | `kickoffs/kickoff-frontend-claude.archived.md`, `kickoffs/kickoff-backend-codex.archived.md` |
| **Type** | Retired routing surface |
| **Reason** | Vendor-named kickoffs invite a session to infer authority from which model is reading them, and both opened with a "Soft lean" lane line that read as an authority boundary. The successor is layer- and capability-named and confirms actual session capability before applying any trust assignment. |
| **Successor** | `Blueprints/prompts/kickoff-l2.md` — one starter for every runtime |
| **Order** | Archived **after** `kickoff-l2.md` was created and all 8 L2 inbound references were verified live. |

The other 4 of the 6 are L0/L1 and are archived in the `Slops-OS` repository under the
same archive root.

**The 8 live L2 references updated in this cutover:**
`AGENT.md` :67, `AGENTS.md` :48, `CLAUDE.md` :48,
`Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` :9,
`Blueprints/prompts/prompt_playbook.md` :4, `Blueprints/prompts/README.md` :20–21,
`Direction/known_issues.md` :56, `Direction/facts-of-record.md` :10.

**Records deliberately NOT edited (D58):**
`Blueprints/handoffs/2026-07-29-planning-pipeline-cutover-pr-a.md` :23 and :26,
`Direction/decision_log.md` :618 and :629,
`Blueprints/playbooks/skill-usage-ledger.md` :118,
`Blueprints/prompts/PROMPTS_CHANGELOG.md` :112,
`Blueprints/handoffs/2026-07-23-session-close-m4-auth.md` :37.

---

## Preserved, NOT archived

These two L2 files are **live runtime prompts** and are the canonical successors to the
retired L0 redirect stubs of the same name. They are preserved, not renamed, not archived:

- `Blueprints/prompts/manager_agent.md` (4436 B) — live
- `Blueprints/prompts/sub_agents.md` (2665 B) — live

The L0 stubs that pointed here were archived in the `Slops-OS` repository.
