"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;
delete process.env.INJURY_FRESHNESS_TIERS_DISABLED;

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");
const {
  freshnessPolicy, buildInjuryOverlay, diffInjuryOverlay, TIERS, LEGACY,
} = require("../src/services/injuryFreshness");

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// ---- policy (pure) -----------------------------------------------------------------------------

test("game-window days refresh fast: Thursday evening, Sunday, Monday evening and the hours before kickoff", () => {
  const cases = [
    ["2026-10-08T20:00:00Z", "Thu 16:00 ET"],
    ["2026-10-08T16:00:00Z", "Thu 12:00 ET, hours before kickoff"],
    ["2026-10-11T12:00:00Z", "Sun 08:00 ET, London window"],
    ["2026-10-11T23:30:00Z", "Sun evening"],
    ["2026-10-12T07:59:00Z", "Mon 03:59 ET, still Sunday night"],
    ["2026-10-12T17:00:00Z", "Mon 13:00 ET"],
    ["2026-10-13T02:00:00Z", "Mon 22:00 ET"],
  ];
  for (const [iso, why] of cases) {
    const p = freshnessPolicy(new Date(iso), { offSeason: false });
    assert.equal(p.tier, "game_window", why);
    assert.equal(p.players_ttl_ms, 10 * MIN);
    assert.equal(p.projections_ttl_ms, 20 * MIN);
  }
});

test("other in-season days refresh every couple of hours", () => {
  for (const iso of ["2026-10-07T15:00:00Z", "2026-10-13T15:00:00Z", "2026-10-12T14:00:00Z", "2026-10-09T15:00:00Z", "2026-10-10T15:00:00Z"]) {
    const p = freshnessPolicy(new Date(iso), { offSeason: false });
    assert.equal(p.tier, "in_season", iso);
    assert.equal(p.players_ttl_ms, 2 * HOUR);
  }
});

test("off-season is slow, and falls back to a month rule when the schedule is unavailable", () => {
  assert.equal(freshnessPolicy(new Date("2026-10-11T17:00:00Z"), { offSeason: true }).tier, "off_season");
  const july = new Date("2026-07-15T17:00:00Z");
  assert.equal(freshnessPolicy(july, { offSeason: null }).tier, "off_season");
  assert.equal(freshnessPolicy(july).players_ttl_ms, TIERS.off_season.players_ttl_ms);
  // Schedule unavailable in season: the day-of-week rule still applies.
  assert.equal(freshnessPolicy(new Date("2026-10-11T17:00:00Z"), { offSeason: null }).tier, "game_window");
});

test("known kickoffs open a window on days the weekday rule would miss (Saturday, holidays)", () => {
  const kickoff = "2026-12-19T20:00:00Z";
  const sat = new Date("2026-12-19T17:00:00Z");
  assert.equal(freshnessPolicy(sat, { offSeason: false }).tier, "in_season");
  assert.equal(freshnessPolicy(sat, { offSeason: false, kickoffs: [kickoff] }).tier, "game_window");
  assert.equal(freshnessPolicy(new Date("2026-12-20T09:00:00Z"), { offSeason: false, kickoffs: [kickoff] }).tier, "in_season");
});

test("INJURY_FRESHNESS_TIERS_DISABLED=1 returns the legacy TTLs", () => {
  const p = freshnessPolicy(new Date("2026-10-11T17:00:00Z"), { offSeason: false, env: { INJURY_FRESHNESS_TIERS_DISABLED: "1" } });
  assert.equal(p.tier, "legacy");
  assert.equal(p.players_ttl_ms, LEGACY.players_ttl_ms);
  assert.equal(p.projections_ttl_ms, HOUR);
});

test("healthy-player projection tolerance is never shorter than the hurt-safe TTL", () => {
  for (const tier of Object.values(TIERS)) assert.ok(tier.healthy_projections_ttl_ms >= tier.projections_ttl_ms);
});

// ---- overlay + diff -----------------------------------------------------------------------------

const roster = (over = {}) => ({
  a: { full_name: "A", status: "Active", injury_status: null },
  b: { full_name: "B", status: "Active", injury_status: "Questionable", injury_body_part: "Knee" },
  c: { full_name: "C", status: "Inactive", injury_status: null },
  ...over,
});

