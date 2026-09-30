# Schema Blueprint — Omen Rebuild (Gate 1, consolidated)

- **Date:** 2026-09-29
- **Status:** Proposed — founder review, then frozen before WO-02 (migration framework). WO-06/07/08 build from this.
- **Review fixes applied 2026-09-29 (founder-approved):**
  1. `leagues` uses a surrogate uuid PK + UNIQUE(provider, provider_league_id, season); `league_memberships` keys on `(user_id, league_id)` (drafts disagreed; consolidation decision now reflected in all DDL).
  2. `decisions.confidence` is `confidence_pct smallint 0–100` per the founder lock; band derived at read time (thresholds proposed, founder to confirm).
  3. `decision_outcomes` single-transition rigidity documented as design intent (post-resolution revision impossible).
  4. `user_actions` gains `updated_at` (it is the one mutable table).
  5. `trade_shares` gains a proposed `validate_share_payload()` trigger backstop (WO-13/14 finalizes + pgTAP test).
- **Detail drafts (full DDL lives here):**
  - `gate1/schema-identity-access.md` — identity & access (10 tables)
  - `gate1/schema-football-core.md` — football core (10 tables)
  - `gate1/schema-decisions-ledger.md` — decisions & ledger (7 tables)
- **Derives from:** 11 domain invariants, the decision envelope, all 32 screen contracts, current-schema evidence.
- **Rules:** Postgres 17, plain Postgres + RLS only (no vendor lock-in beyond RLS/Auth), non-nullable ownership on every user row, one migration per table.

## The shape of the new database

### A. Identity & access — who the human is (10 tables)

