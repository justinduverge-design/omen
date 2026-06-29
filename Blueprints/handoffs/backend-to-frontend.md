# Backend To Frontend Handoff

## Purpose

Codex/backend writes completed or proposed backend contracts here.

Claude/frontend reads this file before wiring UI to backend behavior.

## Phase 1.5d Post-Win Pulse — 2026-06-29

Feature name: Post-win pulse animation.

Status: Built locally as frontend behavior consuming the existing dashboard summary contract.

Endpoint / contract:

No HTTP endpoint, request body, response envelope, frontend call, package, SQL, env, provider credential, auth, Stripe, Supabase, or deploy behavior changed.

Existing frontend-consumed fields:

- `GET /api/dashboard/summary.platforms.{sleeper,yahoo,espn}.lastResult`
- `GET /api/dashboard/summary.platforms.{sleeper,yahoo,espn}.lastGameId`
- `GET /api/dashboard/summary.user.favorite_team`

Frontend behavior:

- Show `<Team> W - bright today` on `/football` when a connected platform has `lastResult === "W"` and `lastGameId`.
- Play the header-rule wash once per `lastGameId`, tracked in localStorage.
- Brighten the embedded current-user standings row while the latest result is a win.
- Do not display win streak tiers until the backend exposes a real streak field.

Future backend request:

Add a provider-safe `currentWinStreak`-style field to `GET /api/dashboard/summary` when ready. It should be computed from provider matchup history, return a safe integer or `null`, and avoid exposing raw provider ids, credentials, or ESPN cookie material.

Files changed:

- `frontend/src/lib/postWinPulse.js`
- `frontend/src/pages/Football.jsx`
- `frontend/src/components/league/LeagueStandings.jsx`
- `frontend/src/index.css`
- `test/postWinPulse.test.mjs`
- `Blueprints/specs/page-system.md`

Limitations:

- Current production behavior is single-win only.
- `lastGameKickoff` is still usually `null`; next-game-day auto-clear remains limited to the backend's latest `lastResult` changing away from `W` or to a new `lastGameId`.
- Authenticated visual screenshot/mobile smoke was not captured in this session.

## Phase 4.16 Open-Agreements Provider Paragraphs — 2026-06-28

Feature name: Provider-specific ToS / Privacy Policy paragraph packet.

Status: Drafted locally for Justin/counsel review. Not published.

Endpoint / contract:

No HTTP endpoint, request body, response envelope, frontend call, package, SQL, env, provider credential, auth, Stripe, Supabase, or deploy behavior changed.

Frontend action needed:

- None for app wiring.
- Do not publish `/terms` or `/privacy` from this packet without Justin/counsel review.
- If future frontend pages use this copy, keep platform attribution factual and never imply ESPN, Yahoo, Sleeper, Disney, or NFL endorsement.

Files changed:

- `Legal/2026-06-28-open-agreements-provider-paragraphs.md`
- `Direction/reviews/2026-06-28-phase4-16-provider-terms-research.md`
- `Direction/reviews/2026-06-28-phase4-16-security-privacy-evidence.md`
- `Direction/reviews/2026-06-28-phase4-16-legal-spot-check.md`

Limitations:

- Not legal advice.
- Not a public policy page.
- No open-agreements DOCX/template output generated because the local template checkout is missing.
- ESPN/Yahoo/Sleeper provider-terms risks remain open for founder/counsel review.

## Phase 3.13 Token-Constrained Narration — 2026-06-28

Feature name: Token-constrained LLM narration prompts.

Status: Built on branch `codex/phase3-13-token-constrained-prompts`; push/merge/deploy approved by Justin.

Endpoint / contract:

No HTTP endpoint, request body, response envelope, or frontend call changed.

Backend behavior change:

- Trade Analyzer LLM explanation prompts now instruct the model to keep the full narration under 50 words and no more than 2 sentences.
- Start/sit LLM explanation prompts use the same limit.
- Omen MVP Move LLM strict-JSON explanation prompts use the same limit and a 90-token generation cap.
- If Omen LLM JSON output exceeds 50 words or 2 sentences across its prose fields, the parser rejects it and the existing deterministic explanation stays in place.

Frontend action needed:

- None. Continue rendering existing explanation fields.
- Treat this as latency/CPU mitigation only, not a new display contract.

Files changed:

- `src/services/llm.js`
- `test/llmService.test.js`

Limitations:

- Live Omen still skips LLM narration by default unless `include_signals.llm_reasoning: true` is explicitly sent.
- No KVM2 live model smoke was run in this task.

## Phase 3.12 KVM2 Gemma Bridge Status — 2026-06-27

Feature name: Private local LLM bridge status.

Status: Deployed. PR #70 squash-merged to `main` as `a13160b`; KVM1 deploy run `28306784898` passed.

No new route. No frontend action required unless you want to display diagnostics.

Changed routes:

```text
GET /api/ready
GET /api/platform-status
```

Additive response fields:

```json
{
  "checks": {
    "optional_services": {
      "llm_private": true
    },
    "llm": {
      "status": "configured_private",
      "model": "gemma4:e2b-q4_0",
      "timeout_ms": 30000,
      "transport": "openai_compatible_chat_completions",
      "private_route_required": true,
      "public_url_exposed": false,
      "note": "LLM_BASE_URL must resolve over a private route such as Tailscale; this status never returns the URL."
    }
  }
}
```

`/api/platform-status.dependencies.llm` returns the same safe status object.

Status values:

```text
not_configured
configured_private
misconfigured_public
invalid_url
```

Important frontend rule:

- Do not expect or display the LLM URL. The backend intentionally never returns it.
- `misconfigured_public` and `invalid_url` are non-fatal optional-service states. Omen still falls back to deterministic/template narration.

Files changed:

- `src/services/llm.js`
- `src/config/index.js`
- `src/services/systemContracts.js`
- `src/routes/system.js`
- `test/llmService.test.js`
- `test/systemRoutes.test.js`

Live note:

- Production currently reports `status: "configured_private"` and `model: "gemma3:4b"` because the production `LLM_MODEL` env override wins over the new code default. That is expected.

## Phase 2.17 Platform Last-Result Fields — 2026-06-27

Feature name: Platform last-result fields for post-win pulse.

Status: Built locally on branch `codex/phase2-17-platform-last-result`. Not deployed.

Method and path:

```text
GET /api/dashboard/summary
```

Auth remains required. No new route, package, SQL, env, migration, deploy, or production config was added.

Response shape change:

Each platform entry in `platforms` now includes the additive fields below:

```json
{
  "lastResult": "W",
  "lastGameId": "sleeper-league-1:7:3",
  "lastGameKickoff": null
}
```

Types:

```text
lastResult: "W" | "L" | null
lastGameId: string | null
lastGameKickoff: ISO8601 string | null
```

Example response excerpt:

```json
{
  "platforms": {
    "sleeper": {
      "connected": true,
      "username": "sleepy",
      "lastResult": "W",
      "lastGameId": "sleeper-league-1:7:3",
      "lastGameKickoff": null
    },
    "yahoo": {
      "connected": true,
      "league_id": "449.l.123",
      "lastResult": null,
      "lastGameId": null,
      "lastGameKickoff": null
    },
    "espn": {
      "connected": false,
      "lastResult": null,
      "lastGameId": null,
      "lastGameKickoff": null
    }
  }
}
```

State handling:

- Omen uses the previous regular-season week only. Week 1 has no prior matchup, so all fields remain `null`.
- Missing, tied, unavailable, or unsafe provider results return `lastResult: null`.
- Provider lookup failures do not fail the dashboard summary; the fields stay null.
- `lastGameKickoff` is present for contract stability but remains `null` in v1 because the fantasy matchup sources used here do not expose a real kickoff timestamp. Do not fake this on the frontend.

Mock vs live data:

- These fields are derived from connected provider data when available.
- They are not mock data and should not be used when `connected` is false.
- Null means "no safe result available," not "loss."

Known limitations:

- ESPN uses the existing private v3 API adapter and remains fragile.
- Raw ESPN cookies, Vault ids, auth headers, and raw ESPN responses are never returned.
- This is a fantasy matchup result, not an NFL favorite-team result.

Frontend action needed:

- Phase 1.5d may trigger the post-win pulse when any selected/active platform row has `lastResult === "W"`.
- Use `lastGameId` for localStorage "already seen" suppression.
- Ignore `null` fields. Do not infer a win/loss from standings, points, or missing data client-side.

Files changed:

- `src/routes/dashboard.js`
- `src/adapters/sleeper.js`
- `src/adapters/yahoo.js`
- `src/adapters/espn.js`
- `src/services/yahoo.js`
- `test/dashboardSummary.test.js`
- `test/sleeperAdapter.test.js`
- `test/yahooAdapter.test.js`
- `test/espnAdapter.test.js`

## Phase 2.10 Trade Share Hash Routes — 2026-06-25

Feature name: Trade Analyzer share hash routes.

Status: Deployed. PR #68 merged to `main` as merge commit `bfefbf1`; KVM1 deploy run `28192331330` passed quality, image build/push, restart, and workflow health smoke.

Method and path:

```text
POST /api/trade/share
GET /api/trade/share/:hash
```

Both routes are public and use the existing `/api/trade` public-tool rate limit. No auth, subscription, provider connection, Supabase query, ESPN cookie, LLM call, or frontend route is required.

Storage behavior:

- Production uses existing Upstash Redis env (`REDIS_URL` + `REDIS_TOKEN`) with a 30-day TTL.
- Test/dev falls back to in-process memory so local tests do not need Redis.
- Production without Redis returns `503 trade_share_storage_unavailable`; it does not silently store public shares in memory.

Create request:

```json
{
  "send": [
    {
      "name": "Bench RB",
      "position": "RB",
      "team": "SEA",
      "projected_points": 10,
      "status": null
    }
  ],
  "receive": [
    {
      "name": "Starter WR",
      "position": "WR",
      "team": "DET",
      "projected_points": 14
    }
  ],
  "scoring_format": "ppr"
}
```

Request rules:

- `send` and `receive` are the same public Trade Analyzer player arrays used by `POST /api/trade/compare`.
- Each side must contain 1-10 player objects.
- `scoring_format` is optional and defaults to `ppr`; allowed values are `ppr`, `half_ppr`, `standard`.
- The route recomputes the public trade snapshot server-side from allowed player fields (`name`, `position`, `team`, `status`, `player_key`, `projected_points`). It does not store arbitrary client-supplied result objects.
- Payloads over 16 KB are rejected.
- Credential-like keys anywhere in the request body are rejected before storage: `cookie`, `espn_s2`, `swid`, `token`, `secret`, `authorization`, `password`.

Create response:

```json
{
  "contract_version": "trade-share.v1",
  "hash": "36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30",
  "api_path": "/api/trade/share/36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30",
  "expires_at": "2026-07-25T18:28:00.000Z"
}
```

Read response:

```json
{
  "contract_version": "trade-share.v1",
  "hash": "36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30",
  "is_public": true,
  "source": "trade_analyzer",
  "created_at": "2026-06-25T18:28:00.000Z",
  "expires_at": "2026-07-25T18:28:00.000Z",
  "trade": {
    "send": [
      {
        "name": "Bench RB",
        "position": "RB",
        "team": "SEA",
        "projected_points": 10
      }
    ],
    "receive": [
      {
        "name": "Starter WR",
        "position": "WR",
        "team": "DET",
        "projected_points": 14
      }
    ],
    "scoring_format": "ppr"
  },
  "result": {
    "net_value": 2.5,
    "verdict": "accept",
    "confidence": "medium",
    "scoring_format": "ppr"
  }
}
```

The actual `result` object also includes the existing Trade Analyzer math fields (`send`, `receive`, `a_score`, `b_score`, `combined_score`, `depth_discounted`, `scarcity_analysis`, `generated_at`). It intentionally does not include LLM `explanation`, because the share route should not invoke narration or trust client-supplied free text.

Error responses:

```text
400 invalid_trade_share_hash
400 trade_share_body_required
400 trade_share_sensitive_field
400 send must be a non-empty array
400 receive must be a non-empty array
400 scoring_format must be one of ppr, half_ppr, standard
413 trade_share_payload_too_large
404 trade_share_not_found
503 trade_share_storage_unavailable
```

Frontend guidance:

- Call `POST /api/trade/share` after a Trade Analyzer result exists, using the same `send`, `receive`, and `scoring_format` values that produced that result.
- Use `api_path` for API reads. A public frontend page such as `/trade/share/:hash` can map to the same hash later.
- Treat read responses as public, deterministic snapshots. They are not live platform data and should not be labeled as Sleeper/Yahoo/ESPN-backed.
- If Redis is unavailable and the create call returns `503`, show a retryable share-error state rather than hiding the failure.

Files changed:

- `src/routes/trade.js`
- `src/services/tradeShareStore.js`
- `test/tradeShareRoute.test.js`
- `Blueprints/api-routes.md`

## Phase 2.8 Sleeper Live Draft Tracking — 2026-06-19

Feature name: Sleeper live draft tracking (debounced Lazy Sync).

Status: Deployed. Baseline PR #53 is superseded by the audited high-frequency ownership/privacy hardening in PR #56 (`b1ec05d`), deployed through KVM1 run `27853988393`.

Method and path:

```text
GET /api/sleeper/draft?leagueId=<id>
GET /api/sleeper/draft/:draftId
GET /api/sleeper/draft/:draftId/state?since=<int>
```

All three routes require auth (same pattern as `GET /api/sleeper/roster`). Subscription is not required.

Request body or query:

```text
GET /api/sleeper/draft
  Query:
    - leagueId (required, string)  Sleeper league id

GET /api/sleeper/draft/:draftId
  Path:
    - draftId (required, string)   Sleeper draft id

GET /api/sleeper/draft/:draftId/state
  Path:
    - draftId (required, string)
  Query:
    - since   (optional, integer ≥ 0, default 0)
              Highest pick_no the caller already has.
              The response only returns picks with pick_no > since.
```

Response shape:

```text
contract_version: "sleeper-draft-list.v1"  | "sleeper-draft-meta.v1" | "sleeper-draft-state.v1"
generated_at:     ISO8601 string
```

Draft list (`sleeper-draft-list.v1`):

```text
{
  contract_version,
  generated_at,
  league_id: string,
  drafts: [
    {
      draft_id, league_id, status, type, sport, season, season_type,
      settings: { teams, rounds, pick_timer },
      start_time, created
    }
  ]
}
```

Draft meta (`sleeper-draft-meta.v1`):

```text
{
  contract_version,
  generated_at,
  draft_id: string,
  draft: {
    draft_id, league_id, status, type, sport, season, season_type,
    settings: { teams, rounds, pick_timer },
    start_time, created,
    user_draft_slot: number | null,
    slot_to_roster_id: { [slot]: roster_id } | null,
    last_picked, last_message_time
  }
}
```

Draft state (`sleeper-draft-state.v1`):

```text
{
  contract_version,
  generated_at,
  draft_id: string,
  status: "pre_draft" | "drafting" | "paused" | "complete" | "unknown",
  type, season,
  settings: { teams, rounds, pick_timer },
  cursor: { since: int, latest: int },
  total_picks:  int,
  total_slots:  int,        // teams * rounds, 0 if unknown
  current_pick: int | null, // null when status === "complete"
  on_the_clock: {
    pick_no, round, draft_slot, roster_id
  } | null,
  picks_since: [
    {
      pick_no, round, draft_slot, roster_id, player_id,
      is_user_pick, is_keeper,
      metadata: { first_name, last_name, team, position, status, injury_status, years_exp }
    }
  ],
  has_new_picks: boolean,
  poll_after_seconds: number, // recommended next poll
  debounce_ms: number         // advisory client-side debounce floor (default 2000)
}
```

