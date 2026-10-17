"use strict";

class WarehouseTargetIdentityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WarehouseTargetIdentityError";
    this.code = code;
  }
}

const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;
const COMPOSED_SCHEMA_VERSION = 2;
// Ledger versions an ingest worker accepts: 2 is the original composed schema (0001 + 0003); 3 adds the weekly
// projections tables (0005); 4 adds the warehouse map (0007); 5 the player index receipts (0009); 6 the team index (0011); 7 the coach graph (0013); 8 game weather forecasts (0015); 9 observed game weather (0017). A worker that tolerates a version can be deployed
// BEFORE that schema is applied.
const ACCEPTED_SCHEMA_VERSIONS = Object.freeze([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

async function verifyWarehouseTarget({ pool, expectedDatabase, expectedRole, expectedVersion, acceptedVersions = ACCEPTED_SCHEMA_VERSIONS }) {
  if (!pool || typeof pool.query !== "function") throw new TypeError("pool.query must be a function");
  if (!IDENTIFIER.test(expectedDatabase || "")) throw new TypeError("expectedDatabase is invalid");
  if (!IDENTIFIER.test(expectedRole || "")) throw new TypeError("expectedRole is invalid");
  // expectedVersion pins one exact version (tests, strict callers); otherwise any of acceptedVersions passes.
  const accepted = expectedVersion === undefined ? acceptedVersions : [expectedVersion];
  if (!Array.isArray(accepted) || !accepted.length || accepted.some((v) => !Number.isInteger(v) || v < 1)) throw new TypeError("expectedVersion is invalid");
  const identity = await pool.query({
    name: "warehouse-target-identity-v1",
    text: `SELECT current_database() AS database_name,
                  current_user AS role_name,
                  to_regclass('football.warehouse_schema_migrations') IS NOT NULL AS marker_exists`,
    query_timeout: 5_000,
  });
  const row = identity?.rows?.[0];
  if (!row || row.database_name !== expectedDatabase || row.role_name !== expectedRole || row.marker_exists !== true) {
    throw new WarehouseTargetIdentityError("warehouse_target_mismatch", "warehouse target identity did not match");
  }
  const version = await pool.query({
    name: "warehouse-target-version-v1",
    text: `SELECT count(*)::integer AS migration_count,
                  COALESCE(min(version), 0)::integer AS first_version,
                  COALESCE(max(version), 0)::integer AS schema_version
           FROM football.warehouse_schema_migrations`,
    query_timeout: 5_000,
  });
  const receipt = version?.rows?.[0];
  // The ledger is contiguous (count == highest version) and starts at 1.
  if (!accepted.includes(receipt?.schema_version)
      || receipt?.migration_count !== receipt?.schema_version
      || receipt?.first_version !== 1) {
    throw new WarehouseTargetIdentityError("warehouse_target_mismatch", "warehouse target identity did not match");
  }
  return Object.freeze({ state: "verified", schemaVersion: receipt.schema_version });
}

module.exports = { verifyWarehouseTarget, WarehouseTargetIdentityError, COMPOSED_SCHEMA_VERSION, ACCEPTED_SCHEMA_VERSIONS };
