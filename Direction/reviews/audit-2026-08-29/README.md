# Audit — 2026-08-29

**Single home for all audit results.** Every pass is reported in the identical structure defined
below. Nothing audit-related lives outside this directory.

| Pass | Lens | Question | File | Status |
|---|---|---|---|---|
| Stage 0 | — | Are we fit to assess at all? | [`stage-0-preflight.md`](stage-0-preflight.md) | **6/6 PASS** |
| 1 | Veteran | Does it hold? | [`pass-1-veteran.md`](pass-1-veteran.md) | complete (Part A) |
| 2 | Scrappy | What does this actually cost? | [`pass-2-scrappy.md`](pass-2-scrappy.md) | complete (Part A) |
| 3 | Hotshot | What are we locking ourselves into? | [`pass-3-hotshot.md`](pass-3-hotshot.md) | complete (Part A) |
| — | all | Consolidated register | [`findings.md`](findings.md) | live |

**Part B (device, real accounts) is not run in any pass.** It is founder-gated and needs
hardware. Every pass states its own Part B position rather than implying coverage.

## Method note — passes were re-run from zero

The first Veteran draft (`superseded-first-veteran-draft.md`, kept for the record) was written
while the author already knew several defects from having just built the code. At founder
direction all passes were **re-run as systematic sweeps**, and the rule applied was:

> **A finding is only admitted if it re-derives from a sweep, with its own evidence.**
> Recall is not evidence. Anything that did not re-derive was dropped.

This is not a claim of amnesia — it is a claim about what is allowed into the report. It worked:
the re-run **dropped nothing** and **found four defects the first draft missed**, three of them
in criteria the first draft never actually swept.

## The uniform report structure

Every pass file carries these sections, in this order, with no additions or omissions:

1. **Header block** — lens, question, criteria owned, commit, date, method
2. **Verdict** — one counts table
3. **Findings** — `F-<LENS>-nn`, each with the identical eight fields
4. **Criteria passed** — with the evidence that they pass
5. **Criteria not runnable in this pass** — and why
6. **Handoff** — what the next lens receives

Every finding carries these eight fields, always:

| Field | Rule |
|---|---|
| **ID** | `F-VET-01`, `F-SCR-01`, `F-HOT-01` — stable, referenced everywhere |
| **Claim** | One sentence |
| **Evidence** | File+line, command+output, or screenshot. Never a hypothetical |
| **Failure scenario** | Concrete inputs → the wrong outcome a user sees |
| **Criterion** | Which criterion it fails |
| **Severity** | `BETA-BLOCKING` / `WEEK-1-BLOCKING` / `AFTER` |
| **Reversibility** | `afternoon` / `contract` / `one-way` — decides who wins a tie |
| **Abort class** | Which ratified class it fires, or `none` |
