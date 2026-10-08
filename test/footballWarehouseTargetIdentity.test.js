"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyWarehouseTarget, WarehouseTargetIdentityError } = require("../src/services/footballWarehouse/targetIdentity");

test("accepts only the expected database, role, marker, and schema version", async () => {
  let query;
  let calls = 0;
  const pool = { query: async (value) => { query = value; calls += 1; return calls === 1
    ? { rows: [{ database_name: "omen_football", role_name: "omen_warehouse_ingest", marker_exists: true }] }
    : { rows: [{ migration_count: 2, first_version: 1, schema_version: 2 }] }; } };
  assert.deepEqual(await verifyWarehouseTarget({ pool, expectedDatabase: "omen_football", expectedRole: "omen_warehouse_ingest" }), { state: "verified", schemaVersion: 2 });
  assert.equal(query.query_timeout, 5000);
  assert.equal(query.values, undefined);
});

test("fails closed with a status-only error for every target mismatch", async () => {
  for (const changed of [
    { database_name: "wrong" }, { role_name: "wrong" }, { marker_exists: false },
    { migration_count: 1 }, { first_version: 2 }, { schema_version: 1 }, { schema_version: 3, migration_count: 3 },
  ]) {
    const row = { database_name: "omen_football", role_name: "omen_warehouse_ingest", marker_exists: true, ...changed };
    let calls = 0;
    const receipt = { migration_count: 2, first_version: 1, schema_version: 2, ...changed };
    await assert.rejects(verifyWarehouseTarget({ pool: { query: async () => (++calls === 1 ? { rows: [row] } : { rows: [receipt] }) }, expectedDatabase: "omen_football", expectedRole: "omen_warehouse_ingest" }),
      (error) => error instanceof WarehouseTargetIdentityError && error.code === "warehouse_target_mismatch" && !String(error).includes("wrong"));
  }
});
