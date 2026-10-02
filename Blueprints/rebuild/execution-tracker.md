# Omen Rebuild — Execution Tracker

> **Database work replaced 2026-10-01.** WO-06 is replaced, not applied; WO-07 and WO-08 are retired. The Gate 1 schema blueprints moved to `Archive/superseded-db-2026-10-01/`. Current: `Blueprints/rebuild/omen-database-redo-v1.md`, sprint items `D2`-`D6`.

**Last updated:** 2026-09-29 ~10:35pm EDT

## In flight
- **WO-06 identity unification** — Jules session `12527754210886371955` dispatched 9/29 ~10:35pm (IN_PROGRESS, auto-PR on). Note: first two dispatch attempts 400'd — the CLI `--source` needs the `sources/` prefix (`sources/github/justinduverge-design/omen`); fixed. A stray test session `12137224081359610466` was created during diagnosis and told to stop with no changes. 10:40pm: sent the session a leagues-model clarification (surrogate uuid PK + UNIQUE(provider, provider_league_id, season); join table = league_memberships on (user_id, league_id)). Session COMPLETED ~1:55am; PR #493 "WO-06: Identity unification" open (branch `feature/wo-06-identity-unification-12527754210886371955`). **BLOCKED — DO NOT MERGE:** Codex automated review left 3 P1s ~3:01am: (1) migration deletes split-identity legacy users as "orphans" → cascading permanent data loss instead of remapping to auth identity; fix = re-key owned rows, delete only proven orphans; (2) migrations-ci.yml expectedInventory still asserts platform/league_id on users → CI fails deterministically; (3) migrationIdentity test runs under plain `npm test` with no Postgres → fails every CI run + wrong hardcoded password. Sent all three back to the builder via send-message ~3:56am. Builder picked them up ~4:15am: pushed `3dfbdfc6` "fix(migration): reconcile split identities and update schema assertions" plus earlier CI/test fixes (`6d360b6d`, `25e23b32`). **MERGED 9/30 ~5:48am by Justin** as `3e87f851` ("WO-06: Identity unification (#493)") — checks were still pending at merge; watching main. Gate review skipped (founder merged directly).
- **Gate 1 blueprint review (founder-approved 9/29 ~10:45pm):** all 5 review fixes applied to `gate1/*.md` (leagues surrogate PK; confidence_pct numeric + derived band w/ proposed 75/50 thresholds; outcome-trigger rigidity documented; user_actions.updated_at; trade_shares payload trigger proposed). Publishing the 4 blueprint docs to the repo at `Blueprints/rebuild/gate1/` — DONE 9/29 ~10:45pm: committed directly to main (docs-only, merge authority granted) as 9b08017 + 930354f; verified the 4 .md files live on origin/main. Open: founder to confirm confidence band thresholds (proposed CONFIDENT ≥ 75, LEAN ≥ 50).

## Merged tonight (main @ 04efbae, verified via GitHub API)
- **#486** MERGED (32d2496) — v2 screen contracts with all 19 founder amendments applied. Justin's Mac screen sessions should now build against main's v2 contracts.
- **#488** MERGED (3fa1e9a) — Android CI parity (workflow + allowlist fix).
- **#487** MERGED (9f01338e, 9:26pm EDT) — WO-15 monitoring-hardening docs + Pi hardening (supervised reboots passed on KVM1/KVM2, restart policy enabled, Sentinel checks built). Correction: the 9:55pm hourly update wrongly said #487 was "closed without merging" — the worker's check was stale; it was merged.
- **#489** MERGED (04efbae) — WO-15 follow-up: Pi kernel update runbook, watcher liveness, kernel decision (from the Claude hardening session).

## Open PRs
- None. All four are merged.
**Direction (revised 2026-09-30):** database work belongs to Claude Code / Codex (tickets D2-D4 in `Direction/current_sprint.md`); Jules does non-database code. No production database write happens except through a bounded, founder-approved Claude/Codex order. **WO-07 and WO-08 are HELD** until D2 merges (see `Direction/decision_log.md`).