test("overlay keeps only players with an injury designation or a non-active status", () => {
  const overlay = buildInjuryOverlay(roster());
  assert.deepEqual([...overlay.keys()].sort(), ["b", "c"]);
  assert.equal(overlay.get("b").injury_body_part, "Knee");
});

test("diff reports designation changes and counts severe, questionable and cleared", () => {
  const prev = buildInjuryOverlay(roster({ d: { status: "Active", injury_status: "Questionable" } }));
  const next = buildInjuryOverlay(roster({
    b: { status: "Active", injury_status: "Out", injury_body_part: "Knee" }, // Q -> Out
    d: { status: "Active", injury_status: null }, // cleared
    e: { status: "Active", injury_status: "Questionable" }, // newly questionable
  }));
  const { changes, counts } = diffInjuryOverlay(prev, next);
  assert.equal(changes.length, 3);
  assert.deepEqual(counts, { tracked: 3, changed: 3, newly_severe: 1, newly_questionable: 1, cleared: 1 });
});

test("a body-part or news edit alone is not a designation change", () => {
  const prev = buildInjuryOverlay(roster());
  const next = buildInjuryOverlay(roster({ b: { status: "Active", injury_status: "Questionable", injury_body_part: "Ankle", news_updated: 9 } }));
  assert.equal(diffInjuryOverlay(prev, next).changes.length, 0);
});

// ---- adapter: stale-while-revalidate with a fake clock ------------------------------------------

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

const playerCalls = (calls) => calls.filter((u) => u.includes("/players/nfl")).length;
const flush = async () => { for (let i = 0; i < 6; i += 1) await new Promise((r) => setImmediate(r)); };

function withClock(startIso, fn) {
  const realNow = Date.now;
  let clock = new Date(startIso).getTime();
  Date.now = () => clock;
  const api = { advance: (ms) => { clock += ms; } };
  return Promise.resolve(fn(api)).finally(() => { Date.now = realNow; });
}

const GAME_DAY = "2026-10-11T17:00:00Z"; // Sunday 13:00 ET
const QUIET_DAY = "2026-10-07T15:00:00Z"; // Wednesday 11:00 ET

test("stale map is served immediately while one background refresh runs, then the new map appears", async () => {
  let version = 1;
  const { adapter, calls } = loadAdapter(() => ({ p1: { full_name: "One", injury_status: version === 1 ? "Questionable" : "Out" } }));
  adapter.resetSleeperPlayersMemo();
  await withClock(GAME_DAY, async (clock) => {
    const first = await adapter.fetchSleeperPlayers();
    assert.equal(first.p1.injury_status, "Questionable");

    clock.advance(5 * MIN); // inside the 10 min game-window TTL
    await adapter.fetchSleeperPlayers();
    await flush();
    assert.equal(playerCalls(calls), 1);

    version = 2;
    clock.advance(6 * MIN); // 11 min: stale
    const results = await Promise.all([adapter.fetchSleeperPlayers(), adapter.fetchSleeperPlayers(), adapter.fetchSleeperPlayers()]);
    for (const r of results) assert.equal(r, first, "callers get the cached map without waiting");
    await flush();
    assert.equal(playerCalls(calls), 2, "single-flight: one refresh for three callers");

    const fresh = await adapter.fetchSleeperPlayers();
    assert.equal(fresh.p1.injury_status, "Out");
    assert.equal(adapter.getSleeperDataFreshness().players_as_of, new Date(Date.now()).toISOString());
  });
});

test("a quiet in-season day tolerates a 90 minute old map and refreshes after 2 hours", async () => {
  const { adapter, calls } = loadAdapter(() => ({ p1: { full_name: "One" } }));
  adapter.resetSleeperPlayersMemo();
  await withClock(QUIET_DAY, async (clock) => {
    await adapter.fetchSleeperPlayers();
    clock.advance(90 * MIN);
    await adapter.fetchSleeperPlayers();
    await flush();
    assert.equal(playerCalls(calls), 1);
    clock.advance(40 * MIN);
    await adapter.fetchSleeperPlayers();
    await flush();
    assert.equal(playerCalls(calls), 2);
    assert.equal(adapter.getSleeperDataFreshness().tier, "in_season");
  });
});

