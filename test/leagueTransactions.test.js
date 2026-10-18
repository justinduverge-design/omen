"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const tx = require("../src/services/leagueTransactions");

/**
 * League transactions (G4). The property under test: a feed that was not read never looks like
 * an empty feed. Sleeper is live; Yahoo and ESPN stay `unavailable` until their flags are on, and
 * an unrecognised shape from them is `unavailable`, not `empty`.
 */

const SLEEPER_ROWS = [
  {
    transaction_id: "t1",
    type: "waiver",
    status: "complete",
    leg: 7,
    created: 1760000000000,
    roster_ids: [3],
    adds: { 4046: 3 },
    drops: { 1234: 3 },
    draft_picks: [],
  },
  {
    transaction_id: "t2",
    type: "trade",
    status: "complete",
    leg: 7,
    created: 1760100000000,
    roster_ids: [3, 7],
    adds: { 4046: 7, 1234: 3 },
    drops: { 4046: 3, 1234: 7 },
    draft_picks: [{}],
  },
  {
    transaction_id: "t3",
    type: "waiver",
    status: "failed",
    leg: 7,
    created: 1760200000000,
    roster_ids: [9],
    adds: { 1: 9 },
  },
];
const PLAYERS = {
  4046: { full_name: "Joe Burrow", position: "QB", team: "CIN" },
  1234: { first_name: "A", last_name: "Back" },
};
const NAMES = { 3: "Top Dogs", 7: "Ravens Flock" };

const connection = (platform) => ({ platform, league_id: "L1" });
const context = { week: 7, season: 2026 };

test("Sleeper rows: complete only, kinds, names and summaries from provider fields", () => {
  const items = tx.parseSleeperTransactions(SLEEPER_ROWS, { players: PLAYERS, teamNames: NAMES });
  assert.equal(items.length, 2, "failed waiver is not league activity");
  const [claim, trade] = items;
  assert.equal(claim.kind, "waiver_claim");
  assert.equal(claim.summary, "Top Dogs claimed Joe Burrow and dropped A Back.");
  assert.equal(trade.kind, "trade");
  assert.equal(trade.draft_picks, 1);
  assert.deepEqual(
    trade.teams.map((t) => t.team_name),
    ["Top Dogs", "Ravens Flock"],
  );
});

test("parsers fail closed on shapes they do not recognise", () => {
  assert.deepEqual(tx.parseSleeperTransactions(null), []);
  assert.deepEqual(tx.parseYahooTransactions({ fantasy_content: {} }), []);
  assert.deepEqual(tx.parseEspnTransactions({ transactions: [{ status: "PENDING", type: "WAIVER" }] }), []);
});

test("clampLimit bounds the page size", () => {
  assert.equal(tx.clampLimit(undefined), tx.DEFAULT_LIMIT);
  assert.equal(tx.clampLimit("0"), tx.DEFAULT_LIMIT);
  assert.equal(tx.clampLimit("999"), tx.MAX_LIMIT);
});

function sleeperDeps(overrides = {}) {
  return {
    env: {},
    sleeper: {
      fetchSleeperTransactions: async (_id, round) => (round === 7 ? SLEEPER_ROWS : []),
      fetchSleeperTeamNames: async () => NAMES,
      fetchSleeperPlayers: async () => PLAYERS,
      ...overrides,
    },
  };
}

test("Sleeper reads live, newest first, reads this round and the one before", async () => {
  const rounds = [];
  const deps = sleeperDeps({
    fetchSleeperTransactions: async (_id, r) => {
      rounds.push(r);
      return r === 7 ? SLEEPER_ROWS : [];
    },
  });
  const body = await tx.readLeagueTransactions({ connection: connection("sleeper"), context, deps });
  assert.equal(body.contract_version, tx.CONTRACT);
  assert.equal(body.status, "available");
  assert.equal(body.provider_read, "live");
  assert.deepEqual(rounds.sort(), [6, 7]);
  assert.equal(body.items[0].kind, "trade", "newest first");
});

