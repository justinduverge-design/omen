# Audit 2026-08-29 — tooling check

| | |
|---|---|
| **Question** | Does a skill already exist to run this kind of audit and record it consistently? |
| **Commit** | `51cbead` |
| **Date** | 2026-08-29 |
| **Method** | Enumerated every `SKILL.md` at L0, L1, and L2; read the audit-adjacent ones. |
| **Answer** | **No.** Two findings below. |

## What exists

**44 skills at L0 (`Blueprints/skills/`), 4 in the Omen repo.** Eight are audit-adjacent:

| Skill | What it does | Where it records |
|---|---|---|
| `slops-code-review` | Pre-merge verdict; P0/P1/P2 findings; explicitly never edits code | unstated |
| `slops-ui-ux-audit` | UI verdict, P0/P1/P2, screenshots | unstated |
| `slops-investigate` | Bug/incident/regression; requires a red signal | **`Direction/reviews/`** |
| `slops-verify` | Functional / real-account / provider QA | unstated |
| `slops-quality-baseline` | Gate evidence | — |
| `mobile-first-qa-playbook` | Device QA | — |
| `product-gap-analysis-session` | Product gaps | — |
| `slops-retro` | Post-hoc learning | — |

`slops-code-review` is the closest, and the gap is instructive rather than cosmetic. It applies
**seven review lenses** — correctness, security, simplicity, reliability, performance, tests,
scope. Those are **dimensions applied by one reviewer**. What was built today is **three
personas with stated blind spots who check each other**, and the difference is the entire point:
a dimension cannot disagree with another dimension, so it cannot produce the signal this system
treats as its output.

## Findings

### F-TOOL-01 — The audit method built today is not a skill, so it is not repeatable

- **Claim:** Nothing in any of the 48 skills carries the method this audit ran on. It exists
  only as three playbook documents and the memory of the session that wrote them.
- **Evidence:** No `SKILL.md` at any layer references a persona-based lens, a pass sequence, a
  tie-break rule, a preflight-to-the-preflight, MEL classification, or abort classes. Grep for
  `veteran|persona|three lens|preflight` across `Blueprints/skills/` returns only unrelated uses
  of "lens" (`slops-code-review`'s dimensions) and "persona" (agent-authoring skills).
- **What specifically has no home:** the three lenses and their blind spots; the
  Veteran→Scrappy→Hotshot sequence and its reversal-cost justification; the reversibility
  tie-break; Stage 0's six fitness checks; MEL classification with mandatory repair dates; abort
  classes fixed before looking; the eight-field finding schema; the single-results-home rule; and
  the re-run-from-zero rule that found four defects the first draft missed.
- **Failure scenario:** The next audit — the one that clears the deferred provider proof before
  invitations — is run by a session that did not write these documents. It finds the three
  playbooks, reads them as prose, and produces findings in a different shape, in a different
  place, with no sequence and no tie-break. **The disagreements stop being the output, and the
  system degrades into one reviewer with three hats — which the grading system itself names as
  worse than one reviewer, because it costs triple and produces false confidence.**
- **Criterion:** A11 — documentation that asserts a fact. The playbooks describe a procedure
  nothing enforces.
- **Severity:** WEEK-1-BLOCKING — the second audit is scheduled before beta invitations
- **Reversibility:** afternoon
- **Abort class:** none

### F-TOOL-02 — This session did not satisfy the repo's own skill-activation contract

- **Claim:** No skill was named at plan time and no ledger row was appended, both of which the
  repo requires.
- **Evidence:** `Direction/current_sprint.md` § "Skill activation contract": *"Every task plan
  must name the selected skills and explain why any normally required skill is N/A. Every
  closeout must record which skills helped, which were skipped or substituted."*
  `slops-saloon/omen/CLAUDE.md` § Close-out: *"append a row to
  `Blueprints/playbooks/skill-usage-ledger.md`."* The ledger's last row is dated **2026-08-28**.
  Today's work — two shipped screens, a new API contract, a production deploy, and four audit
  documents — appended nothing.
- **Failure scenario:** The ledger is the repo's record of which procedures actually help. A
  session this size leaving no row means the next reader cannot tell whether the skills were
  applied and unhelpful, or never considered. **Both look identical in an empty ledger**, and
  the ledger's existing rows show it is normally used to record exactly that distinction — the
  2026-08-26 row runs to several hundred words on what was N/A and why.
- **Criterion:** A11.
- **Severity:** AFTER — a record gap, not a product defect
- **Reversibility:** afternoon
- **Abort class:** none

## Not done here

**No skill was authored.** The founder was explicit that this is not a fix session. `F-TOOL-01`
names the work and its shape; `slops-skill-author` exists at L0 for whoever does it.

One note for that session, because it is the whole risk: **a skill that only restates the three
playbooks will not work.** The parts that carry the value are the ones that constrain behaviour
rather than describe it — the mandated sequence, the tie-break, the "recall is not evidence"
rule, and the single results home. A skill that lists three personalities and asks nicely for
disagreement will produce three agreeable reviewers, which is the failure mode this whole system
was built to avoid.
