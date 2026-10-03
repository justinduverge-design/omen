# Harness design outline — 2026-10-03 (proposal, founder to approve before any rewrite)

"Harness" here means everything an agent reads, follows or is checked by around the code: `CLAUDE.md`,
`AGENTS.md`, `AGENT.md`, kickoff prompts, skills, playbooks, ledgers, scripts and gates. This page says
what it is for, what it is built from, and how it changes. The rewrite comes after this is agreed.

## 1. Why we are doing this

The harness grew by adding a rule after each thing that went wrong. It never shrank. Measured today:

| Measure | Today | Source |
|---|---|---|
| Tokens read before work starts | ~92k (~370 KB) | read list in `CLAUDE.md`; `current_sprint.md` alone is 202 KB |
| Skill descriptions listed every session | ~6k tokens, 61 skills | skill audit |
| Skills that carry the real use | ~13 of 61 | usage ledger, 451 rows |
| Close-out writes | 322 KB skill ledger + 225 KB done ledger, by hand | ledgers |
| Reviews found after the PR, not before | Codex auto-review; merged past unread P1s (#511, #515) | decision log 2026-10-02/03 |
| Tracked files that are build output | 2,564 of 5,724 (`dd/`, 339 MB, from PR #453) | `git ls-files` |

**Goals, in priority order.** (1) Output is secure and correct, so reviews find little. (2) Tokens per
session fall by an order of magnitude without losing what an agent must know. (3) The state of the work
is visible without a hand-kept file. (4) The harness stays small as models improve.

Security and correctness never trade against tokens. We cut ceremony and duplication, not controls.

## 2. Principles — each with its reason

1. **Thin always-loaded layer, fat on-demand layer.** An agent loads only what the current task needs.
   *Why:* irrelevant context makes models worse and costs tokens (ICM paper; gstack "thin harness, fat
   skills"). *Here:* a map of ~1.5k tokens plus a "when you touch X, read Y" table.
2. **One source per fact; everything else points.** *Why:* every copy drifts; `AGENTS.md` already records
   it happening (Draft Assistant, 2026-09-12). *Here:* rules live once, in `facts-of-record.md`; the map
   links, never restates.
3. **Records are written, not read.** Ledgers, decision log and shipped list are append or generated;
   agents search them, never load them whole. *Why:* a 608 KB decision log is an archive, not context.
4. **Enforce with scripts, instruct with prose only what a script cannot.** *Why:* a check costs no tokens
   per session and cannot be skipped. *Here:* a size budget on the map, the existing drift and staleness
   checks, a read-only cost report.
5. **Status comes from git, not from a file someone maintains.** *Why:* the sprint file stopped matching
   how work is done (132 merged PRs in 30 days, almost none from sprint items). *Here:* `shipped.js`.
6. **Review before the PR; a second model only where risk is real.** *Why:* post-PR review means rework and
   late merges; Codex has caught real P1s on database and data-deletion work. *Here:* the Review section
   in the loop doc.
7. **Skills must keep earning their place.** *Why:* models improve, so a skill that helped in June may now
   be dead weight or wrong. *Here:* the freshness check in section 5.
8. **Every harness change is measured.** A change that makes sessions heavier needs a reason in the
   decision log; one that makes them lighter shows the before and after number.

## 3. Structure: four layers

| Layer | What goes in it | Loaded | Budget |
|---|---|---|---|
| **Map** | What Omen is, rules that never bend, current focus, flow, routing table | Every session | ~1.5k tokens, enforced |
| **Task context** | Specs, playbooks, handoffs, relevant skills | When the routing table says so | Per task, narrowest source that answers |
| **Records** | Ledgers, decision log, `shipped.md`, sprint archive | Never whole; searched or run | None |
| **Gates** | Drift, staleness, truth, validation scripts; later a cost budget | Run, report pass/fail | None |

Reference (stable rules) stays separate from working files (per-run output), as in ICM.

## 4. How a harness change is made (the process)

1. **State the problem with a number** (tokens, a missed review, a wrong instruction).
2. **Say which layer it belongs in** and what it replaces. Adding to the map means removing something
   from it or justifying the budget.
3. **Change it in one PR with its check.** If a script can enforce it, ship the script with the rule.
4. **Review it before the PR** like any change; request `@codex review` when it alters a gate, a security
   rule or an approval boundary.
5. **Measure after.** Re-run the cost report; record before and after in the PR.
6. **Log it** in `Direction/decision_log.md` with the reason. Rewrites of `CLAUDE.md`, `AGENTS.md`,
   `AGENT.md` and `kickoff-l2.md` go together through `slops-agent-docs-refresh`, then
   `node scripts/check-kickoff-drift.js`.

Never changed by this process: authority, permissions, or approval gates. Those stay founder decisions.

## 5. Keeping it fresh

- **Monthly, and after every new model release:** for each core skill, run its one-line test with and
  without the skill. No gain → propose deleting. Output drifted → propose an edit. Unused in the window →
  flag. The job opens a PR; a person approves. Needs `last_verified` and a test line per core skill.
- **Automatic usage log:** one line per session (skill, task type, skipped or not) replaces hand-written
  ledger rows.
- **Cost report:** a read-only script prints tokens in the always-loaded set and fails over budget.
- **Graph:** `graphify update .` is free and fast; the graph is only useful once the corpus is cleaned
  (see section 7).

## 6. Order of work

1. Agree this outline (this page) and the map draft (`2026-10-03-startup-map-draft.md`).
2. Build the cost report so every later step has a before and after.
3. Archive finished sprint, inbox and known-issues material (use `shipped.md` to confirm what is done).
4. Rewrite the four bootstrap docs together to point at the map; run the drift checks; measure.
5. Remove build output from git and clean the corpus (section 7).
6. Skill listing diet, then the with/without tests, then the monthly job.

## 7. Found along the way, not yet done

- **`dd/` is committed** (PR #453, 339 MB, 2,564 files). No script depends on it. Remove from tracking and
  gitignore, in its own PR.
- **Graphify** is installed and a refresh runs in ~25 s, but it builds a 25k-node graph (was 3,965 on
  2026-06-25) and the tracked `graphify-out/` would change by ~800k lines. Ignoring `dd/` alone did not
  shrink it. Decide after `dd/` is out whether to keep the graph in git or generate it locally, and what
  else to exclude. Nothing was committed.
- **`slops-graphify`** is named in three playbooks but is not among the 61 skill folders.
- **Plugin skills** (~150 entries, unrelated to Omen) and **skill linking** at `Slops-OS/.claude/skills`
  are outside this repo; both need a founder action and a cross-layer approval.

## 8. Decisions needed from the founder

- Is the four-layer split and the 1.5k-token map budget right, or should the map hold more?
- Approve step order in section 6, or reorder.
- Should the monthly skill check run as a scheduled cloud job, or manually after each model release?
- OK to remove `dd/` from git as its own PR?
