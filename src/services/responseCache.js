"use strict";

/**
 * Short, best-effort, per-user response cache for the slow read routes.
 *
 * What it is: a 60 s (default) cache of the finished JSON body + status, so a
 * second open of the same screen does not re-pull ESPN/Yahoo/Sleeper. It
 * changes no body, no schema, no SQL. Redis only (the same Upstash client and
 * REDIS_URL/REDIS_TOKEN as `tradeFindCacheStore`). With no Redis, or with
 * `OMEN_RESPONSE_CACHE=off`, every function here is a no-op and the routes run
 * exactly as they did before.
 *
 * Isolation: every entry key contains the user id, and the user's current
 * epoch. The route adds the request inputs (platform, league, week, context id,
 * contract, query/body) as `parts`, which are canonicalised and hashed.
 *
 *   omen:rc:v1:{userId}:{epoch}:{route}:{sha256(parts)}
 *
 * Invalidation: `invalidateUser` bumps `omen:rc:epoch:{userId}`. Every entry of
 * that user lives under the old epoch and is simply never read again (it ages
 * out by TTL). No key scan. The epoch is read once, up front, and the same
 * value is used when the answer is written, so a request that was already in
 * flight when the epoch moved writes to a dead epoch and cannot repopulate.
 *
 * Failure policy: any store error or a store that does not answer inside
 * STORE_TIMEOUT_MS is a miss. The cache can slow a request by at most that
 * timeout, and can never fail one.
 */

const crypto = require("node:crypto");

const KEY_PREFIX = "omen:rc:v1:";
const EPOCH_PREFIX = "omen:rc:epoch:";
const STORE_TIMEOUT_MS = 400;
// The epoch key must outlive every entry written under it, or a reset epoch
// could re-expose an old entry. Entry TTLs are clamped well below this.
const EPOCH_TTL_SECONDS = 24 * 60 * 60;
const MAX_TTL_SECONDS = 600;
// A response built while a provider read partly failed is kept only this long.
const DEGRADED_TTL_SECONDS = 5;

let store;
let storeResolved = false;

function envTtl(name, fallbackSeconds) {
  const parsed = Number(process.env[name]);
  const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackSeconds;
  return Math.min(Math.floor(value), MAX_TTL_SECONDS);
}

/** One constant per route, each overridable by its own env var. 0 turns that route off. */
const ROUTE_TTL_SECONDS = Object.freeze({
  mvp_move: () => envTtl("OMEN_CACHE_TTL_MVP_MOVE", 60),
  waiver_analysis: () => envTtl("OMEN_CACHE_TTL_WAIVER_ANALYSIS", 60),
  leagues_directory: () => envTtl("OMEN_CACHE_TTL_LEAGUES_DIRECTORY", 60),
  quiet_week: () => envTtl("OMEN_CACHE_TTL_QUIET_WEEK", 60),
  league_overview: () => envTtl("OMEN_CACHE_TTL_LEAGUE_OVERVIEW", 60),
});

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("response_cache_timeout")), STORE_TIMEOUT_MS);
    if (typeof timer.unref === "function") timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function createMemoryResponseCacheStore({ now = () => Date.now() } = {}) {
  const records = new Map();
  const epochs = new Map();
  return {
    kind: "memory",
    async get(key) {
      const record = records.get(key);
      if (!record) return null;
      if (record.expiresAtMs <= now()) {
        records.delete(key);
        return null;
      }
      return record.value;
    },
    async set(key, value, ttlSeconds) {
      records.set(key, { value, expiresAtMs: now() + ttlSeconds * 1000 });
    },
    async getEpoch(userId) {
      return String(epochs.get(userId) || 0);
    },
    async bumpEpoch(userId) {
      epochs.set(userId, (epochs.get(userId) || 0) + 1);
    },
    size() {
      return records.size;
    },
  };
}

function createRedisResponseCacheStore({ redis }) {
  if (!redis) throw new Error("createRedisResponseCacheStore requires a redis client");
  return {
    kind: "redis",
    async get(key) {
      const cached = await redis.get(key);
      if (!cached) return null;
      return typeof cached === "string" ? JSON.parse(cached) : cached;
    },
    async set(key, value, ttlSeconds) {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    },
    async getEpoch(userId) {
      const value = await redis.get(`${EPOCH_PREFIX}${userId}`);
      return value == null ? "0" : String(value);
    },
    async bumpEpoch(userId) {
      const key = `${EPOCH_PREFIX}${userId}`;
      await redis.incr(key);
      await redis.expire(key, EPOCH_TTL_SECONDS);
    },
  };
}

function createDefaultStore() {
  if (String(process.env.OMEN_RESPONSE_CACHE || "").toLowerCase() === "off") return null;
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    try {
      const { Redis } = require("@upstash/redis");
      return createRedisResponseCacheStore({
        redis: new Redis({ url: process.env.REDIS_URL, token: process.env.REDIS_TOKEN }),
      });
    } catch {
      return null;
    }
  }
  return null;
}

function getStore() {
  if (!storeResolved) {
    store = createDefaultStore();
    storeResolved = true;
  }
  return store;
}

/** Tests inject a memory store (or null for "no Redis"). Pass `undefined` to re-resolve from env. */
function setStoreForTests(next) {
  store = next === undefined ? null : next;
  storeResolved = next !== undefined;
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value === undefined ? null : value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) out[key] = canonicalize(value[key]);
  }
  return out;
}

function hashParts(parts) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(parts))).digest("hex").slice(0, 40);
}

/**
 * Look the answer up. Returns a handle `{ hit, status, body, ttlSeconds, _key }`.
 * `hit` is false on any miss, disabled cache, missing user id, or store fault.
 * The handle is passed back to `store()` so the write uses the epoch seen here.
 */
