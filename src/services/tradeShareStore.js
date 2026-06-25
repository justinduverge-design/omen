"use strict";

const { Redis } = require("@upstash/redis");

const DEFAULT_SHARE_TTL_SECONDS = 60 * 60 * 24 * 30;
const KEY_PREFIX = "omen:trade_share:";

function storageUnavailableError() {
  const error = new Error("trade_share_storage_unavailable");
  error.code = "trade_share_storage_unavailable";
  return error;
}

function createMemoryTradeShareStore({ now = () => new Date() } = {}) {
  const records = new Map();

  return {
    kind: "memory",
    async write(hash, snapshot, ttlSeconds = DEFAULT_SHARE_TTL_SECONDS) {
      const expiresAtMs = now().getTime() + ttlSeconds * 1000;
      records.set(hash, { snapshot, expiresAtMs });
    },
    async read(hash) {
      const record = records.get(hash);
      if (!record) return null;
      if (record.expiresAtMs <= now().getTime()) {
        records.delete(hash);
        return null;
      }
      return record.snapshot;
    },
  };
}

function createRedisTradeShareStore({
  redis,
  keyPrefix = KEY_PREFIX,
} = {}) {
  if (!redis) throw storageUnavailableError();

  return {
    kind: "redis",
    async write(hash, snapshot, ttlSeconds = DEFAULT_SHARE_TTL_SECONDS) {
      await redis.set(`${keyPrefix}${hash}`, JSON.stringify(snapshot), { ex: ttlSeconds });
    },
    async read(hash) {
      const cached = await redis.get(`${keyPrefix}${hash}`);
      if (!cached) return null;
      if (typeof cached === "string") return JSON.parse(cached);
      return cached;
    },
  };
}

function createDisabledTradeShareStore() {
  return {
    kind: "disabled",
    async write() {
      throw storageUnavailableError();
    },
    async read() {
      throw storageUnavailableError();
    },
  };
}

function createDefaultTradeShareStore() {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    return createRedisTradeShareStore({
      redis: new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      }),
    });
  }

  if (process.env.NODE_ENV === "production") {
    return createDisabledTradeShareStore();
  }

  return createMemoryTradeShareStore();
}

module.exports = {
  DEFAULT_SHARE_TTL_SECONDS,
  createDefaultTradeShareStore,
  createDisabledTradeShareStore,
  createMemoryTradeShareStore,
  createRedisTradeShareStore,
};
