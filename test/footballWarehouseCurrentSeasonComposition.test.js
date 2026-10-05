"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createWarehousePool,
  createCurrentSeasonValidationComposition,
} = require("../src/services/footballWarehouse/currentSeasonComposition");

test("creates a dedicated bounded pool with exit-on-idle enabled", () => {
  let options;
  class Pool { constructor(value) { options = value; } }
  const pool = createWarehousePool({ Pool, config: {
    connectionString: "postgresql://u:p@warehouse.internal/football",
    ssl: false,
    poolMax: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    queryTimeoutMillis: 65000,
  } });
  assert.ok(pool instanceof Pool);
  assert.deepEqual(options, {
    connectionString: "postgresql://u:p@warehouse.internal/football",
    ssl: false,
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    query_timeout: 65000,
    application_name: "omen-football-warehouse-ingest",
    allowExitOnIdle: true,
  });
});

test("refuses to construct a pool without explicit warehouse configuration", () => {
  class Pool {}
  assert.throws(() => createWarehousePool({ Pool, config: {} }), /connection string is required/);
});

test("builds the source-validation path without a database pool", () => {
  assert.doesNotThrow(() => createCurrentSeasonValidationComposition({
    fetchImpl: async () => { throw new Error("not called during composition"); },
  }));
});
