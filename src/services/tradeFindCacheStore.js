"use strict";

/**
 * Cache for T2's per-league need-profile/roster bundle.
 *
 * Same client/connection pattern as `tradeShareStore.js`: the project's
 * existing `@upstash/redis` client, a memory fallback for local dev/test,
 * `JSON.stringify`/`parse` at the boundary because Upstash's REST client
 * already parses simple JSON values inconsistently across SDK versions.
 *
 * ## Why "disabled" behaves differently here than in tradeShareStore
 *
 * `tradeShareStore`'s disabled store *throws* on read/write in production
 * without Redis configured, because a trade-share link is a durable public
 * object — if it cannot be persisted, creating it must fail loudly (503),
 * not pretend to succeed.
 *
 * A find-a-trade cache miss is not a correctness problem, only a
 * performance one: `tradeFind.js`'s candidate generation is already bounded
 * independently of caching (a shared search budget plus a hard cap on
 * opponent teams considered — see `MAX_OPPONENT_TEAMS_PER_SCAN` in
 * `tradeFind.js`), so serving a request uncached is still safe, just
 * slower. Throwing here would turn "Redis isn't configured" into "find-a-
 * trade is down", which is a worse failure than "find-a-trade is a little
 * more expensive per request." So the disabled store is a silent no-op
 * rather than an error.
 */

const { Redis } = require("@upstash/redis");

const DEFAULT_FIND_CACHE_TTL_SECONDS = 60 * 15; // 15 minutes.
const KEY_PREFIX = "omen:trade_find:";

function createMemoryTradeFindCache({ now = () => new Date() } = {}) {
  const records = new Map();

  return {
    kind: "memory",
    async write(key, value, ttlSeconds = DEFAULT_FIND_CACHE_TTL_SECONDS) {
      const expiresAtMs = now().getTime() + ttlSeconds * 1000;
      records.set(key, { value, expiresAtMs });
    },
    async read(key) {
      const record = records.get(key);
      if (!record) return null;
      if (record.expiresAtMs <= now().getTime()) {
        records.delete(key);
        return null;
      }
      return record.value;
    },
  };
}

function createRedisTradeFindCache({ redis, keyPrefix = KEY_PREFIX } = {}) {
  if (!redis) {
    throw new Error("createRedisTradeFindCache requires a redis client");
  }

  return {
    kind: "redis",
    async write(key, value, ttlSeconds = DEFAULT_FIND_CACHE_TTL_SECONDS) {
      await redis.set(`${keyPrefix}${key}`, JSON.stringify(value), { ex: ttlSeconds });
    },
    async read(key) {
      const cached = await redis.get(`${keyPrefix}${key}`);
      if (!cached) return null;
      if (typeof cached === "string") return JSON.parse(cached);
      return cached;
    },
  };
}

function createDisabledTradeFindCache() {
  return {
    kind: "disabled",
    async write() {
      // No-op: see the module doc comment. Caching is an optimization here,
      // never a correctness dependency, so a missing store must not block
      // or fail the request.
    },
    async read() {
      return null;
    },
  };
}

function createDefaultTradeFindCache() {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    return createRedisTradeFindCache({
      redis: new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      }),
    });
  }

  if (process.env.NODE_ENV === "production") {
    return createDisabledTradeFindCache();
  }

  return createMemoryTradeFindCache();
}

module.exports = {
  DEFAULT_FIND_CACHE_TTL_SECONDS,
  createDefaultTradeFindCache,
  createDisabledTradeFindCache,
  createMemoryTradeFindCache,
  createRedisTradeFindCache,
};
