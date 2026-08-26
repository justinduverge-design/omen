# `scripts/` — index

Every operational script in the repo, what it is for, and whether it is safe to just run.

**Read this before writing a new script.** Several of these were written because an earlier
session did not know an equivalent already existed.

## Workspace integrity — run this at kickoff, before writing anything

| Script | What it does | Safe to run? |
|---|---|---|
| [`check-workspace-solo.js`](check-workspace-solo.js) | Answers "am I the only agent in this working tree?" Reports other registered worktrees, any path already dirty at kickoff, and optional HEAD drift mid-session. **Never edits anything.** | Yes — read-only |

```bash
node scripts/check-workspace-solo.js                 # full report + coverage
node scripts/check-workspace-solo.js --json          # machine-readable
node scripts/check-workspace-solo.js --since <sha>   # did the branch move under me?
```

**A clean tree is the kickoff expectation.** Anything dirty when you arrive was put there by
someone else — an unfinished previous session, or a concurrent one still typing. On
2026-08-24 two sessions ran in one checkout: the working branch changed underneath one of
them twice, and a single commit captured two unrelated workstreams because both were dirty
and `git add` swept the lot.

If it reports findings, take your own worktree before writing:

```bash
git worktree add ../omen-<your-task> -b <your-branch> main
```

**Branch discipline alone does not protect you** — `git checkout` carries uncommitted changes
across branches, which is precisely how the two workstreams got mixed.

## Record integrity — run these before closing anything

| Script | What it does | Safe to run? |
|---|---|---|
| [`check-sprint-staleness.js`](check-sprint-staleness.js) | Orchestrator for the record-staleness checks. Flags direction files that disagree with `main`, merged PRs, and GitHub issues. **Never edits anything.** | Yes — read-only |
| [`checks/`](checks/README.md) | The six domain checkers it dispatches to, and the contract for adding a seventh | — |

```bash
node scripts/check-sprint-staleness.js                          # full report + coverage
node scripts/check-sprint-staleness.js --json                   # machine-readable
node scripts/check-sprint-staleness.js --only known-issues-buried
node scripts/check-sprint-staleness.js --limit 200              # look further back
```

**Read the coverage block it prints, not just the verdict.** It states what it did *not*
inspect, and reports "DID NOT RUN" rather than passing when GitHub is unreachable. A clean
result is only meaningful against a stated scope — that is the whole reason it prints one.

Exit code is 1 when there are findings, so it can gate a closeout step. `Blueprints/definition-of-done.md`
and the close-out flow both reference it.

### The six checkers, and the real miss each was built from

| id | Catches | Modelled on |
|---|---|---|
| `sprint-vs-merged-prs` | item open while its key shipped in a merged feat/fix PR | the original seven drift incidents |
| `sprint-cited-prs-resolved` | READY item where every PR it cites is resolved | `S8` — invisible to title matching |
| `handoff-unmerged-claims` | handoff claiming "not pushed" while citing a merged PR | #314 |
| `known-issues-buried` | entry marked OPEN naming no GitHub issue | the four surfaced as #338–#341 |
| `issue-state-conflicts` | wording contradicting a cited issue's state | Yahoo / #308 |
| `known-issues-missing-paths` | entry naming a repo path that no longer exists | `src/omen_gdpr.js` |

Full contract for adding one: [`checks/README.md`](checks/README.md).

## Verification and smoke

| Script | What it does | Safe to run? |
|---|---|---|
| [`smoke-tier2-endpoints.js`](smoke-tier2-endpoints.js) | Hits the Tier-2 endpoints and reports shape/status | Yes against local or an approved target |
| [`verify-sleeper-waiver-pool.js`](verify-sleeper-waiver-pool.js) | Proves the Sleeper waiver pool returns real, correctly-filtered players | Yes — read-only against the provider |
| [`verify-provider-error-capture.js`](verify-provider-error-capture.js) | Proves `O8`'s error capture end to end: provokes a real ESPN adapter failure, then inspects the exact envelope the SDK transmits for credential leaks, provider tag, and a usable stack trace | Yes — one read-only GET to ESPN for a nonexistent league; sends nothing to real GlitchTip |
| [`load-omen-routes.js`](load-omen-routes.js) | Load-tests `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary` at a chosen concurrency, with a distinct simulated IP and credential per client so the S3 rate limits distribute the way they will in production. `OMEN_LOAD_SATURATE=1` does the opposite on purpose and measures the limiter instead. **Refuses a non-loopback target** unless `OMEN_LOAD_ALLOW_REMOTE=1` is set deliberately | Yes — local only by default |
| [`local-load-stack.js`](local-load-stack.js) | Boots the real `src/server.js` against a loopback Supabase stub, runs the load script against it, tears it down. Needed because `/api/dashboard/summary` 401s before doing any work without one — and would reach the configured Supabase host on every request, measuring DNS instead of Omen. Generates no provider traffic | Yes — loopback only; touches no real project |

