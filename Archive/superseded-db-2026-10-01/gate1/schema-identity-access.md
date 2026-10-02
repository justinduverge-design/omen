# Schema Blueprint — Identity & Access (Gate 1)

- **Date:** 2026-09-29
- **Status:** Proposed — architecture review, then frozen before WO-06 (identity unification).
- **Invariants:** I1 (one canonical user), I3 (provider-scoped multi-connection leagues), I9 (canonical naming), I11 (privacy boundary).
- **Contracts:** SignIn/session.v1, EmailCode (Supabase OTP, not an Omen route), ConnectLeague/platform-provider-state.v1, Account/dashboard-summary.v1 + user-export.v1 + user-delete.v1.
- **Evidence:** `sql/omen_rls_security.sql` (current DDL), `Blueprints/specs/mobile/m4-auth-providers-v1-brief.md` (5 auth providers: Email, Google, Apple, Discord, Passkeys), Account-v1 governing rule ("Export excludes OAuth tokens, ESPN cookies and Vault ids; legacy DELETE MY OMEN DATA remains accepted").
- **Rules honored:** Postgres 17 types; RLS + Auth are the only Supabase-specific features used; ownership columns are non-nullable everywhere a user exists (I1 — no invisible orphans); every table below is creatable by the single migration in §8.

## Design principles

1. **Supabase Auth is the authority.** The canonical `users.id` IS the Auth user id (`auth.users.id`). The app never mints user ids. Email lives in Auth, not in our tables — the current email duplication across `auth.users`/`public.users` with no sync is exactly the drift this kills.
2. **What identifies a human:** one `users` row. How they authenticate (which of the 5 providers) is recorded in `user_identities`, one row per linked provider.
3. **Grants vs memberships are different things.** `platform_connections` = the OAuth grant (user × provider account, holds Vault secret references). `league_memberships` = which leagues the user follows (user × league). The Account screen's CONNECTED LEAGUES list with per-row DISCONNECT is memberships; "+ Add a league" adds one.
4. **Active league is app state** (I3) — no `active_league` column anywhere server-side. Client holds it.
5. **Secrets never touch our tables.** Provider tokens live in Vault; we store only UUID references (`*_secret_id`). Export excludes them by contract.

## Proposed tables

### 1. users — the canonical identity

Replaces `public.users`. One row per human; id comes from Auth.

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY — **equals `auth.users.id`**, no default; app never generates |
| display_name | text | nullable; the single canonical name field (I9) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

- **Dropped from current:** `email` (Auth owns it), `team_name` (moves to `league_memberships` — a team name belongs to a league, not a human), `platform` + `league_id` (single-league columns; I3), `push_token` (moves to `user_devices`).
- **RLS owner column:** `id` itself. Policies: user reads/updates own row; no user-issued DELETE (deletion goes through `DELETE /api/user/delete` with service_role).
- **Contracts:** SignIn/session.v1 (who is signed in), Account (SIGNED IN header, email + provider label come from the Auth session).
- **Delete semantics:** row deleted; Auth user deleted via Auth API.

### 2. user_identities — how the human authenticates (NEW)

One row per linked auth provider. Supabase Auth is the runtime authority; this table is Omen's canonical record (drives the Account screen's "Apple ID" label, delete-time unlinking, support lookup).

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| provider | text | NOT NULL CHECK (provider IN ('email','google','apple','discord','passkey')) |
| provider_subject | text | NOT NULL — the provider's stable id for this human (e.g. Apple `sub`) |
| created_at | timestamptz | NOT NULL DEFAULT now() |

- UNIQUE(user_id, provider, provider_subject). UNIQUE(provider, provider_subject) — one provider account links to one Omen user.
- **RLS owner column:** `user_id` NOT NULL. Policies: user reads own rows; writes via service_role only (populated at sign-in/link time from the verified Auth session).
- **Replaces:** nothing — the split schema had no record of this.
- **Contracts:** SignIn (provider list), Account ("Apple ID" label).
- **Delete semantics:** cascade; provider sessions revoked via Auth API.

