# Omen football warehouse v1

**Status:** founder-approved architecture; implementation pending
**Decision date:** 2026-10-04
**Supersedes:** applying redo Step 15 to Supabase

## Decision and boundary

Omen has two deliberately separate data planes.

| Plane | System of record | Contents |
|---|---|---|
| User plane | Supabase | Auth accounts, users, encrypted ESPN/Yahoo/Sleeper secrets and connection state, leagues and memberships, Ledger records, saved trades, consent, deletion, and other user-owned records |
| Football plane | Private PostgreSQL on KVM1 | Rebuildable nflverse identity and football facts: schedules, weekly player/team statistics, weekly rosters, full play-by-play, derived opportunity/efficiency facts, source receipts, and Omen-owned metrics |

No user id, email, credential, league secret, saved trade, consent record, or Ledger record may be
copied into the football warehouse. The API may combine Supabase user context with warehouse football
facts in memory for a request; it must not persist that joined user context in the warehouse.

## Topology

```text
nflverse releases -> Omen cron on KVM1 -> football_warehouse Postgres
                                               |
Supabase user plane -> Omen API on KVM1 <------+
                           |
                       native clients

nightly: football_warehouse -> encrypted backup + manifest -> KVM2
weekly: newest backup -> isolated restore -> schema/count/hash/query checks

Command Center Pi: Uptime Kuma + Beszel + GlitchTip -> availability, telemetry, errors
Steward Pi: independent freshness/readiness/restore witness -> alert dispatcher
Sentinel Pi: KVM1/KVM2 patch, exposure, posture, and auth-event witness
optional: encrypted third backup -> separate durable media; never a Pi-hosted primary database
```

The database has no host port and no public route. Only containers on `omen_network` may connect. API
and cron use a least-privilege role; migration and backup roles are separate. A server-local bootstrap
generates the password into a root-owned file. No password is committed, printed, copied into chat, or
held by an agent.

## Existing fleet integration

The warehouse extends the proven Slops OS fleet instead of introducing a second monitoring stack.
All cross-host checks and transfers use Tailscale addresses and forced-command, least-privilege
identities. Monitoring remains detection and notification only; it never authorizes an automatic
restart, migration, restore, secret rotation, firewall change, or warehouse promotion.

- **Uptime Kuma on Command Center** performs content-aware synthetic checks for Omen's public
  readiness and a private warehouse-aware readiness contract. The public check must distinguish an
  API outage from a warehouse-degraded response.
- **Beszel on Command Center** observes KVM1/KVM2 CPU, memory, disk pressure, the warehouse container,
  API/cron containers, and backup/restore units. It is telemetry, not proof that data is fresh.
- **GlitchTip on Command Center** receives server-side API, cron, ingest, backfill, repository, and
  backup/restore exceptions with secrets and raw source rows scrubbed. Existing issue-based alert
  deduplication remains authoritative.
- **Sentry SaaS** remains the mobile/browser client-error surface. Warehouse failures surfaced to a
  client carry a correlation identifier and honest degraded/unavailable state, never database
  credentials or internal host details.
- **Steward** independently checks warehouse readiness, current-season ingest freshness, newest-backup
  freshness, and the age/result of the last isolated restore. It reads a narrow status export and
  holds no PostgreSQL, Restic, or Supabase credential.
- **Sentinel** extends its existing KVM1/KVM2 patch, public-exposure, host-posture, and authentication
  checks to the warehouse container/unit and expected listeners. The database remains absent from the
  public exposure baseline.
- **Command Center's dispatcher** combines the new states with existing Kuma and unresolved GlitchTip
  signals, alerts only on a changed unhealthy signature, and emits one recovery notification.

The three Pis are independent witnesses, not members of the warehouse data plane. Command Center is
the only Docker-capable Pi; Steward and Sentinel retain native-only agents. Their SD cards are not a
suitable sole third-copy target. A third encrypted copy may use separately provisioned durable media
attached to the Pi fleet after capacity and restore testing.

## Storage model

Source facts remain distinct from derived interpretations.

- `warehouse_schema_migrations`: migration names and checksums.
- `warehouse_ingest_events`: one receipt per dataset/run with rights basis, source URL/ref, SHA-256,
  bytes, rows, time window, state, and sanitized error.
- `football_players` and `football_player_ids`: public football identity and deterministic joins;
  unmatched identifiers are recorded and never guessed.
- `nfl_games`: schedules, results, venue/weather/rest, and lines.
- `nfl_weekly_rosters`: player/team/week roster facts.
- `nfl_player_weekly_stats`: complete sparse stat line plus typed high-use fields.
- `nfl_team_weekly_stats`: complete sparse team stat line plus typed score fields.
- `nfl_plays`: one row per nflverse game/play since 1999, retaining the admitted full row as `jsonb`
  and typed columns required by common calculations.
- `nfl_player_weekly_opportunity`: reproducible red-zone, goal-line, end-zone, deep-target, snap,
  route, and touch summaries.
