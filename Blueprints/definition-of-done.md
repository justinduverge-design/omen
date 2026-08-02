# Omen Definition of Done

**valid-as-of:** 2026-07-27
**Status:** v1 — pointer + per-type gate files + ledger
**Posture:** Omen is **free indefinitely.** No billing gates anywhere in this doc.

## How to use

Pick the Done type matching what you shipped, read that file, satisfy every gate, record in the ledger.

| If you shipped... | Read |
|---|---|
| A new feature | `done/feature-done.md` |
| A page edit affecting user-visible structure | `done/page-done.md` |
| A deploy or production cut | `done/release-done.md` |
| Anything touching auth, data, secrets, platform credentials | `done/security-done.md` (cross-cutting) |
| A recommendation (Omen, Trade Analyzer, Draft Assistant) | `done/recommendation-done.md` (cross-cutting) |
| Any user-visible UI | `done/design-done.md` (cross-cutting) |
| A public-facing post / video / social / marketing artifact | `done/content-marketing-done.md` (cross-cutting, L1 work) |

Run cross-cutting gates **in addition** to the primary type. A page change that adds a recommendation triggers Page Done + Recommendation Done + Design Done.

## Procedure receipt (all work)

Every task also follows `playbooks/omen-company-baseline.md` and selects applicable skills from `playbooks/skill-activation-runbook.md`. The handoff must state skills invoked, conditional skills considered but not applicable, evidence, and any procedure gap. Append invoked/skipped-required skills to `playbooks/skill-usage-ledger.md` before closing.

## Foundation: the AAA Framework

From `Brand/brand-system.md` §11: every change must satisfy **Accuracy + Accessibility + Aesthetic Integrity. Two of three is a fail.** Each done-file marks which gates map to which A.

## Evidence discipline

Every gate marked done must **point to evidence** — commit hash, file path, screenshot link, test-run timestamp, skill-verdict location. Do not paste full command output. Justin will investigate from the pointer if needed.

Skipping a gate without writing why = lying about done. Marking a gate done with stale, fabricated, or missing evidence is a hard prohibition.

## CI evidence and degraded verification

Do not assume a billing hold, failed run, or green workflow is current. Before planning, merging, release closure, or handoff claims, inspect the current CI result and record the exact run or locally observed substitute.

A gate that cites CI may not be silently skipped. If CI is unavailable for the task, use one of these explicit outcomes in the handoff and ledger:

- **SUBSTITUTED** — a named local equivalent ran; record its command, count/result, and date.
- **DEFERRED-CI** — no local equivalent exists; record the gate to re-run when CI becomes available. Do not claim CI passed.

Local checks are evidence for their own scope only. They do not prove an iOS simulator workflow, a GitHub-hosted review, deployment, or live behavior. A red or missing check is a stop condition until the failure or availability state is understood; branch-protection availability does not make failed checks cosmetic.

| Gate | Local evidence when appropriate | Limitation |
|---|---|---|
| Backend tests | `npm test` | Local runtime only |
| Frontend build | `npm --prefix frontend run build` | Does not replace browser or deploy evidence |
| Dependency audit | `npm audit --audit-level=moderate` | Does not replace hosted dependency review |
| Android build/tests | Local Gradle command | Record device/emulator limitations |
| iOS simulator CI | No Windows equivalent | Use **DEFERRED-CI** unless an actual CI run exists |
| Prompt evaluation | `npm run evals:validate` | Record the evaluation scope |

## The ledger

Every closure is recorded in `done/LEDGER.md`. Review monthly — gates skipped often signal a prompt or skill to revisit.

## Open updates

- Year-2 billing gates: **N/A** — Omen is free indefinitely (decision 2026-06-15).
- Content & Marketing Done lives at L2 for now; promote to L1 when L1's `marketing-strategy.md` + `content-strategy.md` land.
