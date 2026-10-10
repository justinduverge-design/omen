"use strict";

const { createPlayerWeeklyOpportunityWriter } = require("./playerWeeklyOpportunityWriter");
const { createRatQbRunner } = require("./ratQbRun");

function stageError(stage, error) {
  const code = typeof error?.code === "string" && /^[a-z0-9_]{1,64}$/.test(error.code) ? error.code : "failed";
  return Object.assign(new Error(`derived stage ${stage} failed`), { code: `derived_${stage}_${code}`.slice(0, 64) });
}

/**
 * Stages computed inside the warehouse after a season's facts are current: the player-week opportunity table,
 * then the RAT-QB v0 season-to-date run. Derived output is sanitized to counts and states (no row contents).
 * strict (default, the daily run): a stage failure is a coded failure so the schedule's heartbeat goes down.
 * report (historical backfill): each stage runs independently and a failure is returned as {state:"failed", code}
 * so one season whose early play-by-play cannot be reconciled does not stop the load of every later season.
 * Either way, an already-committed fact is never undone.
 */
function createDerivedStages({ pool, mode = "strict", opportunityWriter = createPlayerWeeklyOpportunityWriter({ pool }), qbRunner = createRatQbRunner({ pool }) } = {}) {
  if (mode !== "strict" && mode !== "report") throw new TypeError("derived stage mode must be strict or report");
  async function stage(name, fn, shape) {
    try { return shape(await fn()); } catch (error) {
      const coded = stageError(name, error);
      if (mode === "strict") throw coded;
      return { state: "failed", code: coded.code };
    }
  }
  return {
    async run({ season }) {
      const opportunity = await stage("opportunity", () => opportunityWriter.writeSeason({ season }), (r) => ({ state: r.state, writtenRows: r.writtenRows }));
      const ratQb = await stage("rat_qb", () => qbRunner.run({ season }), (r) => ({ state: r.state, valueCount: r.valueCount ?? null }));
      return { opportunity, ratQb };
    },
  };
}

module.exports = { createDerivedStages };
