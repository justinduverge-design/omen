# Database and backend architecture audit — 2026-09-27

**Scope:** founder-authorized "audit the whole database, not just football intelligence," later
widened to "start from zero" on architecture, security, and secondary components. Four parallel
read-only investigations plus direct verification. Nothing in this document has been implemented
except where explicitly marked DONE — this is the design/audit output the founder asked for before
picking what to build next.

**Prior, already-applied pass** (same day, separate from this document): production RLS-policy
consolidation, `anon`-grant closure across 6 tables, 3 missing FK indexes, duplicate index drop, and
two dead tables (`oauth_credentials`, `system_context`) dropped. See `Direction/decision_log.md`
2026-09-27 entry and `sql/2026-09-27_production_hygiene_and_grant_hardening.sql`. That work is done
and verified (`get_advisors` clean, `npm test` 1259/1259) and is not repeated here.

**Product context supplied by the founder mid-audit, binding on the data-model design below:**
- ESPN/Yahoo/Sleeper connections already expose the *whole* real-world league, not just the
  connecting user's own team. A `leagues` entity should therefore be modeled as a genuinely shared
  resource multiple users' `platform_connections` rows can point at — not a per-connection dimension
  table — even though today's fix only needs to close the FK/collision gap.
- More platforms will be ingested later, and Omen may eventually run its own first-party platform.
  The `platform` column must stay an open, validated value, never a hardcoded enum tied to exactly
  three providers. Do not build the full multi-provider abstraction now — just don't foreclose it.