test("a failed background refresh keeps the old map, never throws into a request, and backs off", async () => {
  let fail = false;
  const { adapter, calls } = loadAdapter(() => {
    if (fail) throw new Error("down");
    return { p1: { full_name: "One" } };
  });
  adapter.resetSleeperPlayersMemo();
  await withClock(GAME_DAY, async (clock) => {
    const first = await adapter.fetchSleeperPlayers();
    fail = true;
    clock.advance(11 * MIN);
    assert.equal(await adapter.fetchSleeperPlayers(), first);
    await flush();
    assert.equal(playerCalls(calls), 2);

    clock.advance(30 * 1000); // inside the 60 s backoff
    assert.equal(await adapter.fetchSleeperPlayers(), first);
    await flush();
    assert.equal(playerCalls(calls), 2);

    clock.advance(40 * 1000); // past 60 s: retry, fails again, backoff doubles to 120 s
    assert.equal(await adapter.fetchSleeperPlayers(), first);
    await flush();
    assert.equal(playerCalls(calls), 3);

    clock.advance(90 * 1000);
    await adapter.fetchSleeperPlayers();
    await flush();
    assert.equal(playerCalls(calls), 3, "still inside the doubled backoff");

    fail = false;
    clock.advance(60 * 1000);
    await adapter.fetchSleeperPlayers();
    await flush();
    assert.equal(playerCalls(calls), 4);
    assert.equal((await adapter.fetchSleeperPlayers()), (await adapter.fetchSleeperPlayers()));
  });
});

test("a designation change is logged as a PII-free structured event with counts", async () => {
  let version = 1;
  const { adapter } = loadAdapter(() => ({
    p1: { full_name: "Secret Name", status: "Active", injury_status: version === 1 ? "Questionable" : "Out" },
    p2: { full_name: "Other", status: "Active", injury_status: null },
  }));
  adapter.resetSleeperPlayersMemo();
  const logged = [];
  const realLog = console.log;
  console.log = (line) => logged.push(String(line));
  try {
    await withClock(GAME_DAY, async (clock) => {
      await adapter.fetchSleeperPlayers();
      version = 2;
      clock.advance(11 * MIN);
      await adapter.fetchSleeperPlayers();
      await flush();
    });
  } finally {
    console.log = realLog;
  }
  const events = logged.map((l) => JSON.parse(l)).filter((e) => e.event === "sleeper_injury_designation_changes");
  assert.equal(events.length, 1);
  assert.equal(events[0].changed, 1);
  assert.equal(events[0].newly_severe, 1);
  assert.equal(events[0].tier, "game_window");
  assert.ok(!logged.join("\n").includes("Secret Name"));
  assert.ok(!logged.join("\n").includes("p1"));
});

test("INJURY_FRESHNESS_TIERS_DISABLED=1 restores the blocking fixed-TTL behaviour", async () => {
  process.env.INJURY_FRESHNESS_TIERS_DISABLED = "1";
  try {
    let version = 1;
    const { adapter, calls } = loadAdapter(() => ({ p1: { full_name: "One", injury_status: version === 1 ? null : "Out" } }));
    adapter.resetSleeperPlayersMemo();
    await withClock(GAME_DAY, async (clock) => {
      await adapter.fetchSleeperPlayers();
      version = 2;
      clock.advance(15 * MIN); // legacy memo is 20 min: still cached
      assert.equal((await adapter.fetchSleeperPlayers()).p1.injury_status, null);
      assert.equal(playerCalls(calls), 1);
      clock.advance(10 * MIN);
      assert.equal((await adapter.fetchSleeperPlayers()).p1.injury_status, "Out", "legacy waits for the refresh");
    });
  } finally {
    delete process.env.INJURY_FRESHNESS_TIERS_DISABLED;
  }
});

test("projections are served stale while refreshing in the background after the tier TTL", async () => {
  let points = 10;
  const { adapter, calls } = loadAdapter((url) => {
    if (url.includes("/projections/")) return [{ player_id: "p1", stats: { pts_ppr: points } }];
    return {};
  });
  adapter.resetSleeperPlayersMemo();
  const projCalls = () => calls.filter((u) => u.includes("/projections/")).length;
  await withClock(GAME_DAY, async (clock) => {
    assert.equal((await adapter.fetchSleeperProjections(2026, 5)).p1, 10);
    points = 14;
    clock.advance(10 * MIN); // inside the 20 min game-window TTL
    assert.equal((await adapter.fetchSleeperProjections(2026, 5)).p1, 10);
    await flush();
    assert.equal(projCalls(), 1);

    clock.advance(11 * MIN); // 21 min: stale
    assert.equal((await adapter.fetchSleeperProjections(2026, 5)).p1, 10, "served stale, not blocked");
    await adapter.fetchSleeperProjectionStatLines(2026, 5);
    await flush();
    assert.equal(projCalls(), 2, "one refresh covers points and stat lines");
    assert.equal((await adapter.fetchSleeperProjections(2026, 5)).p1, 14);
    assert.ok(adapter.getSleeperDataFreshness().projections_as_of);
  });
});

