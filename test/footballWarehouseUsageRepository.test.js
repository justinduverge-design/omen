"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWarehouseUsageRepository } = require("../src/services/footballWarehouse/usageRepository");

test("warehouse usage query is bounded to public GSIS ids, season, week and REG rows", async () => {
  let observed;
  const repository = createWarehouseUsageRepository({
    timeoutMs: 750,
    query: async (request) => {
      observed = request;
      return { rows: [
        { gsis_id: "00-0031234", week: 1, season_type: "REG", team: "DET", targets: "8", receptions: "6", carries: "1", attempts: "0", target_share: "0.25", snaps: "52", snap_share: "0.81" },
      ] };
    },
  });

  const rows = await repository.readPlayerWeeks({ gsisIds: ["00-0031234", "00-0031234"], season: 2026, beforeWeek: 4 });
  assert.deepEqual(observed.values, [["00-0031234"], 2026, 4]);
  assert.equal(observed.query_timeout, 750);
  assert.match(observed.text, /season_type = 'REG'/);
  assert.deepEqual(rows.get("00-0031234"), [{
    week: 1, season_type: "REG", team: "DET", targets: 8, receptions: 6, carries: 1,
    attempts: 0, target_share: 0.25, snaps: 52, snap_share: 0.81,
  }]);
});

test("warehouse usage repository never accepts provider keys or user identifiers", async () => {
  const repository = createWarehouseUsageRepository({ query: async () => ({ rows: [] }) });
  await assert.rejects(
    repository.readPlayerWeeks({ gsisIds: ["espn:2973405"], season: 2026, beforeWeek: 4 }),
    /public NFL GSIS identifiers/,
  );
  await assert.rejects(
    repository.readPlayerWeeks({ gsisIds: ["user_01:roster"], season: 2026, beforeWeek: 4 }),
    /public NFL GSIS identifiers/,
  );
});

test("warehouse usage repository validates bounds and skips the database for an empty identity set", async () => {
  let calls = 0;
  const repository = createWarehouseUsageRepository({ query: async () => { calls += 1; return { rows: [] }; } });
  assert.deepEqual(await repository.readPlayerWeeks({ gsisIds: [], season: 2026, beforeWeek: 4 }), new Map());
  assert.equal(calls, 0);
  await assert.rejects(repository.readPlayerWeeks({ gsisIds: ["00-1"], season: 1998, beforeWeek: 4 }), /season/);
  await assert.rejects(repository.readPlayerWeeks({ gsisIds: ["00-1"], season: 2026, beforeWeek: 24 }), /beforeWeek/);
});

test("warehouse query errors and timeouts remain failures for the caller to degrade honestly", async () => {
  const error = Object.assign(new Error("query read timeout"), { code: "57014" });
  const repository = createWarehouseUsageRepository({ query: async () => { throw error; } });
  await assert.rejects(
    repository.readPlayerWeeks({ gsisIds: ["00-0031234"], season: 2026, beforeWeek: 4 }),
    (caught) => caught === error,
  );
});
