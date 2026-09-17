"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

/**
 * `GET /api/league/overview` -> `league-overview.v1`.
 *
 * Steps 1-2 of `m1-league-screen-data-plan-v1.md` §4. The central property under test is that
 * sections fail INDEPENDENTLY: a dead matchup read must return standings anyway. That is what
 * keeps one provider hiccup from blanking the whole League destination.
 */

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  then(resolve, reject) {
    const data = this.rows.filter((row) =>
      this.filters.every(({ field, value }) => row[field] === value)
    );
    return Promise.resolve({ data, error: null }).then(resolve, reject);
  }
}

const SLEEPER_STANDINGS = [
  { rank: 1, team_id: "3", team_name: "Top Dogs", is_current_user: false, wins: 7, losses: 1 },
  { rank: 2, team_id: "7", team_name: "Ravens Flock", is_current_user: true, wins: 6, losses: 2 },
  { rank: 3, team_id: "9", team_name: "Also Rans", is_current_user: false, wins: 2, losses: 6 },
];

function defaultSleeperAdapter(overrides = {}) {
  const real = require("../src/adapters/sleeper");
  return {
    fetchSleeperUser: async () => ({ user_id: "sleeper-user-1" }),
    // Shaped from the live league read on 2026-08-30 (M11A claim 2): `playoff_teams` is an
    // int on `settings`, and `trade_deadline` is a WEEK NUMBER — captured here so the fixture
    // cannot drift back to the shape the contract merely assumed.
    fetchSleeperLeague: async () => ({
      league_id: "league-1",
      name: "Sleeper League",
      season: "2026",
      settings: { playoff_teams: 2, playoff_week_start: 15, trade_deadline: 11 },
    }),
    fetchSleeperStandings: async () => SLEEPER_STANDINGS,
    fetchSleeperRoster: async () => ({ roster_id: 7 }),
    fetchSleeperMatchups: async () => ([
      { roster_id: 7, matchup_id: 2, points: 88.4, starters: ["1001", "1002"] },
      { roster_id: 3, matchup_id: 2, points: 91.1, starters: ["2001", "0"] },
      { roster_id: 9, matchup_id: 1, points: 60.0, starters: [] },
    ]),
    // Sleeper's matchup rows carry no projected total, so the PROJ column is summed from the
    // per-player projections endpoint. Stubbed here so the route's own wiring is exercised.
    fetchSleeperProjections: async () => ({ 1001: 12.5, 1002: 9.25, 2001: 18.0 }),
    // The extractor itself is not mocked — the point is to exercise the real one.
    matchupFromMatchups: real.matchupFromMatchups,
    ...overrides,
  };
}

function defaultEspnAdapter(overrides = {}) {
  return {
    // The routes read the league name from the same fetch as the standings; ESPN had been
    // building every envelope without one.
    buildLeagueContext: async () => ({
      league_name: "The Titans of Slopsilonia",
      standings: [
        { rank: 1, team_id: "9", team_name: "ESPN Team", is_current_user: true, wins: 5, losses: 3 },
      ],
    }),
    fetchEspnMatchup: async () => ({
      status: "final",
      you: { team_id: "9", team_name: "ESPN Team", record: "5-3", points: 120.2, projected: null },
      opponent: { team_id: "4", team_name: "Rivals", record: "4-4", points: 99.8, projected: null },
      game_id: "g-1",
    }),
    ...overrides,
  };
}

