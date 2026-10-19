"use strict";

/**
 * Per-call budget plus a process-wide circuit breaker for optional LLM
 * narration. Narration is an enhancement: every outcome other than a usable
 * value resolves (never throws) so the caller falls back to its deterministic
 * text exactly as it does today.
 *
 * Breaker: after FAILURE_THRESHOLD consecutive failures (timeout, thrown
 * error; an empty result is neutral) the
 * breaker opens and narration is skipped for OPEN_MS. After that one probe is
 * allowed through (half-open); success closes the breaker, failure re-opens it.
 *
 * Logs one structured line on open and on close. No prompt text, no secrets.
 */

const NARRATION_BUDGET_MS = Object.freeze({
  omen: 1250,
  trade_compare: 1500,
  start_sit: 1500,
});

const FAILURE_THRESHOLD = 3;
const OPEN_MS = 60_000;

// The app logger loads config, which exits the process when required env is
// missing (unit tests). Only load it when the environment is configured;
// otherwise emit the same structured line to stderr.
function defaultLogger() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      return require("../middleware/logging").logger;
    } catch {
      /* fall through */
    }
  }
  return {
    warn: (message, meta) => process.stderr.write(`${JSON.stringify({ level: "warn", message, ...meta })}\n`),
  };
}

/**
 * NOTE: breaker state is per process (module-level in `sharedNarrationGuard`).
 * Each instance of the API opens and closes on its own evidence, and a restart
 * resets it. That is intentional: it needs no shared store on the hot path.
 *
 * Epochs: every open/close transition starts a new epoch. A call remembers the
 * epoch it was admitted in; a result from an older epoch is ignored for breaker
 * accounting (a late success cannot close without a probe, a late failure cannot
 * extend the open window or log a second "opened", and a late result cannot
 * clear the in-flight probe).
 *
 * Empty (null) results are NEUTRAL: a bridge that is hard-down returns null
 * instantly (llm.chat swallows errors), which says nothing either way. Only a
 * real value closes the breaker; only a timeout or a throw counts as failure.
 */
function createNarrationGuard({
  failureThreshold = FAILURE_THRESHOLD,
  openMs = OPEN_MS,
  now = () => Date.now(),
  logger = null,
} = {}) {
  let consecutiveFailures = 0;
  let openedAt = null; // non-null while open or half-open
  let probeInFlight = false;
  let epoch = 0;

  const log = (message, meta) => {
    const sink = logger || defaultLogger();
    try {
      sink?.warn?.(message, meta);
    } catch {
      /* logging must never break a request */
    }
  };

  function recordSuccess(site, admittedEpoch) {
    if (admittedEpoch !== epoch) return;
    const wasOpen = openedAt !== null;
    consecutiveFailures = 0;
    if (wasOpen) {
      openedAt = null;
      probeInFlight = false;
      epoch += 1;
      log("Narration circuit breaker closed", { event: "narration_breaker_closed", site });
    }
  }

  function recordFailure(site, reason, admittedEpoch) {
    if (admittedEpoch !== epoch) return;
    consecutiveFailures += 1;
    const reopened = openedAt !== null;
    if (reopened || consecutiveFailures >= failureThreshold) {
      openedAt = now();
      probeInFlight = false;
      epoch += 1;
      log("Narration circuit breaker opened", {
        event: "narration_breaker_opened",
        site,
        reason,
        consecutive_failures: consecutiveFailures,
        skip_ms: openMs,
        half_open_probe_failed: reopened,
      });
    }
  }

  function recordNeutral(admittedEpoch) {
    // An empty probe proves nothing: release the probe slot so the next call probes again.
    if (admittedEpoch === epoch && openedAt !== null) probeInFlight = false;
  }

  function admit() {
    if (openedAt === null) return true;
    if (now() - openedAt < openMs) return false;
    if (probeInFlight) return false; // one half-open probe at a time
    probeInFlight = true;
    return true;
  }

  /**
   * @returns {Promise<{status:"ok",value:any}|{status:"skipped"}|{status:"timeout"}|{status:"error",error:Error}|{status:"empty"}>}
   */
  async function run(site, budgetMs, operation) {
    if (!admit()) return { status: "skipped" };
    const admittedEpoch = epoch;
    const controller = new AbortController();
    let timer = null;
    const timedOut = Symbol("timeout");
    try {
      const raced = await Promise.race([
        Promise.resolve().then(() => operation(controller.signal)),
        new Promise((resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve(timedOut);
          }, budgetMs);
        }),
      ]);
      if (raced === timedOut) {
        recordFailure(site, "timeout", admittedEpoch);
        return { status: "timeout" };
      }
      if (raced == null) {
        recordNeutral(admittedEpoch);
        return { status: "empty" };
      }
      recordSuccess(site, admittedEpoch);
      return { status: "ok", value: raced };
    } catch (error) {
      recordFailure(site, "error", admittedEpoch);
      return { status: "error", error };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    run,
    state: () => (openedAt === null ? "closed" : now() - openedAt < openMs ? "open" : "half_open"),
    reset() {
      consecutiveFailures = 0;
      openedAt = null;
      probeInFlight = false;
      epoch += 1;
    },
  };
}

const sharedNarrationGuard = createNarrationGuard();

module.exports = {
  NARRATION_BUDGET_MS,
  FAILURE_THRESHOLD,
  OPEN_MS,
  createNarrationGuard,
  sharedNarrationGuard,
};
