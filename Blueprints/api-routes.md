# Omen API Route Reference

Last updated: 2026-08-26

`/api/stripe/*` (prices, checkout, portal, webhook) removed 2026-07-12 — Omen ships free indefinitely, Stripe is not used on this product (see decision log). `/api/optimizer/*` and `/api/omen/mvp-move` are no longer gated by a subscription check.

This file is the quick backend reference for current canonical routes and known retired compatibility routes. It is not a full OpenAPI spec; the detailed contracts remain in `Blueprints/handoffs/backend-to-frontend.md`.

## Public System Routes

| Method | Path | Contract | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `system-health.v1` | Public liveness check. |
| `GET` | `/api/ready` | `system-ready.v1` | Public dependency readiness check. |
| `GET` | `/api/version` | `system-version.v1` | Public deploy/build metadata. Safe fields only. |
| `GET` | `/api/session` | `session.v1` | Public auth shell; returns authenticated user only when a valid bearer token is supplied. |
| `GET` | `/api/system/current-week` | `system-current-week.v1` | Public NFL season/week context. |
| `GET` | `/api/system/min-version` | `system-min-version.v1` | Public forced-update gate (O7). Query: `platform` (`ios`\|`android`), `version` (dotted, e.g. `1.2.0`). Returns `status` (`ok`\|`update_required`), `update_required`, `minimum_version`. **Always 200 and always fails open** — an unknown platform, unparseable version, or missing param reports `ok`, never `update_required`. |
| `GET` | `/api/platform-status` | `platform-status.v1` | Public platform/config status; no private LLM URL. |
| `GET` | `/api/demo` | `omen-demo.v1` | Public deterministic sample roster + Omen envelope. Always `mode: "demo"`; never live/mock fallback. |

LLM bridge status is additive on `GET /api/ready` and `GET /api/platform-status`. Possible safe status values are `not_configured`, `configured_private`, `misconfigured_public`, and `invalid_url`. These routes never return `LLM_BASE_URL`, hostname, or port; public/invalid LLM URLs are optional-service misconfiguration states, not app readiness failures.

## Canonical Product Routes