Example response (`/api/sleeper/draft/draft-1/state?since=0`):

```json
{
  "contract_version": "sleeper-draft-state.v1",
  "generated_at": "2026-06-19T18:42:11.014Z",
  "draft_id": "draft-1",
  "status": "drafting",
  "type": "snake",
  "season": "2026",
  "settings": { "teams": 12, "rounds": 15, "pick_timer": 60 },
  "cursor": { "since": 0, "latest": 2 },
  "total_picks": 2,
  "total_slots": 180,
  "current_pick": 3,
  "on_the_clock": { "pick_no": 3, "round": 1, "draft_slot": 3, "roster_id": 13 },
  "picks_since": [
    {
      "pick_no": 1, "round": 1, "draft_slot": 1, "roster_id": 11,
      "player_id": "100", "is_user_pick": true, "is_keeper": false,
      "metadata": { "first_name": "Pat", "last_name": "Mahomes", "team": "KC", "position": "QB", "status": null, "injury_status": null, "years_exp": null }
    },
    {
      "pick_no": 2, "round": 1, "draft_slot": 2, "roster_id": 12,
      "player_id": "200", "is_user_pick": false, "is_keeper": false,
      "metadata": { "first_name": "Justin", "last_name": "Jefferson", "team": "MIN", "position": "WR", "status": null, "injury_status": null, "years_exp": null }
    }
  ],
  "has_new_picks": true,
  "poll_after_seconds": 2,
  "debounce_ms": 2000
}
```

`poll_after_seconds` defaults:

```text
pre_draft → 30s
drafting  → 2s
paused    → 30s
complete  → 30s
unknown   → 30s
```

Files changed:

```text
src/adapters/sleeper.js                       (added fetchSleeperLeagueDrafts / fetchSleeperDraft / fetchSleeperDraftPicks + Redis micro-cache)
src/services/sleeperDraft.js                  (new — envelope shaping + snake/linear on-the-clock math)
src/services/sleeperDraftAccess.js            (authenticated connection ownership lookup + bounded 30s cache)
src/routes/sleeper.js                         (added /draft, /draft/:draftId, /draft/:draftId/state under requireAuth)
test/sleeperDraftService.test.js              (new — 14 tests, pure shaping)
test/sleeperDraftRoute.test.js                (new — 11 tests, route + 400/404/200)
test/sleeperDraftAdapter.test.js              (new — 4 tests, adapter null/empty fallbacks)
```

Limitations:

- Snake / linear / standard draft types are supported. Auction drafts are not modeled by `computeOnTheClock` — they get `on_the_clock: null`, and the Sleeper draft `type` field passes through unchanged for the frontend to detect.
- `poll_after_seconds` and `debounce_ms` are advisory hints. Active metadata/picks use a 2-second Redis cache; low-mode callers wait 30 seconds. The global limiter, single-flight dedupe, and 900-call/minute process budget protect upstream Sleeper when Redis is unavailable.
- IDP / DEF positions in picks are passed through verbatim from Sleeper metadata; no Corvus-side enrichment.
- Each route requires auth and verifies the requested league/draft against the user's active Sleeper connection. Other managers' raw Sleeper user IDs are not returned.

How frontend should call it:

```js
// Initial load — pick a draft from the league:
const list = await fetch(`/api/sleeper/draft?leagueId=${leagueId}`, {
  headers: { Authorization: `Bearer ${session.access_token}` }
}).then(r => r.json());

const draftId = list.drafts.find(d => d.status === "drafting" || d.status === "pre_draft")?.draft_id;

// Then poll state with a cursor:
let since = 0;
async function tick() {
  const res = await fetch(`/api/sleeper/draft/${draftId}/state?since=${since}`, {
    headers: { Authorization: `Bearer ${session.access_token}` }
  }).then(r => r.json());

  if (res.has_new_picks) {
    appendPicks(res.picks_since);
    since = res.cursor.latest;
  }
  setOnTheClock(res.on_the_clock);
  setStatus(res.status);

  const delayMs = Math.max(res.poll_after_seconds * 1000, res.debounce_ms);
  setTimeout(tick, delayMs);
}
```

Always respect `Math.max(poll_after_seconds * 1000, debounce_ms)` — never spam below the debounce floor. When `status === "complete"`, stop polling and treat the cached state as final.

## Phase 1 ADP And League Scoring Schema - 2026-06-12

Feature name: Phase 1 launch readiness / Draft Assistant data foundation.

Status: Prepared locally as review-only SQL. Not applied to Supabase. Not deployed.

Method and path:

```text
No HTTP endpoint changed.
Review SQL only: sql/2026-06-12_phase1_adp_scoring_schema_review.sql
```

Request body or query:

```text
None. This is database schema preparation, not a callable frontend contract yet.
```

Response shape:

Prepared tables:

```text
public.adp_sources
public.adp_player_rankings
public.league_scoring_configs
public.league_scoring_rules
public.league_roster_slots
public.league_scarcity_weights
```

Access model:

```text
ADP tables:
- backend/service_role read-write only
- no anon/authenticated direct Data API access

League scoring config tables:
- service_role read-write
- authenticated users may select only configs they own through RLS
- no authenticated browser insert/update/delete grants yet
```

Example response:

```json
{
  "contract_version": "phase1-adp-scoring-schema.v1",
  "status": "prepared_not_applied",
  "tables": [
    "adp_sources",
    "adp_player_rankings",
    "league_scoring_configs",
    "league_scoring_rules",
    "league_roster_slots",
    "league_scarcity_weights"
  ]
}
```

Files changed:

- `sql/2026-06-12_phase1_adp_scoring_schema_review.sql`
- `test/phase1SchemaReviewSql.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`

Limitations:

- SQL has not been applied to Supabase. Justin approval is still required before any migration/apply action.
- No ADP ingestion job or API route was added in this step.
- No math engine refactor was performed. The schema is ready for Phase 2 parameterization but does not version the engine.
- No Sleeper/Yahoo/ESPN live draft tracking was added.
- No `AI_PROVIDER` toggle was added.

How frontend should call it:

- No frontend call change.
- Keep using existing Draft Assistant endpoints.
- Do not show ADP/scoring config as live platform-backed data until backend confirms the SQL was approved, applied, populated, and exposed through an API contract.

## Tuesday Scoring Nflverse Adapter - 2026-06-05

Feature name: Tuesday scoring / Omen calibration loop.

Status: Completed locally. Not deployed. `CORVUS_CRON_SCORING_ENABLED` remains disabled.

Method and path:

```text
Worker only: node src/corvus_tuesday_cron.js
Service helper: matchupService.getPlayerActualPoints(playerName, week, season)
```

Request shape:

```js
await getPlayerActualPoints("Amon-Ra St. Brown", 7, 2026)
await fetchNFLScores({ season: 2026, weekNum: 7, redis })
```

Response shape:

`getPlayerActualPoints(playerName, week, season)` returns:

```json
{
  "actual_points": 24.6,
  "player_name_matched": "Amon-Ra St. Brown"
}
```

or `null` when nflverse data is unavailable or no player row matches.

`fetchNFLScores({ season, weekNum })` now returns the same scoring map shape the cron already expects:

```json
{
  "amonra_st_brown": {
    "name": "Amon-Ra St. Brown",
    "rush": 0,
    "rec_ppr": 24.6,
    "rec_half": 22.1,
    "rec_std": 19.6,
    "pass": 0
  }
}
```

Scoring math:

- Rushing: `rushing_yards * 0.1 + rushing_tds * 6`
- Receiving PPR: `receiving_yards * 0.1 + receiving_tds * 6 + receptions`
- Receiving Half PPR: `receiving_yards * 0.1 + receiving_tds * 6 + receptions * 0.5`
- Receiving Standard: `receiving_yards * 0.1 + receiving_tds * 6`
- Passing: `passing_yards * 0.04 + passing_tds * 4 - interceptions * 2`

Example response:

```json
{
  "dual_threat": {
    "name": "Dual Threat",
    "rush": 10,
    "rec_ppr": 16,
    "rec_half": 13.5,
    "rec_std": 11,
    "pass": 16
  }
}
```

Files changed:

- `src/services/matchupService.js`
- `src/corvus_tuesday_cron.js`
- `test/matchupService.test.js`
- `test/cronHardening.test.js`
- `test/nflverseScoring.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`
- `Blueprints/handoffs/decisions.md`

Limitations:

- This is local code plus fixture validation only. No production cron run, deploy, Supabase mutation, or secret/config change happened.
- `REQUIRED_SCORING_ENV` now requires only `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`; `SPORTRADAR_API_KEY` is no longer required for nflverse scoring.
- The old Sportradar fetch body remains isolated as `fetchSportradarScores()` for future fallback/reference, but the exported `fetchNFLScores()` path is nflverse-backed.
- `CORVUS_CRON_DRY_RUN=true` runs scoring logic without writing move outcomes or archive updates. It logs what would be scored.
- Enablement still needs an approved dry-run against real Supabase data and confirmation that all scoreable Omen rows have reliable `target_player`, `season`, `week_num`, `scoring`, and `confidence` values.

How frontend should call it:

- No frontend call change.
- Keep Move History and effectiveness UI in pending/unscored states until backend confirms a deployed dry-run passed and `CORVUS_CRON_SCORING_ENABLED=true` is intentionally enabled.

## Tuesday Scoring Provider Decision - 2026-06-05

Feature name: Tuesday scoring / Omen calibration loop.

Status: Decision documented. Backend implementation still pending. Cron remains disabled.

Provider decision:

- First launch scoring should use `nflverse-data` weekly player stats.
- The existing `src/corvus_tuesday_cron.js` Sportradar fetch path is not launch-ready for real user data.
- Sportradar is deferred unless the backend later implements the correct schedule -> game id -> game statistics flow and validates that shape.

Required scoring data shape:

- `season`
- `week`
- stable player id where available
- player display name
- NFL team
- fantasy position
- weekly passing, rushing, receiving, and turnover stats
- computed fantasy points for PPR, half-PPR, and standard, or enough raw stats to compute them deterministically

Required backend work before enablement:

- Add/rework a scoring provider adapter around `nflverse-data` weekly player outcomes.
- Persist enough Omen recommendation metadata in `moves` to score reliably: target player id/name, recommendation type, confidence, scoring format, season, week, platform, and league/team context where safe.
- Score by each move row's stored `season` and `week_num`, not one wall-clock computed week for all rows.
- Keep `followed = true` as the only scoring gate. `followed = false` and `followed = null` must not be scored as wins/losses.
- Add fixture tests for provider parsing and scoring math.
- Add dry-run validation before any real Supabase mutation.

Frontend action needed:

- None yet. Keep Tuesday scoring/results UI in pending/unscored states until backend explicitly ships and validates the nflverse scoring adapter.
- Do not present `effectiveness_pct`, wins/losses, or Tuesday scoring as live for new rows unless the backend confirms cron scoring is enabled and validated.

## Trade Analyzer Player Search - 2026-06-05

Feature name: Trade Analyzer Phase 2 player autocomplete.

Status: Completed locally. Not deployed.

Method and path:

```text
GET /api/players/search
```

Auth: none required. The route is public and uses the same public-tool rate limiter as Trade Analyzer and Draft Assistant.

Request query:

```text
q=<partial player name>
position=<QB|RB|WR|TE|K|DEF> optional
limit=<1-10> optional, capped at 10
```

Examples:

```text
GET /api/players/search?position=RB&q=pat
GET /api/players/search?q=cj
GET /api/players/search?position=D/ST&q=eagles
```

Response shape:

```json
[
  {
    "id": "sleeper:100",
    "name": "Patrick Mahomes",
    "position": "QB",
    "team": "KC",
    "projected_points": null
  }
]
```

Example response:

```json
[
  {
    "id": "sleeper:100",
    "name": "Patrick Mahomes",
    "position": "QB",
    "team": "KC",
    "projected_points": null
  }
]
```

Error responses:

Invalid position returns `400`:

```json
{
  "error": "position must be one of QB, RB, WR, TE, K, DEF",
  "code": "player_search_invalid_position"
}
```

Public player source unavailable returns `503`:

```json
{
  "error": "Player search source unavailable",
  "code": "player_search_source_unavailable"
}
```

Files changed:

- `src/services/playerSearch.js`
- `src/routes/players.js`
- `src/server.js`
- `test/playerSearch.test.js`
- `test/playersRoute.test.js`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`

Limitations:

- Source is the public Sleeper NFL player map, cached in process for autocomplete stability. This is not a paid dependency.
- `projected_points` is included for frontend compatibility but returns `null` in v1 unless the source provides a numeric projection. Do not display null projections as live advice.
- Blank `q` returns `[]` so the UI does not dump a large player list before the user types.
- If the public player source is unavailable, keep using `frontend/src/data/nflPlayers.js` as the offline fallback.

How frontend should call it:

- Use it as the Phase 2 replacement for `frontend/src/data/nflPlayers.js` autocomplete.
- Debounce user typing and call with the selected position where available.
- Read the response as a JSON array, not an envelope.
- Show up to the returned rows directly in the autocomplete menu.
- On `503 player_search_source_unavailable`, fall back to the existing static `searchPlayers(position, query)` helper.

## ESPN Connect Input Normalization — 2026-06-04

Date: 2026-06-04
Owner: Codex/backend
Feature: ESPN guided connect recovery
Status: Completed locally. Not deployed.

Context:
- Justin was signed into `https://fantasy.espn.com/football/league?leagueId=2114292181`.
- ESPN's own league API returned JSON in the same browser session, proving the browser session and league id were valid.
- Corvus still returned the user-facing `espn_cookies_invalid` error from `POST /api/platforms/espn/connect`.

Root cause:
- Backend accepted only raw cookie values and a raw numeric league id.
- Real browser copy flows can produce `espn_s2=...`, `SWID=...`, trailing semicolons/spaces, URL-encoded SWID braces, or a full ESPN league URL.
- Those pasted formats were sent to ESPN as malformed cookie values, making a valid ESPN session look invalid.

Patch completed:
- `POST /api/platforms/espn/connect` now normalizes ESPN inputs before validation and Vault storage.
- Accepted ESPN S2 formats now include raw value, `espn_s2=<value>`, and cookie-header style fragments.
- Accepted SWID formats now include raw `{uuid}`, `SWID={uuid}`, and URL-encoded `%7Buuid%7D`.
- Accepted league id formats now include raw numeric id, `leagueId=<id>`, `league_id=<id>`, and full ESPN league URLs.
- Raw ESPN cookies are still never logged, echoed, or exposed in responses.

Contract impact:
- No frontend request or response shape changed.
- Existing `ConnectLeague.jsx` can keep posting `{ espn_s2, swid, league_id }`.
- Existing error handling remains valid. The backend still returns safe user-facing errors for missing cookies, missing league id, cookie rejection, and league/team mismatch.

Verification:
- Focused ESPN/platform tests passed: `node --test test/platforms.test.js test/espnAdapter.test.js test/leagueStandingsRoute.test.js` — 29/29.
- Full backend suite passed: `npm test` — 262/262.

