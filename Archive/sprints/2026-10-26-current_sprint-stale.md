# Omen current work list

**Rebuilt:** 2026-10-25 from repo state, open PRs, the build packages and recall (the 2026-10-12 file is
archived at `Archive/sprints/2026-10-25-current_sprint-stale.md`; its READY items were not re-verified and
are not carried unless listed here). States: `Direction/status-model.md`. A pin in
`Direction/agent_inbox.md` wins. One lane per session, each in its own worktree; at most two lanes run
locally on the Mac, the rest in the cloud.

## Lane 1: finish Build 12 (founder-gated)

### B12-WALK — final signed build on the founder's iPhone, screen and accessibility walk

- **Status:** READY (needs the founder's phone)
- **Why:** last open gate in `Direction/release/builds/build-12.md` → Status. PR #770 (screen rebuild)
  merged 2026-10-23, so the walk is against main at or after 2cd05f1f.
- **Done when:** the walk passes on device with unfiltered accessibility, recorded in the build package.

### B12-TESTFLIGHT — upload the proven archive

- **Status:** BLOCKED by B12-WALK. Store action: founder only.
- **Done when:** the archive that passed the walk is on TestFlight and the package says so.

### B12-RECORD — bring the Build 12 package up to date

- **Status:** READY
- **Why:** the package still calls the screen rebuild "not yet merged" (it merged 2026-10-23), and one
  main deploy failed on 2026-10-25 (run 40197332141) before the next one went green.
- **Done when:** the status block matches main, and the deploy failure is explained in one line.

## Lane 2: environments (Valor-Core brief `environments`)

### ENV-OUR-WAY — environments encode how we work

- **Status:** IN_PROGRESS
- **Claim:** Claude, 2026-10-25
- **Evidence so far:** branch `env/our-way` (AGENTS.md as the shared truth, thin adapters, `.claude/`
  settings, hooks, reviewer, `.mcp.json`, `scripts/merge-pr.sh`, `no-pii-outbound`, `closeout`,
  `cloud-setup.sh`, build-package workflow).
- **Done when:** the brief's "Done means" list is met, including one proof task per runtime.

## Build 13 prep (no scope commitment: Build 13 stays an inventory until Build 12 ships and first feedback is in)

### B13-EVIDENCE-DATES — refresh provider-capability evidence dates

- **Status:** READY
- **Done when:** each provider-capability claim in `Direction/release/builds/build-13.md` carries a
  re-checked date or is marked unverified. No new scope.

### B13-ESPN-NEW-ACCOUNT-PREP — script the new-ESPN-account proof

- **Status:** READY
- **Done when:** a checklist exists for the fresh-login proof (consent copy, return path, ingestion of every
  league) ready to run when a new tester connects. Nothing is changed in the app.

## Open PRs (dependency bumps, founder merges via `scripts/merge-pr.sh`)

- #778 production-dependencies, #726 frontend-runtime, #666 development-tooling.