function loadLeagueRouter(options = {}) {
  const routePath = require.resolve("../src/routes/league");
  delete require.cache[routePath];

  const rows = options.connections || [];
  const fakeSupabase = {
    from() {
      return { select() { return new FakeQuery(rows); } };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => fakeSupabase };
      if (request === "../middleware/auth") {
        return {
          requireAuth: options.requireAuth || ((req, _res, next) => {
            req.user = { id: "user-1" };
            next();
          }),
        };
      }
      if (request === "../middleware/logging") {
        return { logger: { error() {}, warn() {}, info() {} } };
      }
      if (request === "../services/nflSchedule") {
        return {
          getCurrentNflWeekContext: () => options.context || { season: 2026, week: 8, season_type: "regular" },
          isOffSeason: () => options.offSeason || false,
          suppressLiveFootballData: () => options.offSeason || false,
        };
      }
      if (request === "../services/yahooAuth") {
        return { getAuthenticatedYahooClient: async () => ({ client: options.yahooClient }) };
      }
      if (request === "../services/espnAuth") {
        return { getAuthenticatedEspnCredentials: async () => ({ espn_s2: "c", swid: "{s}" }) };
      }
      if (request === "../adapters/sleeper") return options.sleeperAdapter || defaultSleeperAdapter();
      if (request === "../adapters/espn") return options.espnAdapter || defaultEspnAdapter();
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/league");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/league", loadLeagueRouter(options));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

async function request(app, path, headers = { authorization: "Bearer valid-token" }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const SLEEPER_CONNECTION = {
  user_id: "user-1",
  platform: "sleeper",
  is_active: true,
  league_id: "league-1",
  platform_user_id: "sleeper-user-1",
};

const ESPN_CONNECTION = {
  user_id: "user-1",
  platform: "espn",
  is_active: true,
  league_id: "espn-1",
  espn_secret_id: "a",
  swid_secret_id: "b",
  espn_team_id: "9",
};

function byName(records, name) {
  return records.find((record) => record.name === name);
}

test("GET /api/league/overview returns a real matchup built from data that was being discarded", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "league-overview.v1");
  assert.equal(res.body.league_name, "Sleeper League");

  // Both sides, both point totals, and the opponent's name — none of which survived
  // `normalizeLastResult()`, which reduced this same payload to one "W"/"L" letter.
  assert.equal(res.body.matchup.status, "live");
  assert.equal(res.body.matchup.you.team_name, "Ravens Flock");
  assert.equal(res.body.matchup.you.record, "6-2");
  assert.equal(res.body.matchup.you.points, 88.4);
  assert.equal(res.body.matchup.opponent.team_name, "Top Dogs");
  assert.equal(res.body.matchup.opponent.points, 91.1);

  // The overview remains league-overview.v1; the capability/receipt layer is additive and
  // describes only sources already resolved by this request.
  assert.equal(res.body.capability_contract, "decision-capabilities.v1");
  assert.equal(res.body.decision_context.contract_version, "shared-decision-context.v1");
  assert.equal(res.body.decision_context.profile, "league");
  assert.deepEqual(res.body.decision_context.inputs_used, [
    "league_activity",
    "league_matchup",
    "league_playoff_settings",
    "league_standings",
    "selected_context",
  ]);
  assert.deepEqual(res.body.decision_context.inputs.league_standings, {
    state: "live", used: true, source: "sleeper_league_standings", observed_at: res.body.generated_at,
  });
  assert.deepEqual(res.body.decision_context.inputs.league_transactions, {
    state: "not_requested", used: false, source: "provider_transactions", reason_code: "not_requested",
  });
  assert.deepEqual(res.body.decision_context.limitations, [{
    name: "league_transactions", state: "not_requested", reason_code: "not_requested",
  }]);
  assert.deepEqual(byName(res.body.capabilities, "league_standings"), {
    name: "league_standings",
    state: "live",
    used: true,
    kind: "verified",
    source: "sleeper_league_standings",
    statement: "Omen read the current standings from your connected Sleeper league.",
    observed_at: res.body.generated_at,
    fresh_until: null,
  });
  assert.equal(byName(res.body.capabilities, "league_transactions").state, "unavailable");
  assert.equal(byName(res.body.capabilities, "league_transactions").reason_code, "not_requested");
});

test("GET /api/league/overview reports standings position", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.body.standings.status, "available");
  assert.equal(res.body.standings.teams.length, 3);
  assert.equal(res.body.standings.playoff_picture.rank, 2);
  assert.equal(res.body.standings.playoff_picture.team_count, 3);
});

