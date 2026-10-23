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

const { findTradeCandidate, createSearchBudget, weeklyAverage } = require("./tradeLineup");
const { compareTrade, primaryPosition } = require("./tradeValue");
const {
  DEFAULT_STARTERS,
  parseRosterSlots,
  effectiveStarters,
  rosterDepth,
  needWeightForPosition,
} = require("./tradeLeagueContext");

// Positions a FLEX slot can hold. Reported beside `required` so a client never reads a shared slot as one position's.
const FLEX_ELIGIBLE_POSITIONS = new Set(["RB", "WR", "TE"]);

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
    // `required` counts only the league's dedicated slots for this position. FLEX (RB/WR/TE) and
    // SUPERFLEX (QB/RB/WR/TE) are shared slots, so they are not owed to any one position: rounding
    // the fractional flex share up made a 1-TE + FLEX league "need 2 TEs" (founder, 2026-10-19).
    // The flex share still shapes `weight`, which is where demand belongs.
    const dedicated = slotShape.starters[position] || 0;
    needs[position] = {
      have: depth[position] || 0,
      required: effective[position] != null ? dedicated : null,
      weight,
      status: needStatus(weight),
      ...(position === "QB" ? { superflex_slots: slotShape.superFlex } : {}),
      ...(FLEX_ELIGIBLE_POSITIONS.has(position)
        ? { flex_slots: slotShape.flex, superflex_slots: slotShape.superFlex }
        : {}),
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

  const missingProjections =
    Number(valuation?.send?.missing_projection_count || 0) + Number(valuation?.receive?.missing_projection_count || 0);

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

// The coming weeks are the search's working data (comingWeeks.js), not part of the trade-find contract.
function withoutWeeks({ projected_points_by_week: _weeks, ...player }) {
  return player;
}

function buildCandidateRecord({ candidate, opponentTeamId, opponentTeamName, ownNeeds, opponentNeeds }) {
  const receivePosition = primaryPosition(candidate.receive);
  const givePosition = primaryPosition(candidate.give);
  const valuation = compareTrade({ send: [candidate.give], receive: [candidate.receive] });
  const need = ownNeeds?.needs?.[givePosition];
  const samePosition = givePosition === receivePosition;
  const after = Number.isFinite(need?.have) ? need.have - 1 + (samePosition ? 1 : 0) : null;
  const required = Number.isFinite(need?.required) ? need.required : null;
  const theCatch =
    after != null && required != null && after <= required
      ? {
          status: "available",
          code: "thin_position_after_trade",
          statement: `You would have ${after} ${givePosition} for ${required} dedicated starting spot${required === 1 ? "" : "s"}.`,
          position: givePosition,
          players_after: after,
          dedicated_starters: required,
        }
      : { status: "none", code: null, statement: null };

  return {
    id: `find_${opponentTeamId ?? "unknown"}_${candidate.give.player_key || candidate.give.player_id || "give"}_${candidate.receive.player_key || candidate.receive.player_id || "receive"}`,
    opponent_team_id: opponentTeamId ?? null,
    opponent_team_name: opponentTeamName ?? null,
    give: withoutWeeks(candidate.give),
    receive: withoutWeeks(candidate.receive),
    user_lineup_delta: candidate.userDelta,
    opponent_lineup_delta: candidate.opponentDelta,
    valuation,
    reasoning: buildReasoning({ receivePosition, givePosition, ownNeeds, opponentNeeds, valuation }),
    the_catch: theCatch,
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
// A side's weekly lineup gain must be real, and neither side may give up more season-long value (VORP)
// than its own weekly gain justifies. Without the second half a manager "improves" by trading a star
// for a depth piece they would never accept; without the first, "+0.0 to theirs" counts as mutual.
const MIN_SIDE_LINEUP_GAIN = 0.5;
const MAX_VORP_LOSS_PER_WEEKLY_POINT = 1;

function mutualFairnessGuard({ give, receive, userDelta, opponentDelta } = {}) {
  if (!(userDelta >= MIN_SIDE_LINEUP_GAIN) || !(opponentDelta >= MIN_SIDE_LINEUP_GAIN)) return false;
  const net = compareTrade({ send: [give], receive: [receive] }).net_value; // your VORP gain, their VORP loss
  if (!Number.isFinite(net)) return false;
  return net >= -(userDelta * MAX_VORP_LOSS_PER_WEEKLY_POINT) && net <= opponentDelta * MAX_VORP_LOSS_PER_WEEKLY_POINT;
}

// Kickers and defenses are streamed off the waiver wire every week, so a lineup gain there is a waiver move, not a
// reason to trade a real player. A found trade never sends or asks for one (founder, 2026-10-22: "trade a RB for a
// defense when I'm light at RB").
const STREAMED_POSITIONS = new Set(["K", "DST", "DEF", "D/ST"]);

// A cross-position trade may not take a player from a position where that team is already short (a "hole": fewer
// bodies than the league's demand there, flex share included), and may not leave it unable to fill its dedicated
// starting spots. Either would be the "light at RB" trade a manager rejects on sight.
function keepsDepth(needs, position) {
  const info = needs?.needs?.[position];
  if (!info) return true;
  if (info.status === "hole") return false;
  if (Number.isFinite(info.have) && Number.isFinite(info.required)) return info.have - 1 >= info.required;
  return true;
}

function positionalGuard({ give, receive, ownNeeds, opponentNeeds }) {
  const givePosition = primaryPosition(give);
  const receivePosition = primaryPosition(receive);
  if (STREAMED_POSITIONS.has(givePosition) || STREAMED_POSITIONS.has(receivePosition)) return false;
  if (givePosition === receivePosition) return true;
  return keepsDepth(ownNeeds, givePosition) && keepsDepth(opponentNeeds, receivePosition);
}

// A trade both managers would accept gives up about as much value as it gets. Value is points a week above a
// replacement-level player at the position in this league: the first player at that position who would not start if
// every team set its best lineup (the formula fallback of trade value v3, until the free-agent pool is read here).
// Founder, 2026-10-23: a split-backfield RB for a top-three QB raises both lineups on paper and nobody accepts it.
const MAX_VALUE_GAP = 2;
const MIN_VALUE_SHARE = 0.65;
// Below this much value a week on both sides, the share is noise and only the absolute gap applies.
const MIN_VALUE_FOR_SHARE = 0.5;

// A replacement level read from a handful of rosters is not a league's; below this many teams the value check is off.
const MIN_TEAMS_FOR_REPLACEMENT = 6;

function leagueReplacement(teams = [], rosterPositions = []) {
  if (!Array.isArray(teams) || teams.length < MIN_TEAMS_FOR_REPLACEMENT) return null;
  const effective = effectiveStarters(parseRosterSlots(rosterPositions));
  const byPosition = {};
  for (const team of teams) {
    for (const player of team?.players || []) {
      const points = weeklyAverage(player);
      if (!Number.isFinite(points)) continue;
      const position = primaryPosition(player);
      if (!byPosition[position]) byPosition[position] = [];
      byPosition[position].push(points);
    }
  }
  const out = {};
  for (const [position, list] of Object.entries(byPosition)) {
    list.sort((a, b) => b - a);
    const startersLeagueWide = Math.round((effective[position] || 0) * teams.length);
    out[position] = list[Math.min(startersLeagueWide, list.length - 1)] ?? 0;
  }
  return out;
}

function valueOver(players, replacement) {
  return players.reduce((sum, player) => {
    const points = weeklyAverage(player);
    if (!Number.isFinite(points)) return sum;
    return sum + Math.max(0, points - (replacement[primaryPosition(player)] ?? 0));
  }, 0);
}

// Neither lineup gains more than this many times the other's: a trade where one side gets nearly all the gain is a
// trade the other side has no reason to make (live walk, 2026-10-23: +1.2 for you, +6.5 for them).
const MAX_GAIN_RATIO = 3;

/** Neither side gives away more than MAX_VALUE_GAP points a week of value over replacement, nor takes most of the gain. */
function valueBalanced({ give, receive, replacement, userDelta, opponentDelta }) {
  if (Number.isFinite(userDelta) && Number.isFinite(opponentDelta) && userDelta > 0 && opponentDelta > 0) {
    if (Math.max(userDelta, opponentDelta) > MAX_GAIN_RATIO * Math.min(userDelta, opponentDelta)) return false;
  }
  if (!replacement) return true;
  const got = valueOver([receive], replacement);
  const gave = valueOver([give], replacement);
  if (Math.abs(got - gave) > MAX_VALUE_GAP) return false;
  // Each side gets back a fair share of what it gives: an elite QB for a WR2 can sit inside the absolute gap because
  // QB values bunch up in one-QB leagues, but the other side still gets back half (founder, 2026-10-23: Wilson for
  // Lamar and Harvey for Maye, "an easy no").
  const larger = Math.max(got, gave);
  return larger <= MIN_VALUE_FOR_SHARE || Math.min(got, gave) / larger >= MIN_VALUE_SHARE;
}

// Need profiles per roster, so a guard called once per player pair builds each team's profile once.
const needCache = new WeakMap();
function cachedNeeds(team, rosterPositions) {
  if (!team || typeof team !== "object") return null;
  let profile = needCache.get(team);
  if (!profile) {
    profile = buildTeamNeedProfile({ team, rosterPositions });
    needCache.set(team, profile);
  }
  return profile;
}

// The guard every trade search uses: the trade fits both rosters (no K or DEF, no selling from a hole) and is
// fair both ways. Called by `tradeLineup.findTradeCandidate` with both teams on the pair.
function sensibleTradeGuard(pair = {}) {
  const ownNeeds = cachedNeeds(pair.ownTeam, pair.rosterPositions);
  const opponentNeeds = cachedNeeds(pair.opponent, pair.rosterPositions);
  return (
    positionalGuard({ give: pair.give, receive: pair.receive, ownNeeds, opponentNeeds }) &&
    valueBalanced(pair) &&
    mutualFairnessGuard(pair)
  );
}

sensibleTradeGuard.excludes = (player) => STREAMED_POSITIONS.has(primaryPosition(player));

function findLeagueTradeCandidates({
  ownTeamId,
  teams = [],
  rosterPositions = [],
  maxOpponents = MAX_OPPONENT_TEAMS_PER_SCAN,
  maxCandidates = MAX_CANDIDATES_RETURNED,
  budget = createSearchBudget(),
  onBudgetExceeded = null,
  fairnessGuard = sensibleTradeGuard,
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
  const replacement = leagueReplacement(allTeams, rosterPositions);
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
  const tally = { pairs_evaluated: 0, mutual_gain: 0, passed_fairness: 0 };

  for (const opponent of scanned) {
    if (budget.exceeded) {
      budgetExceeded = true;
      break;
    }

    // findTradeCandidate (tradeLineup.js) excludes an opponent whose
    // `roster_id` matches the own team's `roster_id` — this route's team
    // shape uses `team_id`, so `roster_id` is mapped in here rather than
    // changing that guard's contract for every other caller.
    const opponentNeeds = buildTeamNeedProfile({ team: opponent, rosterPositions });
    const candidate = findTradeCandidate({
      ownTeam: { ...ownTeam, roster_id: ownTeam.team_id },
      opponentTeams: [{ ...opponent, roster_id: opponent.team_id }],
      rosterPositions,
      budget,
      fairnessGuard,
      tally,
      replacement,
      onBudgetExceeded: (stats) => {
        budgetExceeded = true;
        if (onBudgetExceeded) {
          onBudgetExceeded({ ...stats, opponent_team_id: opponent.team_id });
        }
      },
    });

    if (budget.exceeded) budgetExceeded = true;
    if (!candidate) continue;

    candidates.push(
      buildCandidateRecord({
        candidate,
        opponentTeamId: opponent.team_id,
        opponentTeamName: opponent.team_name,
        ownNeeds,
        opponentNeeds,
      }),
    );
  }

  candidates.sort(
    (left, right) =>
      right.user_lineup_delta + right.opponent_lineup_delta - (left.user_lineup_delta + left.opponent_lineup_delta),
  );

  return {
    status: "ok",
    candidates: candidates.slice(0, maxCandidates),
    teams_considered: scanned.length,
    teams_skipped_for_cap: skippedForCap,
    degraded_teams: degradedTeams,
    budget_exceeded: budgetExceeded,
    own_needs: ownNeeds,
    search_funnel: tally,
    empty_reason: candidates.length ? null : emptyReason({ scanned: scanned.length, tally, budgetExceeded }),
  };
}

// Why a finished scan found nothing, from the narrowest step that ruled everything out.
function emptyReason({ scanned, tally, budgetExceeded }) {
  if (budgetExceeded) return "search_budget_exceeded";
  if (scanned === 0) return "no_readable_opponents";
  if (tally.pairs_evaluated === 0) return "no_tradeable_players";
  if (tally.mutual_gain === 0) return "no_trade_helps_both_lineups";
  return "no_fair_trade";
}

module.exports = {
  mutualFairnessGuard,
  positionalGuard,
  sensibleTradeGuard,
  leagueReplacement,
  valueBalanced,
  MIN_SIDE_LINEUP_GAIN,
  MAX_OPPONENT_TEAMS_PER_SCAN,
  MAX_CANDIDATES_RETURNED,
  buildTeamNeedProfile,
  findLeagueTradeCandidates,
};
