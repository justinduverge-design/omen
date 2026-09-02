# Record-staleness checkers

`scripts/check-sprint-staleness.js` is the orchestrator. It owns no detection logic — it
selects checkers, runs the ones that apply, and prints coverage. Each checker in this
directory owns one domain.

## Why it is split this way

**A checker that inspects part of what can go stale and then prints "no staleness found" is
worse than no checker** — it converts an unknown into a false all-clear. That is what
happened on 2026-08-19: the single-purpose version reported clean while `S8` had been
finished for eight days and was still being advertised as an available P1 pull.

The founder's framing set the shape: *a fielder with nobody on base doesn't move.* So each
checker declares its own preconditions and is skipped — visibly, with a reason — when it has
nothing to do. Network data is fetched lazily and only if an applicable checker asks for it.
Running `--only known-issues-missing-paths` makes zero GitHub calls.

## The contract

```js
module.exports = {
  id: "some-slug",                 // stable; used in output and --only
  title: "one human-readable line",
  needs: ["merged PRs"],           // data labels, for the coverage report

  // Local files only — never a network call. This is what makes skipping cheap.
  appliesWhen(ctx) {
    return { applies: true, detail: "3 candidate items" };
    // or  { applies: false, reason: "no entry is marked OPEN" };
  },

  run(ctx) {
    return { findings: [], informational: [] };
  },
};
```

Register it in the `CHECKERS` array in the orchestrator. Add a `describe()` case for any new
`kind` you emit.

### `ctx`

| Accessor | Notes |
|---|---|
| `ctx.read(relPath)` | file contents or `null`; memoised |
| `ctx.exists(relPath)` | |
| `ctx.markdownFiles(dir)` | `Direction` or `Blueprints/handoffs` |
| `ctx.mergedPrs()` | network, memoised |
| `ctx.allPrs()` | network, memoised — includes state, so you can tell closed-unmerged from open |
| `ctx.issues()` / `ctx.issuesByNumber()` | network, memoised |
| `ctx.root` | absolute repo root |

A network accessor throws `GitHubUnavailableError` when `gh` is missing or unauthenticated.
The orchestrator catches it and reports that checker as **DID NOT RUN** — never as passing.

## The checkers

| id | Catches | Modelled on |
|---|---|---|
| `sprint-vs-merged-prs` | item open while its key shipped in a merged feat/fix PR | the original seven drift incidents |
| `sprint-cited-prs-resolved` | READY item where every PR it cites is resolved | `S8`, invisible to title matching |
| `handoff-unmerged-claims` | handoff claiming "not pushed" while citing a merged PR | #314 |
| `known-issues-buried` | entry marked OPEN naming no GitHub issue | the four issues surfaced as #338–#341 |
| `issue-state-conflicts` | wording that contradicts a cited issue's state | the Yahoo/#308 contradiction |
| `known-issues-missing-paths` | entry naming a repo path that no longer exists | `src/omen_gdpr.js` |

## Writing a checker that will actually get read

Every false positive costs more than a missed finding, because it teaches people to skim.
Three noise sources were fixed the day this was built, each after seeing real output:

1. **Do not judge a whole section when you mean one line.** Section-scoped matching produced
   four wrong findings on issue #263 — sections that narrate a still-gated feature while
   citing a closed issue as history, which is correct writing.
2. **Do not judge a whole line when you mean one sentence.** A summary line listing #338–#341
   *and* saying "`S8` closed" flagged four times. `issue-state-conflicts` now judges a
   ±70-character window around each reference.
3. **Exempt entries that describe the removal.** A note saying a file was deleted is the fix
   working, not drift. `known-issues-missing-paths` skips lines matching `DESCRIBES_REMOVAL`.
4. **Do not read the historical record as a current claim** *(added 2026-09-02)*. The first CI
   run of these checkers reported five findings on issue #308, all wrong: one inside a block
   headed *"Everything below this line is superseded history, retained for provenance"*, four
   narrating the 2026-08-19 reconciliation in past tense. `agent_inbox.md` had already logged
   them as known false positives, with the reason — **rewriting superseded prose to satisfy a
   linter would destroy provenance this repo keeps on purpose.**

   `issue-state-conflicts` now skips three shapes of record: an inline `[SUPERSEDED]` marker
   or struck-through text (that line only), everything after an explicit *"everything below
   this line"* opener until the next heading of any level, and `decision_log.md` entirely —
   an append-only log whose entries state what was true when each decision was taken.

   Two things this got wrong on the way, both worth keeping in mind for the next exclusion:
   an inline marker first *opened a region*, which blinded every following bullet in the same
   sprint item; and regions first closed only at `##`, while sprint items are `###`. **An
   exclusion that quietly swallows real findings is worse than the false positives it
   removed** — so the skips are counted and printed, and `test/issueStateConflicts.test.js`
   tests both directions, with the live-claim cases carrying the weight.

And treat `VERIFIED` as legitimate: several items are deliberately held there after merging
because one `Done when:` clause is unevidenced. Gate on `READY`/`IN_PROGRESS` when you mean
"still advertised as available work".

## What none of this can do

It never edits anything. Whether a `Done when:` clause was genuinely met is a human call, and
auto-closing on a merged PR would turn one failure mode into a worse one.

It also cannot read prose. The Yahoo contradiction was *prose against prose* and only one
side cited the issue number — `issue-state-conflicts` could not have caught it as written.
**Citing the number is what makes a claim checkable**, which is why `known-issues-buried`
exists alongside it.
