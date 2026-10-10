# Tuesday beta readiness — football warehouse

**Written:** 2026-10-04. **Target:** Tuesday, 2026-10-06 beta update.
**Status (updated 2026-10-10):** warehouse live in shadow, backed up and monitored; shadow comparison and physical-device proof remain open. See §2. Carried forward to the 2026-10-13 beta.
**Authority:** this file is a readiness record and execution checklist. It does not authorize a deploy,
host mutation, production SQL, feature-flag change, merge, or release.

This file carries the football-warehouse work forward without rewriting the historical
`Direction/2026-09-29-tuesday-readiness.md`. The September 13 native canvas remains the visual
authority; this checklist records the evidence required before calling its football-data paths ready.

The Tuesday goal is deliberately smaller than the completed warehouse program. Tuesday readiness
means a private, recoverable PostgreSQL 17 instance on KVM1 with current-season football data,
observable failure behavior, shadow-only API comparison, and a real physical-iPhone beta proof.
It does **not** mean the historical corpus, play-by-play metrics, warehouse-primary cutover, or
Supabase Step 14 retirement are complete.

---

## 1. Scope boundary

### Minimum for Tuesday

1. PostgreSQL 17 runs privately on KVM1 with no published host port and a server-generated secret
   that no agent reads, prints, or copies.
2. The committed warehouse migration is applied and verified on that private instance.
3. At least the current 2026 `stats_player` dataset is admitted through the strict source adapter and
   transactional writer, with a succeeded receipt, exact-byte SHA-256, row counts, schema fingerprint,
   unmatched report, and representative player-week query.
4. An encrypted backup reaches KVM2 and the newest backup passes one isolated restore test.
5. The API can query the warehouse over the internal Docker network in **shadow** mode. Supabase Step
   14 remains the customer-serving answer and fallback during the observation window.
6. The beta path is exercised on Justin's paired physical iPhone with real authentication, a real
   connected league, a real route, and real persisted data, compared in dark mode to the relevant
   September 13 canvas contract.
7. Warehouse failure is honest and contained: auth, provider connections, leagues, Ledger, and saved
   trades continue to work; the client receives a bounded degraded/unavailable state rather than
   fabricated football facts.

### Explicitly later

- Full 1999–2026 season-by-season backfill.
- Full play-by-play ingestion and play-derived opportunity/efficiency metrics.
- Games, weekly rosters, team weekly statistics, snap counts, and all remaining independently
  receipted source families unless a Tuesday screen strictly requires one.
- Warehouse-primary API mode.
- Activation of Omen-owned quarterback, receiver, rusher, opponent-adjustment, or expected-fantasy-
  points metrics.
- Supabase Step 14 retirement. Its down migration remains a separately rehearsed and founder-approved
  production order after an agreed warehouse-primary observation window.
- Any application of Supabase redo Step 15. Step 15 is superseded by this warehouse and must not be
  applied to Supabase.

---

## 2. Current truth — updated 2026-10-10 (for the 2026-10-13 beta)

**Carried forward.** The Oct 6 beta ended with this file's boxes unticked, so nothing below is claimed from
that day. Statuses come from the 2026-10-09 handoffs and the 2026-10-10 takeover session; "unverified"
means nobody re-checked it this session. Gates F and G are the ones that decide whether users get a
better beta, and both are still open.