### 3. user_devices — one human, many devices (NEW)

Replaces `users.push_token` (a single column breaks the moment a human has iOS + Android).

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| push_token | text | nullable — replaced on re-registration, never shared across devices |
| platform | text | NOT NULL CHECK (platform IN ('ios','android','web')) |
| app_version | text | nullable |
| last_seen_at | timestamptz | NOT NULL DEFAULT now() |

- UNIQUE(user_id, push_token) where push_token is not null (partial unique index).
- **RLS owner column:** `user_id` NOT NULL. Policies: user reads own devices, registers/updates own device; delete own device (per-device sign-out support).
- **Replaces:** `users.push_token`.
- **Contracts:** Account "Sign out" (clears the *local* session — device-scoped; server marks device signed out).
- **Delete semantics:** cascade — all push tokens die with the account.

### 4. platform_connections — the OAuth grant (canonical multi-connection)

Replaces `public.platform_connections`. One row per (human × provider account). Holds **Vault secret references only** — never secret values.

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| user_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| provider | text | NOT NULL CHECK (provider IN ('sleeper','espn','yahoo')) |
| provider_user_id | text | NOT NULL — the human's id on the provider (missing in current schema) |
| token_secret_id | uuid | nullable — Vault secret UUID for the OAuth access token |
| refresh_secret_id | uuid | nullable — Vault secret UUID for the refresh token |
| token_expires_at | timestamptz | nullable — drives refresh |
| espn_secret_id | uuid | nullable — Vault secret UUID (ESPN espn_s2 cookie) |
| swid_secret_id | uuid | nullable — Vault secret UUID (ESPN SWID cookie) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

