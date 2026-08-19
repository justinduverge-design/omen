# `scripts/` — index

Every operational script in the repo, what it is for, and whether it is safe to just run.

**Read this before writing a new script.** Several of these were written because an earlier
session did not know an equivalent already existed.

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
| [`load-omen-routes.js`](load-omen-routes.js) | Load-tests `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`. **Tracked as `O4` and has never been run.** | Only against local/staging with approval — never production |

## Data and ops — approval required

| Script | What it does | Safe to run? |
|---|---|---|
| [`email-waitlist-backfill.js`](email-waitlist-backfill.js) | Backfills waitlist email records. **Writes data.** | **No** — founder approval per run |
| [`oracle-https-setup.sh`](oracle-https-setup.sh) | Historical Oracle HTTPS setup. **The hosting lane is Hostinger KVM1**, so this is reference only | **No** — infrastructure, and describes a retired lane |
| [`preview-android.sh`](preview-android.sh) | Builds/installs the Android app to a connected device or emulator | Yes — local only |

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