test("Sleeper with no transactions is empty, because the provider answered", async () => {
  const deps = sleeperDeps({ fetchSleeperTransactions: async () => [] });
  const body = await tx.readLeagueTransactions({ connection: connection("sleeper"), context, deps });
  assert.equal(body.status, "empty");
});

test("a failed players read costs names, not the feed", async () => {
  const deps = sleeperDeps({
    fetchSleeperPlayers: async () => {
      throw new Error("down");
    },
  });
  const body = await tx.readLeagueTransactions({ connection: connection("sleeper"), context, deps });
  assert.equal(body.status, "available");
  assert.ok(body.limitations.some((l) => /names/.test(l)));
});

test("a Sleeper outage is unavailable with a reason, never empty", async () => {
  const deps = sleeperDeps({
    fetchSleeperTransactions: async () => {
      throw new Error("boom");
    },
  });
  const body = await tx.readLeagueTransactions({ connection: connection("sleeper"), context, deps });
  assert.equal(body.status, "unavailable");
  assert.equal(body.provider_read, "failed");
  assert.ok(body.reason);
});

test("Yahoo and ESPN stay dark until their flags are on, and make no provider call", async () => {
  let called = false;
  const deps = {
    env: {},
    getYahooClient: async () => {
      called = true;
      return {};
    },
    getEspnCredentials: async () => {
      called = true;
      return {};
    },
    espn: {},
  };
  for (const platform of ["yahoo", "espn"]) {
    const body = await tx.readLeagueTransactions({ connection: connection(platform), context, deps });
    assert.equal(body.status, "unavailable", platform);
    assert.equal(body.provider_read, "not_enabled", platform);
  }
  assert.equal(called, false);
});

test("a flagged-on Yahoo read with an unrecognised shape is unavailable, not empty", async () => {
  const deps = {
    env: { LEAGUE_TRANSACTIONS_YAHOO: "1" },
    getYahooClient: async () => ({
      client: { getTransactions: async () => ({ fantasy_content: { league: [{}, {}] } }) },
    }),
  };
  const body = await tx.readLeagueTransactions({ connection: connection("yahoo"), context, deps });
  assert.equal(body.status, "unavailable");
  assert.equal(body.reason, "shape_not_recognised");
});

test("an expired Yahoo token asks for reauth", async () => {
  const deps = {
    env: { LEAGUE_TRANSACTIONS_YAHOO: "1" },
    getYahooClient: async () => {
      throw new Error("yahoo_token_expired");
    },
  };
  const body = await tx.readLeagueTransactions({ connection: connection("yahoo"), context, deps });
  assert.equal(body.reason, "reauth_required");
});

test("Sleeper can be switched off", async () => {
  const deps = sleeperDeps();
  deps.env = { LEAGUE_TRANSACTIONS_SLEEPER_DISABLED: "1" };
  const body = await tx.readLeagueTransactions({ connection: connection("sleeper"), context, deps });
  assert.equal(body.status, "unavailable");
  assert.equal(body.reason, "disabled");
});

test("week 0 makes no Sleeper call and is unavailable, not empty", async () => {
  let called = false;
  const deps = sleeperDeps({
    fetchSleeperTransactions: async () => {
      called = true;
      return [];
    },
  });
  const body = await tx.readLeagueTransactions({
    connection: connection("sleeper"),
    context: { week: 0, season: 2026 },
    deps,
  });
  assert.equal(called, false);
  assert.equal(body.status, "unavailable");
  assert.equal(body.reason, "no_round");
});

test("a players load past its budget costs names, not the feed", async () => {
  const deps = sleeperDeps({ fetchSleeperPlayers: () => new Promise(() => {}) });
  const body = await tx.readLeagueTransactions({ connection: connection("sleeper"), context, deps });
  assert.equal(body.status, "available");
  assert.ok(body.limitations.some((l) => /names/.test(l)));
});

test("off season envelope is unavailable with a reason", () => {
  const body = tx.offSeasonEnvelope(connection("sleeper"), context, 10);
  assert.equal(body.status, "unavailable");
  assert.equal(body.reason, "off_season");
  assert.equal(body.coverage.limit, 10);
});