### Load testing

`O4` ran 2026-08-22; evidence in `Direction/reviews/2026-08-22-o4-hot-route-load-rehearsal.md`,
including how the concurrency numbers were chosen against the S3 rate limits and what a local
run does *not* prove.

```bash
OMEN_LOAD_CONCURRENCY=20 OMEN_LOAD_ITERATIONS=8 node scripts/local-load-stack.js
```

**Never against production.** Requests per client must stay at or below the tightest
per-credential budget in `Blueprints/api-routes.md` (10/min for `mvp-move`), or the run
measures `express-rate-limit` rather than Omen.

## Data and ops

### Football-data Phases 1–3 — local and non-production only

| Script | What it does | Safe to run? |
|---|---|---|
| [`football-data.js`](football-data.js) | Captures fixed, rights-reviewed nflverse `stats_player`, `stats_team`, and `schedules` releases; replays one exact manifest; or builds a four-or-more-week normalization/scoring acceptance artifact from one exact manifest for each dataset. Requires explicit local paths; refuses `/var/lib/omen-football-data`, arbitrary source URLs, unsupported datasets, `latest` aliases, publication, and files over 64 MiB. | Yes — local artifact writes and bounded public release reads only; no credentials, database, timer, production path, or promotion behavior |
| [`validate-football-acceptance.js`](validate-football-acceptance.js) | Read-only independent recomputation of offensive, kicker, and DST results from one exact Phase 2 acceptance artifact, including receipt-hash binding and non-publication checks. | Yes — reads only the two explicit local files and writes its summary to stdout |
| [`football-data-staging.js`](football-data-staging.js) | Stages one receipt-bound Phase 2 artifact into explicit disjoint local primary/witness/backup roles, runs labeled synthetic failure drills, or recovers exact backup bytes into a fresh local primary after witness verification. | Yes — local evidence only; refuses unsafe/overlapping roots and never publishes, deploys, schedules, contacts a remote host, or writes a database |
| [`football-data-readiness.js`](football-data-readiness.js) | Evaluates one sanitized Phase 4 host/infrastructure/A4 evidence document against the exact Phase 3 hash, required roles, seven live alert classes, explicit schedules, correction/recovery proofs, and non-activation gates. | Yes — reads one explicit local JSON file and writes the fail-closed assessment to stdout; never contacts a host, reads a secret, installs a service, activates a timer, publishes, or scores |

```bash
node scripts/football-data.js capture --dataset stats_player --season 2025 --root /tmp/omen-football-vault
node scripts/football-data.js capture --dataset stats_team --season 2025 --root /tmp/omen-football-vault
node scripts/football-data.js capture --dataset schedules --season 2025 --root /tmp/omen-football-vault
node scripts/football-data.js replay --root /tmp/omen-football-vault --manifest /tmp/omen-football-vault/manifests/nflverse-data/stats_player/2025/<exact-snapshot-id>.json --out /tmp/omen-football-replays
node scripts/football-data.js accept --root /tmp/omen-football-vault --player-manifest <exact-player-manifest> --team-manifest <exact-team-manifest> --schedule-manifest <exact-schedule-manifest> --season 2025 --weeks 1,7,14,17 --out /tmp/omen-football-acceptance
node scripts/validate-football-acceptance.js --acceptance /tmp/omen-football-acceptance/<run-id>/acceptance.json --receipt /tmp/omen-football-acceptance/<run-id>/receipt.json
node scripts/football-data-staging.js stage --acceptance <exact-acceptance> --receipt <exact-receipt> --primary-root /tmp/omen-stage/primary --witness-root /tmp/omen-stage/witness --backup-root /tmp/omen-stage/backup
node scripts/football-data-staging.js drill --acceptance <exact-acceptance>
node scripts/football-data-staging.js recover --hash <exact-sha256> --backup-root /tmp/omen-stage/backup --recovery-root /tmp/omen-stage/recovered --witness-observation <exact-witness-observation>
node scripts/football-data-readiness.js assess --evidence Direction/reviews/evidence/2026-08-25-a7b-phase4/host-inspection.json
```

