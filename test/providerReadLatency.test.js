"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadAdapter(handler) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
  delete require.cache[adapterPath];
  const calls = [];
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return {
        get: async (url, options = {}) => {
          calls.push(url);
          await new Promise((resolve) => setImmediate(resolve));
          return { data: await handler(url, options) };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return { adapter: require("../src/adapters/sleeper"), calls };
  } finally {
    Module._load = originalLoad;
  }
}

const count = (calls, fragment) => calls.filter((url) => url.includes(fragment)).length;
const countExact = (calls, suffix) => calls.filter((url) => url.endsWith(suffix)).length;

function fixtures(url) {
  if (url.endsWith("/user/justin")) return { user_id: "u1", display_name: "J", username: "justin" };
  if (url.endsWith("/league/L1")) return { league_id: "L1", season: "2026", roster_positions: ["QB", "FLEX"] };
  if (url.endsWith("/league/L1/rosters")) {
    return [{ roster_id: 3, owner_id: "u1", starters: ["p1"], players: ["p1", "p2"], reserve: [] }];
  }
  if (url.endsWith("/league/L1/users")) return [{ user_id: "u1", metadata: { team_name: "Mine" } }];
  if (url.endsWith("/players/nfl")) {
    return {
      p1: { full_name: "One", position: "QB", team: "AAA", active: true },
      p2: { full_name: "Two", position: "WR", team: "BBB", active: true },
      p3: { full_name: "Three", position: "RB", team: "CCC", active: true },
    };
  }
  if (url.includes("/projections/nfl/")) return [{ player_id: "p1", stats: { pts_ppr: 20 } }];
  throw new Error(`unexpected ${url}`);
}

test("within one request scope duplicate GETs collapse; across scopes they do not", async () => {
  const { adapter, calls } = loadAdapter(fixtures);
  await adapter.runWithSleeperRequestMemo(async () => {
    await Promise.all([adapter.fetchSleeperLeague("L1"), adapter.fetchSleeperLeague("L1")]);
    await adapter.fetchSleeperLeague("L1");
    await adapter.fetchSleeperUser("justin");
    await adapter.fetchSleeperUser("justin");
  });
  assert.equal(countExact(calls, "/league/L1"), 1);
  assert.equal(countExact(calls, "/user/justin"), 1);

  await adapter.runWithSleeperRequestMemo(() => adapter.fetchSleeperLeague("L1"));
  assert.equal(countExact(calls, "/league/L1"), 2);

  // Outside any scope there is no memo at all.
  await adapter.fetchSleeperLeague("L1");
  await adapter.fetchSleeperLeague("L1");
  assert.equal(countExact(calls, "/league/L1"), 4);
});

test("the memo keys on the full URL, so different leagues never share", async () => {
  const { adapter, calls } = loadAdapter((url) => ({ url }));
  await adapter.runWithSleeperRequestMemo(async () => {
    const [a, b] = await Promise.all([adapter.fetchSleeperLeague("A"), adapter.fetchSleeperLeague("B")]);
    assert.notDeepEqual(a, b);
  });
  assert.equal(calls.length, 2);
});

test("concurrent request scopes do not leak into each other", async () => {
  const { adapter, calls } = loadAdapter(fixtures);
  await Promise.all([
    adapter.runWithSleeperRequestMemo(() => adapter.fetchSleeperLeague("L1")),
    adapter.runWithSleeperRequestMemo(() => adapter.fetchSleeperLeague("L1")),
  ]);
  assert.equal(countExact(calls, "/league/L1"), 2);
});

test("a failed read is not memoised for the rest of the request", async () => {
  let attempt = 0;
  const { adapter, calls } = loadAdapter(() => {
    attempt += 1;
    if (attempt === 1) throw new Error("boom");
    return { ok: true };
  });
  await adapter.runWithSleeperRequestMemo(async () => {
    await assert.rejects(adapter.fetchSleeperLeague("L1"));
    assert.deepEqual(await adapter.fetchSleeperLeague("L1"), { ok: true });
  });
  assert.equal(calls.length, 2);
});

