# Omen Definition of Done

**valid-as-of:** 2026-06-21
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

## The ledger

Every closure is recorded in `done/LEDGER.md`. Review monthly — gates skipped often signal a prompt or skill to revisit.

## Open updates

- Year-2 billing gates: **N/A** — Omen is free indefinitely (decision 2026-06-15).
- Content & Marketing Done lives at L2 for now; promote to L1 when L1's `marketing-strategy.md` + `content-strategy.md` land.