**A contradiction this audit caught and resolved before it could become a bad recommendation:** the
data-model workstream read `src/omen_agents.js`'s `fetchWithLocalFallback` function and called
`local_snapshots` "a documented emergency fallback, keep it." The secondary-components workstream
independently found `omen_agents.js` is never `require()`'d by `server.js`, any cron entry point, or
any Dockerfile — confirmed directly (`grep -rln "omen_agents" src ops .github` returns only a comment
mention in `omen_prompt_loader.js`; not in `package.json`'s `start`/`dev`/`cron` scripts either). **The
fallback code is real but is not wired into anything that runs.** `local_snapshots`'s 0 rows is not
"the fallback hasn't fired yet" — it's "the fallback path is unreachable." This is exactly the failure
shape this repo's own history warns about repeatedly: a plausible, well-written explanation that
wasn't checked against whether the code is actually on a live path. See Decision D3 below.

---

## Priority-tiered findings

### Tier 0 — real, currently-live gaps (not architecture, actual bugs/leaks)

| # | Finding | File | Severity | Fix |
|---|---|---|---|---|
| 1 | ~~OAuth `state` (CSRF token) can reach Sentry/GlitchTip breadcrumbs unredacted.~~ **FIXED 2026-09-27.** Added `OAUTH_STATE_TEXT_PATTERN` to `scrubText`, mirroring `OAUTH_CODE_TEXT_PATTERN`. Regression tests in `test/providerCredentialContainment.test.js` (canary-provoked, per this file's own convention). `known_issues.md` #339 corrected and closed. | `src/middleware/sentry.js` | P1 → closed | Done. |
| 2 | `DELETE /api/waitlist` unsubscribes by email alone, no ownership proof — anyone who knows/guesses an email can remove someone else. | `src/routes/waitlist.js:64` | P2 | Require a verification token (e.g. the same token pattern used elsewhere) before unsubscribe acts. |
| 3 | Several routes hand-build error JSON and echo raw provider error text instead of routing through the scrubbed central error envelope. | `src/routes/yahoo.js:197-202,207,221,224,255,258`, `src/routes/espn.js:71`, `src/routes/sleeper.js:191` | P2 | Route these through `next(e)` / the shared `errorEnvelope.js` path instead of hand-built responses. |
| 4 | ESPN league id isn't validated before URL interpolation. Bounded risk — hardcoded destination host, caller can only affect requests made with their own ESPN credentials — but still worth tightening. | `src/routes/platforms.js:117-133` → `src/adapters/espn.js:549` | P2 | Validate `leagueId` is numeric before use. |
| 5 | ESPN adapter follows redirects with no hostname allowlist, re-sending the user's `espn_s2`/`SWID` cookies to whatever `Location` header ESPN's response carries. Requires a compromised/MITM'd ESPN response to matter — defense-in-depth, not a live exploit path. | `src/adapters/espn.js` `doEspnRequest`, ~line 476 | P2 | Restrict redirect-follow to `*.espn.com`. |
| 6 | `league-office-run-now.yml` GitHub Action fires on **any push that touches the workflow file itself**, not just manual dispatch — an unrelated comment edit can trigger a live production job against ESPN. | `.github/workflows/league-office-run-now.yml` | P2 | Scope the trigger to `workflow_dispatch` only. |
| 7 | `trade.js` enforces auth manually (`authenticateOmenRequest(req.headers.authorization)` at lines 515/612) instead of the shared `requireAuth` middleware every other route uses. Same security outcome, but harder to audit at a glance and inconsistent with the rest of the app. | `src/routes/trade.js` | P3 (consistency, not a hole) | Migrate to `requireAuth` in the Phase 3 route migration below. |

**Confirmed fine, checked not assumed** (security sweep): Vault usage is consistent everywhere —
every credential write goes through `vault_create_secret`/`vault_update_secret`, no raw token ever
reaches an API response or a log line; CORS is a real default-deny allowlist, not `origin: '*'`;
Helmet is mounted with an explicit CSP; the error handler hides all 5xx detail in production; no
SQL-injection surface (all access through the parameterized query builder); no hardcoded secret
fallbacks (`config/index.js` fails process boot if required env vars are unset); `npm audit
--production` — 0 vulnerabilities.

### Tier 1 — data model (Decisions D1–D4)

**D1. Add a `leagues` entity — this is a live collision bug, not just cleanliness.**
Of the 7 `league_office_*` tables, 5 (`executives`, `rivalries`, `lines`, `awards`, `accolades`)
store *only* `league_id text` with **no platform qualifier**. Since Sleeper/ESPN/Yahoo league IDs
are not globally unique, two of one user's leagues on different platforms can collide on the same
`league_id` value in those tables today — this is a real, live data-integrity bug, independent of
any redesign preference.

Per the founder's product context above, model `leagues` as a shared resource (natural key
`(platform, platform_league_id, season)`, `platform` a validated open value, not a 3-value enum):

```sql
create table public.leagues (
  id                  uuid primary key default gen_random_uuid(),
  platform            text not null,  -- validated against a lookup, not a closed CHECK enum
  platform_league_id  text not null,
  season              integer not null,
  league_name         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (platform, platform_league_id, season)
);
```

Incremental migration (no downtime, no big-bang rewrite — `platform_connections` and
`league_office_matchups` are on hot read paths):
1. Create `leagues` empty.
2. Backfill distinct `(platform, platform_league_id, season)` from `platform_connections`, joined
   back to resolve platform for the 5 tables that lack it (any row that can't resolve unambiguously
   gets flagged, never guessed).
3. Add nullable `league_ref uuid` to all 9 dependent tables, populate, verify row counts match.
4. Add FK + NOT NULL one table at a time, lowest-traffic first: `league_office_executives`/
   `rivalries` (0 rows, free) → `accolades`(2) → `lines`(3) → `sync_jobs`(4) → `awards`(6) →
   `matchups`(24) → `platform_connections`(16) last.
5. Keep the bare `league_id` text columns one release cycle as a rollback lane, then drop.

New work already in flight should target `league_ref` from day one rather than inheriting the
collision pattern: `league_follows` (gated behind `sql/2026-09-03_multi_league_follows_review.sql`,
not yet applied to production) and `activeSelection.js`'s `is_selected` column
(`sql/2026-08-26_league_selection_review.sql`).

**D2. Drop three dead `users` columns; no arbitration needed between `users` and `profiles`.**
Verified by reading every read/write path: `profiles.favorite_team` (real NFL team preference) and
`users.team_name`/`platform`/`league_id` never competed for the same concept — the latter three are
simply dead, zero reads or writes anywhere in `src/` (only `users.id`/`users.email` are ever
touched). Fantasy team identity correctly lives in `platform_connections`
(`platform_username`/`espn_team_id`) already. Also dead: `platform_connections.espn_swid` (plaintext)
— every code path uses `swid_secret_id` (the Vault reference) instead; `espn_swid` was superseded and
never cleaned up.
- `alter table users drop column team_name, drop column platform, drop column league_id;`
- `alter table platform_connections drop column espn_swid;`
- Safe as a single step (re-confirm via grep immediately before running); add a column comment on
  `profiles.favorite_team` clarifying it's unrelated to fantasy team identity, since the name alone
  invites confusion with `platform_connections`.

**D3. `local_snapshots` / `omen_agents.js` — RESOLVED 2026-09-27: deleted, not resurrected.**
Reading `omen_agents.js` in full settled this decisively, past what either background workstream had
established: its own header comment says outright *"the original standalone agent file drifted into
non-executable generated text. Current production agent work lives in `src/services/agents.js` and
`src/routes/optimizer.js`."* Its HTTP router was already retired on purpose (`410 Gone`, `"Use
/api/omen/mvp-move instead"` — confirmed that route is real and live in `src/routes/omen.js`). Its
data source, an external "ssff-bot" pushing snapshots into the table, does not exist anywhere in this
repo or its docs. This was never a good idea waiting to be flipped on — it was already replaced by a
better, currently-running system, and resurrecting it would mean serving fallback data from a bot
that was never built, through hardcoded pre-current-system math. Deleted `omen_agents.js`,
`local_snapshots` (dropped from production, 0 rows), and the now-fully-dead `omen_prompt_loader.js`
(nothing else ever required it — it existed solely to be wired into `omen_agents.js`, which never
happened). This also closed the unrelated, already-`READY` sprint item `S7` (stale
`@anthropic-ai/sdk` dependency + config slot), whose own done-when clause named
`omen_prompt_loader.js`'s stale Anthropic comment directly. `npm test` 1259/1259 before and after;
`npm install` re-run clean, 0 vulnerabilities. See `Direction/decision_log.md` 2026-09-27.

**D4. `moves`'s 8 scoring/reconciliation columns — leave as-is, confirmed correct.**
Verified against `src/routes/moves.js:141-453`: the entire "why does this move have this grade" API
response is built off one row, zero joins. That's the actual point of an audit-trail table — it must
explain its own grade forever, even after the scoring-rules table it referenced changes. Normalizing
this would force a join onto the single hottest read path for no correctness benefit. No action.
(Naming nit, zero risk: `moves.eff` is a cryptic abbreviation for what the API calls
`effectiveness_pct` — rename opportunistically if the column is ever touched for another reason.)

### Tier 2 — backend architecture (repository layer, error handling, route consistency)

**Route/auth inventory:** every route mutating user data or reading platform credentials is
correctly behind `requireAuth`. No live auth hole found. `src/routes/trade.js`'s manual auth check
(Tier 0 #7) is a consistency finding, not a security one.

**27 files call `createClient()` independently** (was 26; `footballIntelligence.js` is new since the
last count). `platform_connections` alone is hand-rolled across 12 files with duplicated query/error
logic. `services/activeSelection.js` is the right template to generalize from — client injected as a
parameter (testable with a fake), already deduplicated three divergent platform-priority
implementations. `services/appUser.js` is not a good template beyond its brevity — it owns its client
and can't be unit-tested without real config.

**Proposed first module**, `src/db/client.js` (single `createClient()` call site for the API
process) plus `src/repositories/platformConnectionsRepository.js` (client injected, mirroring
`activeSelection.js`):

```js
function createPlatformConnectionsRepository(supabase) {
  return {
    async findActive(userId) { /* .eq(user_id).eq(is_active,true) */ },
    async findOne(userId, platform, columns) { /* .maybeSingle() */ },
    async upsertConnection(userId, platform, fields) { /* onConflict: "user_id,platform" */ },
    async updateFields(userId, platform, fields) { /* .update().eq().eq() */ },
    async deleteConnection(userId, platform) { /* .delete().eq().eq() */ },
    async readWithSelection(userId, baseColumns) { /* wraps activeSelection.js */ },
  };
}
```

**No shared validation layer exists** — no zod/joi/express-validator/ajv anywhere; validation is ad
hoc per route. Not urgent, but worth picking one when the route migration below touches a file
already.

**Route files mixing HTTP + business logic + direct data access, largest first:** `league.js` (902
lines), `trade.js` (811), `leagues.js` (771), `platforms.js` (743), `omen.js` (659) — same root cause
as the `platform_connections` duplication, just not yet counted against it.

**Phased migration, each phase independently verifiable against the existing 1259 tests, no
behavior change:**
1. Build `src/db/client.js` + `platformConnectionsRepository`; migrate `activeSelection.js` and
   `middleware/auth.js`'s client construction first (closest to target shape, smallest blast
   radius). Fix the Tier 0 #1 breadcrumb scrub gap in the same pass — it's a 5-line change with an
   obvious regression test.
2. Migrate `espnAuth.js`, `yahooAuth.js`, `sleeperDraftAccess.js` (services, safer than routes —
   callers don't change). Route `yahoo.js`/`espn.js`/`sleeper.js` error responses through `next(e)`
   (Tier 0 #3).
3. Migrate route files one at a time, ascending risk: `startSitDetail.js` → `dashboard.js` →
   `optimizer.js` → `userPrivacy.js` → `espn.js` → `yahoo.js` → `leagues.js` → `platforms.js` (last,
   largest surface). Migrate `trade.js` onto `requireAuth` (Tier 0 #7) in this phase too.

### Tier 3 — secondary components (cron/workers, provider adapters)

**Inventory:** `omen_tuesday_cron.js` (weekly scoring, `crond` in the dedicated cron container,
fails closed unless the scoring flag is explicitly `true`), `league_office_sync_worker.js` (5-minute
ESPN-only sync — Yahoo/Sleeper League Office sync is unimplemented, `job.platform !== "espn"` throws
immediately), `omen_agents.js` (confirmed dead, see D3). No message queue exists — Upstash Redis is
the only secondary datastore; "queueing" is a hand-rolled Postgres-table poll
(`league_office_sync_jobs`).

**Provider adapters share a real, working chokepoint**: `src/middleware/providerErrors.js` is used
by all three adapters, and all three converge on the same `<platform>_reconnect_required` error-code
convention several layers up. Below that seam they leak different quirks (ESPN raw `Error` + status;
Sleeper axios wrapper + self-imposed rate-limit metadata; Yahoo attaches response body +
WWW-Authenticate) — none of the three does server-side retry/backoff.

**On "ESPN is essential and fragile, needs careful recovery flows"**: true, but verified that the
care is in adapter *correctness* (1,404 lines of dated, verified-against-production fixes for ESPN's
undocumented quirks), not resilience *mechanics* — on retry/circuit-breaking, ESPN, Yahoo, and
Sleeper are equally undefended. The docs' "careful recovery" claim is really about parsing ESPN
right, not about surviving ESPN being down.

**Hardening list, specific to this tier:**
1. De-duplicate the nflverse CSV client — `omen_tuesday_cron.js` and `services/matchupService.js`
   independently reimplement the same URL builder and CSV parser, synchronized only by a code
   comment cross-reference. A future nflverse change fixed in one and missed in the other silently
   diverges. Extract to one shared module.
2. Resolve D3 (delete or properly wire `omen_agents.js`).
3. Fix Tier 0 #6 (`league-office-run-now.yml` trigger scope).
4. Pin the cron image by digest at deploy time, matching the rigor already used for the football-data
   pipeline (`ops/football-data/kvm1/`: hostname-pinned, sha256-pinned images, `--cap-drop ALL
   --read-only --security-opt no-new-privileges`). The `src/`-level cron/worker deploy path has none
   of that hardening today — real contrast worth closing.

---

## What I'd actually do first, and why

Ordered by (real risk closed) ÷ (blast radius to ship):

1. ~~**D3**~~ — **DONE 2026-09-27.** `omen_agents.js`/`omen_prompt_loader.js` deleted,
   `local_snapshots` dropped; also closed `S7`. See the D3 section above.
2. **Tier 0, remaining six** — none require a design decision, all are small, isolated,
   independently verifiable diffs. The breadcrumb `state` fix and the GitHub Action trigger scope are
   the two with real (if bounded) live exposure; do those first.
3. **D2** (drop 4 dead columns) — zero risk, zero dependents, immediate.
4. **D1** (`leagues` entity) — the one item here that's a live correctness bug, not a design
   preference. Worth starting even though it's the largest migration, because the collision surface
   is real today and only gets harder to unwind as more `league_office_*` rows accumulate.
5. **Backend architecture Phase 1** — naturally pairs with the Tier 0 #1 fix already touching
   `sentry.js`/client construction.
6. Everything else (Phases 2–3, secondary-component hardening list) — real value, no urgency,
   sequence behind whatever you want built next.