// ---- DST, playoffs ------------------------------------------------------------------------------

test("Sunday 07:00 ET opens the window on both sides of the November fall-back change", () => {
  // 2026-11-01 is the first Sunday of November: clocks fall back at 02:00, so 07:00 ET is 12:00Z (EST).
  assert.equal(freshnessPolicy(new Date("2026-11-01T11:59:00Z"), { offSeason: false }).tier, "in_season");
  assert.equal(freshnessPolicy(new Date("2026-11-01T12:00:00Z"), { offSeason: false }).tier, "game_window");
  // The Sunday before it is still EDT: 07:00 ET is 11:00Z.
  assert.equal(freshnessPolicy(new Date("2026-10-25T10:59:00Z"), { offSeason: false }).tier, "in_season");
  assert.equal(freshnessPolicy(new Date("2026-10-25T11:00:00Z"), { offSeason: false }).tier, "game_window");
  // Monday 04:00 ET closes it: 09:00Z in EST.
  assert.equal(freshnessPolicy(new Date("2026-11-02T08:59:00Z"), { offSeason: false }).tier, "game_window");
  assert.equal(freshnessPolicy(new Date("2026-11-02T09:00:00Z"), { offSeason: false }).tier, "in_season");
});

test("Sunday 07:00 ET is right across the March spring-forward change", () => {
  // 2026-03-08: clocks spring forward at 02:00, so 07:00 ET is 11:00Z (EDT); the Sunday before is EST (12:00Z).
  assert.equal(freshnessPolicy(new Date("2026-03-08T10:59:00Z"), { offSeason: false }).tier, "in_season");
  assert.equal(freshnessPolicy(new Date("2026-03-08T11:00:00Z"), { offSeason: false }).tier, "game_window");
  assert.equal(freshnessPolicy(new Date("2026-03-01T11:59:00Z"), { offSeason: false }).tier, "in_season");
  assert.equal(freshnessPolicy(new Date("2026-03-01T12:00:00Z"), { offSeason: false }).tier, "game_window");
});

test("playoff weeks are in-season even when the regular-season week count says off-season", () => {
  // Saturday 2027-01-16 17:00Z = 12:00 ET, divisional round.
  assert.equal(freshnessPolicy(new Date("2027-01-16T17:00:00Z"), { offSeason: true }).tier, "game_window");
  assert.equal(freshnessPolicy(new Date("2027-01-19T17:00:00Z"), { offSeason: true }).tier, "in_season");
  // Super Bowl Sunday 2027-02-14.
  assert.equal(freshnessPolicy(new Date("2027-02-14T20:00:00Z"), { offSeason: true }).tier, "game_window");
  // Late February is off-season again.
  assert.equal(freshnessPolicy(new Date("2027-02-24T17:00:00Z"), { offSeason: true }).tier, "off_season");
});

// ---- Redis ordering, failure memo, cold backoff, kill switch ---------------------------------------

function loadAdapterWithRedis(handler, store, log, failKey = null) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
  const configPath = require.resolve("../src/config");
  delete require.cache[adapterPath];
  delete require.cache[configPath];
  process.env.REDIS_URL = "https://redis.example";
  process.env.REDIS_TOKEN = "t";
  const calls = [];
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return { get: async (url) => { calls.push(url); await new Promise((r) => setImmediate(r)); return { data: await handler(url) }; } };
    }
    if (request === "@upstash/redis" && parent?.filename === adapterPath) {
      return {
        Redis: class MockRedis {
          async get(key) { return store.get(key) ?? null; }
          async set(key, value) {
            if (failKey && failKey.test(key)) throw new Error("redis write failed");
            // Large blobs are slow to write; a stamp written in parallel would land first.
            if (!key.includes(":at") && !key.includes("-at:")) {
              for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r));
            }
            log.push(key);
            store.set(key, value);
          }
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return { adapter: require("../src/adapters/sleeper"), calls };
  } finally {
    Module._load = originalLoad;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
    delete require.cache[configPath];
  }
}

