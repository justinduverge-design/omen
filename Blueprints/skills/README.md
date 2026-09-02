# Omen Skills

This folder is reserved for Omen-specific reusable skills if Justin explicitly approves product-local skills.

## Canonical Skill Location — read this before concluding a skill does not exist

**The global skill library is in a different repository.** L0 (`SLOPS OS`) and Omen are separate
git repositories; Omen is not tracked by L0. So:

```text
Slops-OS/Blueprints/skills/          ← the global library, 59 skills. AUTHORITATIVE.
omen/Blueprints/skills/              ← this folder. Two Omen-local skills. Not the library.
```

> **Corrected 2026-09-02.** This section previously said global skills live under
> `<active-git-root>/Blueprints/skills/`. In a standalone Omen checkout that path resolves to *this*
> folder, which holds two skills — so an agent following the instruction concluded the library was
> nearly empty. That happened: a Codex session pulled Omen looking for the native design skills,
> correctly reported they were not there, and had no way to learn they existed one repo over.

`Slops-OS/Blueprints/skills/SKILL_ROUTING.md` is the authoritative lookup, agent routing, and tool
permission record. **When it and the inventory below disagree, routing wins** — the inventory is a
convenience copy and will drift.

### Inventory — snapshot 2026-09-02, not authoritative

Names only, so an agent working inside Omen knows what to go and read. Nine were added 2026-09-02
and are `draft` until first real use.

**Frame / plan:** `slops-intent-capture`†, `pre-build-research`, `dbs-research-to-architecture-router`,
`planning-pass`, `product-gap-analysis-session`, `slops-founder-admin-runbook`†

**Build:** `slops-tdd`, `slops-git-flow`, `slops-canvas-to-code`†, `slops-figma-to-native`†,
`design-md-author`, `slops-design-system-pack`, `slops-prompt-generator`

**Review / quality:** `slops-code-review`, `slops-quality-baseline`, `slops-api-hardening`†,
`slops-provider-resilience`†, `security-privacy-evidence`, `rbac-risk-review`,
`slops-ai-integration-review`, `slops-legal-spot-check`

**Design QA:** `slops-native-ui-audit`†, `slops-ui-ux-audit`‡, `slops-taste`, `slops-ux-copy`,
`demo-mode-pre-empty-state`, `mobile-first-qa-playbook`‡, `slops-mobile-smoke`‡

**Verify / ship / operate:** `slops-native-sim-drive`†, `slops-verify`, `slops-ship`, `slops-canary`,
`slops-investigate`, `slops-retro`, `slops-headroom`, `self-hosted-observability-runbook`

**Meta:** `slops-skill-author`, `slops-agent-author`, `slops-agent-docs-refresh`†,
`slops-repo-inspector`, `slops-context-markdown`

† added 2026-09-02, `draft` — not authoritative until it has one real run.
‡ **web app only.** These predate the native pivot and will return confident, irrelevant findings on
a native screen. Use `slops-native-ui-audit` and `slops-native-sim-drive` for native work.

### Two Omen capabilities that are not skills

Do not author a skill over these; they already work.

- **`.github/workflows/native-visual-evidence.yml`** — deterministic native screenshots on a
  `macos-14` runner, per-scenario artifacts, both platforms. `workflow_dispatch` only.
  `slops-native-sim-drive` governs it; it does not replace it.
- **`scripts/check-*.js` + `.github/workflows/docs-quality.yml`** — kickoff-drift, sprint-staleness
  and Valor Brain checks, gated on `Direction/`, `Blueprints/`, `scripts/` and root docs.

## App-Specific Skills

If Omen requires skills not in the global library, they may be created here:

- Keep them scoped to Omen concerns only.
- Global reusable skills belong in `Blueprints\skills`, not here.
- Name them consistently: kebab-case folder names, snake_case for divided categories.
- Each skill should have a `SKILL.md` following the global template.

## Before Creating Skills Here

1. Check `SLOPS\Blueprints\skills\SKILL_ROUTING.md` to confirm the skill doesn't exist globally.
2. Verify that the skill is truly app-specific and not reusable elsewhere.
3. If it becomes reusable, move it to the global library with Justin approval.

## Tool Permissions

All skills inherit the tool permission rules from:

```text
SLOPS\Blueprints\tools\tool-permissions.md
```

Agent tool tier caps are defined in:

```text
SLOPS\Blueprints\agents\AGENT_INDEX.md
```
