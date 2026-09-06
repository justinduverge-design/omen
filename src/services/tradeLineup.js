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
/**
 * A fuse, not the working limit. **The clock is the constraint that matters** — it is what
 * actually bounds how long the event loop is blocked, and it is checked both between solves and
 * inside one every `DEADLINE_CHECK_INTERVAL` nodes.
 *
 * ## Why this is no longer 4,000
 *
 * 4,000 was chosen against the *exhaustive* solver, where a single solve cost ~30ms and 4,000 of
 * them was already minutes of blocking. The assignment solver that replaced it costs ~0.25ms, so
 * the same cap now trips after about **98ms — 5% of the 2s budget** — and a budget trip returns
 * no suggestion at all. The effect was silent and shape-dependent: measured, a 16-team league on
 * 20-man rosters needs **7,625 solves and 203ms** to search honestly, so exactly the deepest
 * leagues lost their trade suggestion while shallow ones kept theirs, with nothing in the
 * response to say why. The 11-team regression test below sits under the old cap and never saw it.
 *
 * Set so the clock trips first in every realistic shape (2,000ms at the measured ~0.027ms per
 * solve is roughly 75,000), leaving this to catch only the pathological case the clock cannot:
 * solves that become near-free but unbounded in count.
 */
const TRADE_SEARCH_MAX_SOLVES = 200000;
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

/**
 * A player's projection, or `null` when there is not one.
 *
 * `null` and `""` are rejected explicitly, because `Number(null)` and `Number("")` are both
 * **0** — finite, and therefore accepted by a bare `Number.isFinite` check. That coercion made
 * a player with no projection indistinguishable from a player projected to score nothing, so
 * every lineup tied at 0.00 and no swap could ever look like an improvement. `startSit.js`
 * already guarded this correctly with a `typeof` check; this did not.
 *
 * A real 0 is still a real projection and is kept.
 */
function finiteProjection(player) {
  const raw = player?.projected_points;
  if (raw === null || raw === undefined || raw === "") return null;
  const points = Number(raw);
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
 * Max-weight assignment of players to starting slots — the Hungarian algorithm (Kuhn-Munkres),
 * in the O(n^3) shortest-augmenting-path form.
 *
 * ## Why this replaced the exhaustive search
 *
 * Picking a lineup is the **assignment problem**: each slot takes at most one player, each
 * player fills at most one slot, maximise total projected points. The original implementation
 * enumerated every assignment, which is exponential and took 177 seconds for two opponents
 * inside `findTradeCandidate` (see `TRADE_SEARCH_BUDGET_MS`). This returns the *same answer* in
 * microseconds, because the problem has a polynomial algorithm and always did.
 *
 * ## How empty slots and ineligibility are expressed
 *
 * Both fall out of the cost matrix rather than needing special cases:
 *
 *   - **Empty is allowed.** One dummy column per slot, cost 0. A slot matched to a dummy is
 *     empty and contributes nothing. Because there are exactly as many dummies as slots, a
 *     complete matching over slots always exists, so the algorithm can never fail to answer.
 *   - **Negative projections leave a slot empty**, without a rule saying so: a player worth
 *     -2 costs +2 against a dummy's 0, so the dummy wins. That matches the exhaustive search,
 *     which would also decline to start him.
 *   - **Ineligibility is priced, not forbidden.** `INELIGIBLE_COST` is large enough that a
 *     dummy is always preferred, so an ineligible pairing is never chosen while the matrix
 *     stays dense and the algorithm stays simple. Assignments are filtered afterwards anyway,
 *     so a pathological matrix cannot put a kicker in the QB slot.
 *
 * Costs are negated projections because Kuhn-Munkres minimises.
 */
const INELIGIBLE_COST = 1e9;

function hungarian(cost, rowCount, colCount) {
  // 1-indexed, following the standard formulation; index 0 is the sentinel the augmenting
  // path terminates on. Potentials `u`/`v` keep every reduced cost non-negative.
  const INF = Infinity;
  const u = new Float64Array(rowCount + 1);
  const v = new Float64Array(colCount + 1);
  const p = new Int32Array(colCount + 1);
  const way = new Int32Array(colCount + 1);

  for (let i = 1; i <= rowCount; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(colCount + 1).fill(INF);
    const used = new Uint8Array(colCount + 1);

    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;

      for (let j = 1; j <= colCount; j += 1) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }

      for (let j = 0; j <= colCount; j += 1) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    // Walk the alternating path back, flipping matched edges.
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  // Invert: column -> row becomes row -> column.
  const rowToCol = new Int32Array(rowCount).fill(-1);
  for (let j = 1; j <= colCount; j += 1) {
    if (p[j] > 0) rowToCol[p[j] - 1] = j - 1;
  }
  return rowToCol;
}

/**
 * The optimal starting lineup. Exact, and fast enough to call thousands of times.
 *
 * `budget` is accepted and ignored: it exists so callers written against the exhaustive solver
 * keep working, and because `findTradeCandidate` still threads one through as a backstop. This
 * function no longer needs it — it cannot run long — so it always reports `exhaustive: true`.
 */
function solveOptimalLineup({ players = [], rosterPositions = [] } = {}) {
  const slots = startingSlots(rosterPositions);
  const eligiblePlayers = players
    .filter((player) => lineupEligible(player) && finiteProjection(player) !== null)
    .slice()
    .sort((a, b) => String(a.player_id || a.player_key).localeCompare(String(b.player_id || b.player_key)));

  if (!slots.length) return { total: 0, starters: [], exhaustive: true };

  const rowCount = slots.length;
  // Real players first, then one dummy per slot so "leave it empty" is always available.
  const colCount = eligiblePlayers.length + slots.length;

  const cost = Array.from({ length: rowCount }, (_, i) => {
    const row = new Float64Array(colCount);
    for (let j = 0; j < eligiblePlayers.length; j += 1) {
      const player = eligiblePlayers[j];
      row[j] = slotEligible(player, slots[i].slot)
        ? -finiteProjection(player)
        : INELIGIBLE_COST;
    }
    // Dummy columns stay 0.
    return row;
  });

  const rowToCol = hungarian(cost, rowCount, colCount);

  let total = 0;
  const byIndex = new Map();
  for (let i = 0; i < rowCount; i += 1) {
    const col = rowToCol[i];
    if (col < 0 || col >= eligiblePlayers.length) continue;
    const player = eligiblePlayers[col];
    // Belt and braces: never surface a pairing the eligibility rules forbid, whatever the
    // arithmetic did.
    if (!slotEligible(player, slots[i].slot)) continue;
    const points = finiteProjection(player);
    if (points === null) continue;
    total += points;
    byIndex.set(slots[i].index, player);
  }

  return {
    total: Math.max(0, total),
    starters: slots.map(({ slot, index }) => ({ slot, player: byIndex.get(index) || null })),
    exhaustive: true,
  };
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
function solveOptimalLineupExhaustive({ players = [], rosterPositions = [], budget = null } = {}) {
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
  // Exported for the property test that pins the fast solver to the old exhaustive one.
  solveOptimalLineupExhaustive,
  findTradeCandidate,
  createSearchBudget,
  TRADE_SEARCH_BUDGET_MS,
  TRADE_SEARCH_MAX_SOLVES,
};
