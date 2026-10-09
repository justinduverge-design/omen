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

async function verifyWarehouseTarget({ pool, expectedDatabase, expectedRole, expectedVersion = COMPOSED_SCHEMA_VERSION }) {
  if (!pool || typeof pool.query !== "function") throw new TypeError("pool.query must be a function");
  if (!IDENTIFIER.test(expectedDatabase || "")) throw new TypeError("expectedDatabase is invalid");
  if (!IDENTIFIER.test(expectedRole || "")) throw new TypeError("expectedRole is invalid");
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new TypeError("expectedVersion is invalid");
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
  if (receipt?.migration_count !== expectedVersion
      || receipt?.first_version !== 1
      || receipt?.schema_version !== expectedVersion) {
    throw new WarehouseTargetIdentityError("warehouse_target_mismatch", "warehouse target identity did not match");
  }
  return Object.freeze({ state: "verified", schemaVersion: expectedVersion });
}

module.exports = { verifyWarehouseTarget, WarehouseTargetIdentityError, COMPOSED_SCHEMA_VERSION };
