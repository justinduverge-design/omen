"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findTradeCandidate, createSearchBudget } = require("../src/services/tradeLineup");
const { findLeagueTradeCandidates, mutualFairnessGuard } = require("../src/services/tradeFind");
const pool = require("../src/services/tradeSearchPool");

const SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN", "BN"];
const POSITIONS = ["QB", "RB", "RB", "RB", "WR", "WR", "WR", "TE", "K", "DEF", "RB", "WR"];

// Seeded so worker and inline see byte-identical leagues.
function league(teamCount, rosterSize, seed = 7) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  return Array.from({ length: teamCount }, (_, t) => ({
    team_id: String(t + 1),
    team_name: `Team ${t + 1}`,
    players: Array.from({ length: rosterSize }, (_, p) => {
      const position = POSITIONS[p % POSITIONS.length];
      const id = `t${t}p${p}`;
      return {
        player_id: id,
        player_key: id,
        name: id,
        position,
        eligible_positions:
          position === "RB" || position === "WR" || position === "TE" ? [position, "FLEX"] : [position],
        selected_position: "BN",
        projected_points: Math.round((3 + random() * 20) * 10) / 10,
      };
    }),
  }));
}

function withMode(mode, fn) {
  const previous = process.env.TRADE_SEARCH_MODE;
  process.env.TRADE_SEARCH_MODE = mode;
  return Promise.resolve(fn()).finally(() => {
    if (previous === undefined) delete process.env.TRADE_SEARCH_MODE;
    else process.env.TRADE_SEARCH_MODE = previous;
  });
}

// `generated_at` is a wall-clock stamp from tradeValue; two inline runs differ on it too.
function stable(value) {
  return JSON.parse(JSON.stringify(value ?? null, (key, v) => (key === "generated_at" ? "<time>" : v)));
}

test.after(() => pool.closeTradeSearchPool());

test("worker and inline trade search return identical results", async () => {
  const teams = league(8, 12, 2);
  const leagueInput = () => ({
    ownTeamId: "1",
    teams,
    rosterPositions: SLOTS,
    budget: createSearchBudget({ budgetMs: 30000 }),
  });
  const candidateInput = (fairnessGuard) => ({
    ownTeam: { ...teams[0], roster_id: "1" },
    opponentTeams: teams.slice(1).map((team) => ({ ...team, roster_id: team.team_id })),
    rosterPositions: SLOTS,
    budget: createSearchBudget({ budgetMs: 30000 }),
    ...(fairnessGuard ? { fairnessGuard } : {}),
  });

  const leagueWorker = await withMode("worker", () => pool.findLeagueTradeCandidatesAsync(leagueInput()));
  const leagueInline = await withMode("inline", () => pool.findLeagueTradeCandidatesAsync(leagueInput()));
  assert.deepStrictEqual(stable(leagueWorker), stable(leagueInline));
  assert.deepStrictEqual(stable(leagueWorker), stable(findLeagueTradeCandidates(leagueInput())));
  assert.ok(leagueWorker.candidates.length > 0, "fixture must produce candidates to compare");

  for (const guard of [undefined, mutualFairnessGuard]) {
    const worker = await withMode("worker", () => pool.findTradeCandidateAsync(candidateInput(guard)));
    const inline = await withMode("inline", () => pool.findTradeCandidateAsync(candidateInput(guard)));
    assert.deepStrictEqual(stable(worker), stable(inline));
    assert.deepStrictEqual(stable(worker), stable(findTradeCandidate(candidateInput(guard))));
    assert.ok(worker, "fixture must produce a candidate to compare");
  }
});

test("a budget trip inside the worker is replayed to onBudgetExceeded", async () => {
  const teams = league(4, 12);
  const events = [];
  const result = await withMode("worker", () =>
    pool.findLeagueTradeCandidatesAsync({
      ownTeamId: "1",
      teams,
      rosterPositions: SLOTS,
      budget: createSearchBudget({ budgetMs: 0 }),
      onBudgetExceeded: (stats) => events.push(stats),
    }),
  );
  assert.equal(result.budget_exceeded, true);
  assert.ok(events.length >= 1);
  assert.equal(events[0].exceeded, true);
});

test("a crashing or hung worker falls back to the inline result, and the next call respawns", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trade-pool-"));
  const crash = path.join(dir, "crash.js");
  const hang = path.join(dir, "hang.js");
  fs.writeFileSync(crash, "require('node:worker_threads').parentPort.on('message', () => process.exit(3));");
  fs.writeFileSync(hang, "require('node:worker_threads').parentPort.on('message', () => { for (;;) {} });");
  t.after(() => {
    pool.setWorkerPathForTests(path.join(__dirname, "../src/services/tradeSearchWorker.js"));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const teams = league(3, 10);
  const input = (budgetMs = 30000) => ({
    ownTeamId: "1",
    teams,
    rosterPositions: SLOTS,
    budget: createSearchBudget({ budgetMs }),
  });
  const expected = stable(findLeagueTradeCandidates(input()));

  await pool.closeTradeSearchPool();
  pool.setWorkerPathForTests(crash);
  assert.deepStrictEqual(
    stable(await withMode("worker", () => pool.findLeagueTradeCandidatesAsync(input()))),
    expected,
  );
  // A second call needs a fresh worker; it crashes too and still falls back.
  assert.deepStrictEqual(
    stable(await withMode("worker", () => pool.findLeagueTradeCandidatesAsync(input()))),
    expected,
  );

  pool.setWorkerPathForTests(hang);
  const started = Date.now();
  const hungResult = await withMode("worker", () => pool.findLeagueTradeCandidatesAsync(input(50)));
  assert.ok(Date.now() - started < 50 + pool.WORKER_GRACE_MS + 3000, "a hung worker is terminated at budget + grace");
  // By the time the hung worker is killed the caller's budget is spent, so inline reports a trip.
  assert.equal(hungResult.budget_exceeded, true);

  pool.setWorkerPathForTests(path.join(__dirname, "../src/services/tradeSearchWorker.js"));
  assert.deepStrictEqual(
    stable(await withMode("worker", () => pool.findLeagueTradeCandidatesAsync(input()))),
    expected,
  );
});
