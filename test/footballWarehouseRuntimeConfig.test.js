"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  connectionStringFromFile,
  parseWarehouseRuntimeConfig,
} = require("../src/services/footballWarehouse/runtimeConfig");

const secret = "postgresql://warehouse:do-not-print@warehouse.internal:5432/football";
const safeFileSystem = {
  statSync: () => ({ isFile: () => true, size: secret.length, mode: 0o100400 }),
  readFileSync: () => secret,
};

test("reads a complete PostgreSQL URL from a restricted absolute secret file", () => {
  const config = parseWarehouseRuntimeConfig({
    env: { FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: "/run/secrets/warehouse", FOOTBALL_WAREHOUSE_SSL_MODE: "require" },
    fileSystem: safeFileSystem,
  });
  assert.equal(config.connectionString, secret);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.connectionTimeoutMillis, 5000);
  assert.equal(config.poolMax, 2);
  assert.equal(config.queryTimeoutMillis, 65000);
  assert.equal(config.shutdownTimeoutMillis, 10000);
  assert.equal(config.expectedDatabase, "omen_football");
  assert.equal(config.expectedRole, "omen_warehouse_ingest");
  assert.equal(Object.isFrozen(config), true);
});

test("configuration failures name constraints but never disclose the secret", () => {
  const failures = [
    () => connectionStringFromFile({}, safeFileSystem),
    () => connectionStringFromFile({ FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: "relative" }, safeFileSystem),
    () => connectionStringFromFile({ FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: "/secret" }, {
      ...safeFileSystem, statSync: () => ({ isFile: () => true, size: secret.length, mode: 0o100404 }),
    }),
    () => connectionStringFromFile({ FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: "/secret" }, {
      ...safeFileSystem, readFileSync: () => "mysql://warehouse:do-not-print@warehouse.internal/football",
    }),
  ];
  for (const run of failures) {
    assert.throws(run, (error) => !String(error).includes("do-not-print"));
  }
  assert.throws(() => connectionStringFromFile({ FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: "/secret" }, {
    ...safeFileSystem,
    readFileSync: () => `${secret}?sslmode=disable`,
  }), /must not override/);
});

test("bounds every pool and acquisition setting", () => {
  const env = {
    FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: "/secret",
    FOOTBALL_WAREHOUSE_CONNECTION_TIMEOUT_MS: "999",
  };
  assert.throws(() => parseWarehouseRuntimeConfig({ env, fileSystem: safeFileSystem }), /1000 through 30000/);
  assert.throws(() => parseWarehouseRuntimeConfig({
    env: { ...env, FOOTBALL_WAREHOUSE_CONNECTION_TIMEOUT_MS: "1000", FOOTBALL_WAREHOUSE_POOL_MAX: "5" },
    fileSystem: safeFileSystem,
  }), /1 through 4/);
});

test("validate-only configuration does not require or read a database secret", () => {
  const config = parseWarehouseRuntimeConfig({ env: {}, requireDatabase: false });
  assert.equal(config.connectionString, null);
});
