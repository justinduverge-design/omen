"use strict";

/**
 * Start/Sit detail (visual briefs §5).
 *
 * `POST /api/start-sit` is a stateless, unauthenticated, caller-supplied
 * two-player comparator: the client passes two names and two projections and
 * gets a winner. §5 is a different surface — it opens on *the user's own*
 * highest-priority unresolved lineup decision, names the league's scoring rule,
 * and separates fact from inference. Nothing in the old route touches a
 * provider, so none of that was reachable.
 *
 * Pure over an already-normalized roster; provider I/O stays in the route.
 */

const optimizer = require("./optimizer");

const CONTRACT_VERSION = "start-sit-detail.v1";

// Below this the two players are inside projection noise. §5.3 requires an
// honest "close decision" rather than a forced recommendation.
const CLOSE_DECISION_DELTA = 1.5;

const OUT_STATUSES = new Set(["O", "OUT", "IR", "IR-R", "PUP", "SUSP"]);
const RISK_STATUSES = new Set(["Q", "QUESTIONABLE", "GTD", "DTD", "DOUBTFUL"]);

const STATES = Object.freeze({
  CLEAR: "clear_decision",
  CLOSE: "close_decision",
  PLAYER_UNAVAILABLE: "player_unavailable",
  INCOMPLETE_DATA: "incomplete_data",
  GAMES_STARTED: "games_started",
  NO_DECISION: "no_decision",
  OFF_SEASON: "off_season",
});

function normalizedStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function confidenceLabel(delta) {
  if (delta >= 4) return "high";
  if (delta >= CLOSE_DECISION_DELTA) return "moderate";
  return "low";
}

function playerView(player, roster) {
  const key = player?.player_key;
  const full = (roster?.slots?.starters || [])
    .concat(roster?.slots?.bench || [])
    .find((candidate) => candidate.player_key === key) || {};
  return {
    player_key: key == null ? null : String(key),
    name: player?.name || null,
    position: full.position || null,
    team: full.team || null,
    projected_points: player?.projected == null ? null : Number(player.projected),
    status: player?.status || null,
    kickoff: full.kickoff || full.game_time || null,
  };
}

/**
 * §5.2. Each entry names its own kind, so the client can never render a
 * projection or a model inference as a verified fact.
 */
function buildEvidence({ start, sit, delta, scoringFormat }) {
  const evidence = [];

  if (scoringFormat) {
    evidence.push({
      category: "league_fact",
      kind: "verified",
      statement: `This league awards ${scoringFormat}.`,
    });
  }

  if (start.projected_points != null && sit.projected_points != null) {
    evidence.push({
      category: "player_game_fact",
      kind: "projection",
      statement: `${start.name} projects ${start.projected_points} and ${sit.name} projects ${sit.projected_points} in this league's scoring.`,
    });
  }

  for (const player of [start, sit]) {
    const status = normalizedStatus(player.status);
    if (status && !OUT_STATUSES.has(status) && !RISK_STATUSES.has(status)) continue;
    if (!status) continue;
    evidence.push({
      category: "current_status",
      kind: "verified",
      statement: `${player.name} is listed ${status.toLowerCase()}.`,
    });
  }

  evidence.push({
    category: "omen_inference",
    kind: "inference",
    statement: delta >= CLOSE_DECISION_DELTA
      ? `The available data favors ${start.name}.`
      : `The available data slightly favors ${start.name}, and the gap is inside normal projection variance.`,
  });

  if (!scoringFormat) {
    evidence.push({
      category: "limitation",
      kind: "limitation",
      statement: "Omen has not verified this league's scoring rules, so the comparison uses the provider's own projections without restating the rule.",
    });
  }

  return evidence;
}

/** §5.3: the one or two conditions genuinely capable of changing the call. */
function whatCouldChangeThis({ start, sit, delta }) {
  const conditions = [];
  for (const player of [sit, start]) {
    if (RISK_STATUSES.has(normalizedStatus(player.status))) {
      conditions.push(`${player.name}'s final injury status.`);
    }
  }
  if (delta < CLOSE_DECISION_DELTA) {
    conditions.push("Any late projection move, since the two are within a point and a half.");
  }
  return conditions.slice(0, 2);
}