Frontend action needed:
- None required before deploy.
- After backend deploy, retry ESPN connect from `/account/connect` using the same form. It should now tolerate copied cookie pairs and a full ESPN league URL.
- Optional later polish: update helper copy to explicitly say Corvus accepts either raw values or copied `name=value` cookie text.

---

## Stripe Webhook Recovery Follow-Up — 2026-06-04

Date: 2026-06-04
Owner: Codex/backend
Feature: Tomorrow-ready Stripe webhook resend hardening
Status: Prepared locally. Not deployed.

Context:
- Stripe resend still showed `500 ERR` with response body `{ "error": "handler failure" }`.
- Account UI already showed `Corvus Pro · Active`, so the user state appears to have been persisted by another successful event. The remaining failed delivery is likely an older retry/event shape that cannot safely mutate subscription state.

Patch prepared:
- `checkout.session.completed` now acknowledges safely if neither subscription lookup nor Checkout Session metadata can map the event to a Corvus `userId`.
- Subscription-created/updated fallback lookups are wrapped so Stripe API lookup failures do not turn old unmapped events into webhook `500`s.
- If a webhook is acknowledged without subscription mutation, logs include safe event diagnostics: Stripe event id, object id, customer id, event type, and reason. No secrets or raw payloads are logged.
- True persistence failures still return `500` so Stripe can retry real database errors.

Tomorrow deploy/validation:
- Deploy the prepared patch.
- Resend the failed Stripe event.
- Expected result for already-accounted old event: `200` with no Account state regression.
- If it still returns `500`, inspect `corvus_api` logs for `eventId`, `objectId`, `stripeCustomerId`, and the persistence error.

Verification:
- `node --check src\routes\stripe.js`
- `node --test test\stripeRoute.test.js` passed 14/14.
- `node --test` passed 260/260.

Frontend action needed:
- None.

---

## Omen Live Fast Default — 2026-06-03

Date: 2026-06-03
Owner: Codex/backend
Feature: `POST /api/omen/mvp-move` launch latency
Status: Backend patch prepared.

Problem:
- The mounted Omen frontend sends `POST /api/omen/mvp-move` with body `{}`.
- Backend treated missing `include_signals.llm_reasoning` as enabled.
- A cold or slow Gemma/Ollama call could therefore hold the whole live Omen response for roughly the LLM timeout window, even though the deterministic recommendation was already available.

Contract adjustment:
- Live non-mock requests now default to deterministic Omen only when `llm_reasoning` is omitted.
- Explicit opt-in still works:

```json
{
  "include_signals": {
    "llm_reasoning": true
  }
}
```

Frontend action:
- For launch, keep the current live request body as `{}`.
- Do not add `llm_reasoning: true` to the mounted Omen call unless Justin explicitly accepts the slower Gemma wait.
- The response contract is otherwise unchanged; fallback/template explanation remains valid.

Verification:
- Focused Omen tests passed: `node --test test/omenMvpLiveRoute.test.js test/omenRoute.test.js` — 36/36.

---

## Move History `eff` Column Repair — 2026-06-03

Date: 2026-06-03
Owner: Codex/backend
Feature: Request 24 — Move History / History tab production error
Status: Resolved in Supabase and patched in repo SQL.

Problem:
- `GET /api/moves` selects `eff`.
- Live `public.moves` did not have `eff` because the table existed before the CREATE TABLE definition included it, and the later ALTER repair block omitted it.
- Result: History tab could show "Couldn't load history" from the missing-column backend failure.

Supabase repair applied:

```sql
alter table public.moves
  add column if not exists eff integer;
```

Applied migration: `20260603164638_add_moves_eff_column`

Verification:
- Live schema confirmed `public.moves.eff` exists as `integer`.
- Production `/api/health` returned `status: ok` and `service: corvus-api`.
- Production `/api/ready` returned `status: ready`.
- Focused local tests passed: `node --test test/securitySql.test.js test/movesRoute.test.js` — 13/13.

Frontend action:
- No frontend code change is required for the missing-column failure.
- `GET /api/moves` should now return an empty/list response instead of failing because `eff` is missing.
- Treat `effectiveness_pct: null` as pending or unscored.

---

## UX Audit + Font System + Team Identity — 2026-05-30

Date: 2026-05-30
Owner: Claude/frontend
Feature: Track A (font system + CSS token sweep), Track B (team identity layer), Track C (atomic identity schema split)
Status: All three tracks complete and pushed to remote.

Commits: Track A `31a308e` · Track B `385dbb4` · Track C `d16c48b`

Track A — Font system + CSS token sweep:
- Initial font spec: Barlow Condensed (display), DM Sans (body/UI), DM Mono (data), Cormorant Garamond (brand-only). **Superseded by PR #22** — see font system note below.
- `index.css` base layer: `h1, h2 { @apply font-display; }`.
- Full CSS token sweep across TradeAnalyzer.jsx, DraftAssistant.jsx, Account.jsx, Football.jsx — all hardcoded `amber-*`/`slate-*` replaced with `var(--color-*)` tokens. Team theme now applies universally.

**Font system update:** PR #22's Cormorant direction is superseded by the 2026-06-15 brand decision. Production stack is now Alegreya Sans (`font-display` + headings/UI) + Alegreya (`font-serif` + body text) + DM Mono (`font-mono`, data). Cormorant Garamond is rejected; see `Brand/brand-system.md` and `decisions.md` for the authoritative spec.

Track B — Team identity layer:
- `nflTeams.js`: `cultureTag` + `wardRoom` fields added for all 32 teams.
- `TeamTheme.jsx`: GM-framing h1, font-display abbr in tiles, identity pill + wardRoom statement block.
- `Account.jsx`: Appearance section added, linking to `/account/appearance`.

Track C — Atomic identity schema:
- `nflTeams.js`: identity split into 4 atomic fields — `cultureTag`, `cry`, `wardRoom`, `lore` (optional, 5 teams).
- `TeamTheme.jsx`: 4-level visual hierarchy — pill → chant (65% opacity) → statement (full weight) → deep-cut (45% opacity).
- Fields independently deployable; `cry` planned for Omen loading state in a future pass.

Frontend action needed:
- None. All three tracks are shipped.
- Next build: Trade Analyzer form rework (position-first layout + autocomplete from `nflPlayers.js`) — frontend-only, no backend dependency.

---

## Active Context — Last updated 2026-06-02

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit and waiver logic live inside Omen / MVP Move unless separated later.

