"use strict";

// Pure weekly-lineup solver used by the canonical Omen trade candidate. It
// deliberately consumes normalized player shapes only; provider payloads and
// season-long VORP valuation stay outside this module.
const FLEX_ELIGIBILITY = {
  FLEX: ["RB", "WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
};

const NON_STARTER_SLOTS = new Set(["BN", "BENCH", "IR", "TAXI"]);

function lineupEligible(player) {
  const location = String(player?.selected_position || "").toUpperCase();
  return location !== "IR" && location !== "TAXI";
}

function finiteProjection(player) {
  const points = Number(player?.projected_points);
  return Number.isFinite(points) ? points : null;
}

function slotEligible(player, slot) {
  const allowed = FLEX_ELIGIBILITY[slot] || [slot];
  const positions = Array.isArray(player?.eligible_positions) && player.eligible_positions.length
    ? player.eligible_positions
    : [player?.position];
  return positions.some((position) => allowed.includes(position));
}

function startingSlots(rosterPositions = []) {
  return rosterPositions
    .map((slot, index) => ({ slot: String(slot || "").toUpperCase(), index }))
    .filter(({ slot }) => slot && !NON_STARTER_SLOTS.has(slot));
}

function solveOptimalLineup({ players = [], rosterPositions = [] } = {}) {
  const slots = startingSlots(rosterPositions);
  const eligiblePlayers = players
    .filter((player) => lineupEligible(player) && finiteProjection(player) !== null)
    .slice()
    .sort((a, b) => String(a.player_id || a.player_key).localeCompare(String(b.player_id || b.player_key)));
  const orderedSlots = slots.slice().sort((left, right) => {
    const leftCount = eligiblePlayers.filter((player) => slotEligible(player, left.slot)).length;
    const rightCount = eligiblePlayers.filter((player) => slotEligible(player, right.slot)).length;
    return leftCount - rightCount || left.index - right.index;
  });

  let best = { total: -1, assignments: [] };

  function search(slotIndex, used, total, assignments) {
    if (slotIndex === orderedSlots.length) {
      if (total > best.total) best = { total, assignments: assignments.slice() };
      return;
    }

    const slot = orderedSlots[slotIndex];
    // Empty is valid for shallow rosters; it contributes exactly zero.
    search(slotIndex + 1, used, total, [...assignments, { ...slot, player: null }]);
    for (const player of eligiblePlayers) {
      const id = String(player.player_id || player.player_key);
      if (used.has(id) || !slotEligible(player, slot.slot)) continue;
      used.add(id);
      search(slotIndex + 1, used, total + finiteProjection(player), [...assignments, { ...slot, player }]);
      used.delete(id);
    }
  }

  search(0, new Set(), 0, []);
  const byIndex = new Map(best.assignments.map((assignment) => [assignment.index, assignment]));
  return {
    total: Math.max(0, best.total),
    starters: slots.map(({ slot, index }) => ({ slot, player: byIndex.get(index)?.player || null })),
  };
}

function withoutPlayer(players, player) {
  const id = String(player?.player_id || player?.player_key);
  return players.filter((candidate) => String(candidate?.player_id || candidate?.player_key) !== id);
}

function findTradeCandidate({ ownTeam, opponentTeams = [], rosterPositions = [], fairnessGuard = () => true } = {}) {
  if (!ownTeam || !Array.isArray(ownTeam.players)) return null;
  const ownBaseline = solveOptimalLineup({ players: ownTeam.players, rosterPositions });
  const candidates = [];

  for (const opponent of opponentTeams) {
    if (!opponent || !Array.isArray(opponent.players) || opponent.roster_id === ownTeam.roster_id) continue;
    const opponentBaseline = solveOptimalLineup({ players: opponent.players, rosterPositions });
    const opponentStarterIds = new Set(opponentBaseline.starters
      .map((row) => row.player && String(row.player.player_id || row.player.player_key))
      .filter(Boolean));
    const ownWorstStarter = Math.min(...ownBaseline.starters
      .map((row) => finiteProjection(row.player))
      .filter((points) => points !== null), Infinity);

    for (const give of ownTeam.players) {
      if (finiteProjection(give) === null) continue;
      for (const receive of opponent.players) {
        const receivePoints = finiteProjection(receive);
        if (receivePoints === null) continue;
        // Bound obvious non-candidates without excluding cross-position trades:
        // a bench opponent asset needs to beat the user's weakest starter.
        const receiveId = String(receive.player_id || receive.player_key);
        if (!opponentStarterIds.has(receiveId) && receivePoints <= ownWorstStarter) continue;

        const ownAfter = solveOptimalLineup({
          players: [...withoutPlayer(ownTeam.players, give), receive],
          rosterPositions,
        });
        const opponentAfter = solveOptimalLineup({
          players: [...withoutPlayer(opponent.players, receive), give],
          rosterPositions,
        });
        const userDelta = ownAfter.total - ownBaseline.total;
        const opponentDelta = opponentAfter.total - opponentBaseline.total;
        if (userDelta <= 0 || opponentDelta <= 0) continue;
        if (!fairnessGuard({ give, receive, userDelta, opponentDelta })) continue;
        candidates.push({
          opponent,
          give,
          receive,
          userDelta,
          opponentDelta,
        });
      }
    }
  }

  candidates.sort((left, right) => (
    right.userDelta - left.userDelta
    || right.opponentDelta - left.opponentDelta
    || String(left.receive.player_id || left.receive.player_key).localeCompare(String(right.receive.player_id || right.receive.player_key))
  ));
  return candidates[0] || null;
}

module.exports = { solveOptimalLineup, findTradeCandidate };
