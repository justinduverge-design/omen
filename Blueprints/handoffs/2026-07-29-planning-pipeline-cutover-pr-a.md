# 2026-07-29 — Planning-pipeline cutover, PR A (L2 / Omen)

**Branch:** `cutover/planning-pipeline` (cut from a fetched `origin/main`, commit `90f6376`)
**Exit state:** **NOT** `CUTOVER_PREPARED` — 2 of 12 gates fail, both on L2. See Blockers.
**Workspace:** fresh clone at `C:/Users/JDuve/dev/_cutover-2026-07-29/omen`. The desktop
checkout at `C:/Users/JDuve/dev/SLOPS/slops-saloon/omen` was read only and never written to;
its 11 linked worktrees were never entered.

## Files updated

**Doctrine-extraction gate (§0.7) — done first, verified live before any archiving**

- `AGENT.md` — the hard vendor-ownership text ("You are Codex acting as the backend engineer";
  "Claude Code owns frontend/app UI planning… Codex owns backend systems") is replaced by the
  vendor-agnostic lane doctrine extracted from `Direction/AGENT.md:9`: *"Lanes are
  vendor-agnostic — any agent may pull any agent-buildable item from any lane in
  `Direction/current_sprint.md`. Pick by readiness, blockers, and token-cost, not by historical
  convention. Justin owns product decisions."* The backend capability list is preserved, but
  reframed as a stated soft lean rather than an ownership boundary.

**Retired-mechanic sites (§2)**

- `Blueprints/prompts/kickoff-frontend-claude.md` — added required step 0
  (`slops-repo-inspector`); 5-unchecked-items auto-populate → `Status: READY` selection with a
  single `Claim:`; "Tick the item" → `Status: VERIFIED` + `Evidence:`.
- `Blueprints/prompts/kickoff-backend-codex.md` — same three changes.
- `Direction/facts-of-record.md` — fact 3 restated against the status model.
- `Direction/current_sprint.md` — rule 2 → select by `Status: READY` / `Blocked by: None`;
  rule 5 → the `VERIFIED` → `CLOSED` transition with `Closure:` values; status-model pointer
  added. **Note:** the spec cites rule 5 at line 14; it is actually at line 12. Intent was
  unambiguous, so I migrated rules 2 and 5 as described.
- `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` — confirmed free of checkbox language, as the
  spec states. Step 4 close-out now names the status model; step 2 migrated off "top-5".

**New (§4.5, §6)**

