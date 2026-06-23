# Omen Skill-Activation Runbook

## Purpose

Give every registered SLOPS skill an honest Omen route. This is the deterministic answer to “where do we use this skill?” It prevents two failure modes: unused catalog entries and forcing irrelevant ceremony into every task.

## Invocation Procedure

1. Read the skill's status in `../../../../Blueprints/skills/SKILL_ROUTING.md`.
2. If `retired`, do not use it. If `parked`, stop unless its named gate is satisfied or Justin explicitly overrides it.
3. Match the task to the trigger below and read the canonical `SKILL.md` before acting.
4. Put selected skills and expected evidence in the plan-approval response.
5. Execute the skill's own procedure and verification.
6. Add the evidence path/result to the handoff, applicable Done ledger, and `skill-usage-ledger.md`.
7. If the skill did not help, record the failure instead of claiming success; route repeated failures through `slops-retro` and `slops-skill-author`.

## Complete Routing Matrix

| Skill | Status/mode | Omen trigger and use | Evidence / procedure home |
|---|---|---|---|
| `slops-context-markdown` | Conditional | Current docs, handoffs, decisions, indexes, or playbooks need correction | Changed canonical Markdown + source list |
| `design-md-author` | Conditional | Omen `Blueprints/design.md` or a future reusable design contract changes | Design diff + design decision/audit |
| `slops-prompt-generator` | Conditional | A spec/audit must become a bounded Claude/Codex execution prompt | `Blueprints/prompts/` artifact |
| `slops-skill-author` | Conditional L0 | A repeated Omen procedure exposes a real skill gap | Canonical skill, routing/lifecycle diff, verification |
| `slops-agent-author` | Conditional L0 | Omen requires a new reusable agent role after approval | Least-privilege agent wrapper |
| `slops-onboarding-agent` | Conditional L0 | An imported agent is proposed for Omen | Review memo; no activation by review alone |
| `agent-wrapper-generator` | Conditional L0 | Justin approves an imported agent candidate | Wrapper proposal with permissions/denials |
| `agent-index-diff-builder` | Conditional L0 | An approved wrapper needs an index proposal | Explicit `AGENT_INDEX.md` diff |
| `rbac-risk-review` | Conditional | Agent, tool, prompt, or workflow authority changes | Risk findings and gate decision |
| `workflow-tree-spec` | Conditional | Auth, provider recovery, onboarding, payments, or multi-state flow changes | Happy/failure/recovery state contract |
| `security-privacy-evidence` | Required on trust-boundary change | Auth, user data, credentials, telemetry, consent, retention, or external sharing changes | Updated evidence/control note + Security Done |
| `command-bridge-generator` | Conditional L0 | Approved skill/agent needs Claude/Codex command shims | Generated shims + routing verification |
| `pre-build-research` | Required before uncertain external work | New/changed API, provider, data source, terms, pricing, model, or dependency | Dated primary-source memo and recommendation |
| `slops-community-needs-research` | Parked | No Omen use. Future community product only after Justin names community/geography/need/decision | Future L1/L2 research memo |
| `slops-learning-loop` | Parked | Activate after Omen Release Done + seven stable days for stack learning and in-season improvement | `post-live-technology-learning.md` outputs |
| `clean-up-checkpoint` | Event | Session/milestone stops before completion or rate limit approaches | Checkpoint + exact next prompt |
| `dbs-research-to-architecture-router` | Conditional L0 | Research must become specs, decisions, patterns, and handoffs | Routed artifact set with authority labels |
| `slops-markdown-authoring` | Retired | Never invoke; use `slops-context-markdown` | N/A |
| `slops-repo-inspector` | Required at task start | Establish L0/L2 path, branch, dirty state, sources, and stale guidance | Orientation block in plan/handoff |
| `planning-pass` | Conditional core | Goal, priority, dependency, or queue changes | Ordered sprint item with spec and done-when |
| `product-gap-analysis-session` | Milestone | Launch/readiness or major workstream needs Have/Need/Gap analysis | Readiness handoff/roadmap |
| `slops-tdd` | Required for behavior changes | Backend/API/data/integration behavior or reproducible defect changes | Intended RED, GREEN, broader test result |
| `slops-git-flow` | Required for implementation | Any scoped branch/commit/PR work | Branch/base/scope/commit/PR evidence |
| `slops-quality-baseline` | Required before merge/release | Any implementation or dependency/config quality change | Tests, audit, build, diff check versus baseline |
| `slops-ui-ux-audit` | Required for UI verdict | User-visible UI, state, accessibility, responsive, or design-system change | P0/P1/P2 audit and screenshots |
| `slops-ux-copy` | Required when UX words change | CTA, state, onboarding, recommendation, error, or confirmation copy | Approved copy options/diff |
| `slops-code-review` | Required before code merge | Branch/PR/diff changes code or trust boundaries | Merge/fix/block verdict with findings |
| `slops-canary` | Required after deploy | Production cutover or release completes | Timed health/route/error/latency verdict |
| `slops-ship` | Required for release | Approved change moves from reviewed branch to live | Review→quality→merge→deploy→canary record |
| `slops-retro` | Required per release/cycle | Release, incident, major milestone, or repeated skip completes | Decision/doctrine/backlog corrections |
| `slops-investigate` | Event | Bug, incident, regression, canary HOLD/ROLLBACK, unexplained metric | Red-capable command, evidence, cause, fix item |
| `slops-verify` | Required for user flow/release | Functional, real-account, provider, state, or regression QA | Route/flow results and screenshots without secrets |
| `slops-graphify` | Conditional | Cross-layer architecture, technology choice, file relationship, or reusable-baseline question | Saved query/result or refreshed graph report |
| `slops-legal-spot-check` | Conditional | Provider terms, public claims, privacy copy, data use, or legal draft changes | Risk flags; counsel/founder gate stated |
| `mobile-first-qa-playbook` | Required at mobile release gate | Full real-device/production phone sweep | iOS/Android matrix and severity findings |
| `self-hosted-observability-runbook` | Conditional operations | Observability stack is installed, migrated, restored, or reviewed | Health/config/scrubbing evidence; deploy gated |
| `compliance-by-template` | Conditional launch/publication | ToS, privacy, DPA, NDA, or compliance page is required | Draft package + Justin/counsel review state |
| `demo-mode-pre-empty-state` | Required for demo/mock work | Demo route, fixtures, empty state, or real-data swap behavior changes | Mock/live labels, fixtures, swap contract |
| `slops-headroom` | Conditional | Tool/log/RAG output would consume excessive context | Compressed artifact plus retained source pointer |
| `slops-markitdown` | Conditional | Relevant PDF/DOCX/XLSX/PPTX/media must enter research context | Local Markdown conversion with source provenance |
| `slops-taste` | Conditional creation | New/redesigned frontend needs layout/motion/density direction | Chosen variant/dials; final verdict still UI audit |
| `slops-screenplay-loop` | Conditional content | A real Omen result needs an explainer script/storyboard | Script + beats approved for production |
| `slops-explainer-cut` | Conditional content | Omen/Trade/ADP math needs a 30–90 second show-your-work video | Render + math/source verification |
| `slops-animation-render` | Conditional content | Approved non-math brand/social/onboarding motion asset | Render + brand/accessibility QA |
| `slops-image-prompt` | Conditional asset | Trade share, OG, logo, or illustration needs image generation | Prompt, source/rights notes, selected asset |
| `slops-design-system-pack` | Conditional design | Creating a page/system spec or comparing design patterns | Referenced pattern + Omen-specific decision |
| `slops-exec-summary` | Milestone | Justin needs a one-page launch, incident, release, or KPI summary | Dated recommendation-first summary |
| `slops-financial-sketch` | Conditional founder decision | Hosting/model/vendor cost, runway, or free-product sustainability needs scenarios | Sanitized assumptions and sensitivity; no live books |
| `slops-ai-integration-review` | Required for AI path change | Model/provider/prompt/fallback/cost/privacy architecture changes | Model/cost/fallback/data-flow verdict |
| `slops-data-ingest-plan` | Required before new ingest | Sports/provider/telemetry ETL, cron, normalization, or storage flow changes | Source→transform→store→failure plan |
| `slops-mobile-smoke` | Required for UI implementation | Automated phone viewport check before real-device gate | Viewport findings and screenshots |
| `slops-product-pulse` | Required post-live cadence | 24h/7d/30d operating review or post-release measurement | Usage/performance/error/follow-up report |

## Coverage Rule

The routing matrix must contain exactly one row for every entry in the L0 Current SLOPS Skills table, including parked and retired entries. Verification fails on a missing or duplicate name.