function envelope({ context, state, extra = {} }) {
  return {
    contract_version: CONTRACT_VERSION,
    generated_at: new Date().toISOString(),
    ...context,
    state,
    recommendation: null,
    why: [],
    what_could_change_this: [],
    evidence: [],
    alternatives: [],
    ...extra,
  };
}

/**
 * @param {object} input
 * @param {object} input.roster normalized roster
 * @param {string|null} input.slot optional slot the user switched to
 */
function buildStartSitDetail({
  roster,
  platform,
  leagueId,
  leagueName = null,
  teamName = null,
  week = null,
  season = null,
  scoringFormat = null,
  slot = null,
  offSeason = false,
} = {}) {
  const context = {
    platform,
    league_id: leagueId == null ? null : String(leagueId),
    league_name: leagueName,
    team_name: teamName,
    season: season == null ? null : Number(season),
    week: week == null ? null : Number(week ?? roster?.week),
    scoring_format: scoringFormat,
  };

  if (offSeason) {
    return envelope({ context, state: STATES.OFF_SEASON, extra: {
      message: "Lineup decisions return with the regular season.",
    } });
  }

  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  const bench = Array.isArray(roster?.slots?.bench) ? roster.slots.bench : [];
  if (!starters.length || !bench.length) {
    return envelope({ context, state: STATES.INCOMPLETE_DATA, extra: {
      message: "Omen needs a full starting lineup and a bench before it can compare a lineup decision.",
    } });
  }

  // minDelta of -Infinity so a close call surfaces as a close call rather than
  // vanishing. The state field, not a silent filter, carries the honesty.
  const all = optimizer.evaluateLineup(roster, { minDelta: Number.NEGATIVE_INFINITY });
  const scoped = slot ? all.filter((rec) => String(rec.slot).toUpperCase() === String(slot).toUpperCase()) : all;

  if (!scoped.length) {
    return envelope({ context, state: STATES.NO_DECISION, extra: {
      message: slot
        ? "No bench player is eligible for that slot."
        : "No bench player is eligible to change a starting slot this week.",
    } });
  }

  // §5.3: default to the highest-priority *unresolved* decision. An OUT starter
  // outranks any pure projection upgrade — that slot is a hole, not a choice.
  const ordered = [...scoped].sort((a, b) =>
    Number(OUT_STATUSES.has(normalizedStatus(b.from.status))) - Number(OUT_STATUSES.has(normalizedStatus(a.from.status)))
    || b.delta - a.delta);
  const top = ordered[0];

  // A negative delta means the current starter is already the right call.
  if (top.delta <= 0 && !OUT_STATUSES.has(normalizedStatus(top.from.status))) {
    return envelope({ context, state: STATES.NO_DECISION, extra: {
      message: "Your current lineup already reflects the best available projection.",
    } });
  }

  const start = playerView(top.to, roster);
  const sit = playerView(top.from, roster);
  const delta = Math.abs(Number(top.delta));
  const starterOut = OUT_STATUSES.has(normalizedStatus(sit.status));

  const why = [];
  if (start.projected_points != null && sit.projected_points != null) {
    why.push(`Higher projected output in this league's scoring (+${Number(delta.toFixed(2))}).`);
  }
  if (starterOut) why.push(`${sit.name} is unavailable for this week.`);
  if (RISK_STATUSES.has(normalizedStatus(sit.status))) why.push(`${sit.name} carries an unresolved injury designation.`);

  return envelope({
    context,
    state: starterOut
      ? STATES.PLAYER_UNAVAILABLE
      : (delta < CLOSE_DECISION_DELTA ? STATES.CLOSE : STATES.CLEAR),
    extra: {
      recommendation: {
        slot: top.slot,
        start,
        over: sit,
        points_delta: Number(delta.toFixed(2)),
        confidence: confidenceLabel(delta),
      },
      why,
      what_could_change_this: whatCouldChangeThis({ start, sit, delta }),
      evidence: buildEvidence({ start, sit, delta, scoringFormat }),
      // §5.3: the user may switch slots. These are the other slots that have one.
      alternatives: ordered.slice(1, 4).map((rec) => ({
        slot: rec.slot,
        start: rec.to.name,
        over: rec.from.name,
        points_delta: Number(Math.abs(rec.delta).toFixed(2)),
      })),
    },
  });
}

module.exports = {
  CLOSE_DECISION_DELTA,
  CONTRACT_VERSION,
  STATES,
  buildStartSitDetail,
  confidenceLabel,
};