- `Direction/facts-of-record.md` — **fact 8 added:** prepared Omen Supabase SQL is never
  applied by an agent; approval → staging → verify → production is a separately gated Justin
  action. Cites three existing `decision_log.md` entries (Phase 1 ADP/scoring "review-only
  SQL"; the Stripe-removal entry recording that real `drop table` statements were added to
  source only and "still need to be run against production Supabase separately"; and the
  Tuesday-scoring entry, where approval "removes the founder-approval blocker, not the dry-run
  step itself"). Existing meaning preserved, not broadened.
- `Direction/CUTOVER_STATE.md` — **new, inactive scaffolding.** `STATE: NONE`. Identical in
  content shape to the L0 file. This cutover is founder-manual; nothing here was activated.

**Archive (§3)** — 3 artifacts moved by `git mv`; git recorded all as pure renames (`R`).

- `Direction/{CLAUDE,AGENTS,AGENT}.md` → the `2026-07-29-pre-status-model` archive root,
  renamed `.archived.md` so the auto-loading filenames go inert; contents byte-identical.
- `MANIFEST.md` written at the archive root; one index line added to `Archive/README.md`.

## Files discussed (read, not changed)

`Direction/agent_inbox.md` (refreshed 2026-07-29) — **left untouched**, see Blockers.
`Direction/decision_log.md`, `Direction/sprints_completed.md`. Records left unedited per §0.6,
including `Blueprints/specs/omen-operational-rename-cutover.md:87`.

## Decisions made

- `Direction/AGENT.md` held better doctrine than the root `AGENT.md` above it. Extraction was
  verified live at the successor **before** the archive move, per the §0.7 gate.
- `Direction/AGENTS.md` was archived carrying stale stack facts — it still listed **Stripe**
  under Payments and in its decision table, though Stripe was fully removed 2026-07-12. Noted
  in the MANIFEST rather than edited, since archived material is preserved as-found.

## Unresolved questions

- `Direction/agent_inbox.md` and `Direction/current_sprint.md` disagree about what is done.
  The inbox (2026-07-29, reconciled against `main`) records M4-Omen-Screen merged as PR #210,
  M4-Auth as PR #193, the B2-D Sleeper waiver stack merged, and A1/A2 as dead PRs — none of
  which the sprint file reflects. This is exactly why §4.4 forbids inferring states.

## Blockers surfaced

**The approved §4.4 L2 status table was not supplied and does not exist in either repo, the
2026-07-28 audit, the capability map, or the desktop checkout.** §4.4 says "apply the approved
tables exactly. Do not infer states." Enumerating the L2 file gives 35 rows against the spec's
34, and the per-item READY/VERIFIED/COMPLETED/DESCOPED split is unspecified. Two data points
are pinned (A1/A2 → CLOSED/DESCOPED; grooming entry 6's evidence → `2c48bbf` + `ca96559`), but
they do not determine the other 32 rows.

Consequently **§4.3 (`agent_inbox.md`) is also blocked** — it must be populated only from
`Status: READY` items, which do not exist yet. I left the file untouched rather than
half-migrate it (deleting the `### Dead entries` block alone would strand the file between two
models).

## Last verified result

Gate sweep run in-clone. **10 of 12 PASS**: A1, A2, A4, A5, A6, A7, A8, A9, A11, A12.
**A3 and A10 FAIL on L2 only.** No test suite was run — this change is documentation and
doctrine only; no source, package, SQL, env, or deploy file was touched.
Per §7, any FAIL halts the PR: branch committed and pushed, **PR not opened**.

## Next recommended pull

Supply the approved L2 table, then finish §4.4-L2 and §4.3 and re-run A3/A10. Do not begin PR B.

---

# Second pass — 2026-07-30, founder rulings applied

The blocker above is resolved. Founder authorized deriving L2 states from evidence, then
issued corrections and rulings. All applied additively; no amend, reset, rebase, or force-push.

## What the evidence changed

**The 34-row expectation was stale.** The canonical set is **35**. Reasons, in order of weight:

1. The expectation predates PRs #238–#245, merged 2026-07-29 — after the audit revision.
2. It assumed 3 `VERIFIED`; evidence yields **0**. A merged PR does not satisfy `VERIFIED`.
3. It assumed 0 `IN_PROGRESS`; that holds, but only because no valid `Claim:` exists.
4. Reaching 34 required folding M1P keys, which the founder ruled must stay distinct.
5. `M0-BE-0` was listed active, but its contract landed (`63980b5`, with an Acceptance Matrix
   covering F2 and BE-1/2/3) and all three dependents merged.

## Rulings applied

- **Mirror.** `Direction/status-model.md` added — Omen is a separate repo and must work in
  standalone clones and CI. Metadata: `MIRROR_OF`, `SCHEMA_VERSION 1.0.0`, `SOURCE_COMMIT`
  `d26b7b66e5155ecbd07b621d1b416d527277d9d4`, `LAST_SYNCED 2026-07-30`. **No silent "L0
  wins"** — when both copies are available, any schema-version or operational-content
  difference is a blocking Truth Gate failure. Standalone checkout: the mirror is operative.
- **M1P identities preserved.** `M1P-Next-1`, `M1P-Next-2`, `M1P-P4`, `M1P-P3` each closed
  separately with their own evidence. Nothing folded. `M1P-P4`'s allowlist residual names
  `M4-Auth` as successor.
- **No new tasks minted.** ESPN waiver-pool work and the Actions-restoration sweep are held in
  `Direction/agent_inbox.md` under "Planning intake — pending planning-pass", non-selectable
  and excluded from all totals.
- **`M4-Help-Support-Implementation` → `READY`, not `IN_PROGRESS`.** Verified no valid claim
  exists: no `Claim:` record anywhere, no pin, remote branch merged and deleted, and zero
  follow-up commits on `main` since #229 (`5d458ca`). Its `Done when:` explicitly requires
  visual + VoiceOver/TalkBack + Dynamic Type evidence that has not been produced.
- **`D2` → `CLOSED / COMPLETED`.** Done-when met in full; the unclaimed deploy/live-provider
  proof is outside its scope and outside its own "do not touch" boundary.
- **Evidence corrected.** The `#125–#139` range was wrong — it swept in #126 (unrelated Jules
  docs gate), #132 (closed, and itself task A2), and #137 (closed, superseded by #138). Now
  eleven exact PR+commit pairs. Separately, the Phase 4.21 lockup record cited PR #120, which
  is `28d1b16` "remove duplicate logo link class" — one file, one deletion — and never carried
  that change; corrected to `2c48bbf` + `ca96559`, both via PR #199 `9ecd562`.

## Resulting counts

`current_sprint.md` holds **13 `READY`**, 0 `IN_PROGRESS`, 0 `VERIFIED`, 0 `CLOSED`.
`sprints_completed.md` gained **22 `CLOSED`** (18 `COMPLETED`, 4 `DESCOPED`).
**13 + 22 = 35.** Planning-intake items excluded, as ruled.

## Gates

New count gates added and passing: **A13** active-sprint counts (13/0/0/0), **A14**
completed-history additions (18+4=22), **A15** combined reconciliation (35). Original A1–A12
re-run and passing, with A11 rebaselined to 12 linked worktrees and the desktop checkout on
`chore/legal-valor-ventures-footer`.

## Blockers surfaced

All 13 active tasks currently carry a non-`None` `Blocked by:` line — nothing is immediately
pullable without founder or external action. Four have an `AGENT_RESOLVABLE` component that
can progress today: B2-D, A4 (dry-run prep), D1 (scope the delta vs #197), and
M4-Help-Support-Implementation (Android accessibility evidence).

## Next recommended pull

Run `planning-pass` on the two planning-intake items. Do not begin PR B.
