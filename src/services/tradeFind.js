"use strict";

/**
 * Find-a-trade: league-wide candidate generator (T2).
 *
 * Composes three already-shipped, unmodified modules — it adds no new
 * scoring model:
 *
 *   - `tradeLineup.js`      — `findTradeCandidate` / `createSearchBudget`,
 *     the exact #404/#405 bounding pattern (a shared wall-clock + solve-
 *     count budget around the Hungarian-algorithm lineup solve).
 *   - `tradeValue.js`       — `compareTrade` / `primaryPosition`, the
 *     existing valuation math.
 *   - `tradeLeagueContext.js` — `rosterDepth` / `effectiveStarters` /
 *     `needWeightForPosition`, the existing "how thin is this team at this
 *     position" math.
 *
 * ## Why this file exists rather than editing the three above
 *
 * T1 (three-team trades) lands in parallel and also touches
 * `src/services/tradeValue.js` and `src/routes/trade.js`. This module only
 * *calls* the existing exports of those three services; it makes zero edits
 * to any of them, so there is nothing here for T1's branch to conflict with.
 *
 * ## The #404 lesson, applied at league scale
 *
 * #404 took production down because `findTradeCandidate` fanned out
 * synchronously over every (own player x opponent player) pair for every
 * opponent, with no ceiling on total compute. #405's fix was a shared
 * budget object that latches once any part of the search runs out of time
 * or solves. T2 is the same failure shape one level up — many opponent
 * *teams* instead of many player pairs within one team — so it reuses
 * exactly that budget object, shared across every opponent processed in a
 * single call, plus a hard cap on how many opponent teams are even
 * considered (`MAX_OPPONENT_TEAMS_PER_SCAN`).
 *
 * Note this is a compute cap, not an API fan-out cap: `/api/trade/roster`'s
 * provider readers already return every team in one already-authenticated
 * call (Sleeper/ESPN/Yahoo all publish a single "every roster in the
 * league" read), so there is no per-team network request to bound here.
 * The thing #404 actually broke was the CPU work done with that data.
 */

const { findTradeCandidate, createSearchBudget } = require("./tradeLineup");
const { compareTrade, primaryPosition } = require("./tradeValue");
const {
  DEFAULT_STARTERS,
  parseRosterSlots,
  effectiveStarters,
  rosterDepth,
  needWeightForPosition,
} = require("./tradeLeagueContext");

// Hard cap on opponent rosters considered per invocation. Chosen well above
// any realistic redraft league (8-16 teams) so it only engages for a
// pathological or dynasty-scale league — the same posture as
// TRADE_SEARCH_MAX_SOLVES being a fuse behind tradeLineup.js's wall-clock
// budget, not the everyday limit.
const MAX_OPPONENT_TEAMS_PER_SCAN = 16;

// Hard cap on candidates returned. Ranked before slicing, so this never
// hides the best finds — it refuses to hand the client (and eventually T3's
// swipe deck) an unbounded batch.
const MAX_CANDIDATES_RETURNED = 10;

// needWeightForPosition (tradeLeagueContext.js) returns >1 when a team has
// fewer bodies at a position than the league requires (a hole, so receiving
// there is valuable) and <1 when it has spare depth (a surplus). These
// thresholds just name that existing scale; no new math.
const NEED_HOLE_THRESHOLD = 1.0;
const NEED_SURPLUS_THRESHOLD = 1.0;

function needStatus(weight) {
  if (weight > NEED_HOLE_THRESHOLD) return "hole";
  if (weight < NEED_SURPLUS_THRESHOLD) return "surplus";
  return "balanced";
}

/**
 * A team's roster counts as readable only when the provider actually
 * disclosed players for it. An empty or missing player list is the honest
 * "cannot see this roster" signal, per fact-of-record #16 — never treated
 * as "this team has no players."
 */
function teamHasReadableRoster(team) {
  return Boolean(team) && Array.isArray(team.players) && team.players.length > 0;
}

/**
 * Per-team need profile: how thin or deep this team is at every roster
 * position the league actually starts, reusing tradeLeagueContext's
 * existing depth math as-is. This is the derived object T2's caching layer
 * (`tradeFindCacheStore.js`, wired in `src/routes/trade.js`) exists to avoid
 * recomputing from a cold provider read on every request.
 */