test("the as-of stamp is written only after the data blob, for players and projections", async () => {
  const store = new Map();
  const log = [];
  const { adapter } = loadAdapterWithRedis((url) => (url.includes("/projections/") ? [{ player_id: "p1", stats: { rec: 5, pts_ppr: 9 } }] : { p1: { full_name: "One" } }), store, log);
  adapter.resetSleeperPlayersMemo();
  await adapter.fetchSleeperPlayers();
  await adapter.fetchSleeperProjections(2026, 5);
  const idx = (k) => log.indexOf(k);
  assert.ok(idx("ssff:sleeper:players") >= 0 && idx("ssff:sleeper:players:at") > idx("ssff:sleeper:players"), log.join(","));
  assert.ok(idx("ssff:sleeper:projections-at:2026:5") > idx("ssff:sleeper:projections:2026:5"), log.join(","));
  assert.ok(idx("ssff:sleeper:projections-at:2026:5") > idx("ssff:sleeper:projection-stat-lines:2026:5"), log.join(","));
});

test("players: a failed data write leaves the stamp untouched, so the old blob is never adopted as fresh", async () => {
  const oldAt = new Date(GAME_DAY).getTime() - 3 * HOUR;
  const store = new Map([
    ["ssff:sleeper:players", JSON.stringify({ p1: { full_name: "One", injury_status: "Questionable" } })],
    ["ssff:sleeper:players:at", oldAt],
  ]);
  const log = [];
  const { adapter } = loadAdapterWithRedis(() => ({ p1: { full_name: "One", injury_status: "Out" } }), store, log, /^ssff:sleeper:players$/);
  adapter.resetSleeperPlayersMemo();
  await withClock(GAME_DAY, async (clock) => {
    await adapter.fetchSleeperPlayers();
    clock.advance(11 * MIN);
    await adapter.fetchSleeperPlayers(); // refresh: data write throws
    await flush();
    assert.ok(!log.includes("ssff:sleeper:players:at"), "stamp must not be written");
    assert.equal(store.get("ssff:sleeper:players:at"), oldAt);
  });
  // A second instance sees the old stamp, which is stale: it must refresh, not adopt the old blob as current.
  adapter.resetSleeperPlayersMemo();
  await withClock(GAME_DAY, async () => {
    const served = await adapter.fetchSleeperPlayers();
    assert.equal(served.p1.injury_status, "Questionable"); // served stale, for now
    assert.equal(adapter.getSleeperDataFreshness().players_as_of, new Date(oldAt).toISOString(), "asOf stays honest");
    assert.equal(adapter.getSleeperDataFreshness().stale, true);
  });
});

test("projections: a failed stat-line write leaves the stamp untouched", async () => {
  const store = new Map();
  const log = [];
  const { adapter } = loadAdapterWithRedis(() => [{ player_id: "p1", stats: { rec: 5, pts_ppr: 9 } }], store, log, /projection-stat-lines/);
  adapter.resetSleeperPlayersMemo();
  await adapter.fetchSleeperProjections(2026, 5);
  assert.ok(!log.includes("ssff:sleeper:projections-at:2026:5"));
  assert.ok(!store.has("ssff:sleeper:projections-at:2026:5"));
});

test("a refresh that returns an empty map is rejected: the old map stays and nobody turns healthy", async () => {
  let body = { p1: { full_name: "One", injury_status: "Out" } };
  const { adapter } = loadAdapter(() => body);
  adapter.resetSleeperPlayersMemo();
  const logged = [];
  const realLog = console.log;
  console.log = (l) => logged.push(String(l));
  try {
    await withClock(GAME_DAY, async (clock) => {
      await adapter.fetchSleeperPlayers();
      body = {};
      clock.advance(11 * MIN);
      await adapter.fetchSleeperPlayers();
      await flush();
      assert.equal((await adapter.fetchSleeperPlayers()).p1.injury_status, "Out");
      assert.equal(adapter.getSleeperDataFreshness().stale, true, "failed refresh marks the data stale");
    });
  } finally {
    console.log = realLog;
  }
  const rejected = logged.map((l) => JSON.parse(l)).find((e) => e.event === "sleeper_players_refresh_rejected");
  assert.deepEqual([rejected.reason, rejected.previous, rejected.received], ["empty", 1, 0]);
});

