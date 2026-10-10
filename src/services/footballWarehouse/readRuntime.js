"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createWarehouseUsageRepository } = require("./usageRepository");
const { createWarehouseOutcomeRepository } = require("./outcomeRepository");
const { createWarehousePlayerIdentityRepository } = require("./playerIdentityRepository");

const MODES = Object.freeze(["supabase", "shadow", "warehouse"]);
const READ_ROLE = "omen_warehouse_read";
const LIMITS = Object.freeze({
  connectionTimeoutMillis: [250, 5_000, 1_000],
  idleTimeoutMillis: [1_000, 30_000, 10_000],
  queryTimeoutMillis: [100, 5_000, 2_000],
  poolMax: [1, 4, 2],
});

function boundedInteger(env, key, [minimum, maximum, fallback]) {
  if (env[key] == null || env[key] === "") return fallback;
  if (!/^\d+$/.test(env[key])) throw new TypeError(`${key} must be an integer`);
  const value = Number(env[key]);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${key} must be from ${minimum} through ${maximum}`);
  }
  return value;
}

function footballDataMode(env = process.env) {
  const mode = env.FOOTBALL_DATA_MODE || "supabase";
  if (!MODES.includes(mode)) {
    throw new TypeError(`FOOTBALL_DATA_MODE must be one of ${MODES.join(", ")}`);
  }
  return mode;
}

/**
 * An invalid FOOTBALL_DATA_MODE used to surface only when the start/sit detail router was lazily required,
 * which server.js swallows, so the route silently 404ed. The entry point calls this first and exits.
 */
function assertFootballDataModeAtStartup({ env = process.env, logger, exit = process.exit } = {}) {
  try {
    return footballDataMode(env);
  } catch (error) {
    try { logger?.error?.("Invalid FOOTBALL_DATA_MODE; refusing to start", { err: error.message }); } catch {}
    exit(1);
    return null;
  }
}

function readConnectionString(env, { readFileSync = fs.readFileSync, statSync = fs.statSync } = {}) {
  const key = "FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE";
  const file = env[key];
  if (!file) throw new TypeError(`${key} is required when FOOTBALL_DATA_MODE uses the warehouse`);
  if (!path.isAbsolute(file)) throw new TypeError(`${key} must be an absolute path`);

  const stat = statSync(file);
  if (!stat.isFile()) throw new TypeError(`${key} must name a regular file`);
  if (stat.size < 1 || stat.size > 4096) throw new RangeError(`${key} must contain from 1 through 4096 bytes`);
  if ((stat.mode & 0o007) !== 0) throw new TypeError(`${key} must not be accessible by other users`);

  const value = String(readFileSync(file, "utf8")).trim();
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError(`${key} must contain a valid PostgreSQL URL`); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)
      || !parsed.username || !parsed.password) {
    throw new TypeError(`${key} must contain a complete PostgreSQL URL`);
  }
  for (const name of ["sslmode", "sslcert", "sslkey", "sslrootcert", "options", "application_name"]) {
    if (parsed.searchParams.has(name)) throw new TypeError(`${key} must not override warehouse read safeguards`);
  }
  return { value, parsed };
}

function parseWarehouseReadConfig({ env = process.env, fileSystem } = {}) {
  const mode = footballDataMode(env);
  if (mode === "supabase") return Object.freeze({ mode, enabled: false });

  const sslMode = env.FOOTBALL_WAREHOUSE_READ_SSL_MODE || "disable";
  if (!new Set(["disable", "require"]).has(sslMode)) {
    throw new TypeError("FOOTBALL_WAREHOUSE_READ_SSL_MODE must be disable or require");
  }
  const expectedDatabase = env.FOOTBALL_WAREHOUSE_READ_EXPECTED_DATABASE || "omen_football";
  const expectedRole = READ_ROLE;
  const { value: connectionString, parsed } = readConnectionString(env, fileSystem);
  if (decodeURIComponent(parsed.username) !== expectedRole) {
    throw new TypeError("warehouse read credential must use FOOTBALL_WAREHOUSE_READ_EXPECTED_ROLE");
  }
  if (decodeURIComponent(parsed.pathname.slice(1)) !== expectedDatabase) {
    throw new TypeError("warehouse read credential must use FOOTBALL_WAREHOUSE_READ_EXPECTED_DATABASE");
  }

  return Object.freeze({
    mode,
    enabled: true,
    connectionString,
    ssl: sslMode === "require" ? Object.freeze({ rejectUnauthorized: true }) : false,
    connectionTimeoutMillis: boundedInteger(env, "FOOTBALL_WAREHOUSE_READ_CONNECTION_TIMEOUT_MS", LIMITS.connectionTimeoutMillis),
    idleTimeoutMillis: boundedInteger(env, "FOOTBALL_WAREHOUSE_READ_IDLE_TIMEOUT_MS", LIMITS.idleTimeoutMillis),
    queryTimeoutMillis: boundedInteger(env, "FOOTBALL_WAREHOUSE_READ_QUERY_TIMEOUT_MS", LIMITS.queryTimeoutMillis),
    poolMax: boundedInteger(env, "FOOTBALL_WAREHOUSE_READ_POOL_MAX", LIMITS.poolMax),
    expectedDatabase,
    expectedRole,
  });
}

/**
 * pg re-emits an idle client's error (warehouse restart, OOM, terminated backend) on the pool. With no
 * listener Node treats it as uncaught and the API process exits, so the listener is always attached. pg
 * has already discarded the broken client; the next query reconnects. The error's message is never
 * forwarded: it can carry connection details.
 */
function createWarehouseReadPool({ Pool, config, onPoolError = () => {} }) {
  if (typeof Pool !== "function") throw new TypeError("Pool must be a constructor");
  if (!config?.enabled || !config.connectionString) throw new TypeError("enabled warehouse read config is required");
  const pool = new Pool({
    connectionString: config.connectionString,
    ssl: config.ssl,
    max: config.poolMax,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
    query_timeout: config.queryTimeoutMillis,
    statement_timeout: config.queryTimeoutMillis,
    application_name: "omen-football-warehouse-read",
    options: "-c default_transaction_read_only=on",
    allowExitOnIdle: true,
  });
  if (typeof pool.on === "function") {
    pool.on("error", () => {
      try {
        onPoolError(Object.freeze({ event: "football_warehouse_read_pool", outcome: "idle_client_error" }));
      } catch {}
    });
  }
  return pool;
}

function createVerifiedReadQuery({ pool, config }) {
  if (!pool || typeof pool.query !== "function") throw new TypeError("warehouse read pool is required");
  let verification;
  async function verifyTarget() {
    const result = await pool.query({
      name: "warehouse-read-target-identity-v1",
      text: `
        SELECT current_database() AS database_name,
               current_user AS role_name,
               current_setting('transaction_read_only') AS transaction_read_only
      `,
      values: [],
      query_timeout: config.queryTimeoutMillis,
    });
    const row = result?.rows?.[0];
    if (row?.database_name !== config.expectedDatabase
        || row?.role_name !== config.expectedRole
        || row?.transaction_read_only !== "on") {
      const error = new Error("warehouse read target identity did not match the approved read-only target");
      error.code = "WAREHOUSE_READ_TARGET_MISMATCH";
      throw error;
    }
  }
  return async (request) => {
    verification ||= verifyTarget();
    await verification;
    return pool.query(request);
  };
}

function createWarehouseReadRuntime({ env = process.env, Pool, fileSystem, onPoolError } = {}) {
  const config = parseWarehouseReadConfig({ env, fileSystem });
  if (!config.enabled) {
    return Object.freeze({ mode: config.mode, enabled: false, repository: null, outcomeRepository: null, identityRepository: null, close: async () => {} });
  }
  const pool = createWarehouseReadPool({ Pool, config, onPoolError });
  const query = createVerifiedReadQuery({ pool, config });
  const repository = createWarehouseUsageRepository({
    timeoutMs: config.queryTimeoutMillis,
    query,
  });
  const outcomeRepository = createWarehouseOutcomeRepository({
    timeoutMs: config.queryTimeoutMillis,
    query,
  });
  const identityRepository = createWarehousePlayerIdentityRepository({
    timeoutMs: config.queryTimeoutMillis,
    query,
  });
  return Object.freeze({
    mode: config.mode,
    enabled: true,
    repository,
    outcomeRepository,
    identityRepository,
    close: async () => pool.end(),
  });
}

/**
 * Shadow mode must never make the Supabase-authoritative route unavailable just
 * because the optional warehouse reader could not be initialized. Warehouse
 * mode remains fail-closed: a bad credential, target, or pool configuration is
 * a startup error rather than an implicit fallback.
 */
function createFailSafeWarehouseReadRuntime({
  env = process.env,
  Pool,
  fileSystem,
  onShadowUnavailable = () => {},
} = {}) {
  if (typeof onShadowUnavailable !== "function") {
    throw new TypeError("onShadowUnavailable must be a function");
  }
  const mode = footballDataMode(env);
  try {
    return createWarehouseReadRuntime({ env, Pool, fileSystem, onPoolError: onShadowUnavailable });
  } catch (error) {
    if (mode !== "shadow") throw error;
    try {
      onShadowUnavailable(Object.freeze({
        event: "football_warehouse_read_startup",
        outcome: "unavailable",
      }));
    } catch {}
    return Object.freeze({ mode, enabled: false, repository: null, outcomeRepository: null, identityRepository: null, close: async () => {} });
  }
}

module.exports = {
  LIMITS,
  MODES,
  footballDataMode,
  assertFootballDataModeAtStartup,
  readConnectionString,
  parseWarehouseReadConfig,
  createWarehouseReadPool,
  createVerifiedReadQuery,
  createWarehouseReadRuntime,
  createFailSafeWarehouseReadRuntime,
};
