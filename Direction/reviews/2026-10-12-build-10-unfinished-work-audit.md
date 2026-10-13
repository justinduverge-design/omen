# Build 10 unfinished-work audit — 2026-10-12

**Scope:** read-only inspection of PR #654 / `omen-projections-v1` and
`feat/provider-gap-g3-g8`. No rebase, merge, production read or provider-account action occurred.

## Executive disposition

- PR #654 is the `omen-projections-v1` branch; it is not a separate workstream.
- Preserve its pure stat-line model, scoring separation, provenance, leakage guards and offline
  harness. Repair the unresolved P1 before rebase or warehouse execution.
- Do not merge `feat/provider-gap-g3-g8` as one change. It is explicitly unreviewed WIP spanning
  roster truth, lineup settings, Trade targets and transactions. Recover it in capability slices.
- Build 10 should prefer the roster/Trade reliability slices if real-provider reproduction confirms
  they address the founder's phone failures. Projection work remains an evidence task until the
  restored-warehouse backtest produces position-specific decisions.

## PR #654 / `omen-projections-v1`

### Current state

- Open PR, clean GitHub merge state at inspection time.
- One commit (`a249b2f6`), 14 files, 2,476 added lines.
- Six commits behind the Build 10 documentation baseline.
- GitHub checks: backend/audit, frontend/client, SPA boot and docs-quality all pass.
- Focused local suite: 30/30 passed.
- No app route, migration or production wiring is included.

### Preserve

- Pure deterministic projection of a stat line rather than a pre-scored points number.
- Explicit scoring-family application outside the projection model.
- Strict future-row exclusion and walk-forward ordering.
- Source/provenance fields, confidence bands and honest unsupported states.
- Provider-leads/Omen-challenges policy and the requirement for a real fact behind disagreement.
- Read-only offline backtest boundary.

### P1 to repair before rebase

The report's `relevant` universe is selected using the trailing-three-game PPR average—the same
`last3` predictor that the model must beat. That makes the eligibility population depend on one of
the baselines under judgment and permits the release decision to be biased by the baseline's own
selection behavior. The specification requires a position to beat both `last3` and `season_avg`,
but the current report does not enforce the ship rule in both an independent population and the
all-player population.

Repair requirements:

1. Define relevance from independent pre-week facts that are not outputs of `last3`, `season_avg`
   or the Omen model—for example pre-week opportunity/roster participation criteria—and version it.
2. Retain the all-player universe as a separate mandatory result.
3. Compute an explicit per-position, per-season verdict against both baselines.
4. Emit `PASS`, `HOLD` or `FAIL`; require the rule to hold in the independent relevant universe and
   not reverse materially in the all-player universe.
5. Add tests where filtering on `last3` would make a losing model appear to pass.

### Additional review items

- `loadSleeper` catches every database error and reports the benchmark as absent. Distinguish an
  expected missing optional table/no rows from permission, schema and transport failures.
- The read-only pool is configured correctly with `default_transaction_read_only=on`; preserve that
  connection-level control. The one-off `SHOW` test is supporting evidence, not the safety boundary.
- The disagreement threshold is explicitly in-sample in the report. Never promote it as a live
  challenger threshold until it is fitted on earlier seasons and evaluated out of sample.

### Build 10 gate

The branch may earn Build 10 foundation inclusion only after P1 repair, rebase, independent review
and restored-warehouse execution. Customer-visible projection leadership is separately gated by
position-specific backtest results and physical-device behavior; a green synthetic suite is not
enough.

### Continuation result

- P1 repaired on the isolated branch in commit `3ff05456` after rebase onto current `origin/main`.
- Relevance is now `preweek-opportunity-v1`, based on three prior games of position-specific
  attempts/carries/targets and never on a fantasy-points predictor.
- The report now emits per-season comparisons and position-level `PASS` / `HOLD` / `FAIL`; both the
  independent relevant universe and all-player universe must pass.
- Focused suite: 32/32 passed after the repair and again after the rebase.
- PR #654 head is `3ff05456`; backend/audit, frontend/client, SPA boot and docs-quality checks pass.
- Independent review remains open. No restored warehouse is running locally, so real QB/RB/WR/TE
  decisions remain open rather than silently substituting production.

## `feat/provider-gap-g3-g8`

### Current state

- One preserved WIP commit (`8a8c78b9`), 13 files, 1,438 additions / 63 deletions.
- Five commits behind the Build 10 documentation baseline.
- Commit labels itself not reviewed and not tested; syntax checking is its only recorded local gate.
- It modifies ESPN, Yahoo and Sleeper adapters plus League, Trade, Waiver, caching and roster
  services, so recovering it wholesale would join unrelated risk domains.

### Safe recovery slices

| Slice | Capability | Files/purpose | Build 10 disposition |
|---|---|---|---|
| R1 | Shared normalized league-roster bundle | Extract `leagueRosterBundle` and adapter-neutral contract tests | Preserve/consolidate; prerequisite candidate |
| R2 | Yahoo partial-roster honesty | Per-team timeout/failure state instead of silently empty roster | Repair candidate; directly relevant to Trade reliability |
| R3 | Provider lineup positions | ESPN/Yahoo provider setting parsers with exact fallback semantics | Review separately; useful to personalized Trade only after fixtures/live proof |
| R4 | Trade targets | `leagueTradeTargets` over a certified roster bundle and selected team | Hold until R1/R2 and phone failure diagnosis; do not hide provider reads in overview |
| R5 | Sleeper transactions | Documented public read plus normalized `league-transactions.v1` | Separate League candidate, not required for Trade repair |
| R6 | Yahoo transactions | Documented but unexercised parser behind a dark flag | Exclude from Build 10 until recorded/live contract proof |
| R7 | ESPN transactions | Community-documented parser behind a dark flag | Exclude from Build 10 until rights/shape/live proof |
| R8 | Route integration and caching | League overview, Trade and Waiver wiring | Rebuild only after the underlying slice contracts pass |

### Build 10 priority

R1 and R2 are the only provider-WIP slices with a plausible direct path into Build 10 today. They
address the shared roster primitive and the specific risk that a failed Yahoo team read appears to
be an empty roster. R3/R4 may follow only if the real Trade reproduction requires them. Transactions
are League work and must not expand a Trade-reliability build.

## Next evidence

1. Fix the PR #654 relevance-population P1 on its existing isolated branch, then rebase and review.
2. Run the repaired model against the restored warehouse and record QB/RB/WR/TE pass/hold/fail.
3. Reproduce Build 9 Trade against real ESPN/Yahoo/Sleeper contexts and determine whether R1/R2/R3
   address the actual failure.
4. Cherry-pick nothing from the provider WIP. Reimplement each earned slice with new focused tests,
   recorded contracts and independent review.