## Known production issues (from GlitchTip, 9/29 ~9pm)
- **moves.result missing**: app queries `moves.result` but the production `moves` table has no such column → moves lookup errors in prod (GlitchTip #13). App/DB drift — no migration framework. Do NOT hotfix in prod; reconcile in WO-07 (normalize moves) against what the app actually queries.
- **ESPN integration down**: GlitchTip #11 (HTTP 400) + #4 (cookies invalid/expired) — the ESPN cookie session died. ESPN-connected features broken until cookies are refreshed. Maintenance task (reconnect ESPN / refresh cookies on KVM1), not rebuild work.
- Dispatcher correctly flagged both as CRITICAL/DEGRADED via Discord (#nosey) — monitoring is doing its job. Note: the CRITICAL state-change alert fired twice with identical content (~8:20pm) — possible dispatcher re-alert nit.

## Open PRs

- None — all merged (see above).

## Operating model

| Who | Does | Never |
|---|---|---|
| **Jules** (Google sub) | Code and docs work that needs no database: factor functions, the backtest harness (S4, S5), PRs, docs | **Anything database** (migrations, SQL, schema, loaders that write rows, credentials — founder decision 2026-09-30); merges; touching prod; spending Claude/Codex tokens |
| **Claude Code / Codex** (Justin's tokens) | Finishes the work: bounded production execution only (backup fix, cutover one-shot) | Broad unpaused work; anything unprepped |
| **Muse** (no. 2) | Dispatches work orders, gate-reviews, merges only passing PRs, keeps this tracker current | Prod DB writes; production deploys |
| **Justin** | UI/UX on the Mac (against v2 contracts), decisions, approvals | — |

Rules: failed or weakly evidenced work stays out of `main`. Every production order has bounded scope, stop conditions, and `psql -v ON_ERROR_STOP=1`.

## Phase 0 — Architecture ✅ DONE (9/29)

- Gate 0 + Gate 1 complete: 15 bounded work orders in 4 waves, 27-table schema blueprint, 32-screen traceability (all screens exist on iOS + Android), decision envelope, 11 domain invariants.
- WO-02 migration framework merged (PR #480). WO-05 witness hostname fix done. WO-01 wrong-policy package fully reverted (PR #484); the rejected prod apply (PR #481) must never be applied.

## Phase 1 — Production triage 🔄 IN FLIGHT (tonight)

- [x] **WO-15 backup diagnosis (Jules prep)** — PR #485 merged 9/29 ~7:45pm as the repair doc (commit `b3146ac`). The stale-table hypothesis it recorded was **refuted** by the production diagnosis — see the completed fix below.
- [x] **WO-15 backup fix (Claude/Codex, bounded 3-phase order)** — COMPLETED 9/29 ~7:45pm. Justin ran the order. Diagnosis CORRECTION: the stale-table hypothesis was wrong — the script had no `-t` refs to the dropped tables. Real causes: (1) hostname guard hard-coded `srv1737978` → "Wrong host: omen-prod" on every timer run since the VPS rename (~80ms exit, silently failing ~2 weeks); (2) auth enum guard tripped by Supabase adding `recovery_code` to `auth.factor_type`. Both fixed (originals backed up as `.bak-*`). Verified: fresh Supabase backup `AUTOMATIC_OMEN_BACKUP=PASS`, isolated restore into a throwaway postgres:17 container matched source (9/9 SHA256, 15 tables, row counts, 12 RLS policies, 11 FKs). Repair docs merged on main (PR #485, commit `b3146ac`). Open: alert on `omen-supabase-backup.service` failure so it never silently fails again (WO-03 backup-monitoring slice); auth users 12→8 looks like test cleanup, unverified; backup covers public + 3 auth tables only.
- [x] **WO-13 contract v2 amendments (Jules, track 2)** — PR **#486** MERGED 9/29 ~10pm (commit `32d2496`): 32 v2 contracts with all 19 founder amendments integrated, README + validators consuming v2.
- [x] **WO-04 Android CI parity (Jules, track 1)** — PR **#488** MERGED 9/29 ~10pm (commit `3fa1e9a`): android-ci.yml + allowlist fix, tests green.

## Phase 2 — Cutover-critical build ⏳ QUEUED (Jules, 2 parallel tracks)

In dependency order. Each: Jules builds → PR → Muse gate-reviews → merge only on pass.

**Gate checklist (go/no-go, from the cutover runbook — live as of 9/30):** no merge unless ALL are green —
1. Migration rehearsal log: UP → DOWN → UP on scratch, with schema-diff proof that DOWN restores baseline and the second UP is identical (idempotency).
2. Full test suite green on the migrated schema.
3. Backfill/data-migration row counts verified (nothing lost, nothing duplicated).
4. For the second of two parallel tracks to merge: rebased on the first merge + suite re-run green.
Any red = no-go, fixes go back to the builder.

1. **WO-06** identity unification — MERGED 9/30 ~5:48am as `3e87f851` (founder merged #493 directly; checks were pending at merge — watching main).
2. **WO-07** normalize `moves` — session `7525669479906377553` (relaunch 9/30 ~7:35am, IN_PROGRESS, auto-PR, Jules-created branch). Earlier attempts `1612768464440824992` and `15107182612892165078` both FAILED at clone: `fatal: Remote branch feature/wo-07-moves-normalization not found in upstream origin` — passing --branch with a not-yet-existing name breaks the Jules clone; WO-06 worked because Jules created its own branch. Lesson: dispatch without --branch. Scope: moves → decisions/* tables per blueprint + backfill, moves.result drift repaired via the new model (no shim), confidence numeric + derived band (proposed 75/50 thresholds, founder to confirm). Scratch UP/DOWN + green suite required; never merge, never touch prod.
3. **WO-08** canonical names and constraints — session `957600959844049462` (relaunch 9/30 ~7:35am, IN_PROGRESS, auto-PR, Jules-created branch, lane rule: stays out of WO-07's decisions-domain files). Earlier attempt `8583580562930371886` FAILED at clone (same missing-branch cause); first attempt `2331943449286238514` stood down (prompt corrupted by shell backtick interpolation). ~40 min wall clock lost before the clone failures were noticed — now watching sessions directly instead of discovering it late.
4. **WO-09** retire API monolith.
5. **WO-14** real MVP Move implementation (behind existing route; envelope mandatory).

Parallel founder track: **Justin's UI/UX on the Mac**, built against the v2 contracts (not v1, not the old schema).

## Phase 3 — Cutover prep ⬜ NOT STARTED (Jules)

- Migration package for the 27-table target schema, in the defined migration order, rehearsed end-to-end on scratch databases.
- Reversible cutover plan + rollback drill (replaces the still-`ready: false` `o2_rollback_drill`).
- Prepped until the package is boring and provable. Nothing here touches prod.

## Phase 4 — Cutover execution ⬜ NOT STARTED (Claude Code or Codex, one bounded one-shot)

- Apply the rehearsed migration to production Supabase, cut the app over, verify, rollback on any failure.
- Only when Phase 2 + 3 are green. This is the single job that spends Justin's tokens besides the backup fix.

## Phase 5 — Hardening & consolidation ⬜ NOT STARTED (Jules)

- **WO-03** pipeline/backup/fleet monitoring — backup-monitoring slice first (so the next backup failure pages someone instead of going quiet two weeks).
- WO-10 consolidate web frontends, WO-11 consolidate deploy targets, WO-12 separate product code from agent sprawl.
- Parity CI hardened to compare RLS policies/grants, not just tables/columns (WO-02 follow-up).
- `POST /api/waitlist` production smoke test.

## Open questions

- Does Jules get production database credentials / trust? (Justin's sentence cut off 9/29 — asked, awaiting answer.)
- Can Justin's Claude Code reach KVM1 over Tailscale (`omen-prod`)? If not, Muse does the read-only Phase 1 first.
