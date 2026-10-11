# Yahoo projections (server side, 2026-10-11)

Source of the problem: `Direction/2026-10-06-tuesday-beta-readiness.md` section 2b ("Yahoo still has no projections") and `2026-10-11-omen-call-hold-and-league-scope.md` (Yahoo = "cannot rank", no trade, availability-only waivers).

## What was true (CODE)

- Sleeper: `fetchSleeperProjections` (public `api.sleeper.app/projections`) fills `projected_points` on rosters and pools. ESPN: the roster API carries a projection per player.
- Yahoo: `roster.normalizePlayer`, `normalizeYahooWaivers` and `adapters/yahoo.withYahooIds` all set `projected_points: null`. Yahoo's `/team/{key}/stats;type=projected` returns a team total only (`getProjectedStats`, result discarded). There is no verified per-player projected-stats call for this app, and Yahoo publishes no projections for players in the `players;status=A` response. Not scraping Yahoo or anyone else was a constraint, so no new Yahoo surface was added.
- Yahoo league scoring IS readable: `/league/{key}/settings` returns `stat_modifiers` and `stat_categories` (measured 2026-09-06, facts-of-record #11) and `scoringRuleSnapshot.deriveYahooRules` already maps them.
- The warehouse crosswalk (#611) maps `yahoo:<id>` to a player, but its Yahoo ids come from the `yahoo_id` field of Sleeper's player list, so Sleeper's own list is the same mapping without a database hop.

## What changed

`src/services/yahooProjections.js` builds a Yahoo player's projection like this:

1. Yahoo player id -> Sleeper id through `yahoo_id` in Sleeper's player list (memoised 20 min in process, 24 h in Redis). A pair is used only if the normalised names agree (`playerCrosswalk.normalizeName`, suffixes ignored) and exactly one Sleeper player claims that Yahoo id. Otherwise the player stays `null`.
2. Sleeper's public weekly projection STAT LINE (`fetchSleeperProjectionStatLines`, cached 1 h) is scored with the Yahoo league's own rules (`stat_modifiers` through `deriveScoringSnapshot`). Sleeper's `pts_ppr` is never used because it is PPR.
3. Labels: each projected player carries `projection_source: "sleeper_public_projections"` and `projection_basis: "league_scoring" | "approximate_scoring"`. A league rule Omen cannot map (e.g. a yardage bonus) makes the totals `approximate_scoring`, but only for the position types that rule can touch (Yahoo's own `stat_categories.position_type`; points-allowed tiers are `DT` and do not mark a running back approximate; an unmapped rule of unknown type marks everyone).
4. Scoring unreadable -> no projections at all (reason `scoring_unreadable`). This is the one place the brief allowed an approximate fallback; it was deliberately NOT built: scoring PPR for a league whose rules are unknown can flip a start/sit call. The Omen call keeps saying "cannot rank".
5. Bounded: the whole enrichment runs under 2.5 s; league rules are memoised 30 min (60 s for a failure); a timeout leaves the request with no projections while the reads keep warming the caches. Kill switch: `YAHOO_PROJECTIONS_DISABLED=1`.

Wiring (all call the same function; it never throws):

| Surface | Change |
|---|---|
| `roster.fetchAndNormalizeRoster` (Omen call, Start/Sit detail, optimizer routes, waiver analysis) | players enriched before the 5-minute cache write; roster carries `projection_meta` |
| `adapters/yahoo.fetchYahooLeagueRosters` (Trade screens, Omen trade candidate) | every team's players enriched; result carries `projection_meta` |
| Omen call waivers (`omen.js`) | Yahoo now builds a projection-backed `waiver_pickup` (same selector, same numeric delta as Sleeper/ESPN). A Yahoo add must share the OUT starter's primary position (Yahoo's `eligible_positions` list flex and bench slots). The pool is read once; the availability-only fallback is kept for pools with no projection |
| `routes/waivers.js` (waiver analysis) | pool projected; `availabilityConfirmed` true only when projections exist; limitations say the numbers are Sleeper's, re-scored, and say "approximate" when so |
| `routes/optimizer.js` | pools projected |
| Omen call response | `signals.projections.source` is `sleeper_public_projections_yahoo_scoring` or `..._approximate`, with a message naming the source; `data_used` gains a line; an approximate league adds a warning |
| `services/optimizer.js` | null-safe: a null projection is never treated as 0 (it used to invent an edge for a projected bench player over an unmapped starter). An OUT starter with no projection is still replaced. Affects Sleeper/ESPN only when a player is unprojected there too |

Trade: Yahoo rosters now carry projections when the above succeeds, so `omenTradeCandidate` weighs a Yahoo trade like ESPN. When projections are unavailable it still reports `projections_unavailable`.

No schema change. No contract fixtures needed: the new strings use existing fields (`signals.projections`, `warnings`, `explanation.data_used`, waiver `limitations`). `node scripts/contracts.js check` passes.

## Rights (read before the beta)

Sleeper's projection records carry `"company": "rotowire"`, i.e. Sleeper redistributes RotoWire's numbers. Omen already uses this endpoint for Sleeper leagues. `scoringSnapshotResolver.js` records that Sleeper's written commercial-use permission is still pending. Extending the same source to Yahoo users widens the exposure, it does not create a new kind. Decision for the founder: if permission does not arrive, Sleeper and Yahoo projections both go together (`YAHOO_PROJECTIONS_DISABLED=1` is the Yahoo-only switch).

## Still missing, and why

- No live Yahoo run: this session could not sign in to Yahoo. Shape assumptions are the repo's own measured ones (`stat_modifiers.stats[].stat.{stat_id,value}`); `stat_categories` parsing is defensive and falls back to "unknown type = approximate". First real call should be checked on a device with a Yahoo league: look for `signals.projections.source` starting `sleeper_public_projections_yahoo_scoring`.
- Team defence (DEF) and IDP players are not projected (Sleeper's DEF ids carry no `yahoo_id`; points-allowed tiers are unmapped).
- Players Sleeper lacks a `yahoo_id` for (some rookies, recent signings) stay unprojected; a roster with some `null` projections gets no swap that depends on them.
- Projection explainer (`projectionBreakdown.js`) still says "Yahoo does not give Omen a projected stat line." It could now show the stat line (the data is in hand); not done to keep this slice small.
- `routes/optimizer.js buildWaiverRecommendations` ranks by VORP using the PPR replacement table (`vorp.js`, protected). Pre-existing; it should take the league's format.
- Hold copy for a Yahoo league with no projections still reads "Yahoo does not give Omen weekly projections" (true, locked by contract fixtures); it could say "Omen could not build" when the reason is a failed build. `projection_meta.reason` is available for that.
- Using the warehouse crosswalk (`football.football_player_ids`) instead of Sleeper's list would add a verified `gsis` join and make this independent of Sleeper's player list; worth doing with the usage lines.

## Tests

`test/yahooProjections.test.js` (scoring, labels, refusal cases, caching, budget, kill switch, optimizer null-safety) and four cases appended to `test/omenMvpLiveService.test.js` (disclosure, approximate, projection-backed waiver with a quarterback excluded, availability fallback reads the pool once).
