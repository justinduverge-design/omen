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

- `Direction/{CLAUDE,AGENTS,AGENT}.md` → `Archive/planning-pipeline/2026-07-29-pre-status-model/Direction/`,
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