- UNIQUE(user_id, provider, provider_user_id). (Current schema has no uniqueness — duplicates possible today.)
- **Dropped from current:** `league_id` (moves to `league_memberships`), `is_active` (replaced by membership active state; a grant with no memberships is simply unused — see open question 4).
- **RLS owner column:** `user_id` NOT NULL. Policies: user full CRUD on own rows (fixes today's SELECT-only gap). The `*_secret_id` columns are readable by the row owner — they are opaque UUIDs, useless without Vault access, which is service_role-only. **Export (user-export.v1) excludes all `*_secret_id` columns and token metadata** per the Account governing rule.
- **Replaces:** `public.platform_connections` (adds NOT NULL ownership, provider check, `provider_user_id`, uniqueness; removes `league_id`).
- **Contracts:** ConnectLeague/platform-provider-state.v1 (connection state), Account CONNECTED LEAGUES (via memberships below).
- **Delete semantics:** cascade the row **plus** application-level revocation: delete the referenced Vault secrets and revoke the provider grant. DB cascade alone is not deletion.

### 5. leagues — provider-scoped league registry (NEW)

League identity is `(provider, provider_league_id, season)` (I3), surfaced through a surrogate uuid PK for FK-friendliness. Shared across Omen users — two cousins in one ESPN league share one row.

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() — surrogate; league identity is the unique triple below |
| provider | text | NOT NULL CHECK (provider IN ('sleeper','espn','yahoo')) |
| provider_league_id | text | NOT NULL |
| league_name | text | NOT NULL — display name from provider ("Slops Saloon FF Showdown") |
| season | integer | NOT NULL — provider league ids are often season-scoped |
| synced_at | timestamptz | NOT NULL DEFAULT now() |

- UNIQUE (provider, provider_league_id, season).
- **RLS:** no user owner column (shared reference data). SELECT for authenticated users holding a membership; INSERT/UPDATE via service_role only (app syncs from provider). This is the principled shared-data exception to I1.
- **Replaces:** the implicit league previously embedded in `platform_connections.league_id`.
- **Contracts:** Account (league names in CONNECTED LEAGUES), SwitchSheet/league-directory.v1 (league list).
- **Delete semantics:** rows are never user-deleted; app prunes leagues with no memberships.

### 6. league_memberships — which leagues the human follows (NEW)

The Account screen's CONNECTED LEAGUES rows. Per-row DISCONNECT deletes a membership, not the grant.

| Column | Type | Constraints |
|---|---|---|
| user_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE — part of PK |
| league_id | uuid | NOT NULL REFERENCES leagues(id) ON DELETE CASCADE — part of PK |
| team_name | text | nullable — the human's team in *this* league ("Titans of Slopsilonia"). This is the single canonical team-name field (I9); it belongs to the membership, not the human. |
| is_active | boolean | NOT NULL DEFAULT true — soft-off for hidden leagues |
| created_at | timestamptz | NOT NULL DEFAULT now() |

- PRIMARY KEY (user_id, league_id).
- **RLS owner column:** `user_id` NOT NULL. Policies: user full CRUD on own memberships.
- **Replaces:** `platform_connections` league rows + `users.team_name` + `profiles.favorite_team` (profiles table dropped).
- **Contracts:** Account CONNECTED LEAGUES ("3", per-row provider badge/team/league/DISCONNECT, "+ Add a league"), SwitchSheet (switcher lists memberships).
- **Delete semantics:** cascade.

### 7. consent_records — fixed FK (EXISTING, repaired)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| user_id | uuid | **NOT NULL REFERENCES users(id) ON DELETE CASCADE** — was `auth.users(id)`; now the same id, one identity |
| consent_type | text | NOT NULL |
| granted | boolean | NOT NULL |
| granted_at | timestamptz | nullable |
| withdrawn_at | timestamptz | nullable |
| ip_address | inet | nullable |
| user_agent | text | nullable |

- **Change from current:** FK retargeted from `auth.users(id)` to `users(id)` (identical values post-unification); `user_id` made NOT NULL (was nullable — orphan risk).
- **RLS owner column:** `user_id` NOT NULL. Policies: user reads own records; writes via service_role only (consent is recorded by the app, not self-asserted).
- **Contracts:** Privacy & data surface (Account → "Privacy & data").
- **Delete semantics:** cascade — with the caveat in open question 2.

### 8. oauth_state — minimal, TTL'd (EXISTING, repaired)

Short-lived CSRF + PKCE state for Omen's own provider OAuth (e.g. Yahoo). Supabase-handled providers (Google/Apple/Discord) never touch this table — GoTrue owns those flows.

| Column | Type | Constraints |
|---|---|---|
| state | text | PRIMARY KEY — 32-byte random, URL-safe |
| provider | text | NOT NULL (renamed from `platform`, I9) |
| user_id | uuid | **NOT NULL REFERENCES users(id) ON DELETE CASCADE** — was nullable (orphan risk) |
| code_verifier | text | NOT NULL — PKCE verifier; sensitive, 10-minute life |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| expires_at | timestamptz | NOT NULL DEFAULT now() + interval '10 minutes' |

- **RLS:** no user-facing policies — service_role only. The app server creates/consumes these during the OAuth dance; clients never read them.
- **Cleanup:** rows older than `expires_at` deleted by scheduled job (pg_cron if available, else app-side sweeper — open question 7).
- **Replaces:** `public.oauth_state` (adds NOT NULLs, TTL default, provider rename).
- **Contracts:** ConnectLeague/EspnConnect flows (platform-provider-state.v1, espn-connect.v1).
- **Delete semantics:** cascade; rows self-expire in minutes anyway.

### 9. waitlist_signups — public write, no public read (EXISTING, RLS repaired)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| email | text | NOT NULL — lowercased by the route before insert |
| provider | text | nullable (renamed from `platform`, I9) — which provider the prospect uses |
| created_at | timestamptz | NOT NULL DEFAULT now() |

- **RLS:** anon INSERT only; no SELECT/UPDATE/DELETE for anon or authenticated; service_role reads. This is the principled pre-auth exception to I1 ownership (no human exists yet).
- **Replaces:** `public.waitlist_signups` (schema unchanged; the fix is RLS — WO-01 covers the current schema, this blueprint carries it forward).
- **Contracts:** none (pre-product surface; route `POST /api/waitlist`).
- **Delete semantics:** not user-linked; deletion by email on request — open question 3.

### 10. deletion_audit_log — kept as-is (EXISTING)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| user_id_hash | text | NOT NULL — one-way hash, not the id (I11) |
| deleted_at | timestamptz | NOT NULL DEFAULT now() |
| method | text | NOT NULL DEFAULT 'user_requested' |

- No FK to users (the human is gone — that's the point). Service_role only. This is the post-delete proof that deletion happened, without retaining anything identifiable.

## "Delete my account" — per-table semantics (user-delete.v1)

The Account governing rule also requires: **"legacy DELETE MY OMEN DATA remains accepted"** — the old route string keeps working.

| Table | On delete |
|---|---|
| users | row deleted; Auth user deleted via Auth API |
| user_identities | cascade; provider sessions revoked |
| user_devices | cascade — all push tokens die |
| platform_connections | cascade row + revoke provider OAuth grant + delete Vault secrets (DB cascade alone is NOT deletion) |
| league_memberships | cascade |
| leagues | untouched (shared) |
| consent_records | cascade — see open question 2 |
| oauth_state | cascade (self-expiring anyway) |
| waitlist_signups | not linked — see open question 3 |
| moves / ledger tables | cascade user rows; `deletion_audit_log` keeps the hash only (ledger blueprint owns the detail) |
| deletion_audit_log | INSERT hash row — the only thing that survives |

## Export semantics (user-export.v1)

Per the Account governing rule, export **excludes**: OAuth tokens, ESPN cookies, and Vault ids (`token_secret_id`, `refresh_secret_id`, `espn_secret_id`, `swid_secret_id`, `token_expires_at`). Export includes: profile (`display_name`), identities (provider names only), devices (platform/app_version, no push tokens), connections (provider + `provider_user_id`, no secrets), memberships + league names, moves/ledger history, consent records. Export is generated server-side with service_role and delivered as a file, never rendered in-app.

## What this replaces — summary

| Current | Target | Change |
|---|---|---|
| `public.users` (app-minted UUID, email, team_name, platform, league_id, push_token) | `users` (id = auth id, display_name) | identity unified; email→Auth; team_name→memberships; platform/league_id dropped (I3); push_token→devices |
| `public.profiles` | dropped | folded into `users.display_name` (I9: one name field) |
| `public.platform_connections` (nullable user_id, no uniqueness, no provider_user_id, league_id embedded) | `platform_connections` + `leagues` + `league_memberships` | grant/membership split; NOT NULL ownership; provider check; uniqueness |
| `public.consent_records` → `auth.users` | `consent_records` → `users` | same id post-unification; NOT NULL |
| `public.oauth_state` (nullable user_id, no TTL default) | `oauth_state` | NOT NULL owner; 10-min TTL default; provider rename |
| `public.waitlist_signups` | `waitlist_signups` | schema unchanged; RLS = anon INSERT only |
| `public.deletion_audit_log` | unchanged | — |
| (nothing) | `user_identities`, `user_devices` | new: provider linkage record, multi-device push |

## §8 — Single migration DDL (proposed, not executed)

```sql
-- Gate 1 identity & access schema. Postgres 17. RLS enabled on all tables;
-- policies ship in the companion RLS migration (WO-01 pattern), not here.
create table public.users (
  id            uuid primary key,  -- equals auth.users.id; app never generates
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.user_identities (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  provider          text not null check (provider in ('email','google','apple','discord','passkey')),
  provider_subject  text not null,
  created_at        timestamptz not null default now(),
  unique (user_id, provider, provider_subject),
  unique (provider, provider_subject)
);

create table public.user_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  push_token    text,
  platform      text not null check (platform in ('ios','android','web')),
  app_version   text,
  last_seen_at  timestamptz not null default now()
);
create unique index user_devices_user_token_uidx
  on public.user_devices (user_id, push_token) where push_token is not null;

create table public.platform_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  provider          text not null check (provider in ('sleeper','espn','yahoo')),
  provider_user_id  text not null,
  token_secret_id   uuid,  -- Vault secret UUIDs only; never secret values
  refresh_secret_id uuid,
  token_expires_at  timestamptz,
  espn_secret_id    uuid,
  swid_secret_id    uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, provider, provider_user_id)
);

create table public.leagues (
  id                uuid primary key default gen_random_uuid(),  -- surrogate; identity = (provider, provider_league_id, season)
  provider          text not null check (provider in ('sleeper','espn','yahoo')),
  provider_league_id text not null,
  league_name       text not null,
  season            integer not null,
  synced_at         timestamptz not null default now(),
  unique (provider, provider_league_id, season)
);

create table public.league_memberships (
  user_id           uuid not null references public.users(id) on delete cascade,
  league_id         uuid not null references public.leagues(id) on delete cascade,
  team_name         text,  -- the single canonical team-name field (I9)
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  primary key (user_id, league_id)
);

create table public.consent_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  consent_type  text not null,
  granted       boolean not null,
  granted_at    timestamptz,
  withdrawn_at  timestamptz,
  ip_address    inet,
  user_agent    text
);

create table public.oauth_state (
  state         text primary key,
  provider      text not null,
  user_id       uuid not null references public.users(id) on delete cascade,
  code_verifier text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '10 minutes'
);

create table public.waitlist_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  provider    text,
  created_at  timestamptz not null default now()
);

create table public.deletion_audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id_hash  text not null,
  deleted_at    timestamptz not null default now(),
  method        text not null default 'user_requested'
);
```

## Data migration notes (for WO-06)

- Existing `public.users` rows carry app-minted UUIDs, not auth ids. Match to `auth.users` **by email** (both tables have it). Rows with no auth match are orphans — WO-06's stop condition fires; do not silently drop or invent ids.
- `consent_records.user_id` already points at `auth.users(id)` — these need no remap, only the FK retarget.
- `platform_connections.user_id` points at old app UUIDs — remap through the email match, then split each row's embedded `league_id` into `leagues` + `league_memberships` rows (team name: current `users.team_name` is per-human, not per-league — where a human has several leagues, team_name attribution per league is unrecoverable from current data; default null and let re-sync fill it).
- `profiles.favorite_team` merges into `users.display_name` only if `users.team_name` is null; conflicts go to open review, not silent overwrite.

## Open questions (do not guess — resolve before WO-06)

1. **Orphan users — RESOLVED 2026-09-29 (founder): DELETE.** `public.users` rows with no matching `auth.users` email are deleted, not held for review.
2. **Consent retention — RESOLVED 2026-09-29 (founder): FULL WIPE.** Account deletion cascades through `consent_records`. The only post-delete artifact is the hash-only `deletion_audit_log` row.
3. **Waitlist dedup/deletion:** add a unique index on `lower(email)`? On "delete everything" for a human who never became a user, delete waitlist rows by email match?
4. **Disconnect semantics:** Account per-row DISCONNECT removes the membership. If it's the last membership on a provider grant — revoke the OAuth grant + delete Vault secrets, or keep the grant for one-tap re-add?
5. **Active league store:** I3 says app state. Confirm: purely client-side, no server session table in this rebuild?
6. **beta_reports linkage:** the report composer sends metadata-only reports — if a report references a user, the reports blueprint must define its delete/export behavior.
7. **oauth_state cleanup:** is pg_cron available on the Supabase project, or does the app run its own sweeper?
8. **ESPN "cookies":** the export exclusion names "ESPN cookies" — confirm no raw cookie values are stored anywhere; only Vault UUIDs (`espn_secret_id`, `swid_secret_id`).
9. **League season in identity — RESOLVED 2026-09-29 (architecture review):** `season` sits in the UNIQUE constraint, not the PK. Surrogate uuid PK chosen for FK-friendliness.
