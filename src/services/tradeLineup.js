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

/**
 * How long the whole trade search may block the event loop, and how many lineup
 * solves it may run.
 *
 * ## Why this exists
 *
 * On 2026-09-05 this module took production down for most of a day. `findTradeCandidate`
 * solves the optimal lineup **twice for every (own player x opponent player) pair, for every
 * opponent** — about 5,600 solves in an eleven-team league — and `solveOptimalLineup` is an
 * exhaustive recursive assignment search. Measured on a normal 16-player roster: **177
 * seconds for two opponents**, extrapolating to roughly 15 minutes for a real league. All of
 * it synchronous, on the one thread Node uses to serve every request, so the API answered
 * nothing — not Omen, not the marketing page — until the watchdog restarted it.
 *
 * It had been dormant since it was written. Everything here is gated on `projected_points`
 * being finite, and ESPN published no 2026 projections until week 1 went live. The code did
 * not change; the data did. That is the case this budget exists for: not a bug we know about,
 * but the next one we don't.
 *
 * ## Why a budget rather than only a faster algorithm
 *
 * The real fix is to replace the exhaustive search with bipartite matching, which is
 * polynomial and returns the same answer. That is worth doing properly and is tracked
 * separately. This budget is the part that must be true **regardless** of how good the
 * algorithm is: no recommendation is worth blocking every other request, so the failure mode
 * becomes "no trade suggestion" instead of "no website".
 */
const TRADE_SEARCH_BUDGET_MS = 2000;
/// Solves are the unit of work, checked between them; the clock is checked inside a solve.
const TRADE_SEARCH_MAX_SOLVES = 4000;
/// Nodes between clock reads. `Date.now()` per node would itself dominate the search.
const DEADLINE_CHECK_INTERVAL = 5000;

/**
 * A shared stop signal. `exceeded` latches, so once any part of the search runs out of budget
 * every remaining part stops immediately instead of each rediscovering it.
 */
function createSearchBudget({ budgetMs = TRADE_SEARCH_BUDGET_MS, now = Date.now } = {}) {
  const startedAt = now();
  let exceeded = false;
  let solves = 0;
  return {
    get exceeded() { return exceeded; },
    countSolve() {
      solves += 1;
      if (solves > TRADE_SEARCH_MAX_SOLVES) exceeded = true;
      return !exceeded;
    },
    checkClock() {
      if (!exceeded && now() - startedAt > budgetMs) exceeded = true;
      return !exceeded;
    },
    get stats() { return { solves, elapsedMs: now() - startedAt, exceeded }; },
  };
}

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

/**
 * The optimal starting lineup, by exhaustive assignment.
 *
 * `budget` is optional. Without one the behaviour is exactly as before — callers that solve a
 * single lineup once (and every existing test) are unaffected. With one, the search stops when
 * the budget is spent and reports `exhaustive: false`.
 *
 * **A non-exhaustive result is a real lineup but not necessarily the best one**, so its `total`
 * must never be differenced against another to value a trade. `findTradeCandidate` abandons the
 * whole search rather than doing that; see the comment there.
 */
