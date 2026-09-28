"use strict";

const DETAIL_COLUMNS = [
  "id", "user_id", "week_num", "season", "move_type", "headline", "reasoning",
  "confidence", "target_player", "followed", "user_stars", "user_note", "outcome",
  "eff", "result", "created_at", "scored_at", "platform", "league_id", "scoring",
  "scoring_contract_version", "scoring_coverage_state", "reconciliation_state",
].join(",");

function createMovesRepository(client) {
  if (!client || typeof client.from !== "function") throw new TypeError("A database client is required");

  function list({ userId, season, limit, platform, leagueId, columns = DETAIL_COLUMNS }) {
    let query = client.from("moves").select(columns)
      .eq("user_id", userId).eq("season", season)
      .order("created_at", { ascending: false }).limit(limit);
    if (platform != null) query = query.eq("platform", platform);
    if (leagueId != null) query = query.eq("league_id", leagueId);
    return query;
  }

  return { list };
}

module.exports = { createMovesRepository, DETAIL_COLUMNS };
