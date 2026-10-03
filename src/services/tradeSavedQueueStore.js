"use strict";

/**
 * Persistence for T4's saved-trade queue.
 *
 * Same client/connection pattern as `tradeShareStore.js` and
 * `tradeFindCacheStore.js` (T2, read-only reference): the project's existing
 * `@upstash/redis` client, a memory fallback for local dev/test,
 * `JSON.stringify`/`parse` at the boundary.
 *
 * ## Why "disabled" throws here, like tradeShareStore and unlike
 * tradeFindCacheStore
 *
 * A find-a-trade cache miss just costs a slower request — degrades gracefully
 * to a silent no-op. A saved trade candidate is durable, user-visible state:
 * the user explicitly asked Omen to remember this for later, plus whatever
 * sent/outcome self-report they layer on afterward. Losing that silently is
 * the same failure shape `tradeShareStore.js`'s doc comment already names for
 * a share link — "if it cannot be persisted, creating it must fail loudly
 * (503), not pretend to succeed." So the disabled store throws, exactly like
 * `tradeShareStore.js`, not like the cache.
 *
 * ## Why one JSON blob per user rather than per-candidate keys
 *
 * A user's saved queue is small (bounded by how many candidates a human
 * swipes "save" on — nowhere near T2's `MAX_CANDIDATES_RETURNED` batch size
 * repeated many times over) and read/written as a whole list by every
 * endpoint T4 needs (save one, list all, mark one sent, self-report one
 * outcome). A single read-modify-write per user avoids a second data
 * structure (a per-user index set plus per-candidate keys) for no real
 * concurrency benefit at this scale.
 */

const { Redis } = require("@upstash/redis");

const KEY_PREFIX = "omen:trade_saved_queue:";

function storageUnavailableError() {
  const error = new Error("trade_saved_queue_storage_unavailable");
  error.code = "trade_saved_queue_storage_unavailable";
  return error;
}

function createMemoryTradeSavedQueueStore() {
  const records = new Map(); // userId -> array of saved candidate records

  return {
    kind: "memory",
    async readAll(userId) {
      const items = records.get(userId);
      return items ? items.map((item) => ({ ...item })) : [];
    },
    async writeAll(userId, items) {
      records.set(userId, items.map((item) => ({ ...item })));
    },
  };
}

function createRedisTradeSavedQueueStore({ redis, keyPrefix = KEY_PREFIX } = {}) {
  if (!redis) throw storageUnavailableError();

  return {
    kind: "redis",
    async readAll(userId) {
      const raw = await redis.get(`${keyPrefix}${userId}`);
      if (!raw) return [];
      if (typeof raw === "string") return JSON.parse(raw);
      return Array.isArray(raw) ? raw : [];
    },
    async writeAll(userId, items) {
      await redis.set(`${keyPrefix}${userId}`, JSON.stringify(items));
    },
  };
}

function createDisabledTradeSavedQueueStore() {
  return {
    kind: "disabled",
    async readAll() {
      throw storageUnavailableError();
    },
    async writeAll() {
      throw storageUnavailableError();
    },
  };
}

function createDefaultTradeSavedQueueStore() {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    return createRedisTradeSavedQueueStore({
      redis: new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      }),
    });
  }

  if (process.env.NODE_ENV === "production") {
    return createDisabledTradeSavedQueueStore();
  }

  return createMemoryTradeSavedQueueStore();
}

module.exports = {
  KEY_PREFIX,
  storageUnavailableError,
  createDefaultTradeSavedQueueStore,
  createDisabledTradeSavedQueueStore,
  createMemoryTradeSavedQueueStore,
  createRedisTradeSavedQueueStore,
};
