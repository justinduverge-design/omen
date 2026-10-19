"use strict";

/**
 * The Omen call: an explicit league is honoured and named, a quiet week returns a HOLD with real
 * reasons, and the trade candidate works for ESPN (and says why not for Yahoo).
 *
 * Same harness shape as omenMvpLiveService.test.js: the service is loaded with its provider
 * modules replaced. The real optimizer runs (nothing here stubs lineup math).
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const { buildHold } = require("../src/services/omenHold");
const { evaluateTradeForConnection, rosterPositionsFromRoster } = require("../src/services/omenTradeCandidate");

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
  }
  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }
  maybeSingle() {
    return Promise.resolve({ data: this.applyFilters()[0] || null, error: null });
  }
  then(resolve, reject) {
    return Promise.resolve({ data: this.applyFilters(), error: null }).then(resolve, reject);
  }
  applyFilters() {
    return this.rows.filter((row) => this.filters.every(({ field, value }) => row[field] === value));
  }
}

const player = (key, name, position, projected, extra = {}) => ({
  player_key: key,
  player_id: key,
  name,
  position,
  eligible_positions: [position],
  selected_position: extra.selected_position || position,
  team: "DAL",
  status: "",
  projected_points: projected,
  ...extra,
});

function loadService({
  connections = [],
  sleeperRosterByLeague = {},
  espnRoster,
  espnLeagueRosters,
  yahooRoster,
  discovery = null,
} = {}) {
  const servicePath = require.resolve("../src/services/omen");
  delete require.cache[servicePath];
  const calls = {
    sleeperRoster: [],
    espnRoster: [],
    yahooRoster: [],
    espnLeagueRosters: [],
    yahooLeagueRosters: [],
    sleeperLeagueRosters: [],
    discovery: [],
  };
  const fakeSupabase = {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    rpc: async (_fn, args) => ({ data: { decrypted_secret: `secret:${args.secret_id}` }, error: null }),
    from(table) {
      return {
        select() {
          if (table === "platform_connections") return new FakeQuery(connections);
          if (table === "users") return new FakeQuery([{ id: "user-1" }]);
          throw new Error(`unexpected table ${table}`);
        },
      };
    },
  };
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    const fromService = parent?.filename === servicePath;
    if (request === "@supabase/supabase-js" && fromService) return { createClient: () => fakeSupabase };
    if (request === "./yahooAuth" && fromService) {
      return {
        getAuthenticatedYahooClient: async () => ({ client: { type: "fake-yahoo" }, accessToken: "yahoo-token" }),
      };
    }
    if (request === "./roster" && fromService) {
      return {
        fetchAndNormalizeRoster: async (_client, leagueId) => {
          calls.yahooRoster.push(leagueId);
          return yahooRoster;
        },
        normalizeYahooWaivers: () => [],
      };
    }
    if (request === "./leagueDiscovery" && fromService) {
      return {
        connectionForLeague: async (rows, options) => {
          calls.discovery.push({ leagueId: options.leagueId, platform: options.platform ?? null });
          return discovery ? discovery(rows, options) : null;
        },
      };
    }
    if (request === "../adapters/sleeper" && fromService) {
      return {
        fetchSleeperLeague: async (leagueId) => ({ league_id: leagueId, status: "in_season" }),
        fetchSleeperAvailablePlayers: async () => [],
        fetchSleeperLeagueRosters: async (leagueId) => {
          calls.sleeperLeagueRosters.push(leagueId);
          return { roster_positions: [], teams: [] };
        },
        buildNormalizedRoster: async (leagueId, _username, week) => {
          calls.sleeperRoster.push(leagueId);
          return sleeperRosterByLeague[leagueId] || sleeperRosterByLeague.default;
        },
      };
    }
    if (request === "../adapters/espn" && fromService) {
      return {
        buildNormalizedRoster: async (leagueId, _s2, _swid, week, opts) => {
          calls.espnRoster.push({ leagueId, teamId: opts?.teamId ?? null });
          return espnRoster;
        },
        fetchEspnWaiverPool: async () => [],
        fetchEspnLeagueRosters: async (leagueId) => {
          calls.espnLeagueRosters.push(leagueId);
          return espnLeagueRosters;
        },
      };
    }
    if (request === "../adapters/yahoo" && fromService) {
      return {
        fetchYahooLeagueRosters: async (leagueId) => {
          calls.yahooLeagueRosters.push(leagueId);
          return { teams: [] };
        },
      };
    }
    if (request === "./nflSchedule" && fromService) {
      return {
        getCurrentNflWeekContext: () => ({ season: 2026, week: 8, season_type: "regular" }),
        isOffSeason: () => false,
        suppressLiveFootballData: () => false,
      };
    }
    return original.call(this, request, parent, isMain);
  };
  try {
    return { service: require("../src/services/omen"), calls };
  } finally {
    Module._load = original;
  }
}

const sleeperConn = (extra = {}) => ({
  id: "ctx-sleeper",
  user_id: "user-1",
  platform: "sleeper",
  is_active: true,
  league_id: "sl-1",
  platform_username: "sleepy",
  ...extra,
});
const espnConn = (extra = {}) => ({
  id: "ctx-espn",
  user_id: "user-1",
  platform: "espn",
  is_active: true,
  league_id: "esp-1",
  espn_secret_id: "espnSecret",
  swid_secret_id: "swidSecret",
  espn_team_id: "7",
  ...extra,
});
const yahooConn = (extra = {}) => ({
  id: "ctx-yahoo",
  user_id: "user-1",
  platform: "yahoo",
  is_active: true,
  league_id: "414.l.1",
  token_secret_id: "tok",
  ...extra,
});

// A lineup whose best bench option is below the 0.5-point bar.
function quietRoster(source, teamKey) {
  return {
    week: 8,
    team_key: teamKey,
    source,
    slots: {
      starters: [
        player("qb1", "Quinn Back", "QB", 20),
        player("wr1", "Wes Receiver", "WR", 12, { selected_position: "WR" }),
      ],
      bench: [player("wr2", "Ben Chwarmer", "WR", 11.8, { selected_position: "BN" })],
      ir: [],
    },
  };
}

// ---------------------------------------------------------------------------
// 1. An explicit league is honoured and named
// ---------------------------------------------------------------------------

test("an explicit context_id answers for that league and says so", async () => {
  const { service, calls } = loadService({
    connections: [sleeperConn({ league_id: "sl-1" }), espnConn()],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    espnRoster: quietRoster("espn", "7"),
    espnLeagueRosters: { teams: [] },
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", { contextId: "ctx-espn" });
  assert.equal(result.body.platform.name, "espn");
  assert.equal(result.body.answered_for.selection, "requested");
  assert.equal(result.body.answered_for.matched, true);
  assert.equal(result.body.answered_for.platform, "espn");
  assert.equal(result.body.answered_for.league_id, "esp-1");
  assert.equal(result.body.answered_for.context_id, "ctx-espn");
  assert.equal(result.body.answered_for.requested.context_id, "ctx-espn");
  assert.deepEqual(calls.sleeperRoster, [], "the other provider must not be read");
});

test("an explicit league_id bound on a connection selects it without a provider lookup", async () => {
  const { service, calls } = loadService({
    connections: [sleeperConn({ league_id: "sl-1" }), espnConn({ league_id: "esp-9" })],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    espnRoster: quietRoster("espn", "7"),
    espnLeagueRosters: { teams: [] },
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", { leagueId: "esp-9" });
  assert.equal(result.body.answered_for.league_id, "esp-9");
  assert.equal(result.body.answered_for.selection, "requested");
  assert.deepEqual(calls.discovery, []);
  assert.deepEqual(calls.sleeperRoster, []);
});

test("a league the account plays in but that is not bound is widened through provider discovery", async () => {
  const { service, calls } = loadService({
    connections: [sleeperConn({ league_id: "sl-1" })],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    discovery: (rows, { leagueId }) => ({ ...rows[0], league_id: leagueId }),
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", { leagueId: "sl-second", platform: "sleeper" });
  assert.deepEqual(calls.discovery, [{ leagueId: "sl-second", platform: "sleeper" }]);
  assert.deepEqual(calls.sleeperRoster, ["sl-second"]);
  assert.equal(result.body.answered_for.league_id, "sl-second");
  assert.equal(result.body.answered_for.requested.league_id, "sl-second");
});

test("a requested league the provider does not claim fails closed, never answering for a different league", async () => {
  const { service, calls } = loadService({
    connections: [sleeperConn()],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    discovery: () => null,
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", { leagueId: "not-mine" });
  assert.equal(result.body.state, "context_unavailable");
  assert.equal(result.body.answered_for.matched, false);
  assert.equal(result.body.answered_for.selection, "requested");
  assert.deepEqual(calls.sleeperRoster, []);
});

test("with no league requested the call names the account-selected league it fell back to", async () => {
  const { service } = loadService({
    connections: [sleeperConn()],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");
  assert.equal(result.body.answered_for.selection, "account_selected");
  assert.equal(result.body.answered_for.league_id, "sl-1");
  assert.deepEqual(result.body.answered_for.requested, { context_id: null, league_id: null, platform: null });
});

// ---------------------------------------------------------------------------
// 2. HOLD with real reasons
// ---------------------------------------------------------------------------

test("a quiet week is a HOLD that names the best alternative and why it lost, from the engine's own numbers", async () => {
  const { service } = loadService({
    connections: [sleeperConn()],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
  });
  const { body } = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(body.state, "empty", "the state stays empty so shipped clients keep working");
  assert.equal(body.recommendation, null);
  assert.equal(body.call_kind, "hold");
  assert.equal(body.hold.kind, "hold");
  const alt = body.hold.best_alternative;
  assert.equal(alt.kind, "start_sit");
  assert.equal(alt.start.name, "Ben Chwarmer");
  assert.equal(alt.sit.name, "Wes Receiver");
  assert.equal(alt.delta, -0.2);
  assert.equal(alt.threshold, 0.5);
  assert.match(alt.why_not, /Wes Receiver already projects 0\.2 points above Ben Chwarmer \(12 vs 11\.8\)/);
  assert.equal(body.hold.projections.available, true);
  assert.deepEqual(
    body.hold.considered.map((c) => c.kind),
    ["start_sit", "waiver_pickup", "trade_suggestion"],
  );
  assert.ok(body.hold.reasons.length >= 1);
});

test("a swap just under the bar is reported as a near miss with its margin", () => {
  const roster = {
    slots: {
      starters: [player("a", "Alpha", "WR", 10)],
      bench: [player("b", "Bravo", "WR", 10.3, { selected_position: "BN" })],
    },
  };
  const hold = buildHold({ roster, platformLabel: "ESPN", isOut: () => false });
  assert.equal(hold.best_alternative.delta, 0.3);
  assert.equal(hold.best_alternative.margin_to_threshold, 0.2);
  assert.match(hold.best_alternative.why_not, /under the 0\.5-point bar/);
});

test("with no projections the hold says so and invents no delta", () => {
  const roster = {
    slots: {
      starters: [{ ...player("a", "Alpha", "WR", null) }],
      bench: [{ ...player("b", "Bravo", "WR", null, { selected_position: "BN" }) }],
    },
  };
  const hold = buildHold({ roster, platformLabel: "Yahoo", isOut: () => false });
  assert.equal(hold.projections.available, false);
  assert.equal(hold.best_alternative, null);
  assert.equal(hold.reasons[0].code, "projections_unavailable");
  assert.match(hold.reasons[0].text, /could not build enough usable weekly projections for this Yahoo league/);
});

test("an OUT starter with no usable pickup is reported as its own reason", () => {
  const out = { ...player("a", "Alpha", "WR", 12), status: "OUT" };
  const roster = { slots: { starters: [out], bench: [player("b", "Bravo", "WR", 3, { selected_position: "BN" })] } };
  const hold = buildHold({
    roster,
    platformLabel: "Sleeper",
    waiver: { signalStatus: "live" },
    isOut: (s) => s === "OUT",
  });
  const waiver = hold.reasons.find((r) => r.code === "no_waiver_fix");
  assert.match(waiver.text, /Alpha is OUT/);
});

// ---------------------------------------------------------------------------
// 3. Yahoo and ESPN trade
// ---------------------------------------------------------------------------

test("Yahoo gets an honest hold: no projections, no trade read, no invented numbers", async () => {
  const noProjection = (key, name, position, slot) => player(key, name, position, null, { selected_position: slot });
  const { service, calls } = loadService({
    connections: [yahooConn()],
    yahooRoster: {
      week: 8,
      team_key: "414.l.1.t.7",
      source: "yahoo",
      slots: {
        starters: [noProjection("yahoo:1", "Yara Back", "QB", "QB")],
        bench: [noProjection("yahoo:2", "Yan Bench", "QB", "BN")],
        ir: [],
      },
    },
  });
  const { body } = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(body.state, "empty");
  assert.equal(body.call_kind, "hold");
  assert.equal(body.hold.projections.available, false);
  assert.equal(body.hold.best_alternative, null);
  assert.equal(body.hold.reasons[0].code, "projections_unavailable");
  const trade = body.hold.considered.find((c) => c.kind === "trade_suggestion");
  assert.equal(trade.outcome, "unavailable");
  assert.equal(trade.reason, "projections_unavailable");
  assert.deepEqual(calls.yahooLeagueRosters, [], "no league-wide read when no trade could be scored");
});

// Own team 7 has a surplus RB and a weak WR; team 8 has the opposite.
function espnLeagueFixture() {
  const mine = [
    player("espn:q1", "My QB", "QB", 20),
    player("espn:r1", "My RB1", "RB", 18),
    player("espn:r2", "My RB2", "RB", 17, { selected_position: "BN" }),
    player("espn:w1", "My WR", "WR", 5),
  ];
  const theirs = [
    player("espn:q2", "Their QB", "QB", 19),
    player("espn:r3", "Their RB", "RB", 4),
    player("espn:w2", "Their WR1", "WR", 17),
    player("espn:w3", "Their WR2", "WR", 16, { selected_position: "BN" }),
  ];
  return {
    roster: {
      week: 8,
      team_key: "7",
      source: "espn",
      slots: {
        starters: [mine[0], mine[1], mine[3]],
        bench: [mine[2]],
        ir: [],
      },
    },
    league: {
      roster_positions: [],
      teams: [
        { team_id: "7", team_name: "Mine", players: mine },
        { team_id: "8", team_name: "Theirs", players: theirs },
      ],
    },
  };
}

test("ESPN now gets a trade call when a one-for-one improves both lineups", async () => {
  const fixture = espnLeagueFixture();
  const { service, calls } = loadService({
    connections: [espnConn()],
    espnRoster: fixture.roster,
    espnLeagueRosters: fixture.league,
  });
  const { body } = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(body.state, "success");
  assert.equal(body.recommendation.type, "trade_suggestion");
  assert.equal(body.call_kind, "trade_suggestion");
  assert.ok(body.recommendation.expected_value_delta.points > 0);
  assert.equal(body.signals.trade_rosters.source, "espn_league_rosters");
  assert.equal(body.platform.name, "espn");
  assert.deepEqual(calls.espnLeagueRosters, ["esp-1"]);
  assert.equal(body.answered_for.platform, "espn");
  // Warehouse usage is additive evidence: present and empty when the warehouse is not enabled.
  assert.deepEqual(body.recommendation.usage_evidence, []);
  assert.ok(!body.recommendation.explanation.data_used.some((line) => /weekly usage/.test(line)));
});

test("ESPN with no trade that clears both lineups holds, and the hold says it searched", async () => {
  const fixture = espnLeagueFixture();
  // Make the opponent identical in need so nothing improves both sides.
  fixture.league.teams[1].players = fixture.league.teams[0].players.map((p) => ({
    ...p,
    player_key: `x${p.player_key}`,
    player_id: `x${p.player_id}`,
  }));
  const { service } = loadService({
    connections: [espnConn()],
    espnRoster: fixture.roster,
    espnLeagueRosters: fixture.league,
  });
  const { body } = await service.buildLiveOmenMvpMoveForUser("user-1");
  assert.equal(body.state, "empty");
  assert.equal(body.call_kind, "hold");
  const trade = body.hold.considered.find((c) => c.kind === "trade_suggestion");
  assert.equal(trade.outcome, "none_found");
  assert.match(trade.detail, /searched 1 other roster/);
});

test("a failing ESPN league read is reported as unavailable, not as 'no trade exists'", async () => {
  const roster = espnLeagueFixture().roster;
  const result = await evaluateTradeForConnection({
    connection: { platform: "espn", league_id: "esp-1" },
    roster,
    platformLabel: "ESPN",
    deps: {
      credentials: { espnS2: "a", swid: "b" },
      adapters: {
        espn: {
          fetchEspnLeagueRosters: async () => {
            throw new Error("boom");
          },
        },
      },
    },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "rosters_unreadable");
});

test("missing ESPN credentials make the trade unavailable with a reconnect reason", async () => {
  const result = await evaluateTradeForConnection({
    connection: { platform: "espn", league_id: "esp-1" },
    roster: espnLeagueFixture().roster,
    platformLabel: "ESPN",
    deps: { credentials: null, adapters: { espn: {} } },
  });
  assert.equal(result.reason, "reauth_required");
});

test("the starting slots are read from the user's own lineup and unknown slots are dropped", () => {
  const roster = {
    slots: {
      starters: [
        player("a", "A", "QB", 1),
        player("b", "B", "RB", 1, { selected_position: "FLEX" }),
        player("c", "C", "LB", 1, { selected_position: "UNK" }),
      ],
    },
  };
  assert.deepEqual(rosterPositionsFromRoster(roster), ["QB", "FLEX"]);
});

test("a display name the provider omitted is filled from the warehouse identity crosswalk, never the projection", async () => {
  const fixture = espnLeagueFixture();
  // The receiving player arrives with ESPN's numeric-id fallback as his name.
  const nameless = fixture.league.teams[1].players.find((p) => p.name === "Their WR1");
  nameless.name = "4567";
  nameless.player_key = "espn:4567";
  nameless.player_id = "4567";
  const result = await evaluateTradeForConnection({
    connection: { platform: "espn", league_id: "esp-1" },
    roster: fixture.roster,
    platformLabel: "ESPN",
    deps: {
      credentials: { espnS2: "a", swid: "b" },
      adapters: { espn: { fetchEspnLeagueRosters: async () => fixture.league } },
      getRuntime: () => ({
        enabled: true,
        mode: "warehouse",
        identityRepository: {
          readPlayersByProviderIds: async ({ keys }) => {
            assert.deepEqual(keys, [{ provider: "espn", providerId: "4567" }]);
            return new Map([["espn:4567", { name: "Jaxon Smith", position: "WR", team: "PHI" }]]);
          },
        },
      }),
    },
  });
  assert.equal(result.status, "candidate");
  assert.equal(result.candidate.receive.name, "Jaxon Smith");
  assert.equal(result.candidate.receive.projected_points, 17, "identity never changes the projection");
});

// ---------------------------------------------------------------------------
// Review fixes: invalid scope fails closed, cross-user refusal, honest summary
// ---------------------------------------------------------------------------

test("a numeric league_id is coerced to a string and honoured (ESPN ids are numeric)", async () => {
  const { service, calls } = loadService({
    connections: [sleeperConn(), espnConn({ league_id: "13338821" })],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    espnRoster: quietRoster("espn", "7"),
    espnLeagueRosters: { teams: [] },
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1", { leagueId: 13338821 });
  assert.equal(result.body.answered_for.league_id, "13338821");
  assert.equal(result.body.answered_for.selection, "requested");
  assert.deepEqual(calls.sleeperRoster, []);
});

for (const [label, options] of [
  ["over-length league_id", { leagueId: "x".repeat(129) }],
  ["object league_id", { leagueId: { $ne: "" } }],
  ["boolean platform", { leagueId: "sl-1", platform: true }],
  ["non-finite number league_id", { leagueId: Number.NaN }],
]) {
  test(`an invalid scope field fails closed instead of falling back: ${label}`, async () => {
    const { service, calls } = loadService({
      connections: [sleeperConn()],
      sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    });
    const result = await service.buildLiveOmenMvpMoveForUser("user-1", options);
    assert.equal(result.body.state, "context_unavailable");
    assert.equal(result.body.answered_for.selection, "requested");
    assert.equal(result.body.answered_for.matched, false);
    assert.deepEqual(calls.sleeperRoster, [], "no provider read for the account-selected league");
  });
}

test("cross-user: a league that belongs to another account is refused, and no roster is read", async () => {
  // User A's provider account plays only in sl-A. The discovery stub answers like the real
  // provider check: only for leagues in A's own list.
  const accountA = new Set(["sl-A"]);
  const { service, calls } = loadService({
    connections: [sleeperConn({ league_id: "sl-A" })],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    discovery: (rows, { leagueId }) => (accountA.has(leagueId) ? { ...rows[0], league_id: leagueId } : null),
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    leagueId: "sl-B-belongs-to-user-B",
    platform: "sleeper",
  });
  assert.equal(result.body.state, "context_unavailable");
  assert.equal(result.body.answered_for.matched, false);
  assert.deepEqual(
    calls.discovery.map((d) => d.leagueId),
    ["sl-B-belongs-to-user-B"],
  );
  assert.deepEqual(calls.sleeperRoster, []);
  // Another account's connection id is refused too.
  const byContext = await service.buildLiveOmenMvpMoveForUser("user-1", { contextId: "ctx-of-user-B" });
  assert.equal(byContext.body.state, "context_unavailable");
});

test("a discovery call that hangs fails closed within its budget", async () => {
  const { service } = loadService({
    connections: [sleeperConn()],
    sleeperRosterByLeague: { default: quietRoster("sleeper", "7") },
    discovery: () => new Promise(() => {}),
  });
  const started = Date.now();
  const result = await service.buildLiveOmenMvpMoveForUser("user-1", { leagueId: "slow" });
  assert.equal(result.body.state, "context_unavailable");
  assert.ok(Date.now() - started < 4000);
});

test("the hold summary does not claim trades were weighed when the trade could not be evaluated", () => {
  const roster = { slots: { starters: [player("a", "Alpha", "WR", 12)], bench: [] } };
  const unavailable = buildHold({
    roster,
    platformLabel: "Yahoo",
    isOut: () => false,
    trade: { status: "unavailable", reason: "rosters_unreadable", message: "x" },
  });
  assert.doesNotMatch(unavailable.summary, /trade/i);
  const searched = buildHold({
    roster,
    platformLabel: "ESPN",
    isOut: () => false,
    trade: { status: "none_found", teams_checked: 5 },
  });
  assert.match(searched.summary, /lineup swaps, waivers and trades/);
  const noProj = buildHold({
    roster: { slots: { starters: [player("a", "Alpha", "WR", null)], bench: [] } },
    platformLabel: "Yahoo",
    isOut: () => false,
    trade: null,
  });
  assert.doesNotMatch(noProj.summary, /lineup swaps/);
});

test("why_not and delta come from the same optimizer row, with or without observed usage", () => {
  const roster = {
    slots: {
      starters: [player("a", "Alpha", "WR", 10)],
      bench: [player("b", "Bravo", "WR", 10.3, { selected_position: "BN" })],
    },
  };
  for (const usage of [null, new Map([["b", { recent: "up" }]])]) {
    const hold = buildHold({ roster, platformLabel: "ESPN", isOut: () => false, usage });
    const alt = hold.best_alternative;
    assert.equal(Number((alt.start.projected - alt.sit.projected).toFixed(2)), alt.delta);
    assert.match(alt.why_not, new RegExp(`\\(${alt.start.projected} vs ${alt.sit.projected}\\)`));
  }
});

test("a Yahoo hold whose projection build failed does not blame Yahoo for what Omen could not build", () => {
  const roster = {
    projection_meta: { available: false, reason: "timed_out" },
    slots: {
      starters: [player("a", "Alpha", "WR", null)],
      bench: [player("b", "Bravo", "WR", null, { selected_position: "BN" })],
    },
  };
  const hold = buildHold({ roster, platformLabel: "Yahoo", isOut: () => false });
  assert.equal(hold.reasons[0].code, "projections_unavailable");
  assert.match(hold.reasons[0].text, /Omen could not build them for this league this time/);
  assert.match(hold.reasons[0].text, /too slow/);
});

test("a Yahoo hold with partial projection coverage says players were left out of the comparison", () => {
  const roster = {
    projection_meta: { available: true },
    slots: {
      starters: [player("a", "Alpha", "WR", 12), player("c", "Charlie", "RB", null)],
      bench: [player("b", "Bravo", "WR", 11.8, { selected_position: "BN" })],
    },
  };
  const hold = buildHold({ roster, platformLabel: "Yahoo", isOut: () => false });
  const partial = hold.reasons.find((reason) => reason.code === "projections_partial");
  assert.ok(partial);
  assert.match(partial.text, /2 of your 3 lineup players/);
  assert.equal(hold.projections.players_with_projection, 2);
});

test("a roster Omen did not fill in (Sleeper, ESPN) gets no partial-coverage reason", () => {
  const roster = {
    slots: {
      starters: [player("a", "Alpha", "WR", 12), player("c", "Charlie", "RB", null)],
      bench: [player("b", "Bravo", "WR", 11.8, { selected_position: "BN" })],
    },
  };
  const hold = buildHold({ roster, platformLabel: "Sleeper", isOut: () => false });
  assert.equal(
    hold.reasons.some((reason) => reason.code === "projections_partial"),
    false,
  );
});
