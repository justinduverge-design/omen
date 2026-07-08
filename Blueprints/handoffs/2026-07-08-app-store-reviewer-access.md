# Handoff — Phase 4.20c: Reviewer / demo access documentation

**Date:** 2026-07-08
**Branch:** `claude/omen-kickoff-439aq7` (local — not merged/deployed; branch was restarted from `origin/main` after Phase 4.20a's squash-merge as PR #91/`9506ea5`)
**Status:** Complete locally, pending review/merge.

## What Changed

Added `Blueprints/playbooks/app-store-reviewer-access.md`, answering the sprint item's exact question: how does an Apple/Google reviewer see Omen working without a real Yahoo/Sleeper/ESPN connection?

**The answer is the existing public `/demo` route** (`frontend/src/pages/Demo.jsx`, `src/routes/demo.js` → `src/services/demoMode.js`). It requires no auth, no Supabase session, no platform connection, and no LLM call, and renders a genuinely computed (not static) start/sit recommendation — the real lineup optimizer fed a deterministic 12-player fixture roster. The playbook documents:

- A step-by-step flow for reaching it.
- `/trade` and `/draft` as secondary, also-public, always-populated surfaces for showing more tool breadth (both clearly labeled mock/preview via the shared `MockBanner`).
- An explicit "what not to do" section: don't attempt to complete onboarding without a real platform connection (there is no bypass — `Onboarding.jsx`'s `ConnectStep` has no skip option and no seeded demo backend account exists), don't rely on dev-only `?fixture=...` params (stripped from production builds via `import.meta.env.DEV` gating), and don't present `/demo`'s fixture data as a real connected league.
- A QA checklist a second person/agent can follow cold, satisfying the sprint item's done-when.

Also added a one-line index entry to `Blueprints/playbooks/README.md`, matching the existing numbered-list format.

## Verification

**Root `npm ci` fails in this sandbox** on a pre-existing lockfile/dependency mismatch (`npm error Missing: gcp-metadata@7.0.1 from lock file`), unrelated to this change and not fixed here (a `package-lock.json` edit is outside this task's scope and off-limits without approval). This blocked booting the full backend server for a live click-through of `/demo`.

**Substituted verification, disclosed rather than silently skipped:**
- Read `frontend/src/pages/Demo.jsx`, `src/routes/demo.js`, and `src/services/demoMode.js` directly and confirmed every claim in the playbook against the actual source (route registration in `frontend/src/routes/index.jsx`, the no-auth/no-Supabase/no-LLM header comment, the exact `DemoBanner` default text, the `TradeAnalyzer.jsx`/`DraftAssistant.jsx` `MockBanner` message strings).
- Executed `buildDemoModeResponse()` directly via `node -e "require('./src/services/demoMode.js')..."` — this module only depends on `./optimizer` (no Express/Supabase/LLM dependency), so it runs standalone even without a full `node_modules` install. Confirmed `state: "success"`, `contract_version: "omen-demo.v1"`, and `demo_notice` text matching exactly what the playbook documents.
- Confirmed via `frontend/src/pages/TradeAnalyzer.jsx` that the "Buy Low" mock section renders from a static local import (`frontend/src/data/tradePulse.js`), not a network fetch — so it's genuinely always-populated with no login, independent of backend availability.

## Discovered, Not Fixed (out of scope for this task)

- **`Blueprints/demo-mode.md`'s status line is stale.** It reads "Backend contract deployed; frontend `/demo` implementation pending," but the frontend has been implemented since Phase 2.7 (2026-06-19, per `Blueprints/done/LEDGER.md`). Left uncorrected since this task's scope was "new playbook file" only; filed as a small follow-up in `Direction/agent_inbox.md`'s refreshed Top 5.
- **Root lockfile drift** (`gcp-metadata@7.0.1` missing from `package-lock.json`) blocks `npm ci` and therefore any full local backend boot in this sandbox. This also explains why `npm test` at the repo root has consistently shown ~70 pre-existing `MODULE_NOT_FOUND` failures across recent sessions (confirmed unrelated to any of this session's changes via `git stash` comparison in the prior Phase 4.20a work). Not fixed here — a lockfile edit needs its own scoped task and explicit approval.

## Done Docs

No Done-type gates apply in the usual sense — this is a doc-only playbook with no app code, UI, or data-flow change. Security-privacy-evidence judged N/A: the playbook documents an existing, already-reviewed no-auth route; it introduces no new data flow, consent boundary, or retention change.

## Skill Receipt

```
Task: Phase 4.20c — Reviewer / demo access documentation
Change type: Documentation (new playbook)
Skills invoked: slops-context-markdown (playbook authoring, matching espn-recovery.md house style), pre-build-research (verified /demo, /trade, /draft, and dataMode behavior against source before writing claims), slops-git-flow (branch restart from origin/main post-squash-merge, scoped commit/push/PR)
Conditional skills considered but not applicable: slops-ui-ux-audit / slops-ux-copy (no app UI or in-app copy changed); security-privacy-evidence (documents an existing, already-reviewed boundary, introduces nothing new)
Evidence: buildDemoModeResponse() executed directly (state: "success", matching documented banner/notice text); route registrations confirmed by direct read; playbook QA checklist itself is the artifact a second agent can follow cold
Procedure gap found: root npm ci fails on a pre-existing lockfile mismatch (gcp-metadata@7.0.1), blocking live backend verification in this sandbox — not fixed here, needs its own scoped task
```

## Known Gaps

- No live server click-through of `/demo`/`/trade`/`/draft` was performed — substituted direct source verification and isolated function execution (see above). If a future session has a working `npm ci`, a real screenshot pair would be a nice-to-have but is not required by this task's done-when (file exists + a second person/agent can follow it cold).
- `Blueprints/demo-mode.md`'s stale status line and the root lockfile drift are both carried forward as follow-up items, not silently closed.

## Next Step

Per the refreshed `Direction/agent_inbox.md` Auto-Populated Top 5, the next unstarted item is **Phase 4.20d — Store metadata, privacy-label, and gambling/DFS copy audit (P1)**: grep + hand-review public copy (Landing, `/about`, onboarding, account-connection) for wagering language and unqualified "live" claims not paired with the Phase 4.16 packet's Platform Attribution Snippets disclaimer.
