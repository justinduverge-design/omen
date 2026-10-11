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
} = {}) {
  const tasks = loaders || {
    warehouse: async () => { await getRuntime()?.warm?.(); },
    season_bundle: () => require("./fantasyMetrics/fantasyMetricsData").getSeasonBundle({ season: Number(getSeason()), log: logger }),
    usage: () => require("./playerUsage").warm({ season: Number(getSeason()) }),
    dvp: () => require("./matchupService").warm({ season: Number(getSeason()) }),
  };
  const started = Object.entries(tasks).map(([name, load]) => {
    let promise;
    try { promise = Promise.resolve(load()); } catch (error) { promise = Promise.reject(error); }
    return promise.then(() => null, (error) => {
      try { logger?.warn?.("Cold-start warm-up skipped", { task: name, reason: error?.code || error?.name || "error" }); } catch {}
      return name;
    });
  });
  return Promise.all(started);
}

module.exports = { warmUp };