test("the players map is parsed once per process and loads are single-flight", async () => {
  const { adapter, calls } = loadAdapter(fixtures);
  adapter.resetSleeperPlayersMemo();
  const [a, b, c] = await Promise.all([
    adapter.fetchSleeperPlayers(), adapter.fetchSleeperPlayers(), adapter.fetchSleeperPlayers(),
  ]);
  assert.equal(a, b);
  assert.equal(b, c);
  await adapter.fetchSleeperPlayers();
  assert.equal(count(calls, "/players/nfl"), 1);
});

test("a failed players load is not cached and a later call retries", async () => {
  let attempt = 0;
  const { adapter, calls } = loadAdapter(() => {
    attempt += 1;
    if (attempt === 1) throw new Error("down");
    return { p1: { full_name: "One" } };
  });
  adapter.resetSleeperPlayersMemo();
  await assert.rejects(adapter.fetchSleeperPlayers());
  assert.deepEqual(await adapter.fetchSleeperPlayers(), { p1: { full_name: "One" } });
  assert.equal(count(calls, "/players/nfl"), 2);
});

test("buildNormalizedRoster issues each read once per request and returns the same roster", async () => {
  const { adapter, calls } = loadAdapter(fixtures);
  adapter.resetSleeperPlayersMemo();
  const scoped = await adapter.runWithSleeperRequestMemo(async () => {
    const roster = await adapter.buildNormalizedRoster("L1", "justin", 5, {});
    // A second stage in the same request (waiver system / pool) re-asks for the same reads.
    await adapter.fetchSleeperRoster("L1", "u1");
    await adapter.fetchSleeperLeague("L1");
    return roster;
  });
  assert.equal(countExact(calls, "/league/L1/rosters"), 1);
  assert.equal(countExact(calls, "/league/L1/users"), 1);
  assert.equal(countExact(calls, "/league/L1"), 1);
  assert.equal(count(calls, "/projections/nfl/"), 1);

  assert.equal(scoped.team_key, "3");
  assert.deepEqual(
    scoped.slots.starters.map((p) => [p.player_id, p.projected_points, p.selected_position]),
    [["p1", 20, "QB"]]
  );
  assert.deepEqual(scoped.slots.bench.map((p) => [p.player_id, p.projected_points]), [["p2", null]]);

  // An unscoped call returns the identical roster.
  const unscoped = await adapter.buildNormalizedRoster("L1", "justin", 5, {});
  assert.deepEqual(unscoped, scoped);
});

test("pool and league-roster reads keep their results with projections fetched concurrently", async () => {
  const { adapter } = loadAdapter(fixtures);
  adapter.resetSleeperPlayersMemo();
  const pool = await adapter.fetchSleeperAvailablePlayers("L1", 5, "2026");
  assert.deepEqual(pool.map((p) => p.player_id), ["p3"]);

  const league = await adapter.fetchSleeperLeagueRosters("L1", 5);
  assert.equal(league.teams.length, 1);
  assert.equal(league.teams[0].team_name, "Mine");
  assert.equal(league.teams[0].players.find((p) => p.player_id === "p1").projected_points, 20);
});

test("a projections failure degrades to null projections, not a failed roster", async () => {
  const { adapter } = loadAdapter((url) => {
    if (url.includes("/projections/")) throw new Error("projections down");
    return fixtures(url);
  });
  adapter.resetSleeperPlayersMemo();
  const roster = await adapter.buildNormalizedRoster("L1", "justin", 5, {});
  assert.equal(roster.slots.starters[0].projected_points, null);
});