function buildTeamNeedProfile({ team, rosterPositions = [] } = {}) {
  const slotShape = parseRosterSlots(rosterPositions);
  const effective = effectiveStarters(slotShape);
  const depth = rosterDepth(team?.players || []);

  const needs = {};
  for (const position of Object.keys(DEFAULT_STARTERS)) {
    if (!(position in effective)) continue;
    const weight = needWeightForPosition(position, { depth, effective });
    needs[position] = {
      have: depth[position] || 0,
      required: effective[position] != null ? Math.ceil(effective[position]) : null,
      weight,
      status: needStatus(weight),
    };
  }

  return {
    team_id: team?.team_id ?? null,
    team_name: team?.team_name ?? null,
    player_count: Array.isArray(team?.players) ? team.players.length : 0,
    needs,
  };
}

/**
 * What a need profile says about one specific position, in a shape that is
 * safe to put directly in an API response: it either names real, measured
 * roster depth, or says plainly that this position isn't tracked for this
 * league shape. It never guesses.
 */
function needEvidenceFor(needProfile, position) {
  const info = needProfile?.needs?.[position];
  if (!info) {
    return { status: "not_tracked", have: null, required: null, weight: null };
  }
  return { status: info.status, have: info.have, required: info.required, weight: info.weight };
}

/**
 * One candidate's full reasoning payload — required output for T4 (the
 * saved-trade queue), not optional debug text. Every field is derived from
 * data already read from the provider (roster composition, league roster
 * slots, live lineup-projection deltas) or from `tradeValue.js`'s existing
 * valuation. Nothing here is invented.
 */
function buildReasoning({ receivePosition, givePosition, ownNeeds, opponentNeeds, valuation }) {
  const userReceivesNeed = needEvidenceFor(ownNeeds, receivePosition);
  const opponentReceivesNeed = needEvidenceFor(opponentNeeds, givePosition);

  const fillsNeedFor = [];
  if (userReceivesNeed.status === "hole") fillsNeedFor.push("user");
  if (opponentReceivesNeed.status === "hole") fillsNeedFor.push("opponent");

  const missingProjections = Number(valuation?.send?.missing_projection_count || 0)
    + Number(valuation?.receive?.missing_projection_count || 0);

  return {
    fills_need_for: fillsNeedFor.length ? fillsNeedFor : ["no_named_hole_on_either_side"],
    user_receives: { position: receivePosition, need: userReceivesNeed },
    opponent_receives: { position: givePosition, need: opponentReceivesNeed },
    evidence: [
      "live_roster_depth",
      "live_lineup_projection_delta",
      ...(missingProjections > 0 ? ["missing_projection_for_some_players"] : []),
    ],
  };
}

function buildCandidateRecord({ candidate, opponentTeamId, opponentTeamName, ownNeeds, opponentNeeds }) {
  const receivePosition = primaryPosition(candidate.receive);
  const givePosition = primaryPosition(candidate.give);
  const valuation = compareTrade({ send: [candidate.give], receive: [candidate.receive] });

  return {
    id: `find_${opponentTeamId ?? "unknown"}_${candidate.give.player_key || candidate.give.player_id || "give"}_${candidate.receive.player_key || candidate.receive.player_id || "receive"}`,
    opponent_team_id: opponentTeamId ?? null,
    opponent_team_name: opponentTeamName ?? null,
    give: candidate.give,
    receive: candidate.receive,
    user_lineup_delta: candidate.userDelta,
    opponent_lineup_delta: candidate.opponentDelta,
    valuation,
    reasoning: buildReasoning({ receivePosition, givePosition, ownNeeds, opponentNeeds, valuation }),
  };
}

/**
 * Scan every other connected team's roster against the caller's own and
 * return ranked candidate trade packages.
 *
 * Bounding, in order:
 *   1. A team whose roster the provider did not disclose (missing/empty
 *      players) is never scanned or proposed against — reported in
 *      `degraded_teams` instead (fact-of-record #16).
 *   2. Readable opponents are capped at `maxOpponents`, in a deterministic
 *      order, so the same input always drops the same teams rather than
 *      depending on provider response ordering. Anything past the cap is
 *      reported in `teams_skipped_for_cap`, never silently dropped.
 *   3. Every opponent scanned shares one `budget` (from `tradeLineup.js`) —
 *      once it trips, the remaining scan stops and reports
 *      `budget_exceeded: true` rather than continuing to burn compute or,
 *      worse, returning a candidate built on a truncated lineup solve (see
 *      the doc comment on `findTradeCandidate` for why that would be
 *      actively unsafe, not just slow).
 *   4. Candidates are ranked and capped at `maxCandidates`.
 *
 * Partial failure never fails the whole batch: an unreadable team is
 * skipped with a named reason, a tripped budget stops the scan early with
 * `budget_exceeded: true`, and whatever candidates were already found are
 * still returned.
 */