- `football_metric_runs` and `football_metric_values`: versioned Omen metrics such as Omen quarterback
  efficiency, receiver/rusher efficiency, opponent adjustment, and expected fantasy points. Each value
  names its formula version and input receipts.

Partition `nfl_plays` by season. Index demonstrated access paths: game/play identity,
season/week/team, passer, rusher, receiver, EPA, and source ingest. The full source row supports future
metrics without another historical download; typed columns keep common reads fast.

## Ingest contract

1. Download allowlisted nflverse assets over HTTPS.
2. Hash exact raw bytes before parsing; `source_ref` is `sha256:<64 lowercase hex>`.
3. Validate required columns and season bounds before writing.
4. Use one transaction per dataset/season and a staging table.
5. Validate counts, uniqueness, references, and unmatched thresholds.
6. Upsert source facts by stable keys; never resolve a player by name.
7. Commit the facts and a `succeeded` receipt together. Roll back facts on failure and record a
   sanitized failure separately.
8. Derivations run only from succeeded receipts and write a versioned metric run.

Daily production runs refresh the current season. Historical backfill runs season-by-season from 1999
through 2026, resumes from receipts, and never silently skips a failed season.

## Reads and cutover

Routes use a football repository interface rather than direct Supabase or `pg` calls.

- `supabase`: current Step 14 behavior.
- `shadow`: answer from Supabase while comparing warehouse facts and recording only aggregate
  mismatch/latency diagnostics without user data.
- `warehouse`: answer from the warehouse; fail honestly if unavailable. A narrow Step 14 fallback may
  remain during the observation window.

Promotion requires a complete 1999–2026 backfill, current freshness, no identity guesses, contract
comparison, acceptable p95 latency, a successful KVM2 backup and isolated restore, and proof that a
warehouse outage cannot affect auth, connections, Ledger, leagues, or saved trades. The founder then
approves the mode change.

Step 14 is removed only after an agreed warehouse-primary observation window, mobile beta verification,
and a separately rehearsed and approved Supabase down migration.

## Backup, recovery, and upgrades

- Nightly logical backup after ingest; compress and encrypt before transfer to KVM2.
- Reuse the existing encrypted Restic/SFTP backup path on KVM2 with warehouse-specific tags, manifests,
  retention, and status exports; schedule it so it does not overlap the existing user-plane backup.
- Manifest: Postgres version, schema migrations, receipt high-water marks, table counts, compressed
  size, SHA-256, timestamps, and exit state.
- Explicit daily/weekly/monthly retention limits.
- At least weekly, restore the newest backup into an isolated temporary Postgres on KVM2 and run schema,
  row-count, receipt-chain, and representative-query checks.
- Alert on backup/restore/hash failure, missing or stale backup, stale ingest, disk pressure, or
  warehouse readiness failure.
- A crashed monitor records `DOWN check_crashed`; it must never preserve a stale healthy state.
- Verification combines timer state, container/unit state, content-aware HTTP readiness, data
  freshness, and a real representative query. No single green dashboard proves warehouse health.
- RPO: 24 hours. RTO: four hours. Complete backup loss falls back to nflverse replay; user data is
  never restored into this system.

Minor upgrades require backup plus isolated compatibility restore. Major upgrades require rehearsed
`pg_upgrade` or dump/restore on KVM2 before KVM1 changes.

## Capacity assumptions

- Expected initial corpus: 2–4 GB; reserve 20 GB including indexes, staging, and growth.
- Reported KVM1 headroom: 83 GB disk and 7 GB memory; verify immediately before deployment.
- Reported KVM2 headroom: 77 GB disk; verify before retention is enabled.
- Start on PostgreSQL 17, a 2 GB memory cap, conservative pooling, and no published port.

## Non-goals

- Reimplementing Supabase Auth, Vault, RLS, or user-data backups.
- Copying user data into the warehouse.
- Reproducing or naming ESPN's proprietary QBR. Omen publishes an independently specified metric with
  its own name, formula version, validation, and limitations.
- Using the Raspberry Pi as the primary database.
- Applying Supabase redo Step 15.
- Dropping Supabase Step 14 during initial construction.

## Delivery stages

1. Contract and safety fence: retire Supabase Step 15; land this architecture and warehouse schema.
2. Local proof: Compose database, migrations, fixtures, deterministic ingest, and repository tests.
3. KVM1 staging: generated secret, internal-only network, limits, readiness, recent-season load.
4. Historical backfill: 1999–2026 receipts, counts, hashes, and unmatched reports.
5. KVM2 recovery: encrypted nightly transfer and automated isolated restore proof.
6. Shadow reads: production still answers from Step 14 while comparison evidence accumulates.
7. Warehouse primary: founder-approved flag change and monitored rollback window.
8. Step 14 retirement: separate Supabase order after the observation gate.

Revisit sizing and topology if the corpus exceeds 20 GB, route p95 misses budget, ingest misses its
window, KVM1 pressure threatens the API, a second API host is added, or a licensed source is admitted.