This is A7B local evidence, not a production collector or scoring publisher. Each identical retrieval creates a new observation manifest but reuses the same immutable SHA-256-addressed raw object. Raw replay and scoring acceptance always record `promoted: false`; scoring acceptance also records `publication.authorized: false`. The exact Phase 2 contract is `Blueprints/specs/football-data/omen-football-scoring-acceptance-v1.md`.
The Phase 3 role/recovery contract is `Blueprints/specs/football-data/omen-football-staging-shadow-v1.md`; the operator procedure is `Blueprints/playbooks/football-data-staging-shadow-runbook.md`. Role names model future KVM1/Pi responsibilities but do not prove or mutate those hosts.
The Phase 4 readiness contract is `Blueprints/specs/football-data/omen-football-production-readiness-v1.md`. A blocked assessment is expected until exact-host provisioning, live alert delivery, schedules/supervision, backup/correction/recovery, and A4 no-write evidence all pass. The assessment never authorizes activation.

### Approval-required writers and infrastructure scripts

| Script | What it does | Safe to run? |
|---|---|---|
| [`email-waitlist-backfill.js`](email-waitlist-backfill.js) | Backfills waitlist email records. **Writes data.** | **No** — founder approval per run |
| [`oracle-https-setup.sh`](oracle-https-setup.sh) | Historical Oracle HTTPS setup. **The hosting lane is Hostinger KVM1**, so this is reference only | **No** — infrastructure, and describes a retired lane |
| [`preview-android.sh`](preview-android.sh) | Builds/installs the Android app to a connected device or emulator. **Windows-only as written** — it hardcodes `emulator.exe` / `adb.exe` and an `AppData` SDK path, so it does not run on the founder's Mac, which has been the native verification host since 2026-08-11 | Yes — local only, on Windows |
| [`capture-screenshot-scenario.sh`](capture-screenshot-scenario.sh) | Captures one `ScreenshotScenarios` entry to a PNG on iOS or Android — the on-a-Mac equivalent of `.github/workflows/native-visual-evidence.yml`, which is `workflow_dispatch`-only and uploads to Actions rather than producing a committable file. Takes an optional Android font scale or iOS content-size category. **Refuses to capture unless the Omen window holds focus**, so a cold-boot SystemUI ANR or a TalkBack focus ring cannot be silently committed as screen evidence | Yes — local only |

## Not in this directory, but part of the same toolkit

| Where | What |
|---|---|
| `npm test` | Backend suite — `node --test`, ~7 s, no build step. The fast proof for backend work |
| `npm run evals:validate` | `evals/slops-prompt-guard.mjs --validate` — the SLOPS Prompt Guard local substitute |
| `.agents/skills/run-slops-saloon/` | Puppeteer drivers for screenshots and authenticated route captures. **Read its `SKILL.md` before writing "no authenticated screenshot is possible"** — that gap is solved and generalised |
| `mobile/ios/.../ScreenshotScenarios.swift` and the Android twin | Deterministic screenshot scenarios. Add an entry here plus a matrix row in `.github/workflows/native-visual-evidence.yml` to get a screen into visual evidence |

## Conventions

- **Read-only by default.** Anything that writes data, touches production, or costs money
  says so in its own header and requires approval per run.
- **Never report a false all-clear.** If a script cannot reach a dependency, it says the
  check did not run — it does not print a pass. `check-sprint-staleness.js` is the reference
  implementation of this rule.
- **Never auto-fix a record.** Whether a `Done when:` clause was genuinely met is a human
  call; several items are legitimately held open after merging.
