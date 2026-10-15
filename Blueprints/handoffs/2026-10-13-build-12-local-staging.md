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
- Completed the Build 12 foundation/provider/League/Omen certification and Trade reliability trace.
- Staged the reviewed Trade repair locally: authoritative directory-based viewer identity, own-team
  exclusion, initial and cross-league context isolation, stale-response rejection and honest neutral
  copy. Focused native Trade tests pass 24/24 and final independent re-review is clean.
- Recorded the founder's 2026-10-14 physical-phone Trade walk. Its exact header proves Xcode built
  `main`, not this branch, but the screenshots also confirm the default Trade entry still diverges
  from the approved league-aware canvas and accepts unresolved name-only players.
- Repaired Find's nil-scope race locally: it can recover the directory's authoritative active league,
  distinguishes connected-but-unselected from truly empty, re-resolves when the shell scope lands,
  and offers Connect only for a truly empty directory. Focused `TradeFindFlowTests` pass 14/14.
- Hardened `scripts/install-latest-ios.sh` so an invocation cannot silently jump to another checkout
  and cannot build without that checkout's ignored local configuration. The worktree's ignored config
  link was restored locally without reading or committing its values.
- Removed the retired native ESPN desktop-helper fallback from both iOS and Android. Repeated session
  failures now remain in the current typed native recovery flow; the separate public web guide remains
  available but is not a native destination. Added `native:retired-paths:check` to prevent the old
  states and copy from returning. Focused iOS and Android connection suites pass.
- Designed and reviewed the isolated KVM2 retained-analysis runbook. Its local planning/refusal and
  exact-resource cleanup core is included in the verified warehouse release inventory and passes
  focused tests; the resource-owning receiver/supervisor/reaper is not implemented or installed.

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
- The 2026-10-14 phone follow-up used the repository `run-slops-saloon` QA skill for evidence and
  provenance discipline, plus three bounded read-only agents for canvas, Find and Xcode-checkout
  audits. Their conclusions agreed on the stale checkout and the remaining product gaps.
- The provider-resilience skill named by `Direction/map.md` was not available in this runtime's skill
  catalog; the approved mobile connection contract, ESPN guide, deterministic native suites and a
  new source retirement gate were used as the documented fallback.
- Repository-routed skills `slops-tdd` and `slops-provider-resilience` were unavailable to the lead
  runtime; existing deterministic tests and governing provider contracts were used as the fallback.
- Tools: Git and GitHub CLI inspection, Node focused tests, repository gates, Xcode focused evidence
  from the delegated ESPN audit, and bounded source/document inspection.

## Next safe step

Trade reliability is the Build 12 primary candidate. First promote the connected, roster-backed
builder to the canvas-aligned primary mode and prevent unresolved name-only players from reaching
Compare. Then rebuild from this exact checkout and run the paired-iPhone partner/manual/Find journey,
starting with an already connected Yahoo or Sleeper league. Record ESPN/Yahoo/Sleeper terminal states
before release integration, but keep Rhody's fresh ESPN login deferred until the founder explicitly
resumes it. Keep KVM2 restored analysis on HOLD until the separate receiver/supervisor/reaper
implementation is complete, independently reviewed, and presented as an exact founder-approved host
command packet.