test("ESPN vault secrets are decrypted concurrently and still fail closed", async () => {
  const authPath = require.resolve("../src/services/espnAuth");
  delete require.cache[authPath];
  const events = [];
  const supabase = {
    failOn: null,
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: { espn_secret_id: "a", swid_secret_id: "b" }, error: null }),
      };
      return q;
    },
    rpc: async (_name, { secret_id: secretId }) => {
      events.push(`start:${secretId}`);
      await new Promise((resolve) => setImmediate(resolve));
      events.push(`end:${secretId}`);
      if (supabase.failOn === secretId) return { data: null, error: { message: "x" } };
      return { data: { decrypted_secret: secretId === "a" ? "s2-value" : "{swid}" }, error: null };
    },
  };
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === authPath) {
      return { createClient: () => supabase };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let auth;
  try { auth = require("../src/services/espnAuth"); } finally { Module._load = originalLoad; }

  assert.deepEqual(await auth.getAuthenticatedEspnCredentials("u"), { espn_s2: "s2-value", swid: "{swid}" });
  assert.deepEqual(events.slice(0, 2), ["start:a", "start:b"]);

  supabase.failOn = "b";
  await assert.rejects(
    auth.getAuthenticatedEspnCredentials("u"),
    (e) => e.status === 401 && !/s2-value|swid/.test(e.message)
  );
});

test("selectTolerantly remembers absent optional columns instead of re-querying each request", async () => {
  const moves = require("../src/routes/moves");
  moves.resetAbsentColumns();
  const queries = [];
  const run = async (columns) => {
    queries.push(columns);
    if (columns.split(",").includes("result")) {
      return { data: null, error: { code: "42703", message: "column moves.result does not exist" } };
    }
    return { data: { ok: true }, error: null };
  };
  const first = await moves.selectTolerantly(["id", "result"], ["result"], run);
  assert.deepEqual(first.data, { ok: true });
  assert.equal(queries.length, 2);

  const second = await moves.selectTolerantly(["id", "result"], ["result"], run);
  assert.deepEqual(second.data, { ok: true });
  assert.equal(queries.length, 3, "second request goes straight to the reduced column list");
  assert.equal(queries[2], "id");
  moves.resetAbsentColumns();
});

test("with a stale players map, every concurrent caller gets it on refresh failure, and failures back off", async () => {
  let fail = false;
  const { adapter, calls } = loadAdapter(() => {
    if (fail) throw new Error("down");
    return { p1: { full_name: "One" } };
  });
  adapter.resetSleeperPlayersMemo();
  const realNow = Date.now;
  let clock = realNow();
  Date.now = () => clock;
  try {
    const first = await adapter.fetchSleeperPlayers();
    fail = true;
    clock += 21 * 60 * 1000; // past the 20 min TTL
    const results = await Promise.all([
      adapter.fetchSleeperPlayers(), adapter.fetchSleeperPlayers(), adapter.fetchSleeperPlayers(),
    ]);
    for (const r of results) assert.equal(r, first);
    assert.equal(count(calls, "/players/nfl"), 2);

    // Within the backoff window nobody retries the upstream.
    clock += 30 * 1000;
    assert.equal(await adapter.fetchSleeperPlayers(), first);
    assert.equal(count(calls, "/players/nfl"), 2);

    // After the backoff it tries again.
    clock += 40 * 1000;
    assert.equal(await adapter.fetchSleeperPlayers(), first);
    assert.equal(count(calls, "/players/nfl"), 3);
  } finally {
    Date.now = realNow;
  }
});

test("absent-column memory is keyed per table", async () => {
  const moves = require("../src/routes/moves");
  moves.resetAbsentColumns();
  const run = async (columns) => (columns.split(",").includes("x")
    ? { data: null, error: { code: "42703", message: "column t.x does not exist" } }
    : { data: {}, error: null });
  await moves.selectTolerantly(["id", "x"], ["x"], run, "table_a");
  const queries = [];
  await moves.selectTolerantly(["id", "x"], ["x"], async (c) => { queries.push(c); return run(c); }, "table_b");
  assert.equal(queries[0], "id,x", "table_b still tries x");
  moves.resetAbsentColumns();
});