test("a refresh under the floor or shrinking by more than half is rejected; a normal one is accepted", async () => {
  const big = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, { full_name: `P${i}`, injury_status: null }]));
  let body = big(2000);
  const { adapter } = loadAdapter(() => body);
  adapter.resetSleeperPlayersMemo();
  const realLog = console.log;
  console.log = () => {};
  try {
    await withClock(GAME_DAY, async (clock) => {
      const first = await adapter.fetchSleeperPlayers();
      body = big(500); // under the 1000 floor
      clock.advance(11 * MIN);
      await adapter.fetchSleeperPlayers();
      await flush();
      assert.equal(await adapter.fetchSleeperPlayers(), first);
      body = big(900); // would pass 50% but is under the floor
      clock.advance(11 * MIN + 60 * 1000);
      await adapter.fetchSleeperPlayers();
      await flush();
      assert.equal(await adapter.fetchSleeperPlayers(), first);
      body = big(1900); // ordinary churn
      clock.advance(20 * MIN);
      await adapter.fetchSleeperPlayers();
      await flush();
      assert.equal(Object.keys(await adapter.fetchSleeperPlayers()).length, 1900);
    });
  } finally {
    console.log = realLog;
  }
});

test("data_freshness reports stale when the data is older than twice the tier TTL", async () => {
  const { adapter } = loadAdapter(() => ({ p1: { full_name: "One" } }));
  adapter.resetSleeperPlayersMemo();
  await withClock(GAME_DAY, async (clock) => {
    await adapter.fetchSleeperPlayers();
    assert.equal(adapter.getSleeperDataFreshness().stale, false);
    clock.advance(25 * MIN); // > 2 x 10 min, and the background refresh has not been triggered by a read
    assert.equal(adapter.getSleeperDataFreshness().stale, true);
  });
});

test("kill-switch legacy reads ignore a tiered-written projections entry older than the legacy 1 h TTL", async () => {
  const at = new Date(GAME_DAY).getTime() - 2 * HOUR;
  const store = new Map([
    ["ssff:sleeper:projections:2026:5", JSON.stringify({ p1: 1 })],
    ["ssff:sleeper:projection-stat-lines:2026:5", JSON.stringify({ p1: { rec: 1 } })],
    ["ssff:sleeper:projections-at:2026:5", at],
  ]);
  const { adapter, calls } = loadAdapterWithRedis((url) => (url.includes("/projections/") ? [{ player_id: "p1", stats: { rec: 5, pts_ppr: 9 } }] : {}), store, []);
  process.env.INJURY_FRESHNESS_TIERS_DISABLED = "1";
  try {
    await withClock(GAME_DAY, async () => {
      assert.equal((await adapter.fetchSleeperProjections(2026, 5)).p1, 9);
      assert.equal(calls.filter((u) => u.includes("/projections/")).length, 1);
    });
  } finally {
    delete process.env.INJURY_FRESHNESS_TIERS_DISABLED;
  }
});

test("a stamp-less (pre-deploy) Redis entry is served now and refreshed immediately in the background", async () => {
  const store = new Map([["ssff:sleeper:players", JSON.stringify({ p1: { full_name: "Old", injury_status: "Questionable" } })]]);
  const { adapter, calls } = loadAdapterWithRedis(() => ({ p1: { full_name: "New", injury_status: "Out" } }), store, []);
  adapter.resetSleeperPlayersMemo();
  const served = await adapter.fetchSleeperPlayers();
  assert.equal(served.p1.full_name, "Old", "no waiting on the refresh");
  await flush();
  assert.equal(playerCalls(calls), 1, "refresh started at once");
  assert.equal((await adapter.fetchSleeperPlayers()).p1.injury_status, "Out");
});