test("League receipt decorates already-resolved sections without a second provider fan-out", async () => {
  const calls = [];
  const base = defaultSleeperAdapter();
  const sleeperAdapter = {
    ...base,
    fetchSleeperLeague: async (...args) => { calls.push("league"); return base.fetchSleeperLeague(...args); },
    fetchSleeperStandings: async (...args) => { calls.push("standings"); return base.fetchSleeperStandings(...args); },
    fetchSleeperRoster: async (...args) => { calls.push("roster"); return base.fetchSleeperRoster(...args); },
    fetchSleeperMatchups: async (...args) => { calls.push("matchups"); return base.fetchSleeperMatchups(...args); },
    fetchSleeperProjections: async (...args) => { calls.push("projections"); return base.fetchSleeperProjections(...args); },
  };

  const res = await request(buildApp({ connections: [SLEEPER_CONNECTION], sleeperAdapter }), "/api/league/overview");

  assert.equal(res.status, 200);
  assert.ok(res.body.decision_context);
  assert.deepEqual(calls.sort(), ["league", "matchups", "projections", "roster", "standings"]);
});

// This test used to assert `settings_known: false` and a bare "2nd of 3", on the reasoning that
// "no provider path reads playoff settings yet". That was true when written and stopped being
// true on 2026-08-30, when M11A found `settings.playoff_teams` on the live Sleeper league object
// the route ALREADY fetched. The "do not invent a cut line" half of its intent did not go away —
// it moved to the sibling test below, which exercises a league that genuinely supplies nothing.

test("GET /api/league/overview keeps the transactions family named even when signals fire", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  // The seam is unchanged by step 2 landing: whatever the status, the missing family is NAMED,
  // so waivers still land without a contract change. Only `items` and `status` move.
  assert.deepEqual(res.body.activity.unavailable_families, ["transactions"]);
  assert.ok(["empty", "partial", "available"].includes(res.body.activity.status));
});

test("a dead matchup read still returns standings — sections fail independently", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONNECTION],
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperMatchups: async () => { throw new Error("provider exploded"); },
    }),
  });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.matchup.status, "unavailable");
  assert.equal(res.body.matchup.unavailable_reason, "provider_failed");
  // The whole point: one dead section must not blank the destination.
  assert.equal(res.body.standings.status, "available");
  assert.equal(res.body.standings.teams.length, 3);
  assert.deepEqual(res.body.decision_context.inputs.league_matchup, {
    state: "unavailable", used: false, source: "sleeper_matchups", reason_code: "provider_failed",
  });
  assert.ok(!res.body.decision_context.inputs_used.includes("league_matchup"));
  assert.equal(byName(res.body.capabilities, "league_matchup").kind, "limitation");
});

test("a bye week is reported as no_matchup, not as a provider failure", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONNECTION],
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperMatchups: async () => ([{ roster_id: 7, matchup_id: 2, points: 0 }]),
    }),
  });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.body.matchup.status, "no_matchup");
  assert.equal(res.body.matchup.you, null);
  // A provider-confirmed bye is a completed live read, not a provider outage.
  assert.deepEqual(res.body.decision_context.inputs.league_matchup, {
    state: "live", used: true, source: "sleeper_matchups", reason_code: "no_matchup", observed_at: res.body.generated_at,
  });
  assert.equal(byName(res.body.capabilities, "league_matchup").state, "live");
  assert.equal(byName(res.body.capabilities, "league_matchup").reason_code, "no_matchup");
});

test("ESPN overview reads its own matchup path", async () => {
  const app = buildApp({ connections: [ESPN_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.platform, "espn");
  assert.equal(res.body.matchup.status, "final");
  assert.equal(res.body.matchup.opponent.team_name, "Rivals");
  assert.equal(res.body.decision_context.inputs.league_standings.source, "espn_league_context");
  assert.equal(res.body.decision_context.inputs.league_matchup.source, "espn_matchup");
  // ESPN's mapped overview does not currently read a playoff-team setting; this is an
  // implementation limitation, not a claim that ESPN cannot provide one.
  assert.equal(res.body.decision_context.inputs.league_playoff_settings.reason_code, "settings_not_read");
});

test("the off-season gate returns explicit section states, never fabricated ones", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION], offSeason: true });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.matchup.status, "unavailable");
  assert.equal(res.body.matchup.unavailable_reason, "off_season");
  assert.equal(res.body.standings.status, "off_season");
  assert.deepEqual(res.body.standings.teams, []);
  assert.equal(res.body.decision_context.inputs.selected_context.state, "live");
  for (const name of ["league_standings", "league_matchup", "league_playoff_settings", "league_activity"]) {
    assert.equal(res.body.decision_context.inputs[name].state, "unavailable");
    assert.equal(res.body.decision_context.inputs[name].reason_code, "off_season");
  }
});

