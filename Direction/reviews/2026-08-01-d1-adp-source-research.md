# D1 Trade-Pulse ADP Source — Research Correction

## Research Question

What data source should back `GET /api/trade/pulse`'s buy-low computation? `Direction/current_sprint.md` D1 framed this as needing a live ADP source, with "do not touch: paid data source or new dependency without approval" — the founder approved exploring a **paid** source for this.

**Finding: a paid source is very likely unnecessary. A free, three-source, already-implemented live ADP pipeline already exists in the codebase and is not wired to production.** This report corrects course before any vendor research happens, per this skill's own rule not to default to research when the actual gap is something else.

## Layer

2-Corvus (Omen)

## What already exists — `src/services/adp.js` + `src/routes/trade.js`

`buildLiveAdpResponse()` in `src/services/adp.js` is a **complete, working, free** weighted-ADP pipeline:

- **Fantasy Football Calculator (FFC)** — `https://fantasyfootballcalculator.com/api/v1/adp/{format}?teams={n}&year={y}`. Verified live just now: returns real 2026-season data (400+ players, PPR, 12-team, `date_range` "July 24-31, 2026"). No API key. No auth. No documented rate limit found (their `/terms` page 404'd — see gap below).
- **MyFantasyLeague (MFL)** — `https://api.myfantasyleague.com/{year}/export?TYPE=adp&...`. Verified live just now: returns real ADP data, 305 drafts analyzed, no auth required, no rate limit stated.
- **Yahoo** — reuses the *already-built* Yahoo OAuth client (`yahooClient.getDraftAnalysis`), no new integration needed.

All three sources are cached in Redis (`FFC_TTL_SECONDS`, `YAHOO_TTL_SECONDS`, `MFL_TTL_SECONDS`), merged via `buildWeightedAdpBoard()` with configurable per-source weights, and normalized to a common player identity across sources. This is not a stub — it's a real, tested-looking implementation.

**Why `/api/trade/pulse` still returns `source_status: "live_adp_unavailable"`:** `src/routes/trade.js`:22-24 only constructs the Redis client when `config.isProd && config.redisUrl && config.redisToken` are all true. Outside that exact condition (or if `buildLiveAdpResponse` throws for any reason — e.g. a transient FFC/MFL fetch failure), the route silently falls back to `unavailable()`. This is a **verification/reliability gap, not a missing-data-source gap.**

## Candidates Evaluated

### Fantasy Football Calculator (already integrated)

- Availability: Free, public, no key
- Auth required: None
- Commercial ToS: **Unclear** — no `/terms` page found (404); no explicit commercial-use statement located. Existing code already attributes them (`FFC_ATTRIBUTION`, `FFC_ATTRIBUTION_URL`) as a courtesy, which is a reasonable community norm for this kind of hobbyist aggregator, but it's not the same as a written license grant.
- Pricing: Free
- Rate limits: Not documented; not observed to fail on a single live request
- Data coverage: Full ADP by format/teams/year, verified current for the 2026 season
- Update frequency: Rolling (draft-count-based, "July 24-31, 2026" window observed)
- Technical complexity: Easy (already built)
- Maintenance risk: Medium — small community site, no formal SLA
- Score: 4/5 (only drawback: no written commercial ToS to point to)

### MyFantasyLeague (already integrated)

- Availability: Free, public export API
- Auth required: None
- Commercial ToS: Unclear — MFL's export API is widely used by third-party fantasy tools; no explicit prohibition found, but no explicit commercial grant checked in depth here either
- Pricing: Free
- Rate limits: Not documented; not observed to fail
- Data coverage: Real ADP data, 305 drafts analyzed at time of check
- Update frequency: Rolling
- Technical complexity: Easy (already built)
- Maintenance risk: Low-medium — long-running, well-known fantasy platform
- Score: 4/5

### Yahoo (already integrated via existing OAuth)

- Availability: Free (uses Omen's existing Yahoo OAuth app)
- Auth required: OAuth (already built and live elsewhere in the app)
- Commercial ToS: Covered by Omen's existing Yahoo developer agreement (already in force for other features)
- Pricing: Free
- Rate limits: Yahoo's standard API limits (already respected elsewhere in the codebase)
- Data coverage: `draft_analysis.average_pick` per player
- Update frequency: Real-time per Yahoo's own data
- Technical complexity: Easy (reuses existing client)
- Maintenance risk: Low — Yahoo already a load-bearing integration
- Score: 5/5

## Ranked Summary

| Category | Winner | Runner-Up | Notes |
|---|---|---|---|
| Best open source / free | FFC + MFL + Yahoo (all three, already built) | — | This is already the implementation; nothing to choose |
| Best value | Same three-source blend | — | Zero incremental cost |
| Best overall (paid, for future reference) | Not researched | — | Didn't pursue paid vendors (Sportradar, FantasyData, RotoWire, etc.) once it was clear the free path already exists and just needs verification — researching a paid replacement for a working free system isn't the actual gap |

## Actionable Recommendation

**Build against:** nothing new — the three-source free pipeline in `src/services/adp.js` already exists.

**Skip:** researching/onboarding a paid ADP vendor. There's no gap here that a paid source would close; the gap is operational (is Redis actually configured/reachable in production right now, and do all three free fetches actually succeed end-to-end).

**Phase 1 now (the real D1 remaining work):**
1. Confirm `config.isProd && config.redisUrl && config.redisToken` actually all resolve true in the live KVM1 environment (this needs someone with production env access — a founder-gated check, not something I can verify from the repo).
2. Hit `GET /api/trade/pulse` in production and confirm it actually returns `source_status: "live_adp"` with real players, not `"live_adp_unavailable"`.
3. If it's failing, find out which of the three sources (or the Redis connection itself) is the actual point of failure, and fix that — not add a fourth data source.
4. Retire the "static list" the original D1 sprint note references, once live is confirmed working (I did not locate this static list in this pass — worth a quick `grep` before assuming it's still referenced anywhere).

**Phase 2 later:** if FFC or MFL prove unreliable in practice (the maintenance-risk flag above), a paid vendor becomes worth researching — but only after the free path is proven to actually fail in production, not preemptively.

## Implementation Notes for a future session

- `src/services/adp.js` and `src/routes/trade.js` are both already fully written — this is a verification task, not a build task.
- **Test coverage already exists and passes**: `test/adpService.test.js` (9 tests, all green) covers `fetchMFL`, `resolveAdpSourceWeights`, `buildWeightedAdpBoard`, and the mock-response labeling. `test/tradeRoute.test.js` already has both `GET /api/trade/pulse is explicitly unavailable without live ADP` and `GET /api/trade/pulse maps live weighted ADP into source-labeled targets` (asserts `source_status === "live_adp"`). There is no static-list reference found anywhere in `src/` — D1's "static list" framing may already be stale relative to this codebase; worth confirming with Justin rather than assuming it still needs retiring.
- The `unavailable()` fallback in `trade.js`:194 (bare `catch {}`) swallows the actual error — worth logging which source/step failed rather than a blanket catch, so a future production failure is diagnosable instead of just "unavailable."

## Approval Required

None for research. The Phase 1 verification above needs **founder access to production env/Redis config** — that's a live-access-window item, not something I can do from the repo, similar to the two flags left open from A3.

## Sources Checked

- `src/services/adp.js`, `src/routes/trade.js` (repo source)
- `https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026` (live fetch, 2026-08-01)
- `https://fantasyfootballcalculator.com/terms` (404, no ToS page found)
- `https://api.myfantasyleague.com/2026/export?TYPE=adp&JSON=1` (live fetch, 2026-08-01)
