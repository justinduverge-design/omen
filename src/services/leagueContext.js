"use strict";

/**
 * Provider-neutral identity for a selected league in a specific season.
 *
 * A provider league id is not a durable Omen identity by itself: the same
 * league id can be reused across seasons, while membership and scoring rules
 * are season-scoped. Keep this value request-local until the additive schema
 * migration is approved; callers must not use it as a credential or provider
 * lookup key.
 */

const LEAGUE_CONTEXT_CONTRACT = "league-context.v1";
const PLATFORMS = new Set(["espn", "sleeper", "yahoo"]);

function text(value) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function season(value) {
  const result = Number(value);
  return Number.isInteger(result) && result >= 2000 && result <= 2200 ? result : null;
}

/**
 * Normalize only caller-owned league facts. Missing identity is explicit and
 * never repaired with the current calendar year or an arbitrary provider id.
 */
function canonicalLeagueContext(input = {}) {
  const platform = text(input.platform)?.toLowerCase() || null;
  const leagueId = text(input.league_id ?? input.leagueId);
  const seasonYear = season(input.season);
  const valid = PLATFORMS.has(platform) && Boolean(leagueId) && seasonYear !== null;
  if (!valid) {
    return {
      contract_version: LEAGUE_CONTEXT_CONTRACT,
      state: "unavailable",
      reason_code: "league_context_incomplete",
    };
  }

  const teamId = text(input.team_id ?? input.teamId);
  const memberId = text(input.member_id ?? input.memberId);
  return {
    contract_version: LEAGUE_CONTEXT_CONTRACT,
    state: "live",
    platform,
    league_id: leagueId,
    season: seasonYear,
    season_instance_key: `${platform}:${leagueId}:${seasonYear}`,
    ...(teamId ? { team_id: teamId } : {}),
    ...(memberId ? { member_id: memberId } : {}),
  };
}

module.exports = { LEAGUE_CONTEXT_CONTRACT, canonicalLeagueContext };