| Gate | Item | Status 2026-10-10 | Evidence or gap |
|---|---|---|---|
| A | Foundation merged, protected files unchanged | **DONE** | #577 merged `e5f11632`; Batches A–C merged (#587–#597); no protected decision-engine file touched |
| B | Private PostgreSQL 17 on KVM1 | **DONE** | healthy, no host port, `omen_football_warehouse`; handoff 2026-10-09 |
| C | Real 2026 current-season ingest | **DONE, daily** | `omen-warehouse-ingest.timer` 11:15 UTC; 2026 current through week 5; per-run receipts in `warehouse_ingest_events` |
| C+ | Play-derived opportunity and first Omen metric (code) | **MERGED, NOT RUN** | #595 opportunity writer, #596 RAT-QB v0; no caller, no production run, not wired into the app |
| D | Encrypted KVM2 backup and isolated restore | **PROVEN, SCHEDULED** | manual backups and a manual restore proof passed 2026-10-10; nightly (KVM1 12:30 UTC) and weekly (KVM2 Sun 14:00 UTC) timers enabled, **first scheduled runs due 2026-10-11** |
| D | Recovery duration against the four-hour RTO | **NOT MEASURED** | |
| D | Retention policy `7 4 3` | **PROVISIONAL** | fix `--group-by host,tags` is merged (#597) but not live: needs a new release on KVM1 |
| E | Beszel on all five hosts, Discord alerts | **DONE** | handoff 2026-10-09 |
| E | Kuma monitors for ingest and nightly backup | **DONE** | ingest #7; backup #8 proven `Up` with a real run 2026-10-10 |
| E | Weekly restore-proof heartbeat | **NOT DONE** | its failures are silent; needs a monitor and a push in the script |
| E | GlitchTip/Sentry correlation, Steward, Sentinel, forced checker-crash `DOWN`, changed-signature alert | **NOT DONE / UNVERIFIED** | `pi-watchdog` scripts not installed; the `down` path never fired on purpose |
| F | API shadow reads | **ENABLED, NOT PROVEN** | `FOOTBALL_DATA_MODE=shadow` on KVM1; **no real Start/Sit request has produced a comparison event** |
| F | Warehouse outage leaves auth, leagues, Ledger, trades working | **NOT TESTED** | |
| G | Physical-iPhone proof of warehouse-backed screens | **NOT RUN** | simulator or fixture evidence does not count |
| G | Device walk of every beta screen on current `main` | **NOT RUN SINCE 2026-10-01** | Oct 1 walk found 3 P0 and 4 P1; closure of each is **UNVERIFIED** (see `2026-10-01-device-walk-1.md`) |
| — | Warehouse-primary mode, 1999–2025 backfill, Step 14 retirement | **NOT STARTED** | intentionally later (§11) |

### Open items from the Oct 1 device walk, closure not re-checked

- Contract drift: numeric `quality.confidence` broke every Omen call (fixed in #504; whether a live
  `football_intelligence` fixture was added is **unverified**).
- One league per platform saved server-side, with duplicate rows, so most leagues cannot get a call
  (belongs to the connections redesign).
- "Nothing to recommend" on a league where the engine finds a swap locally: reproduction **open**.
- Command and League disagreed on waivers; Find-a-trade entry point undecided; lag measured at ~2 s after
  #507 with no cache; scoring held, so Ledger rows read Pending.

No status in this table implies production application. “Verified locally” is not “deployed,”
“reachable,” “serving,” or “physically verified.”

---

## 3. Gate A — branch, review, and deploy preconditions

**Pass condition:** the exact candidate is reviewable, mergeable, green, and its production prerequisites
are current. Passing this gate does not authorize deployment.

- [ ] Record candidate branch: `codex/football-warehouse-foundation`.
- [ ] Record candidate commit SHA: `________________`.
- [ ] Record PR URL and latest reviewed head SHA: `________________`.
- [ ] Record mergeability against current `origin/main`: `________________`.
- [ ] Record required test command, count, result, and artifact/log URL: `________________`.
- [ ] Confirm protected decision-engine files are unchanged:
  `decisionBriefV2.js`, `decisionContext.js`, `systemContracts.js`, `llm.js`.
- [ ] Confirm current `main` Deploy workflow is green immediately before the infrastructure window.
- [ ] Record Deploy run URL, head SHA, conclusion, and completion time: `________________`.
- [ ] Record production image/version before the change: `________________`.
- [ ] Record the separately approved production action and approver/time: `________________`.

**Stop if:** the reviewed head differs from the candidate, required checks are red or absent, the branch
is not mergeable, Deploy is not green, a protected file changed, or the exact host action lacks approval.

---

## 4. Gate B — KVM1 private PostgreSQL 17

**Pass condition:** PostgreSQL is healthy, private, least-privileged, persistent, and does not threaten
the existing API/cron workload.

### Read-only preflight evidence

- [ ] KVM1 free disk bytes and capture time: `________________`.
- [ ] KVM1 available memory bytes and capture time: `________________`.
- [ ] Existing Docker networks and intended network name: `________________`.
- [ ] Existing listeners and explicit proof no PostgreSQL host port is required: `________________`.
- [ ] Existing API/cron container health and image: `________________`.
- [ ] KVM1 -> KVM2 private/Tailscale reachability: `________________`.
- [ ] Volume path, backup staging path, and capacity calculation: `________________`.

### Creation and verification evidence

- [ ] Secret generated on KVM1 into the documented root-owned `0600` secret file; record path and mode,
  never the value: `________________`.
- [ ] PostgreSQL image digest and major version (`17`): `________________`.
- [ ] Compose project/container/volume/network names: `________________`.
- [ ] Proof of no published database port: `________________`.
- [ ] Resource limits and observed steady-state CPU/memory/disk: `________________`.
- [ ] Migration name/checksum and completion time: `________________`.
- [ ] Least-privilege migration, ingest, API-read, and backup role tests: `________________`.
- [ ] Schema verification result: `________________`.
- [ ] Container restart and persisted-row proof: `________________`.

**Stop if:** a secret is printed or leaves the server, PostgreSQL is publicly reachable, a port/network
collides, free capacity misses the documented reserve, the API/cron becomes unhealthy, roles exceed
their required privilege, the migration/checksum differs, or restart persistence fails.

**Rollback:** disable/remove only the newly introduced Compose service and internal attachment; preserve
the named volume and evidence for diagnosis. Restore the prior API/cron configuration. Do not delete the
volume, rotate unrelated credentials, or change Supabase.

---

## 5. Gate C — real current-season ingest

**Pass condition:** one real 2026 `stats_player` source is admitted by the same validated adapter/writer
used in local proof, with no identity guess and no silent partial success.

- [ ] Dataset and season: `stats_player / 2026`.
- [ ] Exact allowlisted source URL: `________________`.
- [ ] Retrieval time, HTTP status, content type, and raw bytes: `________________`.
- [ ] `source_ref` exact raw-byte SHA-256: `________________`.
- [ ] Ordered source-column fingerprint: `________________`.
- [ ] Source rows / staged rows / committed rows: `____ / ____ / ____`.
- [ ] Matched rows / unmatched rows / unmatched ratio: `____ / ____ / ____`.
- [ ] Unmatched public GSIS identifiers artifact: `________________`.
- [ ] Succeeded `warehouse_ingest_events` run ID and completion time: `________________`.
- [ ] Duplicate key, season-bound, reference, and receipt checks: `________________`.
- [ ] Representative known player-week key, typed values, and source comparison: `________________`.
- [ ] Unchanged-source replay result: `________________`.
- [ ] Sanitized error-capture proof from a controlled failed run: `________________`.

**Stop if:** the URL is outside the allowlist, bytes/hash/schema do not match the receipt, any row crosses
season bounds, duplicate keys exist, a player is name-matched or guessed, unmatched ratio exceeds the
fixed admitted threshold, row accounting differs, the receipt and facts do not commit atomically, or a
known player-week differs from the source.

**Rollback:** stop the ingest runner, keep the last succeeded receipt and committed dataset/season,
and preserve the failed run's sanitized diagnostics. A failed correction must leave the prior succeeded
season intact. Do not truncate unrelated facts or edit receipts by hand.

---

## 6. Gate D — KVM2 backup and restore proof

**Pass condition:** the warehouse can be recovered without relying on the live KVM1 database.

- [ ] Backup start/end time and non-overlap with the user-plane backup: `________________`.
- [ ] Encrypted destination/repository and warehouse-specific tags, without credentials: `________________`.
- [ ] Manifest path: `________________`.
- [ ] Manifest PostgreSQL version and schema migration checksums: `________________`.
- [ ] Manifest receipt high-water marks and table counts: `________________`.
- [ ] Compressed size and backup SHA-256: `________________`.
- [ ] KVM2 isolated restore container/database identity: `________________`.
- [ ] Restore start/end time and result: `________________`.
- [ ] Restored schema/count/receipt-chain/hash results: `________________`.
- [ ] Restored representative player-week query result: `________________`.
- [ ] Isolated restore cleanup proof, naming only the temporary target removed: `________________`.
- [ ] Measured recovery duration against four-hour RTO: `________________`.

**Stop if:** encryption is absent, the manifest is incomplete, a checksum/count/receipt differs, restore
uses or mutates the production volume, the representative query fails, credentials appear in output,
or the newest backup cannot be restored in isolation.

**Rollback:** leave KVM1 untouched, disable the unproven backup schedule, preserve the failed backup and
restore logs, and keep the prior known-good backup chain. No recovery claim is permitted until a new
isolated restore passes.

---

## 7. Gate E — observability and containment

**Pass condition:** independent systems detect outage, staleness, recovery failure, and monitor failure
without receiving warehouse credentials or gaining mutation authority.

- [ ] Kuma public readiness result and warehouse-degraded content assertion: `________________`.
- [ ] Beszel KVM1/KVM2 disk, memory, CPU, database container, and backup/restore visibility: `________________`.
- [ ] GlitchTip controlled sanitized ingest exception issue/event: `________________`.
- [ ] Sentry client degraded-state correlation proof, with no database details: `________________`.
- [ ] Steward freshness, newest-backup age, and latest-restore result: `________________`.
- [ ] Sentinel expected-listener and public-exposure result: `________________`.
- [ ] Forced checker-crash result is `DOWN check_crashed`, not stale green: `________________`.
- [ ] One changed-signature alert and one recovery notification: `________________`.

**Stop if:** any monitor needs a PostgreSQL/backup/Supabase secret on a Pi, a Pi can mutate the warehouse,
raw rows or secrets reach telemetry, stale success survives a checker crash, or public exposure differs
from the expected-listener baseline.

**Rollback:** disable only the new warehouse checks/integration that are noisy or unsafe; retain the
database in private mode and treat readiness as failed until evidence is repaired.

---

## 8. Gate F — API shadow reads

**Pass condition:** production responses remain Step-14-backed while the API compares bounded public
football facts from the warehouse and records only aggregate diagnostics.

- [ ] Repository/route contract and exact candidate SHA: `________________`.
- [ ] Pool limits, connection timeout, statement timeout, and result cap: `________________`.
- [ ] Internal network reachability from API to warehouse: `________________`.
- [ ] `supabase` baseline response fixture/contract result: `________________`.
- [ ] `shadow` comparison sample size, aggregate mismatch rate, and p50/p95 latency: `________________`.
- [ ] Proof no user ID, email, league secret, credential, saved trade, consent, or Ledger data is written
  to the warehouse or shadow diagnostics: `________________`.
- [ ] Warehouse timeout/unavailable response behavior: `________________`.
- [ ] Auth, connection, league, Ledger, and saved-trade checks with warehouse deliberately unavailable:
  `________________`.
- [ ] Feature/config owner, current value, approval, change time, and rollback value: `________________`.

**Stop if:** a shadow result changes the customer response, user-plane data reaches the warehouse,
queries are unbounded, p95 exceeds the accepted budget, identity mismatches are silently reconciled,
the warehouse outage breaks a user-plane path, or an unavailable state is presented as valid advice.

**Rollback:** set the approved mode to `supabase`, stop warehouse queries, keep Step 14 serving, and
preserve aggregate comparison evidence. Do not drop the warehouse or Step 14.

---

## 9. Gate G — September 13 canvas and physical iPhone beta proof

**Pass condition:** each Tuesday beta screen that consumes football facts shows a real, honest state on
the paired physical iPhone and remains faithful to its approved September 13 dark-mode canvas contract.

For every in-scope screen, record:

| Evidence field | Required value |
|---|---|
| Screen and canvas/contract ID | `________________` |
| Build number, commit SHA, and production API version | `________________` |
| Physical device model and iOS version | `________________` |
| Authenticated real account and provider/league type, with private identifiers redacted | `________________` |
| Exact production route and response contract version | `________________` |
| Warehouse-backed fields | `________________` |
| Fields still served by Step 14/provider/Supabase | `________________` |
| Live data receipt/run ID or correlation ID | `________________` |
| Dark-mode physical screenshot/video artifact | `________________` |
| Element-by-element comparison result | `________________` |
| Success/no-data/stale/identity-unresolved/timeout/unavailable behavior | `________________` |
| Provider multi-league selection regression result | `________________` |

**Stop if:** the proof is simulator-only, fixture-only, unauthenticated, uses invented roster or football
facts, cannot identify the serving source, masks an unavailable state, regresses provider selection, or
does not use the production route/data intended for Tuesday.

**Rollback:** disable the warehouse shadow call or remove the affected beta path from the Tuesday build
while preserving Step 14/provider behavior. Do not ship a fabricated success state to match an artboard.

---

## 10. Tuesday release decision

The following are separate decisions and must not be collapsed into one “ready” statement:

| Decision | Required gates | Founder decision / time |
|---|---|---|
| Merge the warehouse foundation | A | `________________` |
| Create the private KVM1 database and load 2026 data | A–E | `________________` |
| Enable API shadow reads for the beta | A–F | `________________` |
| Ship beta screens claiming warehouse-data readiness | A–G | `________________` |

Final evidence must separately record:

- merged commit on `main`: `________________`;
- deployment run and deployed image/version: `________________`;
- production database/schema/receipt state: `________________`;
- physical-device verification artifact: `________________`;
- observation owner and window: `________________`;
- rollback owner and tested command/path, with no secret value: `________________`.

If Tuesday ends with only a subset complete, report the subset exactly. Examples:

- “Warehouse foundation merged” is not “KVM1 database created.”
- “KVM1 database healthy” is not “backup recoverable.”
- “Shadow reads enabled” is not “warehouse serving customers.”
- “Screen renders” is not “physical production route verified.”

---

## 11. Later promotion gates

Warehouse-primary mode remains blocked until all of the following are separately evidenced and the
founder approves the mode change:

- complete expected 1999–2026 dataset/season manifest, with succeeded receipts or explicitly documented
  source unavailability;
- full play-by-play load and streaming-memory safety proof;
- independent receipts for player stats, team stats, games, rosters, snaps, and play-by-play;
- current-season freshness and zero identity guesses;
- versioned, reproducible Omen metric runs with named input receipts;
- acceptable aggregate contract comparison and p95 query latency;
- repeated nightly backups and successful isolated restores;
- monitored rollback window proving a warehouse outage does not affect the user plane;
- physical beta proof after warehouse-primary activation.

Only after that observation window may a separate Step 14 retirement order be prepared, rehearsed,
approved, applied, verified, watched, and independently rolled back. Step 15 remains retired from the
Supabase plan.

---

## 12. Immediate execution order

1. Open/review the foundation PR and pin the exact candidate SHA.
2. Implement and locally rehearse the bounded real-source runner for 2026 `stats_player`.
3. Confirm `main` Deploy is green and perform the read-only KVM1/KVM2 preflights.
4. Obtain the exact infrastructure approval, then create and verify private PostgreSQL 17 on KVM1.
5. Load and verify the real 2026 source.
6. Produce one encrypted KVM2 backup and pass one isolated restore.
7. Install the minimum monitoring and prove the failure/recovery states.
8. Add bounded API shadow reads; keep Step 14 as the serving source.
9. Install the beta build on the paired iPhone and capture real-route/data dark-mode evidence.
10. Record which of the four decisions in §10 actually passed. Carry every other item forward without
    claiming readiness.