async function lookup({ route, userId, parts = {} }) {
  const handle = { hit: false, enabled: false, route, ttlSeconds: 0, _key: null, _store: null };
  const ttlSeconds = ROUTE_TTL_SECONDS[route] ? ROUTE_TTL_SECONDS[route]() : 0;
  const activeStore = getStore();
  if (!activeStore || !ttlSeconds || !userId) return handle;

  try {
    const epoch = await withTimeout(activeStore.getEpoch(String(userId)));
    const key = `${KEY_PREFIX}${userId}:${epoch}:${route}:${hashParts(parts)}`;
    handle.enabled = true;
    handle.ttlSeconds = ttlSeconds;
    handle._key = key;
    handle._store = activeStore;
    const cached = await withTimeout(activeStore.get(key));
    if (cached && typeof cached.status === "number" && cached.body !== undefined) {
      handle.hit = true;
      handle.status = cached.status;
      handle.body = cached.body;
    }
  } catch {
    // Best effort: a fault is a miss, and a faulty store is not written to.
    handle.enabled = false;
    handle._key = null;
  }
  return handle;
}

/**
 * Write the answer. `verdict` is what the route decided about cacheability:
 *   { cache: false }                 never stored
 *   { cache: true }                  stored for the route TTL
 *   { cache: true, degraded: true }  stored for DEGRADED_TTL_SECONDS at most
 * A non-2xx status is never stored, whatever the verdict says.
 */
async function store_(handle, status, body, verdict = { cache: true }) {
  if (!handle || !handle.enabled || !handle._key || handle.hit) return false;
  if (!verdict || verdict.cache !== true) return false;
  if (!Number.isInteger(status) || status < 200 || status >= 300) return false;
  const ttl = verdict.degraded ? Math.min(handle.ttlSeconds, DEGRADED_TTL_SECONDS) : handle.ttlSeconds;
  if (!ttl) return false;
  try {
    await withTimeout(handle._store.set(handle._key, { status, body }, ttl));
    return true;
  } catch {
    return false;
  }
}

/** Delete (by orphaning) every cached answer for this user. Never throws. */
async function invalidateUser(userId) {
  const activeStore = getStore();
  if (!activeStore || !userId) return false;
  try {
    await withTimeout(activeStore.bumpEpoch(String(userId)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Express middleware for writes that change what a user's answers mean.
 * Place it AFTER requireAuth. It bumps the epoch before the handler runs and
 * again before the response is released, so a client that reacts to the
 * response by re-fetching cannot read an entry computed from pre-write data.
 */
function invalidateUserCacheOnWrite(req, res, next) {
  const userId = req.user?.id;
  if (!userId || !getStore()) return next();
  invalidateUser(userId).finally(() => {
    const originalEnd = res.end.bind(res);
    let released = false;
    res.end = (...args) => {
      if (released) return originalEnd(...args);
      released = true;
      invalidateUser(userId).finally(() => originalEnd(...args));
      return res;
    };
    next();
  });
}

function setCacheHeader(res, handle) {
  if (!handle || !handle.enabled) return;
  res.set("X-Omen-Cache", handle.hit ? "hit" : "miss");
}

/** Replay a hit: same status, same body, header says hit. */
function sendHit(res, handle) {
  res.set("X-Omen-Cache", "hit");
  return res.status(handle.status).json(handle.body);
}

// ---- cacheability rules -----------------------------------------------------

// States that mean "the user has something to do" or "nothing real was produced".
const ACTION_STATES = new Set([
  "espn_reauth_required",
  "yahoo_reauth_required",
  "platform_disconnected",
  "context_unavailable",
  "sleeper_league_context_missing",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
  "pending_live_engine",
  "error",
  "unavailable",
]);

function hasRecoveryBlock(body) {
  if (!body || typeof body !== "object") return false;
  if (body.recovery) return true;
  if (body.platform && typeof body.platform === "object" && body.platform.recovery) return true;
  if (body.error) return true;
  return false;
}

/** True when the body is a state the user must act on. Never cached. */
function isActionState(body) {
  if (!body || typeof body !== "object") return true;
  if (typeof body.state === "string" && ACTION_STATES.has(body.state)) return true;
  if (typeof body.status === "string" && /reauth|reconnect|disconnected/.test(body.status)) return true;
  return hasRecoveryBlock(body);
}

// Optional enrichment (llm_reasoning, waivers, matchup_dvp, ESPN scoring) is
// routinely "unavailable" and is not a provider failure. Only the roster read,
// which is the provider call the whole answer is built on, marks a degraded one.
function signalsDegraded(signals) {
  if (!signals || typeof signals !== "object") return false;
  const roster = signals.roster;
  return Boolean(roster) && roster.status !== "live";
}

/** Verdict for an Omen move body (mvp-move, quiet-week source). */
function omenMoveVerdict(body) {
  if (isActionState(body)) return { cache: false };
  if (!["success", "live", "empty"].includes(body.state)) return { cache: false };
  return { cache: true, degraded: signalsDegraded(body.signals) };
}

module.exports = {
  DEGRADED_TTL_SECONDS,
  KEY_PREFIX,
  ROUTE_TTL_SECONDS,
  createMemoryResponseCacheStore,
  createRedisResponseCacheStore,
  hasRecoveryBlock,
  invalidateUser,
  invalidateUserCacheOnWrite,
  isActionState,
  lookup,
  omenMoveVerdict,
  sendHit,
  setCacheHeader,
  setStoreForTests,
  signalsDegraded,
  store: store_,
};
