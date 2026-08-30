# Audit — 2026-08-29

**Single home for all audit results.** Every pass is reported in the identical structure defined
below. Nothing audit-related lives outside this directory.

| Pass | Lens | Question | File | Status |
|---|---|---|---|---|
| Stage 0 | — | Are we fit to assess at all? | [`stage-0-preflight.md`](stage-0-preflight.md) | **6/6 PASS** |
| 1 | Veteran | Does it hold? | [`pass-1-veteran.md`](pass-1-veteran.md) | complete (Part A) |
| 2 | Scrappy | What does this actually cost? | [`pass-2-scrappy.md`](pass-2-scrappy.md) | complete (Part A) |
| 3 | Hotshot | What are we locking ourselves into? | [`pass-3-hotshot.md`](pass-3-hotshot.md) | complete (Part A) |
| 4 | Veteran | Does it hold? — **on the running apps** | [`pass-4-veteran-apps.md`](pass-4-veteran-apps.md) | complete (Phase B) |
| 5 | Scrappy | What does this cost? — **on the running apps** | [`pass-5-scrappy-apps.md`](pass-5-scrappy-apps.md) | complete (Phase B) |
| 6 | Hotshot | What are we locking in? — **on the running apps** | [`pass-6-hotshot-apps.md`](pass-6-hotshot-apps.md) | complete (Phase B) |
| — | — | Do we have the tooling? | [`tooling-check.md`](tooling-check.md) | complete |
| — | all | Consolidated register | [`findings.md`](findings.md) | live |

## Phases — the audit is half done

`pre-beta-audit-criteria-v1.md` defines **two phases, run on separate days**:

> *"Run them in that order and on separate days. They fail differently: A is read against the
> repo, B is read against a running app on a real device. **An auditor doing both at once will
> quietly demote B**, because B is slower and less satisfying."*

| Phase | Scope | Lenses | Status |
|---|---|---|---|
| Stage 0 | fitness to assess | — | **PASS 6/6**, 2026-08-29 |
| **A — Code** | read against the repo | Veteran → Scrappy → Hotshot | **COMPLETE**, 2026-08-29 — 12 findings |
| **B — The apps** | read against a running app | Veteran → Scrappy → Hotshot | **COMPLETE**, 2026-08-29 — 6 findings, 2 ruled out |

**Both phases have now run.** B7 (provider truth) and B8 (native crash reporting) remain
**unassessed** — both need a real connected account or signing path, and B7 is the liability the
founder deferred on 2026-08-29. Theme coverage is one-sided: iOS was observed in dark, Android in
light, and neither was seen in the other.

**What Phase B needs, corrected.** An earlier draft called Part B "founder-gated" wholesale.
That understated what is available: the app ships **24 screenshot scenarios** driven by a launch
argument, **13 simulators** are on the build machine, and an Android debug APK is built. B3, B5,
B6 and the fixture-backed half of B2 need no founder and no credentials. **Genuinely
founder-gated:** B7 entirely, B4's real timing, and the real-league halves of B1 and B2 — all of
which need a real connected account.

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