test("GET /api/league/overview reuses the standings error contract verbatim", async () => {
  const app = buildApp({ connections: [] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 404);
  assert.equal(res.body.contract_version, "league-standings-error.v1");
  assert.equal(res.body.code, "league_not_connected");
});

test("GET /api/league/overview rejects an unsupported platform", async () => {
  const app = buildApp();

  const res = await request(app, "/api/league/overview?platform=manual");

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "invalid_platform");
});

test("GET /api/league/overview requires auth", async () => {
  const app = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await request(app, "/api/league/overview", {});

  assert.equal(res.status, 401);
});

test("GET /api/league/standings is unchanged by the additive overview route", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/standings");

  assert.equal(res.status, 200);
  // The Command Center context strip consumes this contract and must not be disturbed.
  assert.equal(res.body.contract_version, "league-standings.v1");
  assert.equal(res.body.standings.length, 3);
});

test("playoff settings are read, so the cut line stops being unknowable", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");
  const picture = res.body.standings.playoff_picture;

  // Until 2026-08-30 nothing read `settings.playoff_teams`, so this was hardcoded false and the
  // League screen could never draw a cut line. M11A found the field in an object already fetched.
  assert.equal(picture.settings_known, true);
  assert.equal(picture.rank, 2);
  assert.equal(picture.line, "2nd of 3 · in a playoff spot");
  assert.equal(picture.cut_line_note, "4 games clear of the cut line");
});

test("a provider that does not supply playoff settings stays honestly unknown", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONNECTION],
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperLeague: async () => ({ league_id: "league-1", name: "L", season: "2026" }),
    }),
  });

  const res = await request(app, "/api/league/overview");
  const picture = res.body.standings.playoff_picture;

  assert.equal(picture.settings_known, false);
  assert.equal(picture.cut_line_note, null);
  // Position without a boundary is still true; inventing the boundary is not.
  assert.equal(picture.line, "2nd of 3");
  assert.equal(res.body.activity.status, "empty");
  assert.deepEqual(res.body.decision_context.inputs.league_playoff_settings, {
    state: "unavailable", used: false, source: "sleeper_league_settings", reason_code: "settings_not_read",
  });
  assert.deepEqual(res.body.decision_context.inputs.league_activity, {
    state: "unavailable", used: false, source: "derived_standings", reason_code: "settings_not_read",
  });
});

test("standings-derived activity populates, and names the family it still lacks", async () => {
  // Tailored so a signal actually fires. The default fixture has the caller 4 games clear of
  // the cut, which correctly produces NO signal — the first version of this test asserted
  // otherwise and was wrong about its own data, not about the code.
  const app = buildApp({
    connections: [SLEEPER_CONNECTION],
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperStandings: async () => ([
        { rank: 1, team_id: "3", team_name: "Top Dogs", is_current_user: false, wins: 7, losses: 1 },
        { rank: 2, team_id: "7", team_name: "Ravens Flock", is_current_user: true, wins: 4, losses: 4 },
        { rank: 3, team_id: "9", team_name: "Also Rans", is_current_user: false, wins: 4, losses: 4 },
      ]),
    }),
  });

  const res = await request(app, "/api/league/overview");

  // `partial`, not `available`: standings signals are live while transactions are still missing,
  // and the contract requires the missing family be named whenever status is partial.
  assert.equal(res.body.activity.status, "partial");
  assert.deepEqual(res.body.activity.unavailable_families, ["transactions"]);
  assert.ok(res.body.activity.items.length >= 1);
  assert.ok(res.body.activity.items.every((i) => i.source === "derived_standings"));
});

test("the deadline signal is NOT emitted, because the field is a week number", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  // M11A claim 2: `settings.trade_deadline` is `11` — a WEEK, not a date. Producing "in 12 days"
  // needs a week-to-date conversion through the NFL schedule, which is step 3. Emitting it from
  // a week number would be the invention this contract exists to prevent.
  const texts = res.body.activity.items.map((i) => i.text).join(" ");
  assert.ok(!/deadline/i.test(texts), "no deadline claim until the week-to-date conversion exists");
});

test("activity items are capped at three by the server, never by the client", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.ok(res.body.activity.items.length <= 3);
});