function findLeagueTradeCandidates({
  ownTeamId,
  teams = [],
  rosterPositions = [],
  maxOpponents = MAX_OPPONENT_TEAMS_PER_SCAN,
  maxCandidates = MAX_CANDIDATES_RETURNED,
  budget = createSearchBudget(),
  onBudgetExceeded = null,
  fairnessGuard,
} = {}) {
  const allTeams = Array.isArray(teams) ? teams : [];
  const ownTeam = allTeams.find((team) => String(team?.team_id) === String(ownTeamId));

  if (!ownTeam) {
    return {
      status: "own_team_not_found",
      candidates: [],
      teams_considered: 0,
      teams_skipped_for_cap: [],
      degraded_teams: [],
      budget_exceeded: false,
      own_needs: null,
    };
  }

  if (!teamHasReadableRoster(ownTeam)) {
    return {
      status: "own_roster_unreadable",
      candidates: [],
      teams_considered: 0,
      teams_skipped_for_cap: [],
      degraded_teams: [],
      budget_exceeded: false,
      own_needs: null,
    };
  }

  const ownNeeds = buildTeamNeedProfile({ team: ownTeam, rosterPositions });
  const others = allTeams.filter((team) => String(team?.team_id) !== String(ownTeamId));

  const degradedTeams = [];
  const readable = [];
  for (const team of others) {
    if (teamHasReadableRoster(team)) {
      readable.push(team);
    } else {
      degradedTeams.push({
        team_id: team?.team_id ?? null,
        team_name: team?.team_name ?? null,
        reason: "roster_unreadable",
      });
    }
  }

  // Deterministic order: the cap always drops the same teams for the same
  // input, independent of the order the provider happened to return them in.
  readable.sort((a, b) => String(a.team_id).localeCompare(String(b.team_id)));
  const scanned = readable.slice(0, maxOpponents);
  const skippedForCap = readable.slice(maxOpponents).map((team) => ({
    team_id: team.team_id ?? null,
    team_name: team.team_name ?? null,
  }));

  const candidates = [];
  let budgetExceeded = false;

  for (const opponent of scanned) {
    if (budget.exceeded) { budgetExceeded = true; break; }

    // findTradeCandidate (tradeLineup.js) excludes an opponent whose
    // `roster_id` matches the own team's `roster_id` — this route's team
    // shape uses `team_id`, so `roster_id` is mapped in here rather than
    // changing that guard's contract for every other caller.
    const candidate = findTradeCandidate({
      ownTeam: { ...ownTeam, roster_id: ownTeam.team_id },
      opponentTeams: [{ ...opponent, roster_id: opponent.team_id }],
      rosterPositions,
      budget,
      fairnessGuard,
      onBudgetExceeded: (stats) => {
        budgetExceeded = true;
        if (onBudgetExceeded) {
          onBudgetExceeded({ ...stats, opponent_team_id: opponent.team_id });
        }
      },
    });

    if (budget.exceeded) budgetExceeded = true;
    if (!candidate) continue;

    const opponentNeeds = buildTeamNeedProfile({ team: opponent, rosterPositions });
    candidates.push(buildCandidateRecord({
      candidate,
      opponentTeamId: opponent.team_id,
      opponentTeamName: opponent.team_name,
      ownNeeds,
      opponentNeeds,
    }));
  }

  candidates.sort((left, right) => (
    (right.user_lineup_delta + right.opponent_lineup_delta)
    - (left.user_lineup_delta + left.opponent_lineup_delta)
  ));

  return {
    status: "ok",
    candidates: candidates.slice(0, maxCandidates),
    teams_considered: scanned.length,
    teams_skipped_for_cap: skippedForCap,
    degraded_teams: degradedTeams,
    budget_exceeded: budgetExceeded,
    own_needs: ownNeeds,
  };
}

module.exports = {
  MAX_OPPONENT_TEAMS_PER_SCAN,
  MAX_CANDIDATES_RETURNED,
  buildTeamNeedProfile,
  findLeagueTradeCandidates,
};
