"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  footballDataMode,
  parseWarehouseReadConfig,
  createWarehouseReadRuntime,
  createFailSafeWarehouseReadRuntime,
} = require("../src/services/footballWarehouse/readRuntime");

const secret = "postgresql://omen_warehouse_read:do-not-print@warehouse:5432/omen_football";
const safeFileSystem = {
  statSync: () => ({ isFile: () => true, size: secret.length, mode: 0o100400 }),
  readFileSync: () => secret,
};

test("football data mode defaults to Supabase and rejects unknown states", () => {
  assert.equal(footballDataMode({}), "supabase");
  assert.equal(footballDataMode({ FOOTBALL_DATA_MODE: "shadow" }), "shadow");
  assert.equal(footballDataMode({ FOOTBALL_DATA_MODE: "warehouse" }), "warehouse");
  assert.throws(() => footballDataMode({ FOOTBALL_DATA_MODE: "dual-write" }), /supabase, shadow, warehouse/);
});

test("Supabase mode never reads warehouse credentials or creates a pool", async () => {
  let fileReads = 0;
  let pools = 0;
  class Pool { constructor() { pools += 1; } }
  const runtime = createWarehouseReadRuntime({
    env: {},
    Pool,
    fileSystem: { readFileSync: () => { fileReads += 1; throw new Error("must not read"); } },
  });
  assert.deepEqual({ mode: runtime.mode, enabled: runtime.enabled, repository: runtime.repository }, {
    mode: "supabase", enabled: false, repository: null,
  });
  await runtime.close();
  assert.equal(fileReads, 0);
  assert.equal(pools, 0);
});

test("shadow startup failure leaves Supabase authoritative and emits aggregate-only availability", async () => {
  const events = [];
  const runtime = createFailSafeWarehouseReadRuntime({
    env: { FOOTBALL_DATA_MODE: "shadow" },
    Pool: class Pool {},
    onShadowUnavailable: (event) => events.push(event),
  });
  assert.deepEqual({ mode: runtime.mode, enabled: runtime.enabled, repository: runtime.repository }, {
    mode: "shadow", enabled: false, repository: null,
  });
  assert.deepEqual(events, [{
    event: "football_warehouse_read_startup",
    outcome: "unavailable",
  }]);
  assert.doesNotMatch(JSON.stringify(events), /credential|password|secret|database_url/i);
  await runtime.close();
});

test("warehouse startup failure remains fail-closed", () => {
  assert.throws(() => createFailSafeWarehouseReadRuntime({
    env: { FOOTBALL_DATA_MODE: "warehouse" },
    Pool: class Pool {},
  }), /READ_DATABASE_URL_FILE/);
});

test("warehouse modes require a restricted dedicated read-role credential file", () => {
  const base = { FOOTBALL_DATA_MODE: "shadow", FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE: "/run/secrets/read" };
  const config = parseWarehouseReadConfig({ env: base, fileSystem: safeFileSystem });
  assert.equal(config.expectedRole, "omen_warehouse_read");
  assert.equal(config.expectedDatabase, "omen_football");
  assert.equal(config.queryTimeoutMillis, 2000);
  assert.equal(config.poolMax, 2);

  assert.throws(() => parseWarehouseReadConfig({ env: { FOOTBALL_DATA_MODE: "warehouse" } }), /READ_DATABASE_URL_FILE/);
  assert.throws(() => parseWarehouseReadConfig({ env: base, fileSystem: {
    ...safeFileSystem, statSync: () => ({ isFile: () => true, size: secret.length, mode: 0o100404 }),
  }}), /must not be accessible/);
  assert.throws(() => parseWarehouseReadConfig({ env: base, fileSystem: {
    ...safeFileSystem, readFileSync: () => secret.replace("omen_warehouse_read", "omen_warehouse_ingest"),
  }}), /EXPECTED_ROLE/);
});

test("configuration errors never disclose warehouse read credentials", () => {
  const env = { FOOTBALL_DATA_MODE: "warehouse", FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE: "/secret" };
  assert.throws(() => parseWarehouseReadConfig({ env, fileSystem: {
    ...safeFileSystem, readFileSync: () => `${secret}?options=do-not-print`,
  }}), (error) => !String(error).includes("do-not-print"));
  assert.throws(() => parseWarehouseReadConfig({ env: {
    ...env, FOOTBALL_WAREHOUSE_READ_QUERY_TIMEOUT_MS: "5001",
  }, fileSystem: safeFileSystem }), /100 through 5000/);
});

test("runtime creates a bounded read-only pool and wires the usage repository", async () => {
  let options;
  let ended = false;
  const calls = [];
  class Pool {
    constructor(value) { options = value; }
    async query(request) {
      calls.push(request);
      if (request.name === "warehouse-read-target-identity-v1") {
        return { rows: [{ database_name: "omen_football", role_name: "omen_warehouse_read", transaction_read_only: "on" }] };
      }
      return { rows: [] };
    }
    async end() { ended = true; }
  }
  const runtime = createWarehouseReadRuntime({
    env: {
      FOOTBALL_DATA_MODE: "shadow",
      FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE: "/run/secrets/read",
      FOOTBALL_WAREHOUSE_READ_POOL_MAX: "1",
      FOOTBALL_WAREHOUSE_READ_QUERY_TIMEOUT_MS: "750",
    },
    Pool,
    fileSystem: safeFileSystem,
  });
  assert.equal(runtime.mode, "shadow");
  assert.equal(runtime.enabled, true);
  assert.equal(options.max, 1);
  assert.equal(options.query_timeout, 750);
  assert.equal(options.statement_timeout, 750);
  assert.equal(options.options, "-c default_transaction_read_only=on");
  assert.equal(options.application_name, "omen-football-warehouse-read");

  await runtime.repository.readPlayerWeeks({ gsisIds: ["00-0031234"], season: 2026, beforeWeek: 4 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].name, "warehouse-read-target-identity-v1");
  assert.equal(calls[1].query_timeout, 750);
  await runtime.close();
  assert.equal(ended, true);
});

test("runtime fails closed before fact reads when server identity or read-only mode differs", async () => {
  const factQueries = [];
  class Pool {
    async query(request) {
      if (request.name === "warehouse-read-target-identity-v1") {
        return { rows: [{ database_name: "omen_football", role_name: "omen_warehouse_read", transaction_read_only: "off" }] };
      }
      factQueries.push(request);
      return { rows: [] };
    }
    async end() {}
  }
  const runtime = createWarehouseReadRuntime({
    env: { FOOTBALL_DATA_MODE: "warehouse", FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE: "/run/secrets/read" },
    Pool,
    fileSystem: safeFileSystem,
  });
  await assert.rejects(
    runtime.repository.readPlayerWeeks({ gsisIds: ["00-0031234"], season: 2026, beforeWeek: 4 }),
    (error) => error.code === "WAREHOUSE_READ_TARGET_MISMATCH",
  );
  assert.equal(factQueries.length, 0);
});
