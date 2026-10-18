"use strict";

/**
 * Storage for decision explanations (decisionExplanation.js): a work queue of inputs and a cache of
 * written explanations, both keyed by the facts hash. Holds no user ids.
 *
 * Same client pattern as tradeFindCacheStore.js: the project's `@upstash/redis` client, a memory
 * fallback for local dev and tests, and a silent no-op when Redis is not configured in production.
 * An explanation is optional (the deterministic text always exists), so storage problems degrade
 * quietly instead of failing a request.
 */

const { Redis } = require("@upstash/redis");

const PREFIX = "omen:decision_explanation:v1:";
const QUEUE_KEY = `${PREFIX}queue`;
const RESULT_TTL_SECONDS = 8 * 24 * 60 * 60; // one NFL week plus a day
const PENDING_TTL_SECONDS = 6 * 60 * 60;
const MAX_QUEUE = 2000;

const parse = (raw) => (typeof raw === "string" ? JSON.parse(raw) : raw || null);

function createMemoryDecisionExplanationStore() {
  const results = new Map();
  const pending = new Set();
  const queue = [];
  return {
    kind: "memory",
    async get(hash) {
      return results.has(hash) ? { ...results.get(hash) } : null;
    },
    async put(hash, record) {
      results.set(hash, { ...record });
      pending.delete(hash);
    },
    async enqueue(input) {
      if (!input?.hash || results.has(input.hash) || pending.has(input.hash) || queue.length >= MAX_QUEUE) return false;
      pending.add(input.hash);
      queue.push(input);
      return true;
    },
    async dequeue(limit) {
      return queue.splice(0, limit);
    },
    async release(hash) {
      pending.delete(hash);
    },
    async requeue(input) {
      if (input?.hash) queue.unshift(input);
    },
  };
}

function createRedisDecisionExplanationStore({ redis }) {
  if (!redis) throw new Error("createRedisDecisionExplanationStore requires a redis client");
  return {
    kind: "redis",
    async get(hash) {
      return parse(await redis.get(`${PREFIX}result:${hash}`));
    },
    async put(hash, record) {
      await redis.set(`${PREFIX}result:${hash}`, JSON.stringify(record), { ex: RESULT_TTL_SECONDS });
      await redis.del(`${PREFIX}pending:${hash}`);
    },
    async enqueue(input) {
      if (!input?.hash) return false;
      if (await redis.exists(`${PREFIX}result:${input.hash}`)) return false;
      // NX: the first request for these facts queues them; repeats within the window do nothing.
      const claimed = await redis.set(`${PREFIX}pending:${input.hash}`, "1", { nx: true, ex: PENDING_TTL_SECONDS });
      if (!claimed) return false;
      if ((await redis.llen(QUEUE_KEY)) >= MAX_QUEUE) {
        await redis.del(`${PREFIX}pending:${input.hash}`);
        return false;
      }
      await redis.rpush(QUEUE_KEY, JSON.stringify(input));
      return true;
    },
    async dequeue(limit) {
      const items = [];
      for (let i = 0; i < limit; i += 1) {
        const raw = await redis.lpop(QUEUE_KEY);
        if (!raw) break;
        items.push(parse(raw));
      }
      return items;
    },
    async release(hash) {
      await redis.del(`${PREFIX}pending:${hash}`);
    },
    // Back to the front of the queue; the pending marker stays, so the facts are not queued twice.
    async requeue(input) {
      if (input?.hash) await redis.lpush(QUEUE_KEY, JSON.stringify(input));
    },
  };
}

function createNoopDecisionExplanationStore() {
  return {
    kind: "disabled",
    async get() { return null; },
    async put() {},
    async enqueue() { return false; },
    async dequeue() { return []; },
    async release() {},
    async requeue() {},
  };
}

function createDefaultDecisionExplanationStore(env = process.env) {
  if (env.REDIS_URL && env.REDIS_TOKEN) {
    return createRedisDecisionExplanationStore({ redis: new Redis({ url: env.REDIS_URL, token: env.REDIS_TOKEN }) });
  }
  if (env.NODE_ENV === "production") return createNoopDecisionExplanationStore();
  return createMemoryDecisionExplanationStore();
}

module.exports = {
  PREFIX,
  QUEUE_KEY,
  RESULT_TTL_SECONDS,
  MAX_QUEUE,
  createDefaultDecisionExplanationStore,
  createMemoryDecisionExplanationStore,
  createNoopDecisionExplanationStore,
  createRedisDecisionExplanationStore,
};
