# Skill audit — 2026-10-03

**Goal:** cut tokens per session, make the harness leaner, and use what we already own. Read-only audit;
no skill was changed. Data: `Blueprints/skills/*/SKILL.md` (61 dirs, last git commit per skill) and
`Blueprints/playbooks/skill-usage-ledger.md` (451 rows).

**How to read the counts.** "Invoked" = rows whose *invoked* column names the skill in backticks.
It is rough: row wording varies, and the ledger only covers Omen sessions. A zero means "never
recorded", not "useless". Sizes are `SKILL.md` bytes and only load when the skill is invoked.

## What costs tokens every session

| Cost | Size | Where it comes from |
|---|---|---|
| Slops skill descriptions | ~24 KB, ~6k tokens | One line per skill, listed in every session whether used or not |
| Plugin skills (unity, noibu, legal, marketing, synthflow, qodo, ...) | ~150 entries | User-level plugins, listed in every session, none relevant to Omen. Not in this repo; disable per project |
| Bootstrap read | ~92k tokens | See `Direction/decision_log.md` 2026-10-03 |
| Close-out | appends to a 322 KB ledger + 225 KB done ledger | Hand-written per task |

Retiring or parking a skill saves its description tokens in every session. Its body only costs tokens
when invoked.

## Verdicts

### Core — heavily used (keep; schedule a with/without test)

`slops-git-flow` 102, `slops-repo-inspector` 97, `slops-tdd` 83, `slops-quality-baseline` 80,
`slops-code-review` 78, `security-privacy-evidence` 60, `slops-context-markdown` 52, `planning-pass` 43,
`slops-ux-copy` 24, `slops-ship` 22, `pre-build-research` 20, `slops-canary` 18, `slops-ui-ux-audit` 31
(web only; web migrations are paused, so check it still earns its place).

**Stale risk:** git-flow, tdd, quality-baseline, code-review, ship, canary and investigate were last
changed 2026-06-08 to 06-22, before the current models and before the 2026-10-03 review policy.
`slops-code-review` still describes the old flow. These are the first with/without tests.

### Light use (1-11) — review each

`rbac-risk-review` 11, `slops-investigate` 10, `slops-mobile-smoke` 9 (14 KB, web only),
`slops-native-ui-audit` 8, `workflow-tree-spec` 7, `slops-legal-spot-check` 7, `slops-canvas-to-code` 6,
`slops-taste` 5, `slops-design-system-pack` 5, `slops-data-ingest-plan` 5, `slops-ai-integration-review` 5,
`slops-native-sim-drive` 4 (22 KB, largest), `slops-verify` 3, `slops-skill-author` 3,
`mobile-first-qa-playbook` 3 (web only), `design-md-author` 3, `demo-mode-pre-empty-state` 3,
`compliance-by-template` 3, `slops-retro` 2, `slops-prompt-generator` 2, `slops-native-screen-design` 2,
`slops-intent-capture` 1, `slops-agent-author` 1, `self-hosted-observability-runbook` 1,
`product-gap-analysis-session` 1, `_template` 1 (17 KB; a template, not a skill).

Candidate merges: the three "web only" skills (`slops-ui-ux-audit`, `slops-mobile-smoke`,
`mobile-first-qa-playbook`) cover one surface that is paused; `slops-data-ingest-plan` and
`slops-ai-integration-review` are 1.5 KB converted stubs.

### Zero recorded use — three different reasons

**Parked on purpose (retire from the listing until the phase starts):** `slops-learning-loop`,
`slops-community-needs-research`, `slops-screenplay-loop`, `slops-explainer-cut`,
`slops-animation-render`, `slops-image-prompt`, `slops-financial-sketch`, `slops-exec-summary`,
`slops-product-pulse`.

**Meta-tooling for the harness itself (keep, but unlisted by default):** `slops-agent-docs-refresh`
(needed for the startup trim), `agent-wrapper-generator`, `agent-index-diff-builder`,
`command-bridge-generator`, `slops-onboarding-agent` (15 KB), `dbs-research-to-architecture-router`,
`slops-markitdown`, `slops-headroom`.

**Relevant to work we are doing now but never used — the real under-use:**
- `slops-provider-resilience` (0) — ESPN is "essential and fragile" in `CLAUDE.md`, and #535 is another
  ESPN reconnect fix.
- `slops-api-hardening` (0) — the database and API redo is exactly its subject.
- `slops-founder-admin-runbook` (0) — App Store / console steps for the Tuesday release.
- `slops-figma-to-native` (0) — native screens are built from Figma frames.
- `clean-up-checkpoint` (0) — the session-end shutdown that this session's close-out costs overlap with.

## Not a skill, but unused: Graphify

`graphify-out/` was built 2026-06-25 at commit `13483bf7` (3,965 nodes over 372 files) and never
refreshed. No bootstrap doc (`AGENTS.md`, `CLAUDE.md`, `AGENT.md`, `RESOLVER.md`, `context.md`,
`kickoff-l2.md`) mentions it, so agents do not know it exists. Its own report says `graphify update .`
costs no API tokens. A refreshed graph answers "what touches X" without reading files, which is the
cheapest kind of context we have.

## Proposed next actions (none taken)

1. **Listing diet:** mark parked and meta skills as not auto-listed, and turn off the unrelated plugin
   families for this project. Biggest per-session saving available with no loss.
2. **Usage log:** replace hand-written ledger rows with one automatic line per session (skill, task
   type, skipped or not).
3. **Wire in the under-used four:** add `slops-provider-resilience` and `slops-api-hardening` to the
   triggers for provider and API/database PRs, and name them in the "when you touch X, read Y" table.
4. **Refresh and reference Graphify:** run `graphify update .`, add one line to the map page.
5. **Skill freshness check — monthly and after each new model release.** For each skill, run its
   one-line test with and without the skill. No gain: propose deleting it. Output drifted: propose an
   edit. Never used in the window: flag it. The job opens a PR; a human approves. Needs a `last_verified`
   date and a test line added to each core skill, starting with the ones marked stale above.

## Limits

- Counts come from one ledger and rough matching; the light-use and zero lists need a human glance
  before anything is deleted.
- No skill was run with or without itself, so "stale" above means "old and unmeasured", not "wrong".
- The plugin-skill cost is estimated from the session listing, not measured.