**Frontend state as of 2026-06-02 (PR #22, run `26833528435`):**
- Navigation: hamburger + `NavDrawer` sidebar with all routes. Logo slot is a `[C]` monogram placeholder.
- `/account/appearance` — Team Theme page live. Calls `PATCH /api/account/preferences`; backend route and `profiles.favorite_team` storage are deployed.
- `App.jsx` — hydrates team theme from `GET /api/dashboard/summary.user.favorite_team` on sign-in; falls back to localStorage.
- `OmenFeedback.jsx` — wired below Omen success state. Calls `POST /api/omen/feedback`; handles `200`, `401`, `422`, `500`.
- `MoveHistory.jsx` — wired to `GET /api/moves`; mounted on Football page "History" tab.
- `LeagueStandings.jsx` — wired to `GET /api/league/standings`; mounted above the tab bar on Football page; handles all documented error codes.
- `Account.jsx` — pricing display calls `GET /api/stripe/prices` via `fetchStripePrices()`; null-safe fallback in place.
- `frontend/src/data/nflTeams.js` — 32-team color strategy in place.
- `frontend/src/data/nflPlayers.js` — ~350-player roster for Trade Analyzer Phase 1 autocomplete.
- Trade Analyzer Phase 1 intentionally omits user-entered Projection and Status fields; Corvus should infer/enrich those signals during analysis.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- User-facing reasoning should stay plain-English.

## Tier 2 Frontend Build Packet — 2026-06-02 (completed)

Date: 2026-06-02
Owner: Claude/frontend
Status: **All five Tier 2 items built and deployed** as part of PR #22 (run `26833528435`).

Completed:
- Account pricing display: `Account.jsx` calls `GET /api/stripe/prices` via `fetchStripePrices()`; live prices shown when Stripe is configured; null-safe fallback copy for unavailable prices.
- Omen feedback hardening: `OmenFeedback.jsx` calls real `POST /api/omen/feedback`; handles `200`, `401`, `422`, and `500`; renders below Omen success state only (not mock mode).
- Team theme hydration: `App.jsx` reads `summary.user.favorite_team` on `SIGNED_IN` / `INITIAL_SESSION` auth events; applies CSS vars immediately; falls back to localStorage for returning users.
- Move History / Hall of Records: `MoveHistory.jsx` calls `GET /api/moves`; renders summary stats, move rows, loading skeleton, empty state, and error/retry. Mounted on Football page "History" tab.
- League Standings: `LeagueStandings.jsx` calls `GET /api/league/standings`; handles `league_not_connected` (panel hides), `*_reconnect_required` (reconnect CTA), and generic errors (retry CTA). Mounted above tab bar on Football page.

No new backend endpoints are required for Tier 2. Future Phase 2 endpoints remain `GET /api/players/search` and `GET /api/trade/pulse`.

---

## Tier 2 Smoke Runner — 2026-06-04

Date: 2026-06-04
Owner: Codex/backend
Feature: Authenticated smoke testing for Tier 2 endpoints
Status: Completed. Authenticated production smoke passed 13/13 checks on 2026-06-04.

Script:

```text
scripts/smoke-tier2-endpoints.js
```

Endpoints covered:
- `GET /api/stripe/prices`
- `PATCH /api/account/preferences`
- `POST /api/omen/feedback`
- `GET /api/moves`
- `GET /api/league/standings`

Production evidence collected:
- `GET /api/stripe/prices` returned `200`, `contract_version: stripe-prices.v1`, source `stripe`, with Monthly `$5/mo` and Season `$20`.
- Protected endpoint auth guards returned `401` without a bearer token for preferences, feedback, moves, and standings.
- Authenticated dashboard summary returned `200` with `user.favorite_team` present.
- `PATCH /api/account/preferences` succeeded, changed favorite team to `BAL`, dashboard summary rehydrated `BAL`, then restore succeeded back to `MIA`.
- `POST /api/omen/feedback` succeeded for smoke target season `2099`, week `1`; returned `recorded: true` with a move id present.
- `GET /api/moves?season=2099&limit=5` returned `200`, `contract_version: moves-history.v1`, `total_count: 1`, and found the smoke feedback move.
- `GET /api/league/standings` returned `200`, `contract_version: league-standings.v1`, platform `sleeper`, league id present, and `12` standings rows.
- Auth token was cleared from the shell after the run.

Local contract verification:
- Targeted Tier 2 backend tests passed: 29/29.
- Covered account preferences, Omen feedback idempotence, Move History, League Standings provider paths, and Stripe price/checkout/portal/webhook contracts.

How to run the full authenticated smoke:

```text
CORVUS_BASE_URL=https://slopssaloon.com
CORVUS_AUTH_TOKEN=<supabase-access-token>
CORVUS_TIER2_WRITE=1
node scripts/smoke-tier2-endpoints.js
```

Notes:
- The script reads the token only from the process environment and never prints it.
- `CORVUS_TIER2_WRITE=1` is required before the script writes preferences or feedback.
- Preference smoke restores the original `summary.user.favorite_team`.
- Feedback smoke writes/upserts one `moves` row for the authenticated user by `season + week`; use a test account for production smoke.
- Default feedback target is season `2099`, week `1` to keep smoke data out of the current-season Move History unless overridden.

Frontend action needed:
- None. Tier 2 authenticated production smoke is complete.

---

## SPA Cache Header Fix — 2026-06-04

Date: 2026-06-04
Owner: Codex/backend
Feature: Production SPA deploy freshness
Status: Fixed locally. Needs normal review/deploy before production headers change.

Problem:
- Production was serving `index.html` with `Cache-Control: public, max-age=2592000`.
- Browsers could keep an old SPA shell after deploy, causing stale asset references or an unstyled page.

Fix:
- `index.html` now gets `Cache-Control: no-cache, must-revalidate`, plus legacy `Pragma: no-cache` and `Expires: 0`.
- Static Vite assets keep the existing long cache behavior.
- The same index cache headers are applied to both `/` via static serving and client-route SPA fallback responses.

Files changed:
- `src/middleware/spaCache.js`
- `src/server.js`
- `test/spaCache.test.js`

Verification:
- `node --test test/spaCache.test.js` passed 3/3.
- `node --test` passed 244/244.

Frontend action needed:
- None.
- After deploy, hard-refresh once if a browser already has the old 30-day cached shell.

---

## Stripe Webhook Hardening — 2026-06-04

Date: 2026-06-04
Owner: Codex/backend
Feature: Stripe subscription-created webhook recovery
Status: Completed locally. Needs normal review/deploy before production webhook behavior changes.

Why this happened:
- Stripe dashboard showed `500 ERR` for `customer.subscription.created` delivered to `https://slopssaloon.com/api/stripe/webhook`.
- The webhook activation path requires a Corvus `userId`.
- Monthly checkout stored `userId` on the Checkout Session, but `customer.subscription.created` can arrive as a Subscription object without that metadata. That made the backend throw instead of persisting the subscription state.

Changes:
- `POST /api/stripe/checkout` now includes `subscription_data.metadata` for monthly subscriptions: `{ userId, plan }`.
- Subscription-created/updated webhooks now recover `userId` from:
  - Subscription metadata when present.
  - Existing Corvus subscription row by Stripe customer id.
  - Related Stripe Checkout Session metadata by subscription id.
- If a subscription event still cannot be mapped to a Corvus user, the webhook logs a safe warning and returns `200` without activating a subscription. This avoids repeated Stripe retries for an event the backend cannot safely attach.

Frontend action needed:
- None. Account checkout, portal, and pricing contracts are unchanged.

Ops action after deploy:
- In Stripe dashboard, resend the failed `customer.subscription.created` event and confirm delivery returns `200`.
- Then verify the test user's Account/dashboard subscription state.

Verification:
- `node --check src\routes\stripe.js`
- `node --check src\services\subscription.js`
- `node --test test\stripeRoute.test.js` passed 11/11.
- `node --test` passed 247/247.

---

## Backend Polish Batch — 2026-06-04

Date: 2026-06-04
Owner: Codex/backend
Feature: Launch-readiness backend polish
Status: Completed locally. Needs normal review/deploy before production behavior changes.

Changes:
- Added `GET /api/version` with safe deploy metadata under `system-version.v1`.
- Added `CORVUS_TIER2_CLEANUP=1` mode to `scripts/smoke-tier2-endpoints.js`; after Move History verifies the season/week smoke row, cleanup mode rewrites that same idempotent row to `followed=false`, `stars=null`, and a cleanup note.
- Added `Blueprints/api-routes.md` as the compact canonical/retired route reference.
- Standardized League Standings error envelopes under `league-standings-error.v1` with stable `error`, `code`, `message`, `action`, and optional `platform`.
- Cache-control tests for SPA `index.html` were already added as part of the SPA cache header fix.

New endpoint:

```text
GET /api/version
```

Example response:

```json
{
  "contract_version": "system-version.v1",
  "service": "corvus-api",
  "package_name": "corvus",
  "package_version": "1.0.0",
  "node_env": "production",
  "git_sha": "commit-or-null",
  "build_id": "build-or-null",
  "image_tag": "image-or-null",
  "generated_at": "2026-06-04T00:00:00.000Z"
}
```

League Standings error example:

```json
{
  "contract_version": "league-standings-error.v1",
  "error": "No connected league found",
  "code": "league_not_connected",
  "message": "Connect a Yahoo, Sleeper, or ESPN league before viewing standings.",
  "action": "connect_league"
}
```

Frontend action needed:
- No required changes. Existing `error` and `code` fields remain.
- Claude may optionally use the new `message` and `action` fields for clearer League Standings recovery UI.

Verification:
- `node --test test\systemRoutes.test.js test\leagueStandingsRoute.test.js test\spaCache.test.js` passed 23/23.
- `node --test` passed 244/244.

---

## HITL Feedback + Team Preference Contracts — 2026-05-31

Date: 2026-05-31
Owner: Codex/backend
Feature: Frontend Requests 21 and 19
Status: Backend completed. Supabase SQL applied and verified as migration `20260531160851_apply_corvus_rls_security_full_setup`. Frontend wired and deployed in PR #22 (run `26833528435`).

### HITL Feedback Loop — `POST /api/omen/feedback`

Status: Built.

Method and path: `POST /api/omen/feedback`

Auth: Required Supabase bearer token.

Request body:

```json
{
  "followed": true,
  "stars": 4,
  "note": "Changed lineup last minute, worked out",
  "week": 1,
  "season": 2026
}
```

Response:

```json
{
  "recorded": true,
  "move_id": "uuid"
}
```

Behavior:
- Writes to `public.moves`.
- Uses backend column names: `week_num`, `season`, `followed`, `user_stars`, `user_note`.
- Idempotent by `user_id + week_num + season`: re-submitting the same week/season updates the existing move row instead of creating a duplicate.
- `followed = true` remains the Tuesday cron scoring gate. `followed = false` and `followed = null` are not scored.

Validation:
- `week` and `season` must be positive integers.
- `followed` must be boolean.
- `stars` may be `null` or an integer from 1 to 5.
- `note` may be `null` or a string; stored notes are trimmed and capped to 500 characters.

Frontend action needed:
- `OmenFeedback.jsx` can call this route after Omen success/empty state.
- On `200`, collapse the card into the recorded state.
- On `401`, route to login using existing auth flow.
- On `422` or `500`, keep the card open and show retry copy.

### Team Preference — `PATCH /api/account/preferences`

Status: Built.

Method and path: `PATCH /api/account/preferences`

Auth: Required Supabase bearer token.

Request body:

```json
{
  "favorite_team": "KC"
}
```

Clearing body:

```json
{
  "favorite_team": null
}
```

Response:

```json
{
  "updated": true,
  "favorite_team": "KC"
}
```

Behavior:
- Upserts `favorite_team` into `public.profiles` by `user_id`.
- String values are trimmed and uppercased.
- `null` clears the saved team.
- No team-set validation is performed by backend; frontend owns the allowed 32-team set.

Dashboard summary addition:

`GET /api/dashboard/summary` now includes:

```json
{
  "user": {
    "favorite_team": "KC"
  }
}
```

If no profile row exists or the user has not selected a team yet, `favorite_team` returns `null` rather than breaking the dashboard summary.

Frontend action needed:
- `TeamThemeProvider` should read `summary.user.favorite_team`.
- Account Appearance can keep optimistic localStorage behavior, then persist through `PATCH /api/account/preferences`.
- Treat `null` as Corvus default theme.

### SQL / Migration Notes

Local SQL file updated and applied: `sql/corvus_rls_security.sql`.

Supabase application:
- Applied as migration `20260531160851_apply_corvus_rls_security_full_setup`.
- Verified live `moves` repair columns: `followed`, `user_stars`, `user_note`, `outcome`.
- Verified live unique index `idx_moves_user_week_unique` on `(user_id, week_num, season)` so Supabase upsert is safe and idempotent.
- Verified live `profiles.favorite_team` column plus profile RLS/grants.
- Verified live subscription date columns, waitlist insert-only access, platform connection safe-column grants, and service-role Vault wrapper RPCs.

Approval boundary:
- Justin approved applying `sql/corvus_rls_security.sql`; the Supabase SQL gate for these contracts is cleared.
- No app deploy or production infrastructure change was performed.

Files changed:
- `src/routes/omen.js`
- `src/routes/account.js`
- `src/routes/dashboard.js`
- `src/server.js`
- `sql/corvus_rls_security.sql`
- `test/omenFeedbackRoute.test.js`
- `test/accountPreferencesRoute.test.js`
- `test/dashboardSummary.test.js`
- `test/securitySql.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`

Verified local checks:
- Latest full local baseline after later backend work: `npm test` passed 240/240.

## Move History Contract — 2026-05-31

Date: 2026-05-31
Owner: Codex/backend
Feature: Frontend Request 22
Status: Backend built and verified. Live Supabase `moves` feedback columns and idempotence index applied and smoke-tested. Frontend (`MoveHistory.jsx`) deployed in PR #22 (run `26833528435`).

### Move History — `GET /api/moves`

Status: Built.

Method and path: `GET /api/moves`

Auth: Required Supabase bearer token.

Query params:

- `season`: optional positive integer. Defaults to the current NFL season from backend week context.
- `limit`: optional integer from 1 to 100. Defaults to `20`.

Response:

```json
{
  "contract_version": "moves-history.v1",
  "generated_at": "2026-05-31T12:00:00.000Z",
  "season": 2026,
  "summary": {
    "wins": 1,
    "losses": 1,
    "pending": 1,
    "avg_effectiveness_pct": 63,
    "followed_count": 2,
    "total_count": 3
  },
  "moves": [
    {
      "id": "uuid",
      "season": 2026,
      "week": 8,
      "move_type": "start_sit",
      "recommendation": "Start Breece Hall over James Conner",
      "followed": true,
      "stars": 4,
      "outcome": "win",
      "effectiveness_pct": 84,
      "created_at": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```

Backend mapping:

- `week_num` -> `week`
- `headline` first, then `reasoning` -> `recommendation`
- `user_stars` -> `stars`
- `eff` -> `effectiveness_pct`
- missing `outcome` -> `pending`

Summary rules:

- `total_count`: number of returned rows after filters and limit.
- `followed_count`: returned rows where `followed === true`.
- `wins` / `losses`: followed rows only, with `outcome === "win"` or `"loss"`.
- `pending`: returned rows with `outcome === "pending"`.
- `avg_effectiveness_pct`: rounded average of `eff` for followed scored rows only; `null` when no followed scored rows exist.

Frontend action needed:

- Hall of Records / Move History can now call `GET /api/moves`.
- Treat empty `moves: []` as a real empty state, not an error.
- Treat `outcome: "pending"` as unscored.
- Do not calculate W/L totals on the client; use `summary`.

Verification:

- Live Supabase schema gate passed after approved repair: `followed`, `user_stars`, `user_note`, `outcome`, and unique `(user_id, week_num, season)` index are present.
- Live database idempotence smoke passed: same user/week/season updated one row and returned the same move id.
- Local focused checks passed: `node --test test\movesRoute.test.js test\omenFeedbackRoute.test.js test\securitySql.test.js test\deployHardening.test.js`.
- Full local checks passed after later backend work: `npm test` 240/240.

Files changed:

- `src/routes/moves.js`
- `src/server.js`
- `test/movesRoute.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`

## League Standings Contract — 2026-05-31

Date: 2026-05-31
Owner: Codex/backend
Feature: Frontend Request 23
Status: Backend built and verified. Canonical route restored; the old `410 legacy_route_retired` handler for this path was removed from the legacy v2 router. Frontend (`LeagueStandings.jsx`) deployed in PR #22 (run `26833528435`).

### League Standings — `GET /api/league/standings`

Status: Built.

Method and path: `GET /api/league/standings`

Auth: Required Supabase bearer token.

Query params:

- `platform`: optional. Allowed values: `yahoo`, `sleeper`, `espn`.
- `leagueId`: optional. If omitted, backend chooses the first usable active connection by priority: Yahoo, Sleeper, ESPN.

Response:

```json
{
  "contract_version": "league-standings.v1",
  "generated_at": "2026-05-31T12:00:00.000Z",
  "platform": "sleeper",
  "league_id": "league-1",
  "league_name": "The Commissioner's League",
  "season": 2026,
  "week": 8,
  "standings": [
    {
      "rank": 1,
      "team_id": "7",
      "team_name": "Ravens Flock",
      "is_current_user": true,
      "wins": 6,
      "losses": 2,
      "points_for": 1142.4,
      "points_against": 980.6
    }
  ]
}
```

Provider behavior:

- Yahoo uses the existing authenticated Yahoo client, stored OAuth/Vault path, and Yahoo standings helper.
- Sleeper uses league rosters/users and ranks by wins, then points-for.
- ESPN uses stored Vault cookie credentials through the existing ESPN auth helper and returns safe reconnect errors when credentials are missing or unusable.

Error responses:

- `400 { "code": "invalid_platform" }` for unsupported `platform`.
- `404 { "code": "league_not_connected" }` when no usable connected league matches the request.
- `401/404 { "code": "<platform>_reconnect_required" }` for provider auth/reconnect states.
- `502 { "code": "league_standings_provider_failed" }` for upstream/provider failures.

Frontend action needed:

- League Standings panel can call `GET /api/league/standings`.
- Prefer no query params for the default connected league.
- Pass `platform` and `leagueId` only when the user explicitly selects a league/platform.
- Use `is_current_user` to highlight the user's team.
- Never inspect provider-specific secrets; none are returned.

Verification:

- Focused checks passed: `node --test test\leagueStandingsRoute.test.js test\sleeperAdapter.test.js test\espnAdapter.test.js test\corvusApiV2.test.js`.
- Tests cover connected Yahoo/Sleeper/ESPN mocks, disconnected `404`, invalid platform, safe provider failure, ESPN reconnect, and no raw ESPN cookie/secret leakage in responses.

Files changed:

- `src/routes/league.js`
- `src/server.js`
- `src/corvus_api_v2.js`
- `src/services/yahoo.js`
- `src/adapters/sleeper.js`
- `src/adapters/espn.js`
- `test/leagueStandingsRoute.test.js`
- `test/sleeperAdapter.test.js`
- `test/espnAdapter.test.js`
- `test/corvusApiV2.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`

## Auth Providers And Post-Login UX Resolution - 2026-05-28

Date: 2026-05-28

Owner: Claude/frontend + Justin/ops

Feature: Supabase OAuth providers, Login UX, nextUrl.js

Status: All three auth provider items resolved. Several earlier sections in this file contain stale warnings about Google/Apple/Discord being "unconfirmed" — this entry supersedes them.

Auth provider status (final):

| Provider | Status | Notes |
| :--- | :--- | :--- |
| Google | ✅ Live | Supabase Site URL set to `https://slopssaloon.com`. `https://xyudxfhqejbwvjngiwhw.supabase.co/auth/v1/callback` added to Google Cloud Console Authorized redirect URIs. Confirmed working on production. |
| Discord | ✅ Live | `https://xyudxfhqejbwvjngiwhw.supabase.co/auth/v1/callback` added to Discord Developer Portal. Discord app credentials entered in Supabase Auth dashboard. Confirmed working on production. |
| Apple | ✅ Intentionally removed | Apple Developer account costs money. Button removed from `frontend/src/pages/Login.jsx` (commit `f23f684`). Decision logged in `decisions.md`. |
| Email magic link | ✅ Live (was already live) | Unchanged. |

Post-login routing fix:

- `frontend/src/lib/nextUrl.js` updated (commit `17bd327`).
- `/account` added to `ALLOWED_DESTINATIONS` Set.
- `consumeNextUrl()` default changed from `'/'` to `'/account'`.
- Effect: if the user signs in with no pending `next` destination, they land on Account, not the landing page. This eliminates the "login feels like a refresh" UX problem.

Frontend action needed:

- None. Both commits are merged and live.
- The stale notes in "UX/UI Build Backend Contract Audit", "Current Contract Truth - 2026-05-26", and "Frontend Request Response" about providers being unconfirmed are superseded by this entry.

---

## Backend Request Status Rollup — Updated 2026-05-31

Date: 2026-05-28

Owner: Codex / backend

Status: Superseded by completed contracts above. Requests 19, 21, 22, and 23 are built locally; `sql/corvus_rls_security.sql` has been applied and verified in Supabase; no app deploy was performed. Frontend should use the completed contract sections above for implementation.

---

### HITL Feedback Loop — `POST /api/omen/feedback`

Frontend request: `frontend-to-backend.md` Request 21.

What Codex needs to build:
- `POST /api/omen/feedback` — upsert user's feedback for a given week/season into the `moves` table
- `moves` table Supabase migration — resolved 2026-05-31 through applied migration `20260531160851_apply_corvus_rls_security_full_setup`
- Route: auth required, idempotent (re-submit same week/season = update, not duplicate)

Key constraint: `followed = true` is the gate for the Tuesday cron. Only moves where `followed = true` get scored for effectiveness. The cron must not score rows where `followed = null` (not yet answered) or `followed = false`.

Expected response: `{ "recorded": true, "move_id": "uuid" }`

Gate status: **CLEARED 2026-05-31.** Omen page passed `/ui-ux-pro-max-skill` audit, HITL backend is built, and the Supabase `moves` storage gate is applied and verified.

---

### Move History — `GET /api/moves`

Frontend request: `frontend-to-backend.md` Request 22.

What Codex needs to build:
- `GET /api/moves` — auth required, returns user's move history with summary stats
- Reads from `moves` table: outcome and effectiveness_pct are written by the Tuesday cron
- Summary aggregates: wins, losses, pending, avg_effectiveness_pct (excluding unscored/unfollowed rows)
- Depends on `moves` table existing (same migration as HITL above)

Expected response shape: see Request 22 for full JSON contract.

---

### League Standings — `GET /api/league/standings`

Frontend request: `frontend-to-backend.md` Request 23.

What Codex needs to build:
- `GET /api/league/standings` — auth required, returns standings for user's connected league
- **Important:** `GET /api/league/standings` is now restored as the canonical `league-standings.v1` route.
- Query params: `platform`, `leagueId` (optional — infers from primary connection)
- Must support Yahoo, Sleeper, ESPN adapters
- `is_current_user: true` on the row matching the authenticated user's team

Confirm with Codex whether the partial scaffold mentioned in the roadmap still exists or was cleaned during the compat route retirement. If the scaffold was removed, this is a net-new build.

---

### User Team Preference — `PATCH /api/account/preferences` + `GET /api/dashboard/summary` update

Frontend request: `frontend-to-backend.md` Request 19.

What Codex needs to build:
- `PATCH /api/account/preferences` — upsert `favorite_team` (team abbreviation string) to user profile
- Add `user.favorite_team` to `GET /api/dashboard/summary` response so `TeamThemeProvider` can read it on app load without a separate fetch
- Supabase migration: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_team text;` — applied and verified 2026-05-31.

---

## Supabase Launch SQL And Stripe Pricing Update - 2026-05-27

Date: 2026-05-27

Owner: Codex/backend

Feature: Frontend Requests 15, 16, and 18

Status: Backend/repo preparation completed. Supabase SQL portions are now applied and verified as part of migration `20260531160851_apply_corvus_rls_security_full_setup`. No Stripe dashboard, product, price, checkout, customer, subscription, portal, webhook secret, package, deploy, or infrastructure change was performed.

Request 15 - waitlist_signups:

- Local SQL setup file now includes `public.waitlist_signups`.
- Table shape: `id uuid primary key default gen_random_uuid()`, `email text not null`, `platform text`, `created_at timestamptz default now()`.
- RLS is enabled.
- Browser access is insert-only for `anon` and `authenticated` roles on `email, platform`.
- No browser SELECT/UPDATE/DELETE grant is provided.
- Duplicate emails are intentionally allowed for launch so repeat submissions do not turn into generic frontend errors.
- Supabase application is complete and verified as of 2026-05-31.

Request 16 - subscription date columns:

- Local SQL setup file now has explicit repair migration SQL:
  - `alter table public.subscriptions add column if not exists trial_ends_at timestamptz`
  - `alter table public.subscriptions add column if not exists current_period_end timestamptz`
- This matters because `create table if not exists public.subscriptions (...)` does not add missing columns to an already-existing table.
- `GET /api/dashboard/summary.subscription.trial_ends_at` and `.current_period_end` will surface real values after Stripe webhook events populate those applied columns.

Request 18 - pricing endpoint:

- Endpoint: `GET /api/stripe/prices`
- Auth: none required.
- Request body/query: none.
- Behavior: read-only. It retrieves configured Stripe Price objects using existing `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_SEASON_PRICE_ID`; it does not create sessions, customers, subscriptions, portal sessions, prices, or products.
- If Stripe is not configured, a plan price id is missing, or a Stripe lookup fails, the endpoint still returns a stable plan entry with `price: null` and `unavailable_reason`.

Response shape:

```json
{
  "contract_version": "stripe-prices.v1",
  "generated_at": "2026-05-27T12:00:00.000Z",
  "source": "stripe",
  "plans": [
    {
      "id": "monthly",
      "label": "Monthly",
      "checkout_plan": "monthly",
      "checkout_mode": "subscription",
      "trial_period_days": 7,
      "stripe_price_id_configured": true,
      "price": {
        "unit_amount": 900,
        "currency": "usd",
        "recurring": { "interval": "month", "interval_count": 1 },
        "display": "$9/mo"
      },
      "unavailable_reason": null
    },
    {
      "id": "season",
      "label": "Season Pass",
      "checkout_plan": "season",
      "checkout_mode": "payment",
      "trial_period_days": 0,
      "stripe_price_id_configured": true,
      "price": {
        "unit_amount": 4900,
        "currency": "usd",
        "recurring": null,
        "display": "$49"
      },
      "unavailable_reason": null
    }
  ]
}
```

Frontend action needed:

- Claude can optionally wire Account pricing display to `GET /api/stripe/prices` instead of hardcoded copy.
- Checkout should still submit `POST /api/stripe/checkout` with `plan: "monthly"` or `plan: "season"` using `checkout_plan`.
- If `price` is `null`, keep existing fallback copy and avoid blocking checkout if the checkout endpoint itself is configured.

Files changed:

- `sql/corvus_rls_security.sql`
- `src/routes/stripe.js`
- `test/securitySql.test.js`
- `test/stripeRoute.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/handoffs/frontend-to-backend.md`

Verified local checks:

- `node --test test\stripeRoute.test.js test\securitySql.test.js` passed 14/14.

## Legacy Compat Route Retirement Update - 2026-05-27

Date: 2026-05-27

Owner: Codex/backend

Feature: Frontend Request 17 - retire legacy compat routes with explicit `410 Gone`

Status: Completed locally. Routes were not deleted from broad mounts; only the listed legacy handlers now fail closed with canonical hints where a replacement exists.

Retired routes:

- `POST /api/optimizer/mvp-move` -> `410`, canonical: `POST /api/omen/mvp-move`
- `POST /api/auth/sleeper/connect` -> `410`, canonical: `POST /api/platforms/sleeper/connect`
- `GET /api/auth/yahoo/authorize` -> `410`, canonical: `GET /api/yahoo/auth`
- `GET /api/auth/yahoo/callback` -> `410`, canonical: `GET /api/yahoo/callback`
- `POST /api/auth/espn/connect` -> `410`, canonical: `POST /api/platforms/espn/connect`
- `GET /api/league/standings` -> restored 2026-05-31 as canonical `league-standings.v1`; no longer retired.

Response shape:

```json
{
  "error": "Legacy endpoint retired",
  "code": "legacy_route_retired",
  "deprecated_endpoint": "/api/auth/sleeper/connect",
  "canonical_endpoint": "/api/platforms/sleeper/connect"
}
```

Headers:

- `Deprecation: true`
- `Link: <canonical path>; rel="canonical"` when a canonical replacement exists

Frontend action needed:

- No frontend code change expected. Frontend launch validation already showed zero callers.
- Continue using canonical routes only.

Files changed:

- `src/routes/optimizer.js`
- `src/corvus_api_v2.js`
- `src/corvus_agents.js`
- `test/optimizerRoute.test.js`
- `test/corvusApiV2.test.js`

Verified local checks:

- `node --test test\corvusApiV2.test.js test\optimizerRoute.test.js` passed 7/7.

## Current Week And Sleeper Omen Gate Update - 2026-05-27

Date: 2026-05-27

Owner: Codex/backend

Feature: Frontend Requests 13 and 14 - Sleeper/ESPN live Omen readiness plus current NFL week contract

Status: Completed locally. No deploy, production action, Supabase migration, Stripe action, secret change, package-file change, or infrastructure change was performed.

Endpoint / contract:

- `GET /api/dashboard/summary`
  - Auth: required.
  - Change: `tools.omen_of_the_week.status` now reports `ready` for subscribed users with a usable Yahoo, Sleeper, or ESPN league connection.
  - Usable Sleeper means active row with `platform_username` and non-placeholder `league_id`.
  - Usable ESPN means active row with `espn_secret_id`, `swid_secret_id`, and non-placeholder `league_id`.
  - Waiver Wire remains Yahoo-only for now; this change only affects the Omen / MVP Move gate.

- `POST /api/omen/mvp-move`
  - Auth: required for live calls.
  - Subscription: required for live calls.
  - Request body: `{}`.
  - Frontend should not pass platform, league, team, season, or week for live Omen.
  - Backend infers the active usable connection and current week, preferring Yahoo, then Sleeper, then ESPN.

- `GET /api/system/current-week`
  - Auth: none.
  - Request body/query: none.
  - Response shape:

```json
{
  "contract_version": "system-current-week.v1",
  "generated_at": "2026-05-27T12:00:00.000Z",
  "season": 2026,
  "week": 1,
  "season_type": "regular"
}
```

Example dashboard gate response for subscribed Sleeper:

```json
{
  "tools": {
    "omen_of_the_week": {
      "available": true,
      "mode": "pro",
      "status": "ready"
    },
    "waiver_wire": {
      "available": false,
      "mode": "pro",
      "status": "needs_platform"
    }
  }
}
```

How frontend should call it:

- Omen screen: continue to call `GET /api/dashboard/summary` first and call `POST /api/omen/mvp-move` with `{}` only when `tools.omen_of_the_week.status === "ready"`.
- Sleeper/ESPN Omen users do not need a frontend week picker or platform selector for MVP Move v1.
- Standalone roster utilities that still require a `week` query can call `GET /api/system/current-week` first, then pass the returned `week`.

Files changed:

- `src/routes/dashboard.js`
- `src/routes/system.js`
- `src/routes/sleeper.js`
- `src/services/nflSchedule.js`
- `src/services/omen.js`
- `src/services/systemContracts.js`
- `test/dashboardSummary.test.js`
- `test/systemRoutes.test.js`
- `test/nflSchedule.test.js`
- `test/sleeperRoute.test.js`

Limitations:

- Current-week detection is a lightweight backend calendar approximation for contract stability. It does not fetch official NFL schedule metadata.
- Live Omen v1 still produces lineup/start-sit MVP moves first. It does not claim live waiver or trade MVP moves for Sleeper/ESPN.
- Applying Supabase launch-blocker migrations remains approval-gated by Justin.

Verified local checks:

- Focused Node test run passed: 60/60.

## Current Contract Truth - 2026-05-26

Date: 2026-05-26

Owner: Codex/backend

Feature: Backend finish pass contracts for Corvus paid Omen and investor hardening

Status: Local backend pass completed. No deploy, production Stripe action, production Supabase migration, secret change, DNS, SSL, Nginx, or package-file change was performed.

Verified local checks:

- `npm test` passed with 207/207 tests.
- `npm audit --audit-level=moderate` passed with 0 vulnerabilities.
- `git diff --check` passed before implementation.
- `npm --prefix frontend run build` passed and emitted `frontend/dist`; Vite still prints the existing `NODE_ENV=production` warning.

Live Omen / Most Valuable Play:

- Endpoint: `POST /api/omen/mvp-move`.
- Auth: required for non-mock live calls.
- Subscription: required for non-mock live calls.
- Platform: requires a usable connected Yahoo, Sleeper, or ESPN league context.
- Request body: `{}` for live calls. Backend infers user, subscription, platform, league, team, and current week.
- Scope: live v1 produces lineup/start-sit MVP moves only. It does not claim waiver or trade MVP unless those live contexts are separately available.
- Yahoo: uses stored OAuth/Vault token path and normalized Yahoo roster.
- Sleeper: uses stored Sleeper username + league id and normalized Sleeper roster.
- ESPN: decrypts stored ESPN Vault cookie secrets server-side only and uses normalized ESPN roster.
- No platform returns fake advice from the live route.

Live Omen states Claude should handle:

- `success`: live start/sit MVP move.
- `empty`: connected context loaded, but no lineup edge cleared the optimizer threshold.
- `platform_disconnected`: no active platform connection.
- `yahoo_reauth_required`: Yahoo row exists but usable OAuth token/league context is missing.
- `sleeper_league_context_missing`: Sleeper username/league context is missing or import failed.
- `espn_reauth_required`: ESPN cookies are missing, expired, invalid, or rejected.
- `espn_league_context_missing`: ESPN auth exists but league/team cannot be found.
- `espn_import_blocked`: ESPN returned an unexpected/private/blocked import response.
- `error` with `error.code: "omen_auth_required"`: send user to `/login`.
- `error` with `error.code: "omen_subscription_required"`: show UpgradeState.
- `error` with `error.code: "omen_live_generation_failed"`: refetch summary/platforms and show retry copy.

Dashboard summary:

- `GET /api/dashboard/summary` remains the app-shell source of truth for platform status, Omen gates, and subscription state.
- `summary.subscription.trial_ends_at` and `summary.subscription.current_period_end` are now real fields when the subscription row has those columns populated.
- Frontend should still gate Omen from dashboard first: auth, then platform, then subscription, then call live Omen only when dashboard status is `ready`.

Draft Assistant:

- `POST /api/draft-assistant/recommendations` remains public.
- If `adp_players` are supplied, recommendations are ADP-backed and return `mode: "live_adp"` with `is_mock: false`.
- Without ADP rows, the endpoint still returns labeled mock output with `mode: "mock"` and `is_mock: true`.
- Do not present Draft Assistant v1 as a real-time draft room. It is ADP/value/position-needs based.

Privacy/account routes:

- `GET /api/user/export`: auth required. Returns safe user/platform/subscription/consent/move export. Excludes raw tokens, ESPN cookies, and Vault secret ids.
- `POST /api/user/consent`: auth required. Upserts a consent record.
- `DELETE /api/user/delete`: auth required. Requires exact `confirmation: "DELETE MY CORVUS DATA"`. Deletes platform rows and attempts Vault cleanup for Yahoo and ESPN secret ids.
- Frontend should not expose destructive account deletion until UX copy and Justin approval are explicit.

System readiness:

- `/api/health`: process alive.
- `/api/ready`: Supabase/config readiness plus optional service labels. Use for deploy/runtime confidence, not public marketing copy.

Stripe:

- Checkout and portal routes are unchanged for frontend usage.
- Webhook handling now covers checkout completion, subscription created/updated/deleted, and invoice payment failed.
- Safe subscription metadata includes `plan`, `status`, `trial_ends_at`, `current_period_end`, `expires_at`, and `canceled_at` when Stripe provides them.
- Production Stripe validation still requires Justin approval.

Remaining frontend/backend cautions:

- Google, Apple, and Discord provider config still requires Supabase dashboard confirmation.
- ESPN must never log or display cookie values.
- Staging QA with real Yahoo/Sleeper/ESPN connected accounts is still required before public “all platforms live” claims.
- `POST /api/omen/mvp-move` is canonical.
- `POST /api/optimizer/mvp-move` is retired and returns `410 legacy_route_retired`. Frontend should not build UI against the optimizer MVP path.

## Previous Contract Truth - 2026-05-25

Date: 2026-05-25

Owner: Codex/backend

Feature: Backend contract reconciliation after app-state audit

Status: Backend contract drift fixed in this handoff. No production, secret, SQL, package, deploy, or Stripe-live changes were made.

Verified local backend state:

- `npm test` passed with 199/199 tests.
- `POST /api/trade/compare` is public and remains payload-validated.
- Draft Assistant endpoints are public and remain preview/mock-first where labeled.
- `GET /api/platforms` is the UX-facing platform status contract.
- `GET /api/dashboard/summary` is the app-shell source of truth for Omen gates and Account subscription state.
- `POST /api/omen/mvp-move` now has a Yahoo-first live path.

Current live Omen behavior:

- Live requests use body `{}`. The backend infers user, subscription, platform, league, team, and week from auth and stored platform connections where available.
- Missing or invalid bearer token returns `401` with `error.code: "omen_auth_required"`.
- Missing subscription returns `402` with `error.code: "omen_subscription_required"`.
- No active platform connection returns `state: "platform_disconnected"`.
- Sleeper-only, ESPN-only, placeholder Yahoo league, or unusable Yahoo token returns `state: "pending_live_engine"` rather than fake advice.
- Usable Yahoo connection plus active subscription can return live `state: "success"` with a Yahoo lineup-swap recommendation.
- Usable Yahoo connection plus no optimizer edge can return live `state: "empty"`.
- Unexpected live generation failure returns `500` with `error.code: "omen_live_generation_failed"` and `retryable: true`.
- Explicit mock/dev previews still require `use_mock_data: true` or `mock_state` and must be visually labeled as preview/mock.

Frontend action needed:

- Do not build a league/platform selector for Yahoo Omen v1.
- Call `POST /api/omen/mvp-move` with `{}` only after `GET /api/dashboard/summary` reports `tools.omen_of_the_week.status === "ready"`.
- Treat `pending_live_engine` as "connected, not ready yet"; do not show generic advice.
- Continue to show UpgradeState when dashboard status is `needs_subscription` or route response is `402`.
- Account subscription UI should use `GET /api/dashboard/summary.subscription`.

Remaining backend work not completed in this local pass:

- Stripe live validation still requires explicit production/payment approval.
- Load testing for `POST /api/omen/mvp-move` and `POST /api/trade/compare` remains pending.
- `POST /api/optimizer/mvp-move` vs. `POST /api/omen/mvp-move` merge decision remains open.
- GDPR export/delete route mount and frontend contract remain open.
- More granular ESPN blocked/private import states remain future backend hardening.

## Draft Assistant And Omen Context Response

Date: 2026-05-25

Owner: Codex/backend

Feature: Current Draft Assistant and Omen frontend contract anchors

Status: Current concise replacement for older scattered request responses.

Draft Assistant:

- `POST /api/draft-assistant/recommendations` is public.
- Current recommendation output is preview/mock-first and returns `is_mock: true`, `mode: "mock"`, and `status: "mock_ready"`.
- Frontend should show a visible MockBanner/preview label for current Draft Assistant recommendations.
- `recommendation_type` should display as a label. Supported labels are `best_available`, `roster_fit`, `value_pick`, and `risk_adjusted`.
- There is no real-time draft board endpoint and no picked-player tracker endpoint yet.
- Current UI should use scoring format, draft position, round, position needs, and ADP context.

Draft Assistant ADP:

- `GET /api/draft-assistant/adp?format=ppr&teams=12` is public.
- `format` accepts `ppr`, `half-ppr`, `half_ppr`, or `standard`.
- `teams` must be an integer from 1 to 20.
- Response includes `is_mock`, `format`, `teams`, `note`, and `sources`.
- `sources` may include `ffc`, `yahoo`, and `mfl`.
- Player rows use `player_id`, `name`, `position`, `team`, and `adp`.
- If `is_mock: true`, label ADP as preview/mock data.
- If one source has an empty `players` array, show that source as unavailable instead of treating the whole endpoint as failed.

Omen context:

- `POST /api/omen/mvp-move` live requests use body `{}`.
- Frontend should not pass platform, league, team, season, week, or scoring format for Yahoo v1.
- Backend infers the current Yahoo-first live context from auth and stored platform connections.
- Do not build a league/platform selector for Yahoo Omen v1.
- Sleeper and ESPN connections should render `pending_live_engine` until their live Omen engines exist.

## Stripe Account Subscription Contract

Date: 2026-05-25

Owner: Codex/backend

Feature: Account subscription state and Stripe return routes

Status: Current local backend contract. Live Stripe validation still requires explicit production approval.

Subscription state:

- `GET /api/dashboard/summary` includes a `subscription` block.
- Account UI should use `summary.subscription` to choose checkout vs. manage-billing states.
- `subscription.is_subscribed` is the main boolean.
- `subscription.status`, `plan`, `subscribed_at`, `canceled_at`, `expires_at`, `current_period_end`, and `can_manage_billing` are safe UI fields.

Stripe checkout:

- Endpoint: `POST /api/stripe/checkout`.
- Auth: required.
- Request body: `{ "plan": "monthly" | "season" }`.
- Response: `{ "url": "<Stripe hosted checkout URL>" }`.
- Success return: `/account?subscribed=true`.
- Cancel return: `/account?cancelled=true`.
- `monthly` is subscription mode with a 7-day trial.
- `season` is one-time payment mode.
- `503` means Stripe is not configured; show a graceful fallback.

Stripe portal:

- Endpoint: `POST /api/stripe/portal`.
- Auth: required.
- Request body: none.
- Response: `{ "url": "<Stripe hosted portal URL>" }`.
- Portal return: `/account`.
- `404` means no Stripe customer record exists; show checkout instead of portal.

## Historical Backend Notes - Initial Omen Contract

Date: 2026-05-23

Owner: Codex/backend

Feature: Omen of the Week / MVP Move

Status: Historical initial contract for the Omen / MVP Move mock flow. This section is preserved for shape/reference history; use "Current Contract Truth - 2026-05-25" above for current live behavior.

Endpoint / contract:

`POST /api/omen/mvp-move`

Purpose:

Return the single highest-value fantasy football action for the user's selected platform, league, team, and week.

Decision types:

- `start_sit`
- `waiver_pickup`
- `trade_suggestion`
- `matchup_note`

Request shape:

```json
{
  "platform": "yahoo",
  "league_id": "414.l.12345",
  "team_id": "7",
  "season": 2026,
  "week": 8,
  "scoring_format": "ppr",
  "decision_scope": ["start_sit", "waiver_pickup", "trade_suggestion"],
  "include_signals": {
    "weather": true,
    "travel_home_away": true,
    "game_time_tv": true,
    "matchup_dvp": true,
    "llm_reasoning": true
  },
  "use_mock_data": false,
  "mock_state": "success"
}
```

Request fields:

- `platform`: `yahoo`, `sleeper`, or `espn`.
- `league_id`: platform league id or league key.
- `team_id`: platform team id when required. Backend may infer it when only one team is available.
- `season`: NFL season year.
- `week`: NFL week.
- `scoring_format`: `ppr`, `half_ppr`, or `standard`.
- `decision_scope`: optional list of decision types the frontend wants considered.
- `include_signals`: optional signal toggles. Backend may return `unavailable` for signals that are requested but not configured.
- `use_mock_data`: allowed for local/dev UI integration only. Production must not present mock advice as live.
- `mock_state`: optional local/dev selector for exercising contract states. Supported values are `success`, `empty`, `platform_disconnected`, `espn_reauth_required`, `espn_league_context_missing`, `espn_import_blocked`, `espn_recovery_needed`, and `error`.

Success response shape:

```json
{
  "state": "success",
  "feature": "omen_mvp_move",
  "mode": "hybrid",
  "request_id": "omen_req_123",
  "generated_at": "2026-05-23T16:00:00.000Z",
  "platform": {
    "name": "yahoo",
    "status": "connected",
    "recovery": null
  },
  "league": {
    "id": "414.l.12345",
    "name": "Example League",
    "season": 2026,
    "week": 8,
    "scoring_format": "ppr"
  },
  "team": {
    "id": "7",
    "name": "Example Team"
  },
  "signals": {
    "roster": {
      "status": "live",
      "used": true,
      "source": "platform_adapter",
      "message": "Roster imported from the connected platform."
    },
    "projections": {
      "status": "stub",
      "used": true,
      "source": "internal_stub",
      "message": "Projection provider is not finalized yet."
    },
    "weather": {
      "status": "live",
      "used": true,
      "source": "openweathermap",
      "message": "Live when OPENWEATHER_API_KEY is configured; stub fallback otherwise."
    },
    "travel_home_away": {
      "status": "live",
      "used": true,
      "source": "espn_scoreboard",
      "message": "Home/away context from ESPN scoreboard."
    },
    "game_time_tv": {
      "status": "live",
      "used": true,
      "source": "espn_scoreboard",
      "message": "Kickoff and slate context from ESPN scoreboard."
    },
    "matchup_dvp": {
      "status": "stub",
      "used": false,
      "source": "pending_nflverse_data",
      "message": "Matchup DvP is live from nflverse-data when enough trailing-week opponent data exists; stub fallback otherwise."
    },
    "waivers": {
      "status": "stub",
      "used": true,
      "source": "platform_or_mock_pool",
      "message": "Live waiver pool wiring is platform-dependent."
    },
    "llm_reasoning": {
      "status": "stub",
      "used": true,
      "source": "ollama_gemma_or_template",
      "message": "Plain-English explanation may be templated until Gemma is wired for this route."
    }
  },
  "recommendation": {
    "id": "omen_123",
    "type": "start_sit",
    "title": "Start Player A over Player B",
    "move": "Move Player A into your WR2 slot and bench Player B.",
    "primary_player": {
      "id": "player_a",
      "name": "Player A",
      "position": "WR",
      "team": "DAL"
    },
    "comparison_player": {
      "id": "player_b",
      "name": "Player B",
      "position": "WR",
      "team": "CHI"
    },
    "expected_value_delta": {
      "points": 4.2,
      "label": "meaningful"
    },
    "confidence": {
      "score": 74,
      "label": "medium_high",
      "rationale": "The projection gap is clear, but matchup data is still stubbed."
    },
    "risk": {
      "level": "medium",
      "reasons": [
        "Player A has a stronger role but a less stable matchup signal.",
        "Matchup DvP is not live yet."
      ]
    },
    "explanation": {
      "summary": "Your best move is to start Player A over Player B.",
      "why_it_matters": "Player A projects for a better weekly role and gives you a higher expected point total.",
      "risk": "The recommendation carries medium risk because one matchup signal is still stubbed.",
      "confidence": "Confidence is 74 out of 100.",
      "data_used": [
        "connected roster",
        "weekly projections",
        "home/away context",
        "game time context"
      ]
    }
  },
  "alternatives": [],
  "warnings": []
}
```

Signal status values:

- `live`: real data from a connected platform or configured provider.
- `stub`: deterministic placeholder used to keep the contract stable.
- `mock`: fake data requested for local/dev UI work.
- `unavailable`: requested signal cannot be used because the connection, provider, or config is missing.

Confidence score:

- `score`: integer from `0` to `100`.
- `label`: `low`, `medium`, `medium_high`, or `high`.
- `rationale`: plain-English reason for the score.

Risk level:

- `level`: `low`, `medium`, or `high`.
- `reasons`: short user-facing reasons.

State handling:

Frontend should branch on `state` first, then use `platform.status`, `platform.recovery`, and `signals`.

Empty state:

```json
{
  "state": "empty",
  "feature": "omen_mvp_move",
  "mode": "live",
  "recommendation": null,
  "explanation": {
    "summary": "No move clears the recommendation threshold this week.",
    "why_it_matters": "Your current lineup is close enough to the available alternatives that Corvus should not force a move.",
    "risk": "Forcing a marginal move could create more downside than upside.",
    "confidence": "Confidence is 68 out of 100 that standing pat is reasonable.",
    "data_used": ["connected roster", "weekly projections"]
  },
  "signals": {},
  "warnings": []
}
```

Platform disconnected state:

```json
{
  "state": "platform_disconnected",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "platform": {
    "name": "sleeper",
    "status": "disconnected",
    "recovery": {
      "code": "connect_platform",
      "message": "Connect Sleeper before Corvus can read your roster.",
      "cta": "Connect Sleeper"
    }
  },
  "signals": {
    "roster": {
      "status": "unavailable",
      "used": false,
      "source": "platform_adapter",
      "message": "No connected roster is available."
    }
  }
}
```

ESPN reauth and recovery states:

- `espn_reauth_required`: ESPN cookies are missing, expired, invalid, or rejected. Ask the user to reconnect ESPN with fresh `ESPN_S2` and `SWID` cookies.
- `espn_league_context_missing`: ESPN auth is present, but the requested league or team cannot be found. Ask the user to select or re-import the league.
- `espn_import_blocked`: ESPN returned a blocked, private, or unexpected response. Ask the user to retry, reconnect, or verify league access.
- `espn_recovery_needed`: backend cannot determine whether the issue is auth, league access, or an ESPN response change. Show recovery guidance and allow retry.

ESPN recovery response shape:

```json
{
  "state": "espn_reauth_required",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "platform": {
    "name": "espn",
    "status": "reauth_required",
    "recovery": {
      "code": "refresh_espn_cookies",
      "message": "Your ESPN connection needs fresh cookies before Corvus can read this league.",
      "cta": "Reconnect ESPN",
      "fields_needed": ["ESPN_S2", "SWID"]
    }
  },
  "signals": {
    "roster": {
      "status": "unavailable",
      "used": false,
      "source": "espn_adapter",
      "message": "ESPN roster import is blocked until reauthorization succeeds."
    }
  }
}
```

Error state:

```json
{
  "state": "error",
  "feature": "omen_mvp_move",
  "recommendation": null,
  "error": {
    "code": "omen_generation_failed",
    "message": "Corvus could not generate an MVP Move right now.",
    "retryable": true
  },
  "signals": {},
  "warnings": []
}
```

Mock vs live data:

Mock data is allowed for frontend integration only when `mode` is `mock` or a signal has `status: "mock"`. If any decision-critical signal is `stub`, the UI should present the result as a preview, not live fantasy advice.

Known limitations:

- Matchup DvP is conditionally live from nflverse-data when a success response has a usable opponent context and at least 3 trailing sample weeks; otherwise it remains stubbed.
- Projection source is not finalized in this contract.
- Waiver pool behavior may differ by platform.
- Gemma/Ollama reasoning may be templated until the backend route is wired.

Frontend action needed:

Verify the Omen / MVP Move screen against the `state` envelope, including `confidence.score`, `risk.level`, plain-English explanation fields, mock/stub/live/unavailable signal labels, and platform-specific recovery UI for disconnected and ESPN recovery states.

## Backend Hardening Pass

Date: 2026-05-24

Owner: Codex/backend

Feature: Backend security, cron, and deploy guardrails

Status: Completed for focused hardening scope. No frontend contract changes required.

What changed:

- Supabase RLS SQL now keeps Vault token secret identifiers out of authenticated client-readable `platform_connections` grants.
- Vault RPC grants are service-role only: create, decrypt, update, and delete.
- Backend schema SQL now includes columns currently used by platform connections, Omen scoring, GDPR export/delete, and Tuesday scoring.
- Legacy `corvus_agents.js` now parses and preserves math exports, while retired legacy HTTP routes fail closed with `410`.
- `corvus_tuesday_cron.js` now parses and is safety-gated. It will not score data unless `CORVUS_CRON_SCORING_ENABLED=true`; as of 2026-06-05, that flag must stay false until the nflverse-data scoring adapter replaces/reworks the unvalidated Sportradar fetch path.
- Cron Docker wiring now points at `src/corvus_tuesday_cron.js` and writes to the crond spool path the container actually uses.
- Deploy workflow now runs tests, audit, and both frontend builds before building/pushing deploy images.
- Probo evidence paths now point at current Corvus files.

Frontend action needed:

None for UI integration. Keep using the existing Omen / MVP Move response envelope. Treat Tuesday scoring/results UI as pending until backend explicitly ships the nflverse-data scoring adapter, validates dry-run output, and enables production scoring.

## UX/UI Build Backend Contract Audit

Date: 2026-05-24

Owner: Codex/backend

Feature: Sign In / Connect League / Manual Omen feasibility

Status: Audit complete. Frontend scaffold can start only after contract mismatches below are accepted or patched.

Auth redirect preservation:

- Recommended strategy: frontend-owned `localStorage` key `corvus.auth.next`.
- Before any Google, Apple, Discord, or email magic-link auth action, sanitize and store the intended relative path.
- Allowed destinations must be same-origin relative paths only, for example `/`, `/trade`, `/draft`, `/omen`, `/account/connect`, and `/football`.
- Reject external URLs, protocol-relative URLs, `/api/*`, paths over 256 chars, and unknown paths. Default to `/`.
- Supabase OAuth/magic-link redirects should return to `/login`; after `detectSessionInUrl` completes, `/login` reads and clears `corvus.auth.next`.
- If the sanitized destination is `/omen` and no league is connected, route to `/account/connect?next=/omen`.
- If the user skips league connection, route to the dashboard/app shell and show Omen as locked/disconnected. Do not show a generic Omen.
- Backend session state is not required for this redirect preservation. The backend still validates auth on protected API calls.

Auth provider status:

- Email magic link is wired in the current frontend through Supabase `signInWithOtp`.
- Google, Apple, and Discord are not wired in the current frontend code.
- Supabase dashboard/provider configuration cannot be confirmed from this repo without inspecting project settings/secrets. Treat Google, Apple, and Discord as pre-launch config checks.
- Discord likely needs a Discord developer app client id/secret configured in Supabase Auth before the UI can honestly claim it works.

Platform connection status:

- Existing endpoint: `GET /api/platforms/status`, auth required.
- Current response shape returns top-level `yahoo`, `sleeper`, `espn`, plus `connections`.
- Requested UX endpoint `GET /api/platforms` does not currently exist.
- Current shape does not include `manual`, league arrays, or selected league metadata.

Sleeper connection:

- Existing endpoint: `POST /api/platforms/sleeper/connect`, auth required.
- Current request shape is `{ "username": "string", "league_id": "string" }`.
- Current behavior validates the Sleeper username and stores the supplied league id.
- The requested flow `{ "sleeper_username": "string" } -> leagues[]` does not exist yet.
- Recommended backend addition: add a resolve step that fetches the Sleeper user and current-season leagues, then a select step that stores the chosen league id.

Yahoo connection:

- Existing start route: `GET /api/yahoo/auth`, auth required.
- Existing callback route: `GET /api/yahoo/callback`.
- Current frontend starts Yahoo via `window.location.href = "/api/yahoo/auth"`.
- Stage 1.5 follow-up fixed the callback destination: Yahoo now redirects to `/account/connect?connected=yahoo`.
- Current flow does not preserve full `?next=` through Yahoo OAuth yet.

ESPN connection:

- Existing endpoint: `POST /api/platforms/espn/connect`, auth required.
- Current request shape is `{ "espn_s2": "string", "swid": "string", "league_id": "string", "espn_team_id": "string | optional" }`.
- Current success response is `{ "connected": true }`.
- Current errors are not yet distinct enough for the guided UX. Invalid cookies, missing league, blocked import, and unknown failure should become separate safe codes before the final guided flow ships.
- ESPN cookie handling remains sensitive: never put cookie values, Vault ids, auth headers, or raw ESPN responses in URLs, logs, UI copy, or LLM payloads.

Manual Omen feasibility:

- Recommendation: Manual Omen should be limited, not full, unless Justin later accepts a stricter data-entry burden.
- Manual can realistically collect team name, season, week, scoring format, league size, lineup rules, current roster, starter/bench/IR slots, player names, positions, NFL teams, eligible positions, optional projections, optional injury/status, optional opponent team, and manually entered waiver candidates.
- Manual cannot reliably collect real platform waiver availability, transaction history, opponent roster/lineup, private league scoring quirks, actual roster constraints, league market context, or live platform lineup state.
- Start/sit is feasible with a completed roster, lineup rules, player teams, statuses, and projections or a public projection provider.
- Waiver pickup is not feasible unless the user manually enters a waiver candidate pool. Without that, Corvus must not claim a waiver move is available.
- Trade suggestion is limited to user-entered trade packages. Corvus cannot infer trading partners or market availability from manual data.
- Matchup notes are limited unless opponent team/player context is supplied or a public matchup signal is available.

Minimum Manual Omen checklist:

- Scoring format: `ppr`, `half_ppr`, or `standard`.
- Current NFL season and week.
- League size.
- Starting lineup rules, including position counts and FLEX/SUPER_FLEX behavior.
- Current roster with player name, position, eligible positions, selected slot, NFL team, and starter/bench/IR state.
- Projection source: user-entered projected points or backend-approved public projection source.
- Injury/status source: user-entered status or backend-approved public injury source.
- Decision scopes requested: start/sit, trade, matchup, or waiver.
- For waiver decisions: user-entered waiver candidate pool with names, positions, teams, and projected points/source labels.
- For matchup decisions: opponent NFL team for each relevant player, or a public schedule/matchup lookup source.

Manual data labels and confidence:

- Use `DataSourceLabel: manual` for user-entered roster, lineup, projections, statuses, and waiver candidates.
- Use `DataSourceLabel: public` for public schedule, injury, matchup, or weather data.
- Use `DataSourceLabel: unavailable` for any missing decision-critical signal.
- Suggested confidence cap: full manual checklist with projections/statuses maxes around `medium` / 68. Missing projections or status should cap at `low` / 55. Missing waiver pool should remove waiver recommendations entirely.

Session duration:

- Not confirmable from repository code. Supabase session lifetime depends on project Auth settings.

Frontend action needed:

- Do not build Manual entry form yet. Justin needs to decide whether limited Manual Omen ships, ships later, or stays locked.
- Treat `/api/platforms/status` as the real existing platform status endpoint until backend adds/aliases `GET /api/platforms`.
- Do not present Google, Apple, or Discord as working until frontend wiring and Supabase provider config are confirmed.
- Trade Analyzer backend conflict is now fixed in the Stage 1.5 pass: `POST /api/trade/compare` is public. Frontend route gating still needs to expose the free Trade Analyzer path without requiring sign-in before claiming the flow is launch-ready.

## Stage 1.5 Backend/UX Unblock Pass

Date: 2026-05-25

Owner: Codex/backend

Feature: Backend contract unblocks for Corvus clean UX/UI pass

Status: Completed focused backend pass. No full UI was built.

What changed:

- `POST /api/trade/compare` no longer requires Supabase auth. It remains payload-validated and capped at 10 players per side.
- `POST /api/omen/mvp-move` now supports Yahoo-first live requests when auth, subscription, and usable Yahoo league context exist. Explicit mock calls remain available for local contract previews through `use_mock_data: true` or `mock_state`.
- `GET /api/platforms` now exists as the UX-facing platform status contract. `GET /api/platforms/status` remains available for legacy callers.
- `POST /api/platforms/sleeper/resolve` now supports the username-first Sleeper flow and returns discovered current-season leagues.
- `POST /api/platforms/sleeper/connect` now accepts either `sleeper_username` or `username` and returns a richer connected response.
- `POST /api/platforms/espn/connect` now returns safe structured error codes for missing cookies, missing league id, and invalid/expired cookies. It still never echoes cookie values.

Trade Analyzer:

- Endpoint: `POST /api/trade/compare`
- Auth: none required.
- Request shape remains:

```json
{
  "send": [{ "name": "Bench RB", "position": "RB", "projected_points": 10 }],
  "receive": [{ "name": "Starter WR", "position": "WR", "projected_points": 14 }],
  "scoring_format": "ppr"
}
```

- Validation: `send` and `receive` must be non-empty arrays, each side is capped at 10 players, and `scoring_format` must be `ppr`, `half_ppr`, or `standard`.
- Remaining frontend gap: the free Trade Analyzer path must not live only behind a protected `/football` route.

Omen gating:

- Endpoint: `POST /api/omen/mvp-move`
- Explicit mock/dev preview remains supported with `use_mock_data: true` or `mock_state`.
- Non-mock live calls require auth and subscription. They return live Yahoo recommendations when a usable Yahoo league path exists, or return explicit gated states such as `platform_disconnected`, `pending_live_engine`, `omen_auth_required`, or `omen_subscription_required`.

Historical live-gated response shape from before Yahoo-first live Omen shipped:

```json
{
  "state": "error",
  "feature": "omen_mvp_move",
  "mode": "live",
  "platform": {
    "name": "sleeper",
    "status": "requires_connected_league",
    "recovery": {
      "code": "connect_league",
      "message": "Most Valuable Play requires sign-in and a connected league before Corvus can produce a real recommendation.",
      "cta": "Connect Your League"
    }
  },
  "league": null,
  "team": null,
  "signals": {
    "roster": {
      "status": "unavailable",
      "used": false,
      "source": "platform_adapter",
      "message": "No authenticated connected-league context was provided."
    }
  },
  "recommendation": null,
  "alternatives": [],
  "warnings": [],
  "error": {
    "code": "live_omen_requires_connected_league_context",
    "message": "Most Valuable Play requires connected league context. Use explicit mock mode only for local contract previews.",
    "retryable": false
  }
}
```

Frontend behavior:

- Do not show generic Omen advice from a non-mock call.
- If this error code appears, send the user to league connection or show Omen locked/disconnected.
- Mock Omen cards/screens must be visually labeled as previews, not live recommendations.

Platform status contract:

- Endpoint: `GET /api/platforms`
- Auth: Supabase user auth required.

Response shape:

```json
{
  "platforms": {
    "sleeper": {
      "platform": "sleeper",
      "status": "connected",
      "connected": true,
      "username": "sleepy",
      "leagues": [
        {
          "id": "league-1",
          "name": null,
          "season": null,
          "scoring_format": null,
          "team_id": null,
          "team_name": null,
          "selected": true
        }
      ]
    },
    "yahoo": {
      "platform": "yahoo",
      "status": "disconnected",
      "connected": false,
      "leagues": []
    },
    "espn": {
      "platform": "espn",
      "status": "disconnected",
      "connected": false,
      "leagues": []
    },
    "manual": {
      "platform": "manual",
      "status": "disconnected",
      "connected": false,
      "team_name": null,
      "leagues": []
    }
  }
}
```

Sleeper connection:

- Resolve endpoint: `POST /api/platforms/sleeper/resolve`
- Auth: required.
- Request:

```json
{
  "sleeper_username": "sleepy",
  "season": 2026
}
```

- Response:

```json
{
  "status": "resolved",
  "platform": "sleeper",
  "username": "sleepy",
  "sleeper_user_id": "sleeper-user-1",
  "season": 2026,
  "leagues": [
    {
      "id": "league-1",
      "name": "Example League",
      "season": 2026,
      "scoring_format": "ppr",
      "team_id": "7",
      "team_name": "Example Team"
    }
  ]
}
```

- Connect endpoint: `POST /api/platforms/sleeper/connect`
- Request:

```json
{
  "sleeper_username": "sleepy",
  "league_id": "league-1"
}
```

Yahoo connection gap:

- Existing start route remains `GET /api/yahoo/auth`.
- Existing callback remains `GET /api/yahoo/callback`.
- Callback behavior now redirects to `/account/connect?connected=yahoo`.
- Full `?next=` preservation through Yahoo OAuth is still not implemented. Frontend can claim the connect-screen return is fixed, but should not claim arbitrary return-to-Omen Yahoo OAuth yet.

ESPN connection:

- Endpoint: `POST /api/platforms/espn/connect`
- Auth: required.
- Request:

```json
{
  "espn_s2": "cookie value",
  "swid": "{cookie value}",
  "league_id": "12345",
  "espn_team_id": "7"
}
```

- Safe error codes:
  - `espn_cookies_required`
  - `espn_league_id_required`
  - `espn_cookies_invalid`
- Remaining gap: blocked/private import and ambiguous ESPN response changes are still collapsed into invalid-cookie recovery until the ESPN adapter exposes more specific failure causes.

Auth redirect preservation:

- Backend session state is not required for the clean `?next=` strategy.
- Frontend should own the sanitized `corvus.auth.next` localStorage strategy documented above.
- OAuth provider config for Google, Apple, and Discord still cannot be confirmed from repository code. Email magic link remains the only provider observed as wired in the current frontend.

Manual Omen feasibility:

- Recommendation remains: Manual Omen should be locked or limited until Justin accepts the data-entry burden.
- Honest limited unlock requires scoring format, season/week, league size, lineup rules, complete roster, player teams/eligible slots/current slots, projections source, injury/status source, decision scope, and manually entered waiver candidates if waiver recommendations are in scope.
- Without the full checklist, Manual should be allowed for Trade Analyzer/manual comparison workflows only, not full Most Valuable Play.

Frontend action needed:

- Claude can build the sign-in/connect UI against these contracts without faking backend behavior.
- Keep Omen paid/locked until auth, payment tier, and connected-league context are all present.
- Expose the public Trade Analyzer route outside auth.
- Use the Sleeper resolve/select/connect sequence for the lowest-friction connection path.
- Treat Yahoo `?next=` and more granular ESPN recovery as follow-up backend gaps.

## Frontend Request Response

Date: 2026-05-25

Owner: Codex/backend

Feature: Responses to Claude frontend requests for onboarding, auth, draft, and ESPN flag

Status: Responded. One backend code change completed for Yahoo callback.

Claude worktree note:

- Claude's new UI files are currently in `.claude/worktrees/dreamy-ride-ab2778`, not the main checkout.
- That is a normal isolated Git worktree pattern for Claude Code, but those files are not active in the main app until merged/copied back.
- Backend responses below are written for the main Corvus repo.

Request 1 - Yahoo OAuth callback destination:

- Completed.
- `GET /api/yahoo/callback` now redirects to `/account/connect?connected=yahoo`.
- This is a hardcoded internal destination. The OAuth `state` token is still not used for user-controlled redirect paths.
- Full `?next=` round-trip through Yahoo OAuth remains a future enhancement.

Request 2 - Auth provider configuration confirmation:

- Repository code cannot confirm Supabase dashboard provider settings.
- Email magic link is the only provider already confirmed from repo code.
- Google, Apple, and Discord require Supabase Auth provider configuration checks in the Supabase dashboard before launch confidence.
- It is safe from a backend perspective for frontend to show provider buttons only if the UI handles Supabase errors inline and does not claim the providers are verified.
- Product recommendation: label or gate unverified providers before public launch unless Justin confirms the Supabase dashboard setup.

Request 3 - Draft Assistant endpoint auth status:

- Draft Assistant endpoints are public today.
- `POST /api/draft-assistant/recommendations` does not require auth.
- `GET /api/draft-assistant/adp` does not require auth.
- `GET /api/draft-assistant/adp` may optionally use an Authorization header to enrich Yahoo-backed ADP when available, but missing auth falls back gracefully.
- No backend change is needed for public `/draft`.

Request 4 - ESPN card build flag clarification:

- Backend endpoint exists: `POST /api/platforms/espn/connect`.
- Endpoint is usable for guided connection and now returns safe structured errors.
- ESPN is still fragile because it depends on user-copied ESPN cookies and ESPN response behavior.
- Production recommendation: keep `VITE_ESPN_ENABLED=false` unless Justin explicitly wants ESPN visible as a soft-launch guided connection.
- If enabled in production, UI copy should frame ESPN as guided/manual connection, not low-friction OAuth.

## Dashboard And Omen Gate Contract

Date: 2026-05-25

Owner: Codex/backend

Feature: Responses to Claude Requests 5 and 6

Status: Contract updated. Omen is Pro/paid.

Dashboard summary endpoint:

- Confirmed endpoint: `GET /api/dashboard/summary`.
- Auth: Supabase bearer token required.
- Contract version: `dashboard-summary.v1`.
- This is the app-shell source of truth for dashboard tool tiles, Omen gate state, subscription state, and compact platform status.

Dashboard platform summary:

- Decision: Option A is already in place. `platforms` is included in `GET /api/dashboard/summary`.
- Frontend does not need a second fetch just to render the `/football` status bar or pass platform status into Draft Assistant for platform-aware ADP display.
- Use `GET /api/platforms` only when the UI needs richer connect/manage metadata, selected league details, reconnect copy, or account connection actions.

Current `platforms` shape:

```json
{
  "platforms": {
    "yahoo": {
      "connected": true,
      "league_id": "449.l.123"
    },
    "sleeper": {
      "connected": true,
      "username": "sleepy"
    },
    "espn": {
      "connected": false
    }
  }
}
```

Yahoo expired-token shape:

```json
{
  "platforms": {
    "yahoo": {
      "connected": false,
      "league_id": "449.l.123",
      "status": "token_expired"
    }
  }
}
```

Frontend platform handling:

- Treat `platforms.yahoo.connected === true` as Yahoo connected and usable for Yahoo-aware UI hints.
- Treat `platforms.yahoo.status === "token_expired"` as reconnect-needed, not fully connected.
- Treat `platforms.sleeper.connected === true` as Sleeper connected; `username` may be shown.
- Treat `platforms.espn.connected === true` as ESPN connected; no cookie or secret detail is exposed.
- Draft Assistant can receive `summary.platforms` directly from Football. Yahoo is currently the only connected platform that can enrich ADP; Sleeper/ESPN should show connected status but should not imply live ADP enrichment.
- Status bar can render from `summary.platforms` directly. No extra `/api/platforms` request is needed for that bar.

Omen product decision:

- Omen / Most Valuable Play is Pro/paid.
- Omen requires auth, a usable platform/league path, and active subscription.
- Frontend should show UpgradeState before trying live Omen when subscription is missing.
- Frontend should not call non-mock `POST /api/omen/mvp-move` until dashboard/platform/subscription gates are satisfied.

Dashboard Omen tool statuses:

- `tools.omen_of_the_week.mode` is now always `pro`.
- `status: "ready"` means platform context and subscription are present. Show the Omen CTA.
- `status: "needs_platform"` means no usable connected league exists. Show "Connect a league" and link to `/account/connect`.
- `status: "needs_subscription"` means a usable platform path exists, but the user is not subscribed. Show UpgradeState.
- `status: "pending_live_engine"` means a platform row exists, but the current live Omen engine cannot honestly produce a real recommendation from that connection yet. Show a connected-but-not-ready state, not fake advice.

Current backend behavior:

```json
{
  "tools": {
    "omen_of_the_week": {
      "available": false,
      "mode": "pro",
      "status": "needs_subscription"
    }
  }
}
```

Frontend gate order:

1. No session: `ProtectedRoute` sends user to `/login`.
2. `tools.omen_of_the_week.status === "needs_platform"`: show DisconnectedState with `/account/connect` CTA.
3. `tools.omen_of_the_week.status === "needs_subscription"`: show UpgradeState.
4. `tools.omen_of_the_week.status === "pending_live_engine"`: show connected-but-not-ready state.
5. `tools.omen_of_the_week.status === "ready"`: show Omen CTA or call live Omen path.

**Product confirmation — Justin 2026-05-24:** Gate order above is locked. Claude can build Omen gate logic without ambiguity. Auth first, then platform, then subscription (UpgradeState), then live Omen only when `status === "ready"`. Do not shortcut the subscription gate even if platform is connected.

Waiver Wire:

- `tools.waiver_wire` remains Pro.
- Show as a locked/upsell tile when `needs_subscription`.
- Show platform-disconnected copy when `needs_platform`.

`POST /api/omen/mvp-move` recovery:

- Non-mock live calls no longer universally fail closed. They should be attempted only after dashboard status is `ready`.
- If frontend sees `platform_disconnected`, `pending_live_engine`, `omen_auth_required`, `omen_subscription_required`, or `omen_live_generation_failed`, safest recovery is to refetch `GET /api/dashboard/summary` and `GET /api/platforms`, then route according to the dashboard Omen status above.
- Explicit mock/dev previews remain allowed only when visibly labeled as preview/mock.

## Local Authenticated Load Test Checkpoint

Date: 2026-06-05

Owner: Codex/backend

Feature: Omen / Trade Analyzer / Dashboard local load smoke

Status: Complete with Omen latency concern. No frontend contract shape changed.

Endpoint / contract:

- `POST /api/trade/compare`
- `POST /api/omen/mvp-move`
- `GET /api/dashboard/summary`

Request shape:

- Load script: `scripts/load-corvus-routes.js`
- Base URL used: `http://localhost:3000`
- Iterations: `10`
- Auth: Supabase bearer token supplied for Omen and dashboard.
- Trade payload:

```json
{
  "send": [{ "name": "Player A", "projected_points": 12, "position": "WR" }],
  "receive": [{ "name": "Player B", "projected_points": 14, "position": "RB" }],
  "scoring_format": "ppr"
}
```

Response shape:

- No API response shape changed.
- The script reports per-route `count`, HTTP `statuses`, `p50_ms`, and `p95_ms`.

Example response:

```json
{
  "base_url": "http://localhost:3000",
  "iterations": 10,
  "auth_token_supplied": true,
  "reports": [
    {
      "name": "trade_compare",
      "count": 10,
      "statuses": { "200": 10 },
      "p50_ms": 1,
      "p95_ms": 34
    },
    {
      "name": "omen_mvp_move",
      "count": 10,
      "statuses": { "200": 10 },
      "p50_ms": 2758,
      "p95_ms": 4999
    },
    {
      "name": "dashboard_summary",
      "count": 10,
      "statuses": { "200": 10 },
      "p50_ms": 156,
      "p95_ms": 633
    }
  ]
}
```

Files changed:

- Documentation/status only:
  - `Direction/current_sprint.md`
  - `Direction/decision_log.md`
  - `Blueprints/handoffs/backend-to-frontend.md`
  - `Blueprints/handoffs/rate-limit-shutdown-checkpoint.md`

Limitations:

- This was local Docker load smoke, not production load testing.
- Omen passed functionally but reached p95 4999ms under repeated authenticated local calls. Keep loading and duplicate-submit protection in the Omen UI.
- Dashboard summary stayed under the investor-demo 750ms p95 threshold locally.
- Trade Analyzer stayed very fast locally.
- Earlier `401` failures were traced to local Docker `.env` / Supabase service-key readiness, not frontend auth behavior.

How frontend should call it:

- No frontend call change required.
- Continue to call `GET /api/dashboard/summary` first and call `POST /api/omen/mvp-move` only when `tools.omen_of_the_week.status === "ready"`.
- Keep Account/Dashboard loading states resilient because dashboard summary may take several hundred milliseconds locally.
- Keep Omen in-flight state and duplicate-click protection because live Omen can take several seconds under load.

## Billing Kill-Switch Contract

Date: 2026-06-08

Owner: Codex/backend

Feature: Free/non-monetized Corvus billing gate

Status: Completed locally. Not deployed.

Endpoint / contract:

- Runtime flag: `CORVUS_BILLING_ENABLED`.
- Default: disabled unless the env value is exactly `"true"`.
- Launch value: `false`.
- When disabled, these routes return `403` before any Stripe method call:
  - `GET /api/stripe/prices`
  - `POST /api/stripe/checkout`
  - `POST /api/stripe/portal`
- Disabled response:

```json
{ "error": "Billing is disabled", "code": "billing_disabled" }
```

- Stripe webhook remains ungated and signature verification is unchanged.
- `requireSubscription` passes authenticated users through when billing is disabled, so Omen/Pro-depth backend paths no longer 402 on `users.is_subscribed` in free mode.
- When `CORVUS_BILLING_ENABLED=true`, existing Stripe prices/checkout/portal behavior and the `users.is_subscribed` subscription gate are unchanged.

State handling:

- Frontend should treat `billing_disabled` as the free/non-monetized mode and avoid sending users into checkout or portal.
- Account subscription/payment surfaces can be hidden or replaced by free-access copy in the frontend lane.

Mock vs live data:

- Tests use mocked Stripe and Supabase only. No live Stripe or Supabase calls were made.

Known limitations:

- This backend change does not remove Stripe code or frontend payment UI. It only makes the billing behavior reversible behind one flag.

Frontend action needed:

- Hide or revise Account billing CTAs for free launch mode, using `billing_disabled` as a defensive backend signal if those CTAs are still reachable.

## Phase 2.5 Weighted ADP Contract

Date: 2026-06-18

Owner: Codex/backend

Feature: Proprietary ADP weighting service

Status: Built and verified locally in commit `d04c535`. Not pushed or deployed.

Endpoint / contract:

- Existing `GET /api/draft-assistant/adp` response is additive; existing `sources.ffc`, `sources.yahoo`, and `sources.mfl` remain unchanged.
- New `weighting` metadata declares the config path and normalized provider weights.
- New `weighted_players` is the merged consensus board, ordered by `rank` ascending.
- `score` is weighted-average ADP, so lower is better. `lower_is_better: true` and `score_basis: "weighted_average_adp"` make that explicit.
- Each player includes `source_count` plus provider-level ADP, effective weight, and contribution evidence.

Configuration:

```json
{
  "default_scoring_rules": {
    "adp_source_weights": {
      "ffc": 5,
      "yahoo": 3,
      "mfl": 2
    }
  }
}
```

- Default relative weights are equal: FFC `1`, Yahoo `1`, MFL `1`.
- Configured values are normalized, so `5:3:2` becomes `0.5:0.3:0.2`.
- A missing provider is reweighted over the providers available for that player.
- An all-zero override restores defaults rather than emitting an empty board.
- The service accepts the league scoring-config row as `scoringConfig`. The public route currently uses defaults because the Phase 1.4 schema is review-only and no production row loader is in scope.

Response shape (abbreviated):

```json
{
  "is_mock": false,
  "weighting": {
    "config_path": "default_scoring_rules.adp_source_weights",
    "defaults_applied": false,
    "weights": { "ffc": 0.5, "yahoo": 0.3, "mfl": 0.2 }
  },
  "weighted_players": [
    {
      "rank": 1,
      "name": "Player Name",
      "position": "RB",
      "team": "BAL",
      "score": 17,
      "score_basis": "weighted_average_adp",
      "lower_is_better": true,
      "source_count": 3,
      "sources": {
        "ffc": { "adp": 10, "weight": 0.5, "contribution": 5 },
        "yahoo": { "adp": 20, "weight": 0.3, "contribution": 6 },
        "mfl": { "adp": 30, "weight": 0.2, "contribution": 6 }
      }
    }
  ]
}
```

Mock vs live data:

- Mock responses remain `is_mock: true` with the existing mock note.
- `weighted_players` on a mock response is derived only from the labeled mock source rows.
- Live source attribution remains present on the raw provider objects.

Known limitations:

- Matching uses normalized player name plus position because provider IDs are source-specific.
- The route does not query `league_scoring_configs`; Phase 2.6 or another authenticated consumer must pass the applicable row into the service.

Frontend action needed:

- None required. Existing raw-source rendering remains compatible.
- When adopting the consensus board, render `weighted_players`, preserve mock labeling, and describe the score as consensus ADP rather than a guarantee or projection.

## Response Template

```text
Date:
Owner:
Feature:
Status:

Endpoint / contract:

Request shape:

Response shape:

State handling:

Mock vs live data:

Known limitations:

Frontend action needed:
```

## Phase 2.7 Demo Mode Backend Contract

Date: 2026-06-19

Owner: Codex/backend

Feature name: Public Corvus Demo Mode

Status: Deployed from PR #51, squash merge `cccc857`, in KVM1 workflow run `27842680052`.

Method and path:

```text
GET /api/demo
Auth: none
Rate limit: public-tool limiter
```

Request body or query:

```text
None.
```

Response shape:

```json
{
  "contract_version": "corvus-demo.v1",
  "feature": "corvus_demo",
  "mode": "demo",
  "is_demo": true,
  "is_live": false,
  "is_mock": false,
  "generated_at": "ISO-8601",
  "demo_notice": {
    "label": "Demo Mode",
    "message": "Sample league and roster data. This is not live fantasy advice.",
    "deterministic_fixture": true,
    "requires_explicit_live_switch": true
  },
  "telemetry": {
    "analytics_eligible": false,
    "llm_training_eligible": false
  },
  "roster": {
    "source": "demo_fixture",
    "platform": "demo",
    "league_key": "demo-league-corvus",
    "team_key": "demo-team-ravens",
    "week": 1,
    "slots": {
      "starters": [],
      "bench": [],
      "ir": []
    }
  },
  "omen": {
    "state": "success",
    "feature": "omen_mvp_move",
    "mode": "demo",
    "signals": {},
    "recommendation": {},
    "alternatives": [],
    "warnings": []
  }
}
```

Example recommendation:

```json
{
  "title": "Start Sample RB Breakout over Sample RB Starter",
  "move": "Move Sample RB Breakout into your RB slot and bench Sample RB Starter.",
  "expected_value_delta": {
    "points": 5.6,
    "label": "major"
  },
  "confidence": {
    "score": 95,
    "label": "high",
    "rationale": "The demo optimizer sees a 5.60 point edge in the sample lineup."
  },
  "risk": {
    "level": "low",
    "reasons": [
      "The roster and projections are deterministic sample data, not current league information.",
      "A real recommendation can change with injuries, matchups, scoring settings, and roster context."
    ]
  }
}
```

Files changed:

- `src/services/demoMode.js`
- `src/routes/demo.js`
- `src/server.js`
- `test/demoMode.test.js`
- `Blueprints/demo-mode.md`
- `Blueprints/api-routes.md`

Limitations:

- Demo data is a fixed product fixture, not current NFL or user-league data.
- `generated_at` changes per request; roster, recommendation inputs, and request id remain deterministic for `corvus-demo.v1`.
- The backend exposes no separate loading/empty/error demo variants in v1; the success fixture is intentionally stable.
- Demo interactions must not be sent to product analytics or LLM training. The response exposes this under `telemetry`, but the frontend owns event suppression.
- The service performs no Supabase, provider-adapter, auth, or LLM work.

How frontend should call it:

- Fetch once when the public `/demo` route loads.
- Treat `mode` as authoritative. Do not interpret `is_mock: false` as live when `mode === "demo"`.
- Keep a persistent Demo Mode label visible and add `demo` handling to `DataSourceLabel`/signal status UI.
- Render `roster` through normalized roster components and `omen` through the existing Omen rendering shape.
- Require an explicit CTA/navigation action before entering platform connection or live Omen; never silently merge or replace the demo fixture.

## Phase 2.6 Parameterized Math Engine Contract

Date: 2026-06-19

Owner: Codex/backend

Feature name: Parameterized optimizer and trade-value math engine

Status: Deployed 2026-06-19 via squash-merged PR #49 (`93e1a7176e26c715d34b5337df66182a6a828eb0`) and successful KVM1 workflow run `27834697621`.

Method and path:

- No endpoint or route contract changed.
- Existing Omen, optimizer, Start/Sit, waiver, and Trade Analyzer call sites continue using their current defaults.
- This contract is an internal backend service seam for a future approved scoring-config loader.

Request / service input:

Services accept a whole scoring-config row directly, as `opts.scoringConfig`, or as a trailing `scoringConfig` argument. Existing options take precedence.

```json
{
  "scoring_format": "half_ppr",
  "default_scoring_rules": {
    "optimizer": {
      "lineup_min_delta": 1,
      "waiver_min_delta": 2,
      "waiver_limit": 3
    },
    "trade_value": {
      "neutral_band": 2.5,
      "scarcity_signal_weight": 0.7
    }
  },
  "league_scarcity_weights": [
    {
      "position": "TE",
      "baseline_points": 6,
      "scarcity_weight": 1.5
    }
  ]
}
```

Response shape:

- Existing response envelopes are unchanged.
- Without config, optimizer defaults remain lineup delta `0.5`, waiver delta `0`, and waiver limit `5`.
- Without config, Trade Analyzer remains PPR with the existing replacement levels, neutral band `2.0`, and scarcity-signal weight `0.6`.
- With config, recommendation ordering/verdict math may change, but confidence, risk, reasoning, source labels, and response field names remain unchanged.

Example response:

```json
{
  "scoring_format": "half_ppr",
  "net_value": 7,
  "a_score": 7,
  "b_score": 0,
  "combined_score": 7,
  "verdict": "accept",
  "confidence": "medium"
}
```

Files changed:

- `src/services/optimizer.js`
- `src/services/tradeValue.js`
- `test/optimizerService.test.js`
- `test/tradeValue.test.js`
- `Blueprints/audits/2026-06-19-phase2-6-math-engine-code-review.md`

Limitations:

- No production `league_scoring_configs` loader exists yet; current routes continue using defaults.
- The Phase 1.4 schema remains review-only and was not applied or queried.
- A `custom` scoring format inherits PPR baselines for positions without an explicit `baseline_points` row.
- No frontend-visible behavior changes until a backend caller supplies an approved config.

How frontend should call it:

- No frontend change. Continue calling existing endpoints with their current request bodies.
- Do not send raw scoring-config rows from the browser; future backend integration should load the authenticated user's owned league config server-side.
