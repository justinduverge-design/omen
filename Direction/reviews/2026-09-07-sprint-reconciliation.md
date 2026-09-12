# Sprint reconciliation — 2026-09-07

**Moved out of `Direction/current_sprint.md` on 2026-09-12.** This is the reasoning behind a
reconciliation pass, not the queue. It was read by every session before it could pick a task; it is
now read when someone asks *why the queue says what it says*.

Its standing findings are still live and are pointed at from the queue.

## Reconciliation standing items — 2026-09-07

**This pass reconciled the queue against `git log`, not against its own prose.** Between the
2026-09-02 pass (`17806cf`) and `origin/main` today there are **50 non-merge commits**. The queue
described none of them.

### The record was split, and only half of it was stale

Worth stating precisely, because "the docs are behind" was too broad when this pass started:

- **Current and genuinely good:** `Direction/decision_log.md` (entries through 2026-09-07),
  `Direction/known_issues.md` (34 references to this week), and seven dated handoffs covering
  2026-09-02 → 2026-09-07. The *reasoning* for this week's work is written down and is not thin.
- **Stale:** this file, `Direction/sprints_completed.md`, `Blueprints/done/LEDGER.md` (last row
  2026-08-26), `Direction/roadmap.md` (2026-08-31), and `Direction/release_readiness.md`
  (2026-08-26).

So the failure was **not** that work went undocumented. It is that the *status surfaces* — the ones
an agent reads to pick a task and the founder reads to judge progress — were never advanced. The
narrative record and the queue record came apart, and only the queue was wrong.

### What was structurally broken in this file

1. **30 `CLOSED` tombstone stubs** were still occupying the active queue, each already carrying
   "Retired from the active queue 2026-09-02" while sitting in it. All 30 were verified against
   `sprints_completed.md` before removal; **27 have a real record there.** Removed this pass.
2. **`R4`, `R5` and `M8-EspnAndroidHelper` were closed with no ledger row.**
   **`R4` and `R5` were verified complete in both consoles on 2026-09-07 and are resolved** — see
   `sprints_completed.md`. The founder was right: the work was done, only the receipt was missing.
   iOS App Privacy reads "Published 15 days ago", which lands exactly on the claimed 2026-08-23.
   `M8` remains open. The original finding, kept because the defect was real: — the exact defect the
   2026-09-02 pass flagged for `O2` and `W1-GATE`, recurring three more times and undetected. Each
   appears in `sprints_completed.md` only as a cross-reference inside *another* item's prose
   (*"R4/R5 still gate rollout"*; *"Android path is deferred separately as `M8-EspnAndroidHelper`"*),
   never as a closure of its own. **Founder call, not an agent's:** either the evidence exists and
   was not written down, or the closure was premature. Filed as an open question in
   `sprints_completed.md` § "Reconciliation — 2026-09-07"; not silently re-opened and not silently
   accepted.
   **`M8` was missed on this pass's own first sweep** — a substring search matched the pointer inside
   M7's row and cleared it. It was caught by the new `sprint-closed-without-ledger-row` check written
   the same day. A cross-reference is not a receipt, and only an exact-key search can tell them
   apart.
3. **`W1-CONSENT` existed twice** — a `READY` copy with the scope and a `VERIFIED` copy with the
   evidence, appended 2026-09-01 without retiring the original. The inbox selector reads `READY`, so
   the queue was advertising finished P0 work as available. Merged into one `VERIFIED` entry.
4. **`W1-REVIEW` read as triple-blocked when only one blocker was live.** Both task blockers
   (`W1-CONSENT`, `W1-DEMO-NAMES`) were satisfied before 2026-09-02. The remaining blocker is
   `FOUNDER`. Annotated rather than cleared, because neither blocker carries a `Closure:` value yet.

### 🔴 Found while verifying `R4`/`R5` — the store listings are not built

Neither store listing exists in a submittable state. **Google Play is 6 of 11 on "Set up your app"**
— missing app category and contact details, the store listing itself, and the Government apps /
**Financial features** / Health declarations; the app is `Draft` and internal testers currently see
the temporary name `com.slopssaloon.omen (unreviewed)`. **iOS 1.0 has no screenshots, no
description, no keywords, no support URL, no build attached, and no Primary Category.**

**`W1-REVIEW` cannot succeed against either store in this state**, regardless of how good the build
is. No item in this queue owns listing content — `R6` and `R7` both assume a listing already exists,
and `R7` closed having found the metadata "already clean" when it was in fact empty. **Not minted as
a task here; a new critical-path item is a founder call.**

### Unchanged and still flagged — these are decisions, not edits

- **`READY_FOR_REVIEW` is still not a state in `Direction/status-model.md`** and five items still sit
  in it: `M9-BE-Switcher`, `M9-BE-WaiverAnalysis`, `M9-BE-StartSitDetail`, `M9-BE-LedgerDetail`,
  `B2-D3-S2`. **The inbox selector cannot see any of them.** This is Batch 1 — five built and tested
  PRs behind one approval — and it has now been invisible to the queue for a second consecutive
  reconciliation. Flagged for the third time; still not rewritten, because changing it is a
  status-model question.
- **`P1-YahooReauth` carries `Status: ✅ DONE`**, which is likewise not a state in the status model.
  Same treatment: recorded, not rewritten.
- **Nine `VERIFIED` items await a `Closure:` value:** `A7-OwnedFootballDataPipeline`, `R2-Android`,
  `R3-BUILD-Android`, `M5-Native-API-Client`, `S5`, `W1-A`, `W1-CONSENT`, `W1-DEMO-NAMES`,
  `W1-TABBAR`. **No `VERIFIED` item was advanced by this pass.** Closure remains a human call.

### What this pass did not touch

No `Done when:` clause was judged met, no item changed priority, no blocker was cleared, and no
status was upgraded on the strength of a commit message. Commits are evidence that work happened,
not evidence that an acceptance clause is satisfied — and the gap between those two is where this
file has gone wrong before.
