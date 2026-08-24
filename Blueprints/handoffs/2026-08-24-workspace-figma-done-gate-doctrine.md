# Handoff — 2026-08-24 — Workspace, Figma-absence, and Done-gate doctrine

**Branch:** `chore/workspace-solo-and-figma-absence` off `main`. **Not merged.** Deliberately separate from [#364](https://github.com/justinduverge-design/omen/pull/364) so that PR stays a pure contract review.

Closes the three flags raised at the end of the `M1-Screen-League` / `M1-Screen-Trade` revision, plus one false gate found while closing them.

## Flag 1 — nobody knows whether they are alone in the tree

Two agent sessions ran in this checkout on 2026-08-24. The working branch changed underneath one of them **twice**, mid-task, and commit `4bf00fa` (*"thus might belong to another branch maybr a7?"*) captured two unrelated workstreams because both were dirty in one tree.

**Branch discipline does not prevent this.** `git checkout` carries uncommitted changes across branches — that is the actual mechanism, and it is why "just use your own branch" is not the fix.

- **`scripts/check-workspace-solo.js`** — reports other registered worktrees, any path already dirty, and optional HEAD drift (`--since <sha>`). Advisory, read-only, exits 1 on findings, prints its own blind spots. Indexed in `scripts/README.md`.
- **`kickoff-l2.md` STEP 0.2** and **`HOW-TO-RUN-THE-LOOP.md` step 0** — run it before writing anything.
- **The rule it encodes:** a clean tree is the kickoff expectation. Anything dirty when you arrive belongs to someone else. Never `git add -A` in a tree you did not start clean. When it fires, take a worktree.

**Verified against the real incident**, not a hypothetical: run in the collided tree with the other session still live, its first output named that session's worktree and branch.

## Flag 2 — `M10` was specced to build a checker that lies

`M10-DesignLaneStaleness` asserts Figma frames are **absent** before offering a design item as pullable. The obvious way to check that is a false positive:

| Read | Reported | Reality |
|---|---|---|
| `get_metadata`, no `nodeId` | 1 page | 7 pages |
| `page.children.length` (unloaded) | 0 children | 27 frames |

Built as written, **M10 would confidently report existing, approved contracts as missing** — this item's own failure mode, inverted.

- **`M10` amended** to require a direct per-node probe and a fixture proving it does not read a lazily-unloaded page as empty.
- **`native-mobile-design-delivery-workflow-v1.md`** gained the caveat: an empty listing is *unknown*, never *absent*; probe the node id before reporting that prior work was never done.

Caught because the same trap nearly produced a false finding an hour earlier during the contract revision — the page listing supported a confident conclusion that node `86:2` was never written; probing `86:2` returned a fully populated board. Same shape as the 2026-08-21 Yahoo `403`-without-a-body lesson, and most dangerous precisely because this repo's history of contracts-claimed-but-not-written makes the wrong conclusion feel likely.

## Flag 3c — `design-done.md` assumes a running UI

`M4-Help-Support`, the 2026-08-16 M1 pass, and the 2026-08-24 revision each annotated around the identical two gates. **Three tasks working around the same gate is a gate problem.**

**`Blueprints/done/design-contract-done.md` — PROPOSAL, not ratified.** Same bar, asked at the stage the work is at, and it adds the gate `design-done.md` has no equivalent for: *is every capability the screen implies backed by a shipped route, or labelled as not yet existing?* It explicitly does **not** discharge the deferred gates — it records which implementation slice owes each one.

## Flags 3a/3b — minted, deliberately not done

**`M11-M1ContractProviderProof`** — `BLOCKED`, founder-gated. Five named claims: ESPN per-side projection shape, Sleeper and ESPN deadline fields, Trade personalization against a real Sleeper league, and the neutral-vs-personalized flip on real data.

**Sequenced after ratification on purpose:** if either contract is rejected again the proof target changes, so proving it now risks proving the wrong thing. Yahoo is out of scope while its API is refused (#308).

## Unplanned find — a false gate, for the fourth time

`Blueprints/definition-of-done.md` still carried the whole *"Degraded verification — GitHub Actions billing hold"* section: allotment exhausted, red checks **"cosmetic"**, and **"Release Done is hard-blocked."**

The hold was retracted on 2026-08-01 and **never existed**. `done/release-done.md` was corrected on 2026-08-19 when someone tried to pass it — but **the pointer file every kickoff reads first kept the false version for a further 23 days**, and `feature-done.md` carried the same banner.

Corrected both; verified false against three passing PR checks on #364. **Scope held deliberately:** only the two files where the claim is an *active gate* were touched. Handoffs, ledger rows, `decision_log.md`, and `sprints_completed.md` keep the mention as accurate history.

**Fourth recorded instance of the identical pattern** — a correction written where it was discovered, not everywhere it was asserted — after the Yahoo fact-of-record, the nflverse cron, and the M1 Figma copy.

## Verification

- `npm test` **618/618** — no source file touched, baseline unchanged.
- `node scripts/check-sprint-staleness.js` — no findings.
- `node scripts/check-workspace-solo.js` — exercised in both directions (findings and JSON).
- No package file, dependency, SQL, migration, deploy, or secret touched.

## What is NOT done

- **`design-contract-done.md` is a proposal.** It ratifies nothing and discharges nothing.
- **No provider proof obtained.** The four ⚠️ rows in the League data plan remain inferred, by design.
- **`M10` is amended, not built.** The checker still does not exist.
- **The stale-gate class is corrected, not prevented.** `check-sprint-staleness.js` prints "anything outside `Direction/` and `Blueprints/handoffs/`" as a blind spot on *every run*, and the stale gate sat squarely in it. **A tool that names its blind spot every run and is never extended to cover it is a documented hole, not a covered one.** The next fix of this class should be a checker over the active gate files, not another handwritten sweep.

## Merge order

Land **#364 first** if both are approved — it touches `Direction/current_sprint.md` too. Overlap is section-level (this branch amends `M10` and appends `M11`; #364 advances the two M1 items), so expect a small mechanical merge at worst.
