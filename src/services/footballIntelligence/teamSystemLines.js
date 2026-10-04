"use strict";

/**
 * Published team-system summaries for a set of NFL teams (FI-LEAGUE step 7): the `team_system_identity`
 * signals the nightly job publishes (omen_football_intelligence_cron.js), read for the start/sit call's
 * "observed context" lines. Published, available rows with a summary only; any failure returns nothing,
 * and the caller then shows no line.
 */

const { teamIdFor, canonicalAbbreviation } = require("./nflTeams");
const { TEAM_SIGNAL_TYPE } = require("./servingRepository");

/** @returns {Promise<Map<string, string>>} team abbreviation -> summary sentence */
async function getTeamSystemSummaries({ supabase, teams, season, log }) {
  try {
    const abbrs = [...new Set((teams || []).map(canonicalAbbreviation).filter(Boolean))];
    if (!supabase || !abbrs.length || !Number.isInteger(season)) return new Map();
    const ids = abbrs.map(teamIdFor);
    const { data, error } = await supabase
      .from("football_intelligence_signals")
      .select("team_id, status, payload")
      .in("team_id", ids)
      .eq("season", season)
      .eq("signal_type", TEAM_SIGNAL_TYPE)
      .eq("publication_state", "published");
    if (error) throw new Error(`signals read failed: ${error.code || "unknown"}`);
    const byId = new Map();
    for (const row of data || []) {
      const summary = row?.payload?.summary;
      if (row.status === "available" && typeof summary === "string" && summary.trim()) byId.set(row.team_id, summary.trim());
    }
    return new Map(abbrs.filter((a) => byId.has(teamIdFor(a))).map((a) => [a, byId.get(teamIdFor(a))]));
  } catch (error) {
    log?.warn?.("team system summaries unavailable", { reason: error.message });
    return new Map();
  }
}

module.exports = { getTeamSystemSummaries };
