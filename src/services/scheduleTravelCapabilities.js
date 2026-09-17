"use strict";

/**
 * Schedule and travel capability source.
 *
 * This module owns only NFL-wide, credential-free schedule context. It does not
 * decide a fantasy move and it does not choose a player: callers must give it
 * the server-normalized NFL team for the player already selected in the user's
 * verified league context.
 *
 * The returned `status` is legacy-signal compatible. `resolution` preserves the
 * richer source result for the shared capability kernel, which can render a
 * meaningful unavailable/failed/not-applicable state without exposing `stub`.
 */

const nflSchedule = require("./nflSchedule");

const ESPN_SOURCE = "espn_scoreboard";
const TRAVEL_SOURCE = "omen_stadium_distance";

function isoNow(now) {
  const date = now instanceof Date ? now : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isNormalizedNflTeam(value) {
  return /^[A-Z]{2,3}$/.test(String(value || "").trim().toUpperCase());
}

function limitation({ name, resolution, source, statement, observedAt = null, freshUntil = null }) {
  return {
    name,
    // The shared kernel already treats `unavailable` as the compatible wire
    // state. Keep the source-native distinction in `resolution`.
    status: "unavailable",
    resolution,
    used: false,
    source,
    message: statement,
    observed_at: observedAt,
    fresh_until: freshUntil,
    facts: [],
  };
}

function noScheduleCapabilities({ resolution, source, statement, observedAt, freshUntil }) {
  return {
    game_time_tv: limitation({
      name: "game_time_tv", resolution, source, statement, observedAt, freshUntil,
    }),
    travel_home_away: limitation({
      name: "travel_home_away", resolution, source, statement, observedAt, freshUntil,
    }),
  };
}

function scheduleCapabilities(game, { observedAt, freshUntil }) {
  const gameFacts = [
    {
      name: "kickoff",
      kind: "verified",
      source: ESPN_SOURCE,
      statement: `Kickoff is ${game.kickoff_local}.`,
      value: game.kickoff_utc,
    },
    {
      name: "opponent",
      kind: "verified",
      source: ESPN_SOURCE,
      statement: `Opponent: ${game.opponent_name}.`,
      value: game.opponent_abbr,
    },
    {
      name: "home_away",
      kind: "verified",
      source: ESPN_SOURCE,
      statement: `${game.home_away} game.`,
      value: game.home_away,
    },
    {
      name: "kickoff_window",
      // ESPN's public scoreboard event gave us the event time. The window is
      // classified from that time/name; it is not a verified broadcast network.
      kind: "inference",
      source: "omen_kickoff_window",
      statement: `Kickoff window: ${game.tv_slate}. No broadcaster is claimed by this source.`,
      value: game.tv_slate,
    },
  ];

  const travelKnown = Number.isFinite(game.travel_miles);
  const travelFact = {
    name: "travel_distance",
    kind: "model",
    source: TRAVEL_SOURCE,
    statement: travelKnown
      ? game.home_away === "Home"
        ? "Home game; the stadium-distance model records no team travel."
        : `Omen estimates about ${game.travel_miles} straight-line miles from static stadium coordinates.`
      : "Omen verified the game location but cannot estimate travel distance from its stadium data.",
    value: travelKnown ? game.travel_miles : null,
  };

  return {
    game_time_tv: {
      name: "game_time_tv",
      status: "live",
      resolution: "available",
      used: false,
      source: ESPN_SOURCE,
      message: `Kickoff is ${game.kickoff_local}; ${game.home_away.toLowerCase()} vs ${game.opponent_abbr}. ${gameFacts[3].statement}`,
      observed_at: observedAt,
      fresh_until: freshUntil,
      facts: gameFacts,
    },
    travel_home_away: {
      name: "travel_home_away",
      status: "live",
      resolution: "available",
      used: false,
      source: TRAVEL_SOURCE,
      message: `${game.home_away} vs ${game.opponent_abbr}. ${travelFact.statement}`,
      observed_at: observedAt,
      fresh_until: freshUntil,
      facts: [gameFacts[1], gameFacts[2], travelFact],
    },
  };
}

/**
 * Resolve source-backed kickoff and travel/home-away context for one normalized NFL team.
 * This never asks a provider for credentials or accepts a client-supplied opponent.
 */
async function resolveScheduleTravelCapabilities({ nflTeam, now = new Date() } = {}) {
  if (!isNormalizedNflTeam(nflTeam)) {
    return noScheduleCapabilities({
      resolution: "insufficient_context",
      source: "normalized_roster",
      statement: "Omen needs the selected player's normalized NFL team before it can read game context.",
    });
  }

  if (nflSchedule.isOffSeason(now)) {
    return noScheduleCapabilities({
      resolution: "not_applicable",
      source: "nfl_season_calendar",
      statement: "Game-time and travel context return when the regular season is active.",
    });
  }

  const result = await nflSchedule.getGameInfoDetails(String(nflTeam).trim().toUpperCase());
  if (result.status === "available") {
    return scheduleCapabilities(result.game, {
      observedAt: result.observed_at || isoNow(now),
      freshUntil: result.fresh_until || null,
    });
  }

  const timing = { observedAt: result.observed_at || null, freshUntil: result.fresh_until || null };
  if (result.status === "failed") {
    return noScheduleCapabilities({
      resolution: "failed",
      source: ESPN_SOURCE,
      statement: "Omen could not verify this week's game context from the schedule source. Try again shortly.",
      ...timing,
    });
  }

  if (result.status === "insufficient_context") {
    return noScheduleCapabilities({
      resolution: "insufficient_context",
      source: ESPN_SOURCE,
      statement: "Omen needs a complete NFL team context before it can read this game's schedule.",
      ...timing,
    });
  }

  return noScheduleCapabilities({
    resolution: "unavailable",
    source: ESPN_SOURCE,
    statement: "Omen could not find a scheduled game for this team on the current scoreboard.",
    ...timing,
  });
}

module.exports = {
  ESPN_SOURCE,
  TRAVEL_SOURCE,
  isNormalizedNflTeam,
  resolveScheduleTravelCapabilities,
};