| Method | Path | Contract | Auth | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/trade/compare` | `trade-compare.v2` | Optional | Free Trade Analyzer entry point; still public and still neutral by default. Sending `league_context` **and** a bearer token opts into personalized analysis — see **Trade compare v2** below. Rate limited — see Rate Limits. |
| `POST` | `/api/trade/share` | `trade-share.v1` | No | Creates a 30-day public share hash from bounded Trade Analyzer input. Uses Redis in production; no auth or provider data. |
| `GET` | `/api/trade/share/:hash` | `trade-share.v1` | No | Public read of a shared trade snapshot by UUID hash. Returns `404 trade_share_not_found` when missing/expired. |
| `GET` | `/api/trade/share/:hash/og.svg` | trade-share public OG image | No | Server-side SVG image for crawler cards. Reads the same public snapshot and returns `image/svg+xml`; no auth/provider data. |
| `GET` | `/api/players/search` | `players-search.v1` | No | Free Trade Analyzer autocomplete. Uses public Sleeper player data; max 10 rows. |
| `POST` | `/api/draft-assistant/recommendations` | `draft-assistant-recommendations.v1` | No | Mock/preview recommendations until live Draft Assistant data ships. |
| `GET` | `/api/draft-assistant/adp` | ADP response | No | Public ADP; optional Yahoo enrichment when auth is supplied. |
| `GET` | `/api/sleeper/draft?leagueId=` | `sleeper-draft-list.v1` | Yes | Connected Sleeper league only. |
| `GET` | `/api/sleeper/draft/:draftId` | `sleeper-draft-meta.v1` | Yes | Connected-league metadata; exposes only the caller's draft slot. |
| `GET` | `/api/sleeper/draft/:draftId/state?since=` | `sleeper-draft-state.v1` | Yes | Two-second active / 30-second low Lazy Sync; no raw manager user IDs. |
| `GET` | `/api/dashboard/summary` | `dashboard-summary.v1` | Yes | App shell truth for gates, platforms, `user.favorite_team`, additive platform `lastResult` fields, and Omen `off_season` status. No `subscription` field — Omen is free, no billing gate. Rate limited — see Rate Limits. |
| `GET` | `/api/platforms` | platform connection status | Yes | Account/connect platform state. |
| `GET` | `/api/platforms/state` | `platform-provider-state.v1` | Yes | Additive native provider-flow state: opaque state, recovery action, and error code only; never credentials, OAuth artifacts, or Vault IDs. |
| `POST` | `/api/platforms/sleeper/resolve` | Sleeper resolve response | Yes | Username-first league discovery. |
| `POST` | `/api/platforms/sleeper/connect` | Sleeper connect response | Yes | Accepts selected `league_id`. Native callers may add an opaque bounded `request_id`; completed retries replay safely for 10 minutes, while replay-store failures fail closed. |
| `GET` | `/api/yahoo/auth` | redirect | Yes | Yahoo OAuth start. |
| `GET` | `/api/yahoo/callback` | redirect | No | Yahoo OAuth callback; redirects to Account connect. |
| `GET` | `/api/yahoo/leagues` | `{leagues: [{league_id, name, season}]}` | Yes | Lists the authenticated user's current-season Yahoo NFL leagues via a live Yahoo API call. `league_id` is Yahoo's `league_key`, the same value every other Yahoo route expects. |
| `POST` | `/api/yahoo/league` | `{league_id}` | Yes | Binds `leagueId` to the caller's Yahoo connection after validating it against a fresh `GET /api/yahoo/leagues` call; `400` if not one of the user's leagues, `404` if no Yahoo connection exists yet. Repairs an existing placeholder without disconnecting. |
| `POST` | `/api/platforms/espn/connect` | ESPN connect response | Yes | Cookie-backed ESPN connect; never log cookie values. |
| `DELETE` | `/api/platforms/:platform` | disconnect response | Yes | Disconnects `yahoo`, `sleeper`, or `espn`. |
| `POST` | `/api/omen/mvp-move` | `2026-05-18.omen-live.v1` | Yes for live | Canonical Omen / MVP Move path. Live UI sends `{}` after dashboard status `ready`; mock mode is explicit and never an automatic live fallback. Every ESPN recommendation includes an unavailable `exact_espn_scoring_unavailable` signal: Omen may recognize some settings, but cannot yet verify every scoring rule and final ESPN result. A live success is issued only after the server persists its move metadata and post-A6 fail-closed scoring state; persistence failure returns `503 omen_recommendation_persistence_failed` with no recommendation. Unknown live provider scoring stays `null`, never an invented PPR default. Authenticated direct live POST returns `state: "off_season"` before live generation when the shared NFL calendar is outside weeks 1-18. Rate limited — see Rate Limits. |
| `POST` | `/api/omen/feedback` | feedback response | Yes | Idempotent by user + season + week. A direct/older client that creates the row marks it `scoring_contract_required=true`, so Tuesday scoring cannot mistake it for pre-A6 historical PPR data. |
| `GET` | `/api/moves` | `moves-history.v1` | Yes | Move History / Hall of Records. |
| `GET` | `/api/moves/:id` | `move-detail.v1` | Yes | Ledger **detail** — the receipt for one Omen call (visual briefs §7). Immutable snapshot, evidence-at-the-time categorised into `league_context` / `player_game_fact` / `model_input` / `omen_inference` / `limitation`, user action **only when safely known**, and the observed outcome in measured language. The stored `outcome` column holds `win`/`loss`; it is translated and never surfaced raw. `issued_at` carries an explicit `issued_at_timezone`. A row that pre-dates A6 scoring capture names the PPR fallback as a limitation. Error envelope `move-detail-error.v1` (`invalid_move_id` 400, `move_not_found` 404). The `user_id` filter is applied in the query. |
| `GET` | `/api/leagues` | `league-directory.v1` | Yes | **Team/league switcher directory** (visual briefs §10.2). Grouped by platform in a stable order (`sleeper`, `espn`, `yahoo`), alphabetical by league within a platform. Per-platform `connection_state` (`connected` / `reconnect_required` / `not_connected`) and `discovery`: `full` for Sleeper and Yahoo, **`bound_only` for ESPN**, which exposes no league list to Omen. `active` is the league Omen will actually use. `selection_persistence` is `explicit` once the reviewed selection column is applied and `provider_binding_only` until then — see Active-league selection below. A per-platform failure degrades that group only and leaves the others listed. |
| `POST` | `/api/leagues/active` | `league-active-selection.v1` | Yes | Sets the active league. Body `{platform, league_id, team_id?}`. The league is verified against the user's own provider account before binding (Sleeper and Yahoo by discovery; ESPN against the bound league, its only verifiable claim). Returns `refresh: ["command_center","omen","league","waiver_watch","ledger"]` — the surfaces §10.3 requires the caller to re-read. Error envelope `league-directory-error.v1`: `invalid_platform`/`league_id_required` 400, `platform_not_connected` 404, `league_not_in_account` 400, `league_verification_unavailable` 502 (retryable, and deliberately distinct from a bad league). |
| `GET` | `/api/waivers/analysis` | `waiver-analysis.v1` | Yes | **Waiver Analysis** (visual briefs §6) for Sleeper, ESPN, and Yahoo. Best move, the starter it displaces, the recommended drop and its stated cost, and up to three alternatives with a tradeoff sentence each. `state` is one of `confirmed_opportunity`, `availability_unknown`, `no_low_cost_drop`, `no_credible_move`, `engine_limitation`, `off_season`. Optional `week` (1-18). **Never returns FAAB amount, waiver priority, or claim probability** (§6.2). A `null` projection stays unknown and never becomes zero, so an unprojected free agent is never recommended — Yahoo's pool carries no projections at all and says so in `limitations`. A `deadline` is emitted only when availability was confirmed. Error envelope `waiver-analysis-error.v1`. |
| `GET` | `/api/start-sit/detail` | `start-sit-detail.v1` | Yes | **Start/Sit detail** (visual briefs §5) for Sleeper, ESPN, and Yahoo. Opens on the caller's highest-priority *unresolved* lineup decision; optional `slot` switches slots and optional `week` (1-18). Evidence is categorised per §5.2 and each entry carries its own `kind` (`verified` / `projection` / `model` / `inference` / `limitation`), so a projection is never rendered as a fact. `state` is one of `clear_decision`, `close_decision`, `player_unavailable`, `incomplete_data`, `no_decision`, `off_season`. An unverified scoring format is stated as a limitation, **never assumed to be PPR**. Error envelope `start-sit-detail-error.v1`. Distinct from `POST /api/start-sit`, which is the public caller-supplied comparator. |
| `GET` | `/api/user/export` | `user-export.v1` | Yes | Safe user data export. Excludes raw OAuth tokens, ESPN cookies, and Vault secret ids. |
| `POST` | `/api/user/consent` | `user-consent.v1` | Yes | Upserts a consent record for the authenticated user. |
| `DELETE` | `/api/user/delete` | `user-delete.v1` | Yes | Requires exact `confirmation: "DELETE MY OMEN DATA"`. Deletes Omen-side rows and attempts Vault secret cleanup; does not delete provider-held data. |
| `GET` | `/api/league/standings` | `league-standings.v1` | Yes | Canonical standings for Yahoo, Sleeper, ESPN. Returns `200` with `standings: []` during the shared off-season window. Error envelope is `league-standings-error.v1`. |
| `GET` | `/api/league/overview` | `league-overview.v1` | Yes | **Additive; `/standings` is unchanged.** League destination payload: `matchup`, `standings`, `activity`. Every section carries its own explicit `status` and **fails independently** — a dead matchup read returns `status: "unavailable"` beside live standings. `activity` ships `status: "empty"` with `unavailable_families: ["transactions"]`: v1 derives no activity signals, and that slot is the seam the waiver/trade work fills without a contract change. `playoff_picture.cut_line_note` stays `null` with `settings_known: false` until a provider path reads playoff settings. Reuses `league-standings-error.v1` verbatim. Yahoo returns standings with `matchup.status: "unavailable"` (`provider_unsupported`). |
| `PATCH` | `/api/account/preferences` | preference response | Yes | Persists `favorite_team`. |

## Trade compare v2 — additive, 2026-08-24

`POST /api/trade/compare` gained real league personalization and explicit server semantics for all four approved verdict states. **Every change is additive.** v1 consumers — the web Trade Analyzer and `trade-share.v1` snapshots — read the same fields they always did and behave identically.

### Request

```jsonc
{
  "send":    [ { "name": "...", "position": "RB", "projected_points": 13 } ],
  "receive": [ { "name": "...", "position": "WR", "projected_points": 14 } ],
  "scoring_format": "ppr",              // neutral path only; ignored when personalized
  "league_context": {                    // OPTIONAL — opts into personalization
    "platform":  "sleeper",              // optional: yahoo | sleeper | espn
    "league_id": "123456"                // optional: pick among several connections
  }
}
```

`league_context` is a **request** for personalization, never the data itself. A client may name which connected league to use; it may never supply the roster, scoring rules, or league settings. Those are read server-side from the caller's own stored connection.

### Added response fields

| Field | Meaning |
| --- | --- |
| `contract_version` | `"trade-compare.v2"` |
| `verdict_state` | The four approved labels: `favors_you`, `close_needs_context`, `you_give_up_too_much`, `insufficient_data`. **This is the only field carrying the fourth state.** |
| `evaluability` | `{ status, reason, missing_projection_count, total_player_count }`. `status` is `evaluable` or `insufficient_data`. |
| `analysis_context` | `{ mode, platform, league_id, league_name, applied[], unavailable_reason }`. `mode` is `neutral` or `personalized`. |

`verdict` is **unchanged** and still emits `accept` / `decline` / `neutral`. Clients that understand v2 read `verdict_state`; clients that do not keep working. When `evaluability.status` is `insufficient_data`, `verdict_state` is `insufficient_data` while `verdict` retains its previously-computed value — v2 clients must prefer `verdict_state`.

### What "personalized" actually changes

Personalization is not a scoring-format label. Three real inputs move the numbers:

1. **Scoring format** read from the provider's own settings, not from the client's `scoring_format`.
2. **Roster construction** — a league starting three WRs drains the WR pool deeper than one starting two, so the replacement baseline drops and every WR gains value. Bounded to ±35%.
3. **The caller's own positional depth** — an incoming RB is worth less to a manager already deep at RB.

These are expressed as the `league_scarcity_weights` rows `compareTrade()` already consumed, so the comparison engine itself is unchanged.

### Honest fallback

Personalization never silently pretends. Each of these returns **200 with neutral analysis** and a named `analysis_context.unavailable_reason`:

| Reason | When |
| --- | --- |
| `unauthenticated` | `league_context` sent without a valid bearer token. Trade stays free and public — this is a downgrade, not a `401`. |
| `no_connected_league` | No usable connection for this caller. |
| `provider_unsupported` | The connection is ESPN or Yahoo. ESPN carries the data but needs its own credential path and provider proof; **Yahoo is refused at the app-entitlement level** (facts-of-record #11, issue [#308](https://github.com/justinduverge-design/omen/issues/308)) and is never offered as a personalization source. |
| `league_context_unavailable` | The provider read failed. |

Only **Sleeper** resolves a personalized context today.

Validation: a `league_context` that is not an object, names an unknown platform, or carries an over-long `league_id` returns `400`.

## Rate Limits

Four limiters are in play. They **stack** — a request passes through every one that matches its
path, and the tightest applicable budget is the one that binds.

| Limiter | Applies to | Budget | Source |
| --- | --- | --- | --- |
| General | every `/api/*` except `/api/health` | 100 / min / IP | `src/middleware/security.js` |
| Auth | `/api/auth/*` | 20 / 10 min / IP | `src/middleware/security.js` |
| Public tool | `/api/trade/*`, `/api/players/*`, `/api/demo/*`, `/api/waitlist/*` | 30 / min / IP | `src/middleware/security.js` |
| **Hot route (S3)** | the three routes below | see table | `src/middleware/hotRouteLimits.js` |

### Hot-route budgets — S3

Added 2026-08-21. These three routes take the Sunday-morning load and are the ones a tester can
hammer. Both limits are enforced on every request, per rolling 60-second window.

| Route | Per IP | Per credential | Why these numbers |
| --- | --- | --- | --- |
| `POST /api/omen/mvp-move` | 20 / min | 10 / min | Heaviest request Omen serves — provider fan-out plus an LLM call. There is one real Omen per user per week; everything past that is a refresh tap. |
| `POST /api/trade/compare` | 20 / min | 20 / min | LLM-backed and the free front door, so a session of genuine back-to-back comparisons has to fit. Sits under the 30/min public-tool limit on `/api/trade/*`, making the expensive endpoint the tighter of the two rather than a redundant duplicate. |
| `GET /api/dashboard/summary` | 60 / min | 30 / min | Cheapest and most polled — app launch, tab focus, post-connect refresh. A household or campus NAT puts many real users behind one IP, so its per-IP number is deliberately the loosest. |

**"Per credential", not "per account" — stated plainly because the difference matters.** These
limiters run *before* authentication (they are mounted ahead of the routers, and
`/api/omen/mvp-move` authenticates inside its own handler), so no verified user id exists at the
point the decision is made. The user bucket is therefore keyed on a SHA-256 digest of the
presented bearer token, not on the JWT's `sub` claim. Keying on an unverified `sub` would let
anyone mint a token carrying a victim's `sub` and lock that victim out. The cost of the safer
choice: two devices get two buckets, and a Supabase token refresh (~hourly) mints a fresh one.
The per-IP limit is the backstop that keeps refresh-to-reset bounded — which is why both are
enforced rather than either alone.

Anonymous requests skip the credential bucket entirely (there is nothing to key on) and are
covered by the per-IP limit, which never skips.

### The 429 envelope

```json
{
  "error": "Too many POST /api/omen/mvp-move requests from this network. Slow down and retry shortly.",
  "code": "rate_limited",
  "scope": "ip",
  "route": "omen_mvp_move",
  "limit": 20,
  "window_seconds": 60,
  "retry_after_seconds": 43
}
```

- `scope` is `"ip"` or `"user"`, so a client sharing an office IP is not told its own account is
  throttled.
- `retry_after_seconds` is computed from the live window reset, and the response also carries
  `Retry-After` plus the draft-7 `RateLimit` / `RateLimit-Policy` headers.
- Tripping the credential bucket proves only that a bearer header was present. The envelope
  never reveals whether the token was valid.

**Storage is per-process** (`MemoryStore`, one per route+scope). Omen runs a single `omen_api`
container, so that is the whole picture today. If the API is ever replicated, the effective limit
multiplies by the replica count and these need a shared store.

Evidence that they fire: `test/hotRouteRateLimits.test.js` drives real requests through the
shipped middleware instances until they 429, and proves reset.

## Active-league selection — additive, 2026-08-26

`platform_connections` holds one row per `(user_id, platform)` with a single `league_id`, and no column recording which provider the user chose. Before `GET /api/leagues` existed, three surfaces answered "which league is active" three different ways, none of them the user's choice:

- `src/services/omen.js` ordered `sleeper` → `espn` → `yahoo`
- `src/routes/league.js` ordered `espn` → `sleeper` → `yahoo`
- `src/routes/optimizer.js` resolved Yahoo only, by `updated_at`

`src/services/activeSelection.js` is now the single resolver, and `omen.js`, `league.js`, `waivers.js`, and `start-sit/detail` all use it. Behavior is unchanged for a user who has not chosen: the previous deterministic order remains the tie-break.

**Persistence is honest, not assumed.** An explicit cross-provider choice needs a column. `sql/2026-08-26_league_selection_review.sql` is authored **review-only and is not applied** — applying SQL is the gated founder sequence (facts-of-record #8). Until it is applied:

- `selection_persistence` reports `provider_binding_only`;
- `POST /api/leagues/active` still binds the league *within* its provider, which is real and useful;
- nothing claims a cross-provider choice persisted that did not.

Once applied, `selection_persistence` reports `explicit` with no code change — the routes detect the column at runtime and fall back rather than failing.

## Retired Compatibility Routes

These routes intentionally return `410 legacy_route_retired` with canonical hints where a replacement exists.

| Method | Retired Path | Canonical Path |
| --- | --- | --- |
| `POST` | `/api/optimizer/mvp-move` | `/api/omen/mvp-move` |
| `POST` | `/api/auth/sleeper/connect` | `/api/platforms/sleeper/connect` |
| `GET` | `/api/auth/yahoo/authorize` | `/api/yahoo/auth` |
| `GET` | `/api/auth/yahoo/callback` | `/api/yahoo/callback` |
| `POST` | `/api/auth/espn/connect` | `/api/platforms/espn/connect` |

`GET /api/league/standings` was previously considered for retirement but is now restored as the canonical League Standings route.

`POST /api/optimizer/mvp-move` is intentionally not a product tier or fallback recommendation route. It remains retired so all Omen recommendation work converges on `POST /api/omen/mvp-move`.

## Smoke Conventions

Use `scripts/smoke-tier2-endpoints.js` for Tier 2 launch smoke.

- Default feedback smoke target: season `2099`, week `1`.
- This keeps smoke evidence away from current-season user history by default.
- Add `OMEN_TIER2_CLEANUP=1` to rewrite the same idempotent smoke row to `followed=false`, `stars=null`, and a cleanup note after Move History has verified it.
- The script reads `OMEN_AUTH_TOKEN` only from the current process environment and never prints it.