function solveOptimalLineup({ players = [], rosterPositions = [], budget = null } = {}) {
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
  let nodes = 0;
  let ranOut = false;

  function outOfBudget() {
    if (!budget) return false;
    if (ranOut || budget.exceeded) { ranOut = true; return true; }
    nodes += 1;
    // Sampled rather than per-node: a `Date.now()` on every node costs more than the node.
    if (nodes % DEADLINE_CHECK_INTERVAL === 0 && !budget.checkClock()) { ranOut = true; return true; }
    return false;
  }

  function search(slotIndex, used, total, assignments) {
    if (outOfBudget()) return;
    if (slotIndex === orderedSlots.length) {
      if (total > best.total) best = { total, assignments: assignments.slice() };
      return;
    }

    const slot = orderedSlots[slotIndex];
    // Empty is valid for shallow rosters; it contributes exactly zero.
    search(slotIndex + 1, used, total, [...assignments, { ...slot, player: null }]);
    for (const player of eligiblePlayers) {
      if (outOfBudget()) return;
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
    // True when the search covered the whole space. Callers that compare two totals MUST check it.
    exhaustive: !ranOut,
  };
}

function withoutPlayer(players, player) {
  const id = String(player?.player_id || player?.player_key);
  return players.filter((candidate) => String(candidate?.player_id || candidate?.player_key) !== id);
}

/**
 * The best single-player-for-single-player trade, or `null`.
 *
 * Bounded by a wall-clock and solve-count budget (see `TRADE_SEARCH_BUDGET_MS`). **When the
 * budget runs out this returns `null` — no suggestion — rather than the best candidate found
 * so far.** That is deliberate and is the whole safety property:
 *
 * Every delta here is the difference between two `solveOptimalLineup` totals. A truncated solve
 * returns a *valid* lineup that is not necessarily the *best* one, so its total is an
 * underestimate of unknown size. Differencing two of them produces a number that can be wrong in
 * either direction — which could recommend a trade that actively makes the user's team worse, in
 * a product whose entire promise is "see the move before the league does". A missing suggestion
 * is honest. A confidently wrong one is not, and silence is the only safe answer here.
 */
function findTradeCandidate({
  ownTeam,
  opponentTeams = [],
  rosterPositions = [],
  fairnessGuard = () => true,
  budget = createSearchBudget(),
  onBudgetExceeded = null,
} = {}) {
  if (!ownTeam || !Array.isArray(ownTeam.players)) return null;
  const ownBaseline = solveOptimalLineup({ players: ownTeam.players, rosterPositions, budget });
  if (!ownBaseline.exhaustive) {
    // The user's own baseline is the denominator for every delta below. Without an exact one
    // there is nothing to compare against, so there is no point starting.
    if (onBudgetExceeded) onBudgetExceeded(budget.stats);
    return null;
  }
  const candidates = [];

  let ranOut = false;

  for (const opponent of opponentTeams) {
    if (ranOut || budget.exceeded) { ranOut = true; break; }
    if (!opponent || !Array.isArray(opponent.players) || opponent.roster_id === ownTeam.roster_id) continue;
    const opponentBaseline = solveOptimalLineup({ players: opponent.players, rosterPositions, budget });
    if (!opponentBaseline.exhaustive) { ranOut = true; break; }
    const opponentStarterIds = new Set(opponentBaseline.starters
      .map((row) => row.player && String(row.player.player_id || row.player.player_key))
      .filter(Boolean));
    const ownWorstStarter = Math.min(...ownBaseline.starters
      .map((row) => finiteProjection(row.player))
      .filter((points) => points !== null), Infinity);

    for (const give of ownTeam.players) {
      if (ranOut || budget.exceeded) { ranOut = true; break; }
      if (finiteProjection(give) === null) continue;
      for (const receive of opponent.players) {
        if (ranOut || budget.exceeded) { ranOut = true; break; }
        const receivePoints = finiteProjection(receive);
        if (receivePoints === null) continue;
        // Bound obvious non-candidates without excluding cross-position trades:
        // a bench opponent asset needs to beat the user's weakest starter.
        const receiveId = String(receive.player_id || receive.player_key);
        if (!opponentStarterIds.has(receiveId) && receivePoints <= ownWorstStarter) continue;

        // Counted before the work, so the cap bounds solves started, not solves finished.
        if (!budget.countSolve() || !budget.checkClock()) { ranOut = true; break; }
        const ownAfter = solveOptimalLineup({
          players: [...withoutPlayer(ownTeam.players, give), receive],
          rosterPositions,
          budget,
        });
        const opponentAfter = solveOptimalLineup({
          players: [...withoutPlayer(opponent.players, receive), give],
          rosterPositions,
          budget,
        });
        if (!ownAfter.exhaustive || !opponentAfter.exhaustive) { ranOut = true; break; }
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

  if (ranOut || budget.exceeded) {
    // See the doc comment: a partial search cannot be trusted to rank trades, so it yields none.
    if (onBudgetExceeded) onBudgetExceeded(budget.stats);
    return null;
  }

  candidates.sort((left, right) => (
    right.userDelta - left.userDelta
    || right.opponentDelta - left.opponentDelta
    || String(left.receive.player_id || left.receive.player_key).localeCompare(String(right.receive.player_id || right.receive.player_key))
  ));
  return candidates[0] || null;
}

module.exports = {
  solveOptimalLineup,
  findTradeCandidate,
  createSearchBudget,
  TRADE_SEARCH_BUDGET_MS,
  TRADE_SEARCH_MAX_SOLVES,
};