| Table | What it is |
|---|---|
| `users` | The ONE identity. `id` **is** the Auth user id — the app never mints ids. Email lives in Auth only. Ends the split brain. |
| `user_identities` | Which providers the human signed in with (Email/Google/Apple/Discord/Passkey), one row each. |
| `user_devices` | Push tokens per device — one human, many devices. Replaces the single `push_token` column. |
| `platform_connections` | The OAuth grant: user × provider account. Vault secret UUIDs only, never secret values. Full user CRUD (fixes today's SELECT-only gap). |
| `leagues` | One row per real league, shared across followers. Surrogate uuid PK; `UNIQUE(provider, provider_league_id, season)`. Backend-owned reference data. |
| `league_memberships` | Which leagues the human follows: `(user_id, league_id)` + `team_name` (the single canonical team-name field — a team name belongs to a league, not a human) + `is_active`. Per-row DISCONNECT deletes a membership. |
| `consent_records` | FK retargeted to canonical users, NOT NULL. Service-role writes only. |
| `oauth_state` | NOT NULL owner, 10-minute TTL default, service-role only. |
| `waitlist_signups` | Schema unchanged; RLS = anon INSERT only (principled pre-auth exception). |
| `deletion_audit_log` | Unchanged — one-way hash only, the post-delete proof. |

Delete/export semantics defined per table from the Account contract (`user-export.v1`, `user-delete.v1`): export excludes all secret references; delete cascades user data, revokes provider grants, deletes Vault secrets (DB cascade alone is not deletion).

### B. Football core — the game itself (10 tables)

| Table | What it is |
|---|---|
| `players` | The ONE player identity: `omen:player:<slug>`. No user data here. |
| `player_provider_ids` | Sleeper/ESPN/Yahoo/**nflverse** ids point AT the canonical id, never the reverse. |
| `seasons` | Explicit season boundaries; `current_week`/`is_offseason` maintained by a scheduled job. Clients never compute "what week is it." |
| `league_scoring_configs` | Per-league-per-season scoring as data (never assumed). `config_hash` so decisions can cite exactly which config they used. |
| `league_scoring_rules` | Normalized per-stat rules under a config. |
| `league_roster_slots` | Roster construction (QB/RB/WR/TE/FLEX/…/BENCH/IR). |
| `roster_snapshots` | Point-in-time roster reads with `read_at` and `live`/`cached` labeling. History kept, never overwritten. Makes "no trade read without rosters" provable and decisions reproducible. |
| `roster_entries` | Players in a snapshot, in slots, referencing canonical player ids. |
| `league_scarcity_weights` | Shape-only in v1; population deferred to the VORP work. |

(`leagues` itself is defined in domain A; football core references it.)

**League Office (7 `league_office_*` tables): KEEP as-is.** They're the League Office feature store, not football core. One flag carried to WO-06: the weekly-message migration re-keyed awards/lines uniqueness to league-scoped (dropping `user_id`); reconcile with single-identity there.

### C. Decisions & ledger — what Omen said and what happened (7 tables)

| Table | What it is |
|---|---|
| `decisions` | One IMMUTABLE row per decision: the envelope as columns — `as_of`, `expires_at`, `snapshot_ref`, model id+version, call index, lock time, verdict, `CONFIDENT`/`LEAN`/`NO_CALL`, limitations, degraded flag. CHECK: `expires_at > as_of` (no stale all-clears). |
| `premises` | Every factual claim names its source: `(decision_id, claim, source, source_as_of)`. |
| `decision_inputs` | What the model consumed: canonical player ids, scoring config ref, roster snapshot ref (with mandatory `as_of`). |
| `user_actions` | The ONE mutable table: followed / declined / starred / noted. Absence of a row = unknown, never "did not follow." |
| `decision_outcomes` | `pending` → `win`/`loss`, exactly one transition, enforced by trigger. Raw win/loss stored; render mapping stays in API code. |
| `ledger_entries` | The immutable published receipt: `{decision_id, as_of, snapshot_ref}` + named blind spots, denormalized so the Ledger index renders receipts by construction. |
| `trade_shares` | 30-day expiring share links: unguessable hash, anon-readable while unexpired, payload must contain no provider data and no auth, names off by default. |

Immutability is enforced twice: RLS (no mutation policies) + `BEFORE UPDATE OR DELETE` trigger, because `service_role` bypasses RLS. The trigger is the real backstop.

**Deliberate non-tables:** no `waiver_claims` (recommendations are decisions; claims happen in-provider and are unverifiable), no proposed-trades table (ephemeral client state), no stored waiver deadline (computed at read time; storing it risks serving a stale one).

## Reconciliations made in consolidation

1. **One `leagues` table.** Identity draft used composite PK `(provider, provider_league_id)`; football-core used surrogate uuid + `UNIQUE(provider, provider_league_id, season)`. Chose the surrogate (FK-friendly for scoring configs and roster snapshots). Membership join is named `league_memberships` (carries `team_name` + `is_active`; the Account screen's CONNECTED LEAGUES rows).
2. **Season in league identity.** Provider league ids are often season-scoped, but not always — `season` is in the uniqueness constraint, not the PK. If a provider ever reuses ids across seasons, promote it.
3. **`platform_connections.league_id` is dropped** (identity draft), not kept as an active-league pointer (football-core's suggestion). I3: active league is client app state. No server-side active-league column anywhere.
4. **`user_id` FKs land in WO-06.** Decisions/ledger tables carry `user_id uuid NOT NULL` now; the FK to canonical `users(id)` is added by the identity-unification migration.
5. **League Office stays out** of the football-core migrations; its scoping question is WO-06's to answer.

## Migration order (one file per table, dependency-ordered)

**WO-06 identity:** users → user_identities → user_devices → platform_connections → leagues → league_memberships → consent_records → oauth_state → waitlist_signups → deletion_audit_log → (add `user_id` FKs to decisions-domain tables)
**Football core:** players → player_provider_ids → seasons → league_scoring_configs → league_scoring_rules → league_roster_slots → roster_snapshots → roster_entries → league_scarcity_weights (shape only)
**WO-07 decisions:** decisions → premises → decision_inputs → user_actions → decision_outcomes → ledger_entries → trade_shares (+ `moves` data migration per WO-07)
**Unchanged:** the 7 `league_office_*` tables (kept as-is; WO-01 repairs their RLS on the current schema first)

## What the old schema becomes (replacements)

- `public.users` (app-minted UUID, email, team_name, platform, league_id, push_token) → `users` + `user_devices` + `league_memberships`
- `public.profiles` → dropped (folded into `users.display_name`)
- `public.platform_connections` (nullable owner, no uniqueness, league embedded) → grant-only `platform_connections` + `leagues` + `league_memberships`
- `consent_records` → FK retargeted, NOT NULL
- `oauth_state` → NOT NULL owner, TTL default
- `waitlist_signups` → unchanged schema, RLS repaired
- `moves` (25 mixed-concern columns) → `decisions` + `premises` + `decision_inputs` + `user_actions` + `decision_outcomes` (every old column mapped; see decisions draft §moves disposition)
- `week_num` → `week`, `platform` → `provider` everywhere (I9)
- `moves.scoring` free-text default 'PPR' → `league_scoring_configs` + `config_hash` cited per decision (I5)
- `moves.target_player` free text → canonical `players(id)` references
- Rosters read-live-and-discarded → `roster_snapshots` + `roster_entries`
- Hardcoded season/week logic → `seasons`

## Forward-thinking checklist (what this buys)

- **Time is stored, not implied.** Decisions carry as-of/expiry; rosters carry read time; shares carry expiry. The database remembers *when* it knew things.
- **The why is stored, not just the what.** Premises with sources and source-as-of; scoring config hashes cited per decision. Auditable a year from now.
- **Evidence is immutable.** Decisions, premises, inputs, ledger entries, shares: insert-only, trigger-enforced. "The evidence as it stood then" is a storage guarantee.
- **Provider-agnostic core.** Canonical player/league ids; provider ids and quirks at the edges. A fourth platform doesn't reshape the database.
- **Portable Postgres.** Nothing vendor-specific beyond RLS + Auth. The schema survives a move off Supabase.
- **No silent defaults.** Scoring, week, ownership, bids — every place the old schema guessed, the new schema requires or forbids.
- **Every change versioned.** One migration per table; fresh database buildable from migrations alone (WO-02 framework).

## Open questions

**Founder-owned — DECIDED 2026-09-29:**
1. **Shared leagues vs per-user copies → SHARED.** One league row per real league; everyone in it follows the same record (`league_memberships`). Decided by Justin. Unblocks WO-02.
2. **Account deletion → FULL WIPE.** Deleting an account deletes everything, including consent records. No legal-evidence retention. Applies at WO-06.
3. **Orphan legacy users → DELETE.** Legacy `public.users` rows that cannot be matched to an Auth identity are deleted, not reconciled. Applies at WO-06.
4. **Confidence → LOCKED 2026-09-29.** Store the numeric confidence (0–100) as `decisions.confidence_pct`; derive the band (CONFIDENT/LEAN/NO_CALL) at read time, never stored. Old `moves.confidence` is already a percentage — no historical mapping needed. Band thresholds PROPOSED (CONFIDENT ≥ 75, LEAN ≥ 50, else NO_CALL) — founder to confirm; WO-07 implements the derivation.
3. **Consent records on delete.** They're legal proof the human consented. Does "delete my account" erase them (cascade) or retain them? Needs a decision, not a default.
4. **Orphan users.** `public.users` rows with no matching login email — delete, or hold for founder review? (WO-06 stop condition.)

**Builder-resolved at work-order time (recorded, not asked):**
- Premise `source` vocabulary (open text unless analytics needs grouping)
- Share-payload validation (pgTAP test or validation function in WO-13/14)
- `superseded_by` product rule (needs a contract line in WO-13)
- `seasons.current_week` updater job ownership
- `oauth_state` cleanup mechanism (pg_cron availability)
- Waitlist dedup + deletion-by-email policy
- Disconnect-last-league grant revocation semantics
- Historical `moves.target_player` fuzzy-match policy (WO-07)
- ESPN cookie storage confirmation (Vault UUIDs only, no raw values)
