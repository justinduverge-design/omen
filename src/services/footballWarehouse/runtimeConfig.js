"use strict";

const fs = require("node:fs");
const path = require("node:path");

const LIMITS = Object.freeze({
  connectionTimeoutMillis: [1_000, 30_000, 5_000],
  idleTimeoutMillis: [1_000, 60_000, 10_000],
  poolMax: [1, 4, 2],
  acquisitionTimeoutMs: [1, 600_000, 120_000],
});

function integer(env, key, limits) {
  if (env[key] == null || env[key] === "") return limits[2];
  if (!/^\d+$/.test(env[key])) throw new TypeError(`${key} must be an integer`);
  const value = Number(env[key]);
  if (!Number.isSafeInteger(value) || value < limits[0] || value > limits[1]) {
    throw new RangeError(`${key} must be from ${limits[0]} through ${limits[1]}`);
  }
  return value;
}

function connectionStringFromFile(env, { readFileSync = fs.readFileSync, statSync = fs.statSync } = {}) {
  const key = "FOOTBALL_WAREHOUSE_DATABASE_URL_FILE";
  const file = env[key];
  if (!file) throw new TypeError(`${key} is required for ingest mode`);
  if (!path.isAbsolute(file)) throw new TypeError(`${key} must be an absolute path`);
  const stat = statSync(file);
  if (!stat.isFile()) throw new TypeError(`${key} must name a regular file`);
  if (stat.size < 1 || stat.size > 4096) throw new RangeError(`${key} must contain from 1 through 4096 bytes`);
  if ((stat.mode & 0o007) !== 0) throw new TypeError(`${key} must not be accessible by other users`);
  const value = String(readFileSync(file, "utf8")).trim();
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError(`${key} must contain a valid PostgreSQL URL`); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)
      || !parsed.username || !parsed.password) {
    throw new TypeError(`${key} must contain a complete PostgreSQL URL`);
  }
  for (const name of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    if (parsed.searchParams.has(name)) {
      throw new TypeError(`${key} must not override FOOTBALL_WAREHOUSE_SSL_MODE`);
    }
  }
  return value;
}

function parseWarehouseRuntimeConfig({ env = process.env, requireDatabase = true, fileSystem } = {}) {
  const sslMode = env.FOOTBALL_WAREHOUSE_SSL_MODE || "disable";
  if (!new Set(["disable", "require"]).has(sslMode)) {
    throw new TypeError("FOOTBALL_WAREHOUSE_SSL_MODE must be disable or require");
  }
  return Object.freeze({
    connectionString: requireDatabase ? connectionStringFromFile(env, fileSystem) : null,
    ssl: sslMode === "require" ? Object.freeze({ rejectUnauthorized: true }) : false,
    connectionTimeoutMillis: integer(env, "FOOTBALL_WAREHOUSE_CONNECTION_TIMEOUT_MS", LIMITS.connectionTimeoutMillis),
    idleTimeoutMillis: integer(env, "FOOTBALL_WAREHOUSE_IDLE_TIMEOUT_MS", LIMITS.idleTimeoutMillis),
    poolMax: integer(env, "FOOTBALL_WAREHOUSE_POOL_MAX", LIMITS.poolMax),
    acquisitionTimeoutMs: integer(env, "FOOTBALL_WAREHOUSE_ACQUISITION_TIMEOUT_MS", LIMITS.acquisitionTimeoutMs),
  });
}

module.exports = { LIMITS, connectionStringFromFile, parseWarehouseRuntimeConfig };
