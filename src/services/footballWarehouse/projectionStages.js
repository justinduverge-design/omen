"use strict";

const { createSleeperProjectionSource } = require("./sleeperProjectionSource");
const { createProjectionWriter } = require("./projectionWriter");
const { getCurrentNflWeekContext } = require("../nflSchedule");

// Ingest stage that stores Sleeper's weekly projections for the current NFL week and the next WEEKS_AHEAD weeks.
// It runs after the nflverse facts (and the derived stages) in the daily chain and is isolated from them:
//   - opt-in:      FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED=true (wired in currentSeasonCommand)
//   - kill switch: FOOTBALL_PROJECTIONS_DISABLED=1 stops the stage (and the read path in the API)
//   - report mode: a failed week is returned as { state: "failed", code } and never throws, so projections cannot
//                  fail the nflverse ingest or take down the daily heartbeat. strict mode exists for tests/backfills.
// Output is counts and states only (no player rows).

const DEFAULT_WEEKS_AHEAD = 2;
const LAST_REGULAR_WEEK = 18;

function stageCode(error) {
  return typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : "projection_stage_failed";
}

function killSwitchOn(env) {
  return env.FOOTBALL_PROJECTIONS_DISABLED === "1";
}

/** Weeks worth storing for `season` at `now`, or [] when the season is not the live one or is over. */
function weeksToFetch({ season, now, weeksAhead = DEFAULT_WEEKS_AHEAD, weekContext = getCurrentNflWeekContext }) {
  const context = weekContext(now);
  if (context.season !== season || context.raw_week > LAST_REGULAR_WEEK) return [];
  const weeks = [];
  for (let week = context.week; week <= Math.min(LAST_REGULAR_WEEK, context.week + weeksAhead); week += 1)
    weeks.push(week);
  return weeks;
}

function createProjectionStages({
  pool,
  mode = "report",
  env = process.env,
  now = () => new Date(),
  weeksAhead = DEFAULT_WEEKS_AHEAD,
  source = createSleeperProjectionSource(),
  writer = createProjectionWriter({ pool, now }),
  weekContext,
  signal,
} = {}) {
  if (mode !== "strict" && mode !== "report") throw new TypeError("projection stage mode must be strict or report");

  return {
    async run({ season }) {
      if (killSwitchOn(env)) return { state: "disabled", weeks: [] };
      const at = now();
      const weeks = weeksToFetch({ season, now: at, weeksAhead, weekContext });
      if (!weeks.length) return { state: "skipped", reason: "no_live_weeks", weeks: [] };

      const results = [];
      let failed = null;
      for (const week of weeks) {
        const runId = `projections-sleeper-${season}-w${week}-${at.toISOString().replace(/[^0-9TZ]/g, "")}`;
        let fetched;
        const fetchedAt = now();
        try {
          fetched = await source.fetchWeek({ season, week, signal });
          const written = await writer.writeWeek({ runId, fetchedAt, fetched });
          results.push({
            week,
            state: written.state,
            inserted: written.inserted,
            changed: written.changed,
            unchanged: written.unchanged,
            unmatched: written.unmatched,
          });
        } catch (error) {
          const code = stageCode(error);
          // A fetch that failed before the writer ran has no receipt yet; the writer records its own failures.
          if (!fetched && typeof writer.recordFailure === "function") {
            await writer.recordFailure({
              runId,
              season,
              week,
              fetchedAt,
              code,
              summary: "projection fetch failed",
              sourceUrl: "https://api.sleeper.app/projections/nfl",
            });
          }
          results.push({ week, state: "failed", code });
          failed =
            failed ||
            Object.assign(new Error(`projection stage week ${week} failed`), {
              code: `projections_${code}`.slice(0, 64),
            });
        }
      }
      if (failed && mode === "strict") throw failed;
      const failures = results.filter((r) => r.state === "failed").length;
      const state = failures === 0 ? "succeeded" : failures === results.length ? "failed" : "partial";
      return { state, weeks: results };
    },
  };
}

module.exports = { createProjectionStages, weeksToFetch, DEFAULT_WEEKS_AHEAD };
