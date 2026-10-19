"use strict";

/**
 * Background narration for the Omen call.
 *
 * The private model host answers in seconds to tens of seconds, far past the call's response
 * budget, so waiting on it inline only ever cost 1.25 s and returned the template. Instead:
 *
 * - a narration is generated once per set of decision facts (the grounded LLM payload), in the
 *   background, with a long timeout, and kept for TTL_MS;
 * - a request whose facts already have a narration gets it at once;
 * - a request without one starts the generation and waits for it only while the host has
 *   recently been fast enough to finish inside the budget. Otherwise it answers with the
 *   deterministic template straight away, and the next view of the same move is narrated.
 *
 * Per process, no prompt text in logs. Generations run one at a time: the host is a CPU box.
 */

const crypto = require("crypto");

const TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 500;
const BACKGROUND_TIMEOUT_MS = 60_000;
// Waiting generations beyond this are dropped: on a slow host they would land after the user left.
const MAX_QUEUED = 20;

function createNarrationCache({
  now = () => Date.now(),
  ttlMs = TTL_MS,
  maxEntries = MAX_ENTRIES,
  maxQueued = MAX_QUEUED,
} = {}) {
  const done = new Map(); // key -> { value, at }
  const inFlight = new Map(); // key -> promise
  let queue = Promise.resolve();
  let lastDurationMs = null;

  function keyFor(payload) {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  function get(key) {
    const hit = done.get(key);
    if (!hit) return undefined;
    if (now() - hit.at > ttlMs) {
      done.delete(key);
      return undefined;
    }
    return hit.value;
  }

  function store(key, value) {
    if (done.size >= maxEntries) done.delete(done.keys().next().value);
    done.set(key, { value, at: now() });
  }

  /** Starts (or joins) the generation for `key`. Resolves to the narration or null; never rejects. */
  function generate(key, produce) {
    if (inFlight.has(key)) return inFlight.get(key);
    if (inFlight.size >= maxQueued) return Promise.resolve(null);
    const run = queue.then(async () => {
      const started = now();
      try {
        const value = await produce(BACKGROUND_TIMEOUT_MS);
        if (value) store(key, value);
        return value || null;
      } catch {
        return null;
      } finally {
        lastDurationMs = now() - started;
        inFlight.delete(key);
      }
    });
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    inFlight.set(key, run);
    return run;
  }

  /**
   * True when a new generation could finish inside `budgetMs`: nothing is queued ahead of it and
   * the last one finished inside the budget (or none has run yet). Ask before calling generate().
   */
  function hostFitsBudget(budgetMs) {
    return inFlight.size === 0 && (lastDurationMs === null || lastDurationMs <= budgetMs);
  }

  function clear() {
    done.clear();
    inFlight.clear();
    lastDurationMs = null;
    queue = Promise.resolve();
  }

  return { keyFor, get, generate, hostFitsBudget, clear };
}

const sharedNarrationCache = createNarrationCache();

module.exports = { createNarrationCache, sharedNarrationCache, BACKGROUND_TIMEOUT_MS };
