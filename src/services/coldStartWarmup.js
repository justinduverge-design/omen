"use strict";

/**
 * Cold-start warm-up. Every deploy recreates the container, so the in-memory caches and the warehouse
 * pool start empty and the first requests pay for them. This starts those loads right after the server
 * is listening. Fire-and-forget by contract: it never throws, never delays readiness or health, and a
 * failed load is only logged once; the request path still loads on demand exactly as before.
 */

function warmUp({
  logger,
  getRuntime = () => require("./footballWarehouse/sharedUsageAccess").getRuntime({ logger }),
  getSeason = () => require("./nflSchedule").getCurrentNflWeekContext().season,
  loaders = null,
  suppressDownloads = () => require("./nflSchedule").suppressLiveFootballData(),
} = {}) {
  // Off-season there is nothing to pre-fetch for: the football-data downloads are skipped.
  const downloads = (tasks) => (suppressDownloads() ? {} : tasks);
  const tasks = loaders || {
    warehouse: async () => {
      await getRuntime()?.warm?.();
    },
    ...downloads({
      season_bundle: () =>
        require("./fantasyMetrics/fantasyMetricsData").getSeasonBundle({ season: Number(getSeason()), log: logger }),
      usage: () => require("./playerUsage").warm({ season: Number(getSeason()) }),
      dvp: () => require("./matchupService").warm({ season: Number(getSeason()) }),
    }),
  };
  const started = Object.entries(tasks).map(([name, load]) => {
    let promise;
    try {
      promise = Promise.resolve(load());
    } catch (error) {
      promise = Promise.reject(error);
    }
    return promise.then(
      () => null,
      (error) => {
        try {
          logger?.warn?.("Cold-start warm-up skipped", { task: name, reason: error?.code || error?.name || "error" });
        } catch {}
        return name;
      },
    );
  });
  return Promise.all(started);
}

const START_DELAY_MS = 5_000;
const MIN_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Schedules the warm-up once per process, well after the server is listening. Skipped in tests, when
 * OMEN_COLD_START_WARMUP=off, and when a warm-up already started within MIN_INTERVAL_MS (a stamp file
 * in the temp dir), so a crash-looping container cannot re-download faster than that. Returns the
 * timer, or null when skipped. Never throws.
 */
function scheduleWarmUp({
  logger,
  env = process.env,
  fs = require("node:fs"),
  stampPath = require("node:path").join(require("node:os").tmpdir(), "omen-cold-start-warmup.stamp"),
  now = Date.now,
  delayMs = START_DELAY_MS,
  run = warmUp,
  setTimer = setTimeout,
} = {}) {
  try {
    if (env.NODE_ENV === "test") return null;
    if (String(env.OMEN_COLD_START_WARMUP || "").toLowerCase() === "off") return null;
    try {
      const last = Number(fs.readFileSync(stampPath, "utf8"));
      if (Number.isFinite(last) && now() - last < MIN_INTERVAL_MS) return null;
    } catch {}
    const timer = setTimer(() => {
      try {
        fs.writeFileSync(stampPath, String(now()));
      } catch {}
      try {
        run({ logger });
      } catch {}
    }, delayMs);
    timer?.unref?.();
    return timer;
  } catch {
    return null;
  }
}

module.exports = { warmUp, scheduleWarmUp, START_DELAY_MS, MIN_INTERVAL_MS };
