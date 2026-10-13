# Build 12 local staging handoff — 2026-10-13

## Outcome

- Fetched current `origin/main` at PR #669 merge `633596b7` and preserved Claude's Build 11 / ESPN handoff.
- Created local branch `codex/build-12`, rebased the four planning commits onto current `main`, and
  kept the branch unpushed with no upstream.
- Merged `omen-projections-v1` into Build 12 staging only. PR #654 remains open and `main` is unchanged.
- Repaired the projection certification review findings locally:
  - standard, half-PPR and PPR certify independently;
  - `paired-evidence-v1` requires 100 rows and 20 player clusters per seasonal comparison;
  - clustered inference uses the finite-cluster correction;
  - sparse evidence is `HOLD`, never a fabricated pass or loss;
  - the CLI and source verify `omen_warehouse_read` on `omen_football` in a read-only session;
  - the owner-facing Markdown exposes rows, player clusters and verdicts for every season/baseline.
- Focused projection suite passes 34/34.

## Build truth

- Build 10 was cut from current `main` but superseded before tester release.
- Build 11 was uploaded 2026-10-12 and is the current tester baseline.
- Build 12 is next; Tuesday 2026-10-20 is the earliest target, not a promise.
- The historical Build 9 phone walk remains valid product evidence for Trade, but it is not proof of
  current Build 11 behavior.
- Rhody/Rodys's fresh ESPN login remains unproven. Do not change the ESPN flow again before a real
  Build 11 attempt is correlated with status-only logs under the merged #669 watch list.

## Hard boundary still open

The official KVM2 `restore-isolated.sh` proves and then destroys a successful restore. It creates
only NOLOGIN capability roles, not the `omen_warehouse_read` LOGIN principal required by the
backtest. Therefore the real restored-warehouse run remains `HOLD` until a separately reviewed,
bounded analysis-restore procedure:

1. retains the isolated copy only for the analysis window;
2. provisions `omen_warehouse_read` with only `omen_warehouse_reader` membership;
3. exposes only a local socket or equally private route;
4. captures the backtest evidence; and
5. destroys the temporary restore.

Do not fall back to `postgres`, production data, or a password in argv/environment.

## Branch and publication boundary

- Local branch: `codex/build-12`.
- No remote branch and no upstream.
- No push, GitHub merge, deploy, provider mutation, database mutation or App Store action occurred.
- Projection source is not customer-visible and must not enter `main` while the retained-analysis
  procedure, restored-warehouse results and position/scoring-family decisions remain open.

## Skills and tools

- Skills invoked: `engineering:debug`, `engineering:testing-strategy`; fresh-agent reviews used
  `engineering:code-review` / the repository's `slops-tdd` review posture.
- Repository-routed skills `slops-tdd` and `slops-provider-resilience` were unavailable to the lead
  runtime; existing deterministic tests and governing provider contracts were used as the fallback.
- Tools: Git and GitHub CLI inspection, Node focused tests, repository gates, Xcode focused evidence
  from the delegated ESPN audit, and bounded source/document inspection.

## Next safe step

Keep KVM2 execution on hold. The founder has also deferred ESPN verification until a new beta build
has an install and explicitly resumes that check. Continue the Build 12 scope gate through three
no-install lanes: Trade reliability trace; shared-primitives/provider-honesty certification; and the
Omen-summary plus League completion/canvas audit.