test("a cold-start projections failure is remembered for 30 s on every read path (points and stat lines)", async () => {
  const { adapter, calls } = loadAdapter(() => { throw new Error("down"); });
  adapter.resetSleeperPlayersMemo();
  adapter.resetSleeperStatLineFailures();
  const projCalls = () => calls.filter((u) => u.includes("/projections/")).length;
  await withClock(GAME_DAY, async (clock) => {
    await assert.rejects(adapter.fetchSleeperProjectionStatLines(2026, 5));
    await assert.rejects(adapter.fetchSleeperProjections(2026, 5), (e) => e.code === "sleeper_projections_recently_failed");
    await assert.rejects(adapter.fetchSleeperProjectionStatLines(2026, 5), (e) => e.code === "sleeper_projections_recently_failed");
    assert.equal(projCalls(), 1);
    clock.advance(31 * 1000);
    await assert.rejects(adapter.fetchSleeperProjections(2026, 5));
    assert.equal(projCalls(), 2);
    adapter.resetSleeperStatLineFailures();
    await assert.rejects(adapter.fetchSleeperProjections(2026, 5));
    assert.equal(projCalls(), 3, "reset clears the memo");
  });
});

test("a cold process with no cache does not retry a failing players fetch on every request", async () => {
  const { adapter, calls } = loadAdapter(() => { throw new Error("down"); });
  adapter.resetSleeperPlayersMemo();
  await withClock(GAME_DAY, async (clock) => {
    await assert.rejects(adapter.fetchSleeperPlayers());
    await assert.rejects(adapter.fetchSleeperPlayers());
    await assert.rejects(adapter.fetchSleeperPlayers());
    assert.equal(playerCalls(calls), 1);
    clock.advance(31 * 1000);
    await assert.rejects(adapter.fetchSleeperPlayers());
    assert.equal(playerCalls(calls), 2);
  });
});

test("with the kill switch on, attachDataFreshness leaves the body byte-for-byte unchanged", async () => {
  const { attachDataFreshness } = require("../src/routes/omen");
  const { adapter } = loadAdapter(() => ({ p1: { full_name: "One" } }));
  adapter.resetSleeperPlayersMemo();
  await adapter.fetchSleeperPlayers();
  process.env.INJURY_FRESHNESS_TIERS_DISABLED = "1";
  try {
    const body = { platform: { name: "sleeper" }, signals: { roster: {} } };
    const before = JSON.stringify(body);
    attachDataFreshness(body);
    assert.equal(JSON.stringify(body), before);
  } finally {
    delete process.env.INJURY_FRESHNESS_TIERS_DISABLED;
  }
});

test("attachDataFreshness adds an additive signal for Sleeper calls only, once the adapter has a stamp", async () => {
  const { attachDataFreshness } = require("../src/routes/omen");
  // loadAdapter leaves a fresh adapter in the require cache, which the route resolves lazily.
  const { adapter } = loadAdapter(() => ({ p1: { full_name: "One" } }));
  adapter.resetSleeperPlayersMemo();
  const none = { platform: { name: "sleeper" }, signals: {} };
  attachDataFreshness(none);
  assert.equal(none.signals.data_freshness, undefined, "no stamp yet");

  await adapter.fetchSleeperPlayers();
  const sleeperBody = { platform: { name: "sleeper" }, signals: { roster: {} } };
  attachDataFreshness(sleeperBody);
  assert.match(sleeperBody.signals.data_freshness.players_as_of, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(sleeperBody.signals.data_freshness.used, true);

  const yahoo = { platform: { name: "yahoo" }, signals: {} };
  attachDataFreshness(yahoo);
  assert.equal(yahoo.signals.data_freshness, undefined);
});

test("a healthy-only caller may accept the longer healthy projections TTL; the default is strict", async () => {
  const { adapter, calls } = loadAdapter((url) => (url.includes("/projections/") ? [{ player_id: "p1", stats: { pts_ppr: 9 } }] : {}));
  adapter.resetSleeperPlayersMemo();
  const projCalls = () => calls.filter((u) => u.includes("/projections/")).length;
  await withClock(GAME_DAY, async (clock) => {
    await adapter.fetchSleeperProjections(2026, 5);
    clock.advance(30 * MIN); // past 20 min hurt-safe TTL, inside the 40 min healthy TTL
    await adapter.fetchSleeperProjections(2026, 5, { hurtPlayers: false });
    await flush();
    assert.equal(projCalls(), 1);
    await adapter.fetchSleeperProjections(2026, 5);
    await flush();
    assert.equal(projCalls(), 2);
  });
});
