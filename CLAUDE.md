# Omen — Claude Context

You are working in the Omen product layer. Lanes are a scheduling convenience, never an authority boundary — any runtime may be assigned any item. Confirm this session's actual capabilities and read Runtime Policy before applying any authority.

**Product shape:** Omen is a **mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has a web app. The native mobile pivot is active authority; the web app is secondary and new web page migrations are paused. Omen is **free indefinitely** — no Stripe, subscription, or paywall code exists. **Draft Assistant is cut from 1.0** (2026-08-05) and ships for the **2027 fantasy draft** on a Slops-built ADP. Amended 2026-08-14: a single factual "2027 fantasy draft" mention is permitted on the marketing site and in a clearly-labelled in-app "not in this version" note — never "coming soon", never a month. It stays out of **store metadata**, onboarding copy, navigation, legal copy, and the advertised tool list.

## Read in order before pulling a task

**This list and `Blueprints/prompts/kickoff-l2.md` are one contract and must stay identical.**
`node scripts/check-kickoff-drift.js` enforces it. If you change one, change both.

### Always-read core

Paid for on every session. It earns its size; do not grow it without the founder.

**Revised 2026-09-12 — the core cost ~166,000 tokens and now costs ~50,000.** Three files carried
it: `decision_log.md` (~93k), `current_sprint.md` (~34k), `known_issues.md` (~19k). A bootstrap that
large competes with the work, and it is the best explanation on record for why this queue needed
reconciling three times in six weeks — an agent that cannot afford to read the queue skims it.

1. `AGENTS.md` — shared root posture, ownership boundaries, safety rules
2. `AGENT.md` — Codex-specific ownership, safety rules, end-of-task report shape.
   **Naming note:** `AGENTS.md` is the shared file every runtime reads; `AGENT.md` (no S)
   extends it for Codex. The names differ by one letter and the roles are easy to invert —
   `AGENTS.md` is the general one.
3. `RESOLVER.md` — where a new file belongs, before you create one
4. `Direction/context.md` — current operating context
5. `Direction/agent_inbox.md` — pinned task; **a pin wins over the queue**
6. `Direction/current_sprint.md` — the lane queue when there is no pin. **Active items only** —
   terminal items keep a one-line pointer into `Direction/sprint-verified-detail.md`
7. `Direction/status-model.md` — states, `Claim:`/`Evidence:`, blocker grammar, selection rule
8. `Direction/facts-of-record.md` — standing constraints
9. `Direction/known_issues.md` — **open** bugs; resolved ones are in `Direction/known_issues-resolved.md`

### Read before you plan

10. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` — the loop in one page
11. `Blueprints/definition-of-done.md` — per-type DoD pointers
12. `Blueprints/playbooks/omen-company-baseline.md` — baseline procedure
13. `Blueprints/playbooks/skill-activation-runbook.md` — skill routing
14. Latest entry in `Blueprints/handoffs/` — last session handoff

**`Direction/decision_log.md` left this list on 2026-09-12.** It is a reference, not a briefing:
nothing about picking up a task requires every decision ever made, and at ~93,000 tokens it was 56%
of the cold start. Read the entry that governs what you are touching — and still **write** to it at
close-out. If you find yourself about to re-decide something, that is the signal to go read it.

If a file is missing, continue and mention it.

## Reads on demand

- **`Direction/decision_log.md`** — why a decision was made. L2's decision authority; there is no
  `Direction/decisions/` folder here. Read the governing entry, not the file.
- **`Direction/sprint-verified-detail.md`** — evidence, claims, and correction history for items the
  queue shows as `VERIFIED`, `DONE`, `SUPERSEDED` or `DEFERRED`.
- **`Direction/known_issues-resolved.md`** — fixed and closed issues. Read it when a symptom looks
  familiar; more than one entry here has been re-opened.
- **`Direction/reviews/2026-09-07-sprint-reconciliation.md`** — the reasoning behind the current
  queue's shape, and three findings that are still standing.

- **The Slops skills are invocable by name — you do not read them as files.** As of 2026-09-12,
  `Slops-OS/Blueprints/tools/skill-link/link-skills.mjs` symlinks the library into `.claude/skills/`
  in both repos, so 61 skills (59 from L0 plus this repo's two) appear to skill routing and can be
  called by name. Authorship still lives in `Slops-OS/Blueprints/skills/`, and
  `Slops-OS/Blueprints/skills/SKILL_ROUTING.md` is authoritative for status and scope. If a skill
  does not appear, re-run the linker — do not copy a skill into this repo.
  **Three are web-app only** — `slops-ui-ux-audit`, `mobile-first-qa-playbook`, `slops-mobile-smoke`.
  Native work wants `slops-native-ui-audit`, `slops-native-sim-drive`, and `slops-native-screen-design`
  (which decides what a screen should be, where the others grade one that exists).

- `Brand/brand-system.md` — voice, palette, type, AAA framework
- `Blueprints/specs/page-system.md` — per-page typography / accent / palette / copy contract
- `Blueprints/specs/design/component-lock-v1.md` — canonical component API/tokens (Button, Input, Segmented, Card shell, Type scale, Spacing)
- `Blueprints/specs/design/team-theme-contract-v1.md` — which tokens a team skin may override, contrast rules, room-mode depth
- `Blueprints/specs/omen-ux-ui-design-system-v1.md` — ⚠️ **PARTIALLY SUPERSEDED.** Do not treat as current for component APIs, tokens, or state patterns — the two specs above own those. It remains authoritative **only** for base palette hexes, dark-mode token names, and brand voice. Read its own banner before citing it for anything else.
- `Blueprints/api-routes.md` — API contracts
- `Blueprints/handoffs/frontend-to-backend.md` / `backend-to-frontend.md` / `decisions.md` — contract bus

## Native mobile read gate

For any native iPhone, Android, mobile design-system, mobile onboarding, provider-connection, or mobile release task, read these before planning or code:

1. `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
2. `Blueprints/specs/mobile/omen-native-design-house-v1.md`
3. `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md`
4. `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`
5. `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`
6. `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
7. Relevant approved Figma screen/component and API/state contract

Do not start native feature code when any of those sources are missing or conflict. Flag the gap instead.

## Kickoff

Paste `Blueprints/prompts/kickoff-l2.md` to start a session — or just run the auto-populate flow described in `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, append a row to
`Blueprints/playbooks/skill-usage-ledger.md`, log decisions in `Direction/decision_log.md`, and
write a dated handoff in `Blueprints/handoffs/`.

Then run the gates. A **P0 blocks your own close-out** — it means an agent reading current docs
would act on false information. An unrun check is not a passing check; if the L0 tree is
unavailable in a standalone clone, say the gate did not run.

```bash
node scripts/check-sprint-staleness.js                          # queue vs main, this repo
node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet    # cross-layer docs, from L0 root
node ../../Blueprints/tools/valor-brain/validate.mjs             # opted-in metadata pages
node scripts/check-kickoff-drift.js                              # this list vs kickoff-l2.md
```

**Entries you append today cite repo-relative paths that resolve today** — `Blueprints/done/LEDGER.md`,
not `done/LEDGER.md`. Old entries in the append-only records are history and stay as written.
