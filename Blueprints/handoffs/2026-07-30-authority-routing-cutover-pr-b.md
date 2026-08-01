# Handoff — Authority / Routing Cutover (PR B), L2

**Date:** 2026-07-30
**Branch:** `cutover/authority-routing` (pushed, PR opened, **not merged**)
**Companion:** the L0 + L1 half is on the same branch name in the `Slops-OS` repository.
Read that handoff first — it carries the authority model this repo now defers to.

## 1. Files updated

Worked in a fresh clone at `C:/Users/JDuve/dev/_cutover-b-2026-07-30/omen`. The desktop
checkout was never written to, and none of the 12 linked worktrees was entered.

**`2c8d09f` — kickoff-l2 adoption + archives**

- `Blueprints/prompts/kickoff-l2.md` — **created.** Layer- and capability-named; works
  for any runtime. Confirms actual session capability before applying a tier, reads
  Runtime Policy and Active Trust Assignments, applies only current-task authority,
  preserves every security and founder gate, never infers authority from a vendor or
  model name. In a standalone Omen checkout with no L0 available it states there is no
  active assignment by definition and operates read-only.
- Archived to `Archive/authority-routing/2026-07-30-pre-runtime-trust/kickoffs/` via
  content-preserving `git mv`, renamed inert: `kickoff-frontend-claude.archived.md`,
  `kickoff-backend-codex.archived.md`. `MANIFEST.md` and an `Archive/README.md` index
  line added. No redirect stubs left behind.
- **All 8 live references updated:** `AGENT.md`:67, `AGENTS.md`:48, `CLAUDE.md`:48,
  `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`:9,
  `Blueprints/prompts/prompt_playbook.md`:4, `Blueprints/prompts/README.md`:20-21,
  `Direction/known_issues.md`:56, `Direction/facts-of-record.md`:10.
- `Soft lean` removed from `CLAUDE.md` and `AGENTS.md`.

## 2. Files discussed, not changed

`Blueprints/prompts/manager_agent.md` (4436 B) and `Blueprints/prompts/sub_agents.md`
(2665 B) — **verified live and deliberately preserved.** These are the canonical
successors to the two L0 redirect stubs archived in `Slops-OS`. Do not rename them, do
not archive them, do not recreate an L0 copy.

## 3. Decisions made — for `decision_log.md`

1. **One kickoff replaces two.** The frontend/backend vendor split is gone. Lanes are a
   scheduling convenience, never an authority boundary; any runtime may be assigned any
   item, and what it may *do* comes from Runtime Policy plus an Active Trust Assignment.
2. **Standalone-clone behaviour is now explicit.** With no L0 available there is no
   active assignment by definition, so `kickoff-l2.md` says to operate read-only and ask
   the founder before any write, rather than assuming prior authority.
3. **Records were not edited** (D58): the PR A handoff, `decision_log.md`:618 and :629,
   `skill-usage-ledger.md`:118, `PROMPTS_CHANGELOG.md`:112, and
   `handoffs/2026-07-23-session-close-m4-auth.md`:37 all still name the retired kickoffs.
   That is correct — they describe the past.

## 4. Unresolved questions

None specific to L2. The open questions are in the L0 handoff.

## 5. Blockers surfaced

**None, in this repo or overall.** Founder rulings D70–D72, D76–D77, and D79 have all been
applied to the machine configuration. D79 removed the last item — `Skill(gstack:*)` and the
top-level `Skill(gstack)` dispatcher.

**Final score: 13 of 13, genuinely. CUTOVER_COMPLETE is supportable.** The earlier
"13 of 13" claim was premature and was retracted; the score history is retained in the
tracked evidence so the error and its correction stay visible. Evidence:
`Slops-OS/Direction/reviews/2026-07-30-pr-b-gate-results.md` and
`.../2026-07-30-authority-cutover-enforcement-audit.md`.

**B5 wording, per D74:** no active authority, routing, identity, or kickoff surface
contains `Soft lean`. Occurrences inside archives and protected historical records —
including `Blueprints/handoffs/2026-07-23-session-close-m4-auth.md`:37 in this repo — are
excluded and remain unchanged.

**Zero path-A items remain open.** D76 removed all five retired-project trust entries
(zero trusted entries remain), D77 removed `Bash(npx vite *)`, and D79 removed the gstack
standing authority. The effective allowlist is 9 rules with zero wildcards. None of this
changed any file in this repo.

**PR A regression verification (D80): all 7 checks pass**, including that this repo's
`Direction/status-model.md` pin `SOURCE_COMMIT d26b7b6` resolves and is an ancestor of
Slops-OS `origin/master`, and that PR B modifies neither status-model file.

**Merge order matters:** merge `Slops-OS` first. This repo's `kickoff-l2.md` points at
L0's `AGENT_INDEX.md` §§8–9 for Runtime Policy and Active Trust Assignments; merging L2
first would leave those pointers dangling.

## 6. Last verified result

No build or test suite applies — doctrine-only, zero app source, zero tests, zero
package files touched.

Verification run: exactly 1 active kickoff (`kickoff-l2.md`) and exactly 2 archived
vendor-named kickoffs in this repo; zero `Soft lean` on active surfaces; both L2 runtime
prompts present at their original byte sizes.

## 7. Next recommended pull

Nothing blocking. Resume the normal L2 queue from `Direction/agent_inbox.md` once both PRs
are merged — and note that your next session will start from `kickoff-l2.md`, which will
ask you to confirm your actual capabilities before you do anything.
